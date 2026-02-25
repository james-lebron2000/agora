import { setTimeout as sleep } from 'node:timers/promises';
import { AgoraAgent, generateKeypair, transferNative, transferUSDC, } from '../../../packages/sdk/src/index.ts';
const relayUrl = process.env.AGORA_RELAY_URL || 'http://127.0.0.1:8789';
const requestId = `req_base_pay_${Date.now()}`;
const intent = process.env.AGORA_PAYMENT_INTENT || 'translation.en_zh';
const paymentMode = (process.env.AGORA_PAYMENT_MODE || 'onchain').toLowerCase();
const network = (process.env.AGORA_PAYMENT_NETWORK || 'base-sepolia');
const rpcUrl = process.env.AGORA_PAYMENT_RPC_URL;
const paymentToken = (process.env.AGORA_PAYMENT_TOKEN || 'USDC').toUpperCase();
const amount = Number(process.env.AGORA_PAYMENT_AMOUNT
    || process.env.AGORA_PAYMENT_AMOUNT_USDC
    || (paymentToken === 'ETH' ? '0.0001' : '0.02'));
const buyerAddress = process.env.AGORA_PAYMENT_BUYER_ADDRESS;
const buyerPrivateKey = process.env.AGORA_PAYMENT_BUYER_PRIVATE_KEY;
const sellerAddress = process.env.AGORA_PAYMENT_SELLER_ADDRESS;
function fail(message) {
    throw new Error(`[payment-base] ${message}`);
}
function normalizeAddress(value, envName) {
    if (!value)
        fail(`${envName} is required`);
    const trimmed = value.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
        fail(`${envName} must be a valid 0x-prefixed EVM address`);
    }
    return trimmed.toLowerCase();
}
function normalizePrivateKey(value) {
    if (!value)
        fail('AGORA_PAYMENT_BUYER_PRIVATE_KEY is required');
    const trimmed = value.trim();
    if (!/^0x[a-fA-F0-9]{64}$/.test(trimmed)) {
        fail('AGORA_PAYMENT_BUYER_PRIVATE_KEY must be a valid 0x-prefixed private key');
    }
    return trimmed;
}
async function createAgent(name, intents, did) {
    const { privateKey } = await generateKeypair();
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
                    currency: paymentToken,
                    fixed_price: amount,
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
    const timeoutMs = options.timeoutMs ?? 45_000;
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
async function waitForPaymentVerification(options) {
    const deadline = Date.now() + (options.timeoutMs ?? 120_000);
    let attempts = 0;
    while (Date.now() < deadline) {
        attempts += 1;
        const verify = await options.agent.relay.verifyPayment({
            tx_hash: options.txHash,
            chain: options.chain,
            token: options.token,
            payer: options.payer,
            payee: options.payee,
            amount: options.amount,
        });
        if (verify.ok && verify.payment) {
            return { attempts, payment: verify.payment };
        }
        if (!verify.pending && verify.error && verify.error !== 'TX_NOT_FOUND') {
            fail(`payment verify failed: ${verify.error} ${verify.message || ''}`.trim());
        }
        await sleep(2000);
    }
    fail('payment verification timeout');
}
async function main() {
    const health = await fetch(`${relayUrl}/health`).then((r) => r.json()).catch(() => null);
    if (!health?.ok) {
        fail(`relay is unreachable at ${relayUrl}`);
    }
    if (paymentToken !== 'USDC' && paymentToken !== 'ETH') {
        fail('AGORA_PAYMENT_TOKEN must be USDC or ETH');
    }
    if (!Number.isFinite(amount) || amount <= 0) {
        fail('AGORA_PAYMENT_AMOUNT must be a positive number');
    }
    if (network !== 'base' && network !== 'base-sepolia') {
        fail('AGORA_PAYMENT_NETWORK must be base or base-sepolia');
    }
    const payer = normalizeAddress(buyerAddress || (paymentMode === 'synthetic' ? '0x1111111111111111111111111111111111111111' : undefined), 'AGORA_PAYMENT_BUYER_ADDRESS');
    const payee = normalizeAddress(sellerAddress || (paymentMode === 'synthetic' ? '0x2222222222222222222222222222222222222222' : undefined), 'AGORA_PAYMENT_SELLER_ADDRESS');
    const payerKey = paymentMode === 'onchain'
        ? normalizePrivateKey(buyerPrivateKey)
        : '0x0000000000000000000000000000000000000000000000000000000000000000';
    const requesterDid = `eip155:${network === 'base' ? 8453 : 84532}:${payer}`;
    const workerDid = `eip155:${network === 'base' ? 8453 : 84532}:${payee}`;
    const requester = await createAgent('Requester Base Payer', [intent], requesterDid);
    const worker = await createAgent('Worker Base Receiver', [intent], workerDid);
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
        title: 'Base USDC paid task',
        params: { text: 'Please translate this sentence to Chinese.' },
        constraints: { max_cost_usd: amount + 0.01 },
    }, { thread: requestId });
    const requestEvt = await onRequest;
    await worker.sendOffer(requestId, {
        plan: 'Translate EN to ZH and return concise output',
        price: { amount, currency: paymentToken },
        eta_seconds: 20,
    }, { thread: requestEvt.thread?.id || requestId });
    const offerEvt = await waitForMessage({
        agent: requester,
        since: startedAt,
        type: 'OFFER',
        requestId,
        senderId: worker.did,
    });
    const txHash = paymentMode === 'onchain'
        ? paymentToken === 'USDC'
            ? await transferUSDC({
                privateKey: payerKey,
                network,
                rpcUrl,
                recipient: payee,
                amount,
            })
            : await transferNative({
                privateKey: payerKey,
                network,
                rpcUrl,
                recipient: payee,
                amount,
            })
        : `relay:held:${requestId}`;
    const verifyBeforeAccept = await waitForPaymentVerification({
        agent: requester,
        txHash,
        payer,
        payee,
        amount,
        chain: network,
        token: paymentToken,
    });
    await requester.sendAccept(requestId, {
        thread: requestId,
        payment_tx: txHash,
        chain: network,
        token: paymentToken,
        terms: {
            offer_id: offerEvt.id,
            provider: payee,
            amount_usdc: paymentToken === 'USDC' ? amount : undefined,
            amount_eth: paymentToken === 'ETH' ? amount : undefined,
            amount,
            payer,
            payee,
            token: paymentToken,
            chain: network,
        },
    });
    await waitForMessage({
        agent: worker,
        since: startedAt,
        type: 'ACCEPT',
        requestId,
        senderId: requester.did,
    });
    const verifyAfterAccept = await worker.relay.verifyPayment({
        tx_hash: txHash,
        chain: network,
        token: paymentToken,
        payer,
        payee,
        amount,
    });
    if (!verifyAfterAccept.ok || !verifyAfterAccept.payment) {
        fail(`worker verify failed: ${verifyAfterAccept.error || 'unknown error'}`);
    }
    await worker.sendResult(requestId, {
        status: 'success',
        output: {
            translated_text: '请将这句话翻译成中文。',
        },
        metrics: {
            latency_ms: 1200,
            cost_actual: amount,
        },
    }, { thread: requestId });
    const resultEvt = await waitForMessage({
        agent: requester,
        since: startedAt,
        type: 'RESULT',
        requestId,
        senderId: worker.did,
    });
    console.log('[payment-base] pass');
    console.log(`[payment-base] mode=${paymentMode}`);
    console.log(`[payment-base] token=${paymentToken}`);
    console.log(`[payment-base] network=${network}`);
    console.log(`[payment-base] request_id=${requestId}`);
    console.log(`[payment-base] offer_id=${offerEvt.id}`);
    console.log(`[payment-base] tx_hash=${txHash}`);
    console.log(`[payment-base] verify_attempts=${verifyBeforeAccept.attempts}`);
    console.log(`[payment-base] verified_amount=${verifyAfterAccept.payment.amount}`);
    console.log(`[payment-base] confirmations=${verifyAfterAccept.payment.confirmations}`);
    console.log(`[payment-base] result_id=${resultEvt.id}`);
}
main().catch((err) => {
    console.error(err?.stack || err);
    process.exit(1);
});
//# sourceMappingURL=payment-publish-base.js.map