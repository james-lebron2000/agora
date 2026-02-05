import { Envelope, EnvelopeSigner, MessageType, Sender, SignedEnvelope } from './envelope.js';
import {
  MessageBuilder,
  RequestPayload,
  OfferPayload,
  ResultPayload,
} from './messages.js';
import { RelayClient, SubscribeOptions, AgentRegistration, AgentRecord } from './relay.js';

export interface AgoraAgentOptions {
  did: string;
  privateKey: Uint8Array;
  relayUrl: string;
  name?: string;
  url?: string;
  capabilities?: unknown[];
}

export interface RegisterOptions {
  capabilities?: unknown[];
  status?: string;
}

export type MessageHandler = (envelope: SignedEnvelope) => void | Promise<void>;

export class AgoraAgent {
  public readonly did: string;
  public readonly relay: RelayClient;
  private readonly signer: EnvelopeSigner;
  private readonly senderProfile: Sender;
  private readonly defaultCapabilities?: unknown[];

  constructor(options: AgoraAgentOptions) {
    this.did = options.did;
    this.relay = new RelayClient({ baseUrl: options.relayUrl });
    this.signer = new EnvelopeSigner(options.privateKey);
    this.senderProfile = { id: options.did, name: options.name, url: options.url };
    this.defaultCapabilities = options.capabilities;
  }

  get sender(): Sender {
    return this.senderProfile;
  }

  async register(options: RegisterOptions = {}): Promise<{ ok: boolean; agent?: AgentRecord; error?: string }> {
    const payload: AgentRegistration = {
      agent: this.senderProfile,
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
    options?: { thread?: string }
  ): Promise<{ ok: boolean; id?: string; error?: string }> {
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
    return this.onMessage('REQUEST', handler, options);
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
}
