/**
 * Agora Agent Core Module
 *
 * Provides the main AgoraAgent class for creating and managing AI agents
 * that can communicate via the Agora protocol. Includes message handling,
 * intent validation, and escrow event processing.
 *
 * @module agent
 */
import { EnvelopeSigner } from './envelope.js';
import { MessageBuilder, } from './messages.js';
import { RelayClient } from './relay.js';
import { validateJsonSchema } from './schema.js';
function isRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}
export function extractIntentSchemasFromCapabilities(capabilities) {
    const map = {};
    if (!Array.isArray(capabilities))
        return map;
    for (const capability of capabilities) {
        if (!isRecord(capability))
            continue;
        const input = (isRecord(capability.input_schema) ? capability.input_schema : undefined)
            || (isRecord(capability.schemas?.request) ? capability.schemas.request : undefined);
        const output = (isRecord(capability.output_schema) ? capability.output_schema : undefined)
            || (isRecord(capability.schemas?.response) ? capability.schemas.response : undefined);
        const intents = Array.isArray(capability.intents) ? capability.intents : [];
        for (const intentDecl of intents) {
            if (typeof intentDecl === 'string' && intentDecl) {
                map[intentDecl] = { input, output };
                continue;
            }
            if (!isRecord(intentDecl) || typeof intentDecl.id !== 'string' || !intentDecl.id)
                continue;
            const intentInput = isRecord(intentDecl.input_schema) ? intentDecl.input_schema : input;
            const intentOutput = isRecord(intentDecl.output_schema) ? intentDecl.output_schema : output;
            map[intentDecl.id] = { input: intentInput, output: intentOutput };
        }
    }
    return map;
}
export class AgoraAgent {
    did;
    relay;
    signer;
    senderProfile;
    registrationProfile;
    defaultCapabilities;
    intentSchemas;
    constructor(options) {
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
    get sender() {
        return this.senderProfile;
    }
    async register(options = {}) {
        const payload = {
            agent: { ...this.senderProfile, ...this.registrationProfile },
            capabilities: options.capabilities ?? this.defaultCapabilities,
            status: options.status,
        };
        return this.relay.registerAgent(payload);
    }
    async sign(envelope) {
        return this.signer.sign(envelope);
    }
    async sendEnvelope(envelope) {
        const signed = await this.signer.sign(envelope);
        return this.relay.submitMessage(signed);
    }
    async sendRequest(payload, options) {
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
    async sendOffer(requestId, payload, options) {
        const envelope = MessageBuilder.offer(this.senderProfile, requestId, payload, options);
        return this.sendEnvelope(envelope);
    }
    async sendAccept(requestId, options) {
        const envelope = MessageBuilder.accept(this.senderProfile, requestId, options);
        return this.sendEnvelope(envelope);
    }
    async sendResult(requestId, payload, options) {
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
    async sendError(code, message, options) {
        const envelope = MessageBuilder.error(this.senderProfile, code, message, options);
        return this.sendEnvelope(envelope);
    }
    async onMessage(type, handler, options = {}) {
        for await (const batch of this.relay.subscribeMessages({ ...options, type })) {
            for (const envelope of batch) {
                await handler(envelope);
            }
        }
    }
    async onRequest(handler, options = {}) {
        return this.onMessage('REQUEST', async (envelope) => {
            const payload = envelope.payload || {};
            const intent = typeof payload.intent === 'string' ? payload.intent : null;
            const schema = intent ? this.intentSchemas[intent]?.input : undefined;
            if (schema) {
                const check = validateJsonSchema(schema, payload.params, 'payload.params');
                if (!check.ok) {
                    await this.sendError('REQUEST_SCHEMA_VALIDATION_FAILED', `Incoming request schema validation failed: ${check.errors.join('; ')}`, {
                        recipient: envelope.sender?.id,
                        thread: envelope.thread?.id,
                        details: {
                            request_id: payload.request_id || payload.requestId,
                            intent,
                            errors: check.errors,
                        },
                    });
                    return;
                }
            }
            await handler(envelope);
        }, options);
    }
    async onOffer(handler, options = {}) {
        return this.onMessage('OFFER', handler, options);
    }
    async onAccept(handler, options = {}) {
        return this.onMessage('ACCEPT', handler, options);
    }
    async onResult(handler, options = {}) {
        return this.onMessage('RESULT', handler, options);
    }
    async onEscrowDeposit(handler, options = {}) {
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
            if (onlyForPayee && escrow.payee && escrow.payee !== this.did)
                return;
            await handler(envelope, escrow);
        }, subscribe);
    }
}
//# sourceMappingURL=agent.js.map