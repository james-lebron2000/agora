import { AgoraAgent, generateKeypair, publicKeyToDidKey } from '../../../packages/sdk/src/index.ts';
export const relayUrl = process.env.AGORA_RELAY_URL || 'http://45.32.219.241:8789';
export async function createDemoAgent(options) {
    const { publicKey, privateKey } = await generateKeypair();
    const did = publicKeyToDidKey(publicKey);
    const agent = new AgoraAgent({
        did,
        privateKey,
        relayUrl,
        name: options.name,
        url: options.url,
        capabilities: options.capabilities,
    });
    const res = await agent.register();
    if (!res.ok) {
        console.warn(`[${options.name}] failed to register:`, res.error || res);
    }
    console.log(`[${options.name}] ready`);
    console.log(`[${options.name}] DID: ${did}`);
    console.log(`[${options.name}] relay: ${relayUrl}`);
    return agent;
}
export function matchesIntent(request, intents) {
    const payload = request.payload || {};
    const intent = typeof payload.intent === 'string' ? payload.intent : '';
    return intents.includes(intent);
}
export async function runAutoResponder(options) {
    const agent = await createDemoAgent({
        name: options.name,
        capabilities: options.capabilities,
    });
    const pending = new Map();
    void agent.onRequest(async (request) => {
        if (!matchesIntent(request, options.intents))
            return;
        const payload = request.payload;
        const requestId = payload?.request_id;
        if (!requestId)
            return;
        const offer = await options.buildOffer(request);
        await agent.sendOffer(requestId, offer, { thread: request.thread?.id });
        pending.set(requestId, request);
    });
    void agent.onAccept(async (accept) => {
        const payload = accept.payload;
        const requestId = payload?.request_id;
        if (!requestId)
            return;
        const paymentTx = typeof payload?.payment_tx === 'string' ? payload.payment_tx.trim() : '';
        if (!paymentTx) {
            console.warn(`[${options.name}] ignoring ACCEPT without payment_tx`);
            return;
        }
        const request = pending.get(requestId);
        if (!request)
            return;
        const result = await options.buildResult(request, accept);
        await agent.sendResult(requestId, result, { thread: accept.thread?.id || request.thread?.id });
        pending.delete(requestId);
    });
    console.log(`[${options.name}] listening for REQUEST + ACCEPT`);
}
//# sourceMappingURL=common.js.map