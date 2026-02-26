/**
 * Agora Agent Core Module
 *
 * Provides the main AgoraAgent class for creating and managing AI agents
 * that can communicate via the Agora protocol. Includes message handling,
 * intent validation, and escrow event processing.
 *
 * @module agent
 */

import { Envelope, EnvelopeSigner, MessageType, Sender, SignedEnvelope } from './envelope.js';
import {
  MessageBuilder,
  RequestPayload,
  OfferPayload,
  ResultPayload,
} from './messages.js';
import { RelayClient, SubscribeOptions, AgentRegistration, AgentRecord } from './relay.js';
import { JsonSchema, validateJsonSchema } from './schema.js';

/** Options for creating an AgoraAgent instance */
export interface AgoraAgentOptions {
  /** Agent's DID (Decentralized Identifier) */
  did: string;
  /** Ed25519 private key for signing envelopes */
  privateKey: Uint8Array;
  /** URL of the Agora relay server */
  relayUrl: string;
  /** Human-readable agent name */
  name?: string;
  /** Agent's public URL */
  url?: string;
  /** Agent description */
  description?: string;
  /** URL to agent's portfolio */
  portfolioUrl?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Agent capabilities */
  capabilities?: unknown[];
  /** JSON schemas for intent validation */
  intentSchemas?: Record<string, { input?: JsonSchema; output?: JsonSchema }>;
}

/** Options for agent registration */
export interface RegisterOptions {
  /** Capabilities to register */
  capabilities?: unknown[];
  /** Initial status */
  status?: string;
}

/** Handler for incoming messages */
export type MessageHandler = (envelope: SignedEnvelope) => void | Promise<void>;

/** Handler for escrow events */
export type EscrowHandler = (
  envelope: SignedEnvelope,
  escrow: {
    request_id: string;
    payer?: string;
    payee?: string;
    amount?: number;
    currency?: string;
    status?: string;
    held_at?: string;
    released_at?: string;
  },
) => void | Promise<void>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function extractIntentSchemasFromCapabilities(
  capabilities: unknown[],
): Record<string, { input?: JsonSchema; output?: JsonSchema }> {
  const map: Record<string, { input?: JsonSchema; output?: JsonSchema }> = {};
  if (!Array.isArray(capabilities)) return map;

  for (const capability of capabilities) {
    if (!isRecord(capability)) continue;
    const input = (isRecord(capability.input_schema) ? capability.input_schema : undefined)
      || (isRecord((capability.schemas as any)?.request) ? (capability.schemas as any).request : undefined);
    const output = (isRecord(capability.output_schema) ? capability.output_schema : undefined)
      || (isRecord((capability.schemas as any)?.response) ? (capability.schemas as any).response : undefined);
    const intents = Array.isArray(capability.intents) ? capability.intents : [];

    for (const intentDecl of intents) {
      if (typeof intentDecl === 'string' && intentDecl) {
        map[intentDecl] = { input, output };
        continue;
      }
      if (!isRecord(intentDecl) || typeof intentDecl.id !== 'string' || !intentDecl.id) continue;
      const intentInput = isRecord(intentDecl.input_schema) ? intentDecl.input_schema : input;
      const intentOutput = isRecord(intentDecl.output_schema) ? intentDecl.output_schema : output;
      map[intentDecl.id] = { input: intentInput, output: intentOutput };
    }
  }

  return map;
}

export class AgoraAgent {
  public readonly did: string;
  public readonly relay: RelayClient;
  private readonly signer: EnvelopeSigner;
  private readonly senderProfile: Sender;
  private readonly registrationProfile: {
    description?: string;
    portfolio_url?: string;
    metadata?: Record<string, unknown>;
  };
  private readonly defaultCapabilities?: unknown[];
  private readonly intentSchemas: Record<string, { input?: JsonSchema; output?: JsonSchema }>;

  constructor(options: AgoraAgentOptions) {
    this.did = options.did;
    this.relay = new RelayClient({ baseUrl: options.relayUrl });
    this.signer = new EnvelopeSigner(options.privateKey);
    this.senderProfile = { id: options.did, name: options.name, url: options.url };
    this.registrationProfile = {
      description: options.description,
      portfolio_url: options.portfolioUrl,
      metadata: options.metadata,
    };
    this.defaultCapabilities = options.capabilities;
    this.intentSchemas = options.intentSchemas || extractIntentSchemasFromCapabilities(options.capabilities || []);
  }

  get sender(): Sender {
    return this.senderProfile;
  }

  async register(options: RegisterOptions = {}): Promise<{ ok: boolean; agent?: AgentRecord; error?: string }> {
    const payload: AgentRegistration = {
      agent: { ...this.senderProfile, ...this.registrationProfile },
      capabilities: options.capabilities ?? this.defaultCapabilities,
      status: options.status,
    };
    return this.relay.registerAgent(payload);
  }

  async sign(envelope: Envelope): Promise<SignedEnvelope> {
    return this.signer.sign(envelope);
  }

  async sendEnvelope(envelope: Envelope): Promise<{ ok: boolean; id?: string; error?: string }> {
    const signed = await this.signer.sign(envelope);
    return this.relay.submitMessage(signed);
  }

  async sendRequest(
    payload: RequestPayload,
    options?: { recipient?: string; thread?: string }
  ): Promise<{ ok: boolean; id?: string; error?: string }> {
    const schema = this.intentSchemas[payload.intent]?.input;
    if (schema) {
      const check = validateJsonSchema(schema, payload.params, 'payload.params');
      if (!check.ok) {
        return { ok: false, error: `REQUEST_SCHEMA_VALIDATION_FAILED: ${check.errors.join('; ')}` };
      }
    }
    const envelope = MessageBuilder.request(this.senderProfile, payload, options);
    return this.sendEnvelope(envelope);
  }

  async sendOffer(
    requestId: string,
    payload: Omit<OfferPayload, 'request_id'>,
    options?: { thread?: string }
  ): Promise<{ ok: boolean; id?: string; error?: string }> {
    const envelope = MessageBuilder.offer(this.senderProfile, requestId, payload, options);
    return this.sendEnvelope(envelope);
  }

  async sendAccept(
    requestId: string,
    options?: { thread?: string; terms?: Record<string, unknown>; payment_tx?: string }
  ): Promise<{ ok: boolean; id?: string; error?: string }> {
    const envelope = MessageBuilder.accept(this.senderProfile, requestId, options);
    return this.sendEnvelope(envelope);
  }

  async sendResult(
    requestId: string,
    payload: Omit<ResultPayload, 'request_id'>,
    options?: { thread?: string; intent?: string }
  ): Promise<{ ok: boolean; id?: string; error?: string }> {
    const outputSchema = options?.intent ? this.intentSchemas[options.intent]?.output : undefined;
    if (outputSchema) {
      const outputValue = payload.output ?? payload;
      const check = validateJsonSchema(outputSchema, outputValue, 'payload.output');
      if (!check.ok) {
        return { ok: false, error: `RESULT_SCHEMA_VALIDATION_FAILED: ${check.errors.join('; ')}` };
      }
    }
    const envelope = MessageBuilder.result(this.senderProfile, requestId, payload, options);
    return this.sendEnvelope(envelope);
  }

  async sendError(
    code: string,
    message: string,
    options?: { recipient?: string; details?: Record<string, unknown>; thread?: string }
  ): Promise<{ ok: boolean; id?: string; error?: string }> {
    const envelope = MessageBuilder.error(this.senderProfile, code, message, options);
    return this.sendEnvelope(envelope);
  }

  async onMessage(
    type: MessageType,
    handler: MessageHandler,
    options: SubscribeOptions = {}
  ): Promise<void> {
    for await (const batch of this.relay.subscribeMessages({ ...options, type })) {
      for (const envelope of batch) {
        await handler(envelope);
      }
    }
  }

  async onRequest(handler: MessageHandler, options: SubscribeOptions = {}): Promise<void> {
    return this.onMessage('REQUEST', async (envelope) => {
      const payload = envelope.payload || {};
      const intent = typeof payload.intent === 'string' ? payload.intent : null;
      const schema = intent ? this.intentSchemas[intent]?.input : undefined;
      if (schema) {
        const check = validateJsonSchema(schema, payload.params, 'payload.params');
        if (!check.ok) {
          await this.sendError(
            'REQUEST_SCHEMA_VALIDATION_FAILED',
            `Incoming request schema validation failed: ${check.errors.join('; ')}`,
            {
              recipient: envelope.sender?.id,
              thread: envelope.thread?.id,
              details: {
                request_id: payload.request_id || payload.requestId,
                intent,
                errors: check.errors,
              },
            },
          );
          return;
        }
      }
      await handler(envelope);
    }, options);
  }

  async onOffer(handler: MessageHandler, options: SubscribeOptions = {}): Promise<void> {
    return this.onMessage('OFFER', handler, options);
  }

  async onAccept(handler: MessageHandler, options: SubscribeOptions = {}): Promise<void> {
    return this.onMessage('ACCEPT', handler, options);
  }

  async onResult(handler: MessageHandler, options: SubscribeOptions = {}): Promise<void> {
    return this.onMessage('RESULT', handler, options);
  }

  async onEscrowDeposit(
    handler: EscrowHandler,
    options: SubscribeOptions & { onlyForPayee?: boolean } = {},
  ): Promise<void> {
    const { onlyForPayee = true, ...subscribe } = options;
    return this.onMessage('ESCROW_HELD', async (envelope) => {
      const payload = envelope.payload || {};
      const escrow = {
        request_id: typeof payload.request_id === 'string' ? payload.request_id : String(payload.request_id || ''),
        payer: typeof payload.payer === 'string' ? payload.payer : undefined,
        payee: typeof payload.payee === 'string' ? payload.payee : undefined,
        amount: typeof payload.amount === 'number' ? payload.amount : undefined,
        currency: typeof payload.currency === 'string' ? payload.currency : undefined,
        status: typeof payload.status === 'string' ? payload.status : undefined,
        held_at: typeof payload.held_at === 'string' ? payload.held_at : undefined,
        released_at: typeof payload.released_at === 'string' ? payload.released_at : undefined,
      };
      if (onlyForPayee && escrow.payee && escrow.payee !== this.did) return;
      await handler(envelope, escrow);
    }, subscribe);
  }
}
