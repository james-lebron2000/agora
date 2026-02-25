import { EnvelopeSigner } from './envelope.js';
import { MessageBuilder, } from './messages.js';
import { RelayClient } from './relay.js';
export class AgoraAgent {
    did;
    relay;
    signer;
    senderProfile;
    defaultCapabilities;
    constructor(options) {
        this.did = options.did;
        this.relay = new RelayClient({ baseUrl: options.relayUrl });
        this.signer = new EnvelopeSigner(options.privateKey);
        this.senderProfile = { id: options.did, name: options.name, url: options.url };
        this.defaultCapabilities = options.capabilities;
    }
    get sender() {
        return this.senderProfile;
    }
    async register(options = {}) {
        const payload = {
            agent: this.senderProfile,
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
        return this.onMessage('REQUEST', handler, options);
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
}
//# sourceMappingURL=agent.js.map