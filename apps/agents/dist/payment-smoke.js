import { setTimeout as sleep } from 'node:timers/promises';
import { AgoraAgent, generateKeypair, publicKeyToDidKey, } from '../../../packages/sdk/src/index.ts';
const relayUrl = process.env.AGORA_RELAY_URL || 'http://127.0.0.1:8789';
const requestId = `req_payment_smoke_${Date.now()}`;
const intent = 'translation.en_zh';
const amountUsdc = 1.25;
function fail(message) {
    throw new Error(`[payment-smoke] ${message}`);
}
async function createAgent(name, intents) {
    const { publicKey, privateKey } = await generateKeypair();
    const did = publicKeyToDidKey(publicKey);
    const agent = new AgoraAgent({
        did,
        privateKey,
        relayUrl,
        name,
        capabilities: [
            {
                id: `cap_${name.toLowerCase().replace(/\s+/g, '_')}`,
                name,
                intents: intents.map((id) => ({ id, name: id })),
                pricing: {
                    model: 'fixed',
                    currency: 'USDC',
                    fixed_price: amountUsdc,
                },
            },
        ],
    });
    const reg = await agent.register();
    if (!reg.ok)
        fail(`failed to register ${name}: ${reg.error || 'unknown error'}`);
    return agent;
}
async function waitForMessage(options) {
    const timeoutMs = options.timeoutMs ?? 30_000;
    const deadline = Date.now() + timeoutMs;
    let cursor = options.since;
    while (Date.now() < deadline) {
        const res = await options.agent.relay.getMessages({
            since: cursor,
            type: options.type,
            timeout: 1,
        });
        if (res.ok) {
            for (const evt of res.events) {
                cursor = evt.ts || cursor;
                const reqId = evt.payload?.request_id;
                if (reqId !== options.requestId)
                    continue;
                if (options.senderId && evt.sender?.id !== options.senderId)
                    continue;
                return evt;
            }
        }
        await sleep(300);
    }
    fail(`timeout waiting for ${options.type}`);
}
async function main() {
    const health = await fetch(`${relayUrl}/health`).then((r) => r.json()).catch(() => null);
    if (!health?.ok) {
        fail(`relay is unreachable at ${relayUrl}`);
    }
    const requester = await createAgent('Requester', [intent]);
    const worker = await createAgent('Worker', [intent]);
    const startedAt = new Date().toISOString();
    const onRequest = waitForMessage({
        agent: worker,
        since: startedAt,
        type: 'REQUEST',
        requestId,
        senderId: requester.did,
    });
    await requester.sendRequest({
        request_id: requestId,
        intent,
        title: 'Payment smoke translation task',
        params: { text: 'Hello Agora' },
        constraints: { max_cost_usd: amountUsdc + 0.1 },
    }, { thread: requestId });
    const requestEvt = await onRequest;
    await worker.sendOffer(requestId, {
        plan: 'Translate EN to ZH',
        price: { amount: amountUsdc, currency: 'USDC' },
        eta_seconds: 10,
    }, { thread: requestEvt.thread?.id || requestId });
    const offerEvt = await waitForMessage({
        agent: requester,
        since: startedAt,
        type: 'OFFER',
        requestId,
        senderId: worker.did,
    });
    const hold = await requester.relay.holdEscrow({
        request_id: requestId,
        payer: requester.did,
        payee: worker.did,
        amount: amountUsdc,
        currency: 'USDC',
    });
    if (!hold.ok || !hold.escrow) {
        fail(`hold escrow failed: ${hold.error || 'unknown error'}`);
    }
    await requester.sendAccept(requestId, {
        thread: requestId,
        payment_tx: `relay:held:${requestId}`,
        terms: {
            offer_id: offerEvt.id,
            amount_usdc: amountUsdc,
        },
    });
    await waitForMessage({
        agent: worker,
        since: startedAt,
        type: 'ACCEPT',
        requestId,
        senderId: requester.did,
    });
    await worker.sendResult(requestId, {
        status: 'success',
        output: {
            translated_text: '你好 Agora',
        },
        metrics: {
            latency_ms: 900,
            cost_actual: amountUsdc,
        },
    }, { thread: requestId });
    const released = await worker.relay.releaseEscrow({ request_id: requestId, resolution: 'success' });
    if (!released.ok || !released.escrow) {
        fail(`release escrow failed: ${released.error || 'unknown error'}`);
    }
    const sellerLedger = await worker.relay.getLedgerAccount(worker.did);
    if (!sellerLedger.ok || !sellerLedger.account) {
        fail(`seller ledger unavailable: ${sellerLedger.error || 'unknown error'}`);
    }
    const expectedPayout = Number((amountUsdc * 0.9).toFixed(6));
    if (Math.abs(sellerLedger.account.balance - expectedPayout) > 0.000001) {
        fail(`unexpected seller payout: got ${sellerLedger.account.balance}, expected ${expectedPayout}`);
    }
    const resultEvt = await waitForMessage({
        agent: requester,
        since: startedAt,
        type: 'RESULT',
        requestId,
        senderId: worker.did,
    });
    console.log('[payment-smoke] pass');
    console.log(`[payment-smoke] request_id=${requestId}`);
    console.log(`[payment-smoke] offer_id=${offerEvt.id}`);
    console.log(`[payment-smoke] result_id=${resultEvt.id}`);
    console.log(`[payment-smoke] escrow_status=${released.escrow.status}`);
    console.log(`[payment-smoke] seller_balance=${sellerLedger.account.balance}`);
}
main().catch((err) => {
    console.error(err?.stack || err);
    process.exit(1);
});
//# sourceMappingURL=payment-smoke.js.map