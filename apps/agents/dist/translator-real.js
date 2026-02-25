import { setTimeout as sleep } from 'node:timers/promises';
import { AgoraAgent, generateKeypair, publicKeyToDidKey, } from '../../../packages/sdk/src/index.ts';
import { encodeRequestId, release as releaseOnchain, refund as refundOnchain, watchEscrowEvents, } from '../../../packages/sdk/src/escrow.ts';
const relayUrl = process.env.AGORA_RELAY_URL || 'http://45.32.219.241:8789';
const KIMI_API_KEY = process.env.MOONSHOT_API_KEY
    || process.env.KIMI_API_KEY;
const KIMI_BASE_URL = process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1';
const KIMI_MODEL = process.env.KIMI_MODEL || 'moonshot-v1-8k';
const MAX_CHARS = 4000;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const PRICE_PER_CHAR = 0.001;
const ESCROW_POLL_INTERVAL_MS = 1500;
const ESCROW_WAIT_TIMEOUT_MS = 120_000;
const readNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
const MAX_REQUESTS_PER_MINUTE = readNumber(process.env.POLYGLOT_RATE_LIMIT_PER_MINUTE, 60);
const MAX_CONCURRENT_TRANSLATIONS = readNumber(process.env.POLYGLOT_MAX_CONCURRENCY, 2);
const ESCROW_MODE = (process.env.AGORA_ESCROW_MODE || 'relay').toLowerCase();
const ESCROW_NETWORK = (process.env.AGORA_ESCROW_NETWORK || 'base-sepolia');
const ESCROW_RPC_URL = process.env.AGORA_ESCROW_RPC_URL;
const ESCROW_RELAY_ENDPOINT = process.env.AGORA_ESCROW_RELAY_ENDPOINT || `${relayUrl}/v1/escrow/hold`;
const ESCROW_CONTRACT_ADDRESS = process.env.AGORA_ESCROW_CONTRACT_ADDRESS;
const ESCROW_SELLER_PRIVATE_KEY = process.env.AGORA_ESCROW_SELLER_PRIVATE_KEY;
const intents = ['translate', 'translation', 'localization'];
const agentName = 'Polyglot Pro';
const supportedLanguages = [
    { code: 'en', label: 'English', aliases: ['en', 'english'] },
    { code: 'zh', label: 'Chinese (Simplified)', aliases: ['zh', 'zh-cn', 'cn', 'chinese', 'chinese simplified'] },
    { code: 'ja', label: 'Japanese', aliases: ['ja', 'jp', 'japanese'] },
    { code: 'ko', label: 'Korean', aliases: ['ko', 'kr', 'korean'] },
    { code: 'fr', label: 'French', aliases: ['fr', 'french'] },
    { code: 'es', label: 'Spanish', aliases: ['es', 'spanish'] },
    { code: 'de', label: 'German', aliases: ['de', 'german'] },
];
const supportedLanguageCodes = supportedLanguages.map((lang) => lang.code);
const reputationSeed = {
    total_orders_delta: readNumber(process.env.POLYGLOT_REP_TOTAL, 1),
    success_orders_delta: readNumber(process.env.POLYGLOT_REP_SUCCESS, 1),
    on_time_orders_delta: readNumber(process.env.POLYGLOT_REP_ON_TIME, 1),
    rating: readNumber(process.env.POLYGLOT_REP_RATING, 5),
    response_time_ms: readNumber(process.env.POLYGLOT_REP_RESPONSE_MS, 1200),
};
const capabilities = [
    {
        id: 'cap_polyglot_translation_v1',
        name: 'Polyglot Translation (Kimi)',
        description: 'High-quality translation with Moonshot Kimi API.',
        version: '1.0.0',
        intents: intents.map((id) => ({ id, name: id })),
        pricing: {
            model: 'metered',
            currency: 'USDC',
            metered_unit: 'character',
            metered_rate: PRICE_PER_CHAR,
        },
        supported_languages: supportedLanguageCodes,
        reputation_seed: reputationSeed,
    },
];
class RateLimiter {
    max;
    windowMs;
    timestamps = [];
    constructor(max, windowMs) {
        this.max = max;
        this.windowMs = windowMs;
    }
    async wait() {
        if (this.max <= 0)
            return;
        while (true) {
            const now = Date.now();
            this.timestamps = this.timestamps.filter((ts) => now - ts < this.windowMs);
            if (this.timestamps.length < this.max) {
                this.timestamps.push(now);
                return;
            }
            const earliest = this.timestamps[0];
            const waitMs = Math.max(this.windowMs - (now - earliest), 50);
            await sleep(waitMs);
        }
    }
}
class Semaphore {
    max;
    current = 0;
    queue = [];
    constructor(max) {
        this.max = max;
    }
    async acquire() {
        if (this.max <= 0)
            return () => { };
        if (this.current < this.max) {
            this.current += 1;
            return () => this.release();
        }
        return new Promise((resolve) => {
            this.queue.push(() => {
                this.current += 1;
                resolve(() => this.release());
            });
        });
    }
    release() {
        this.current = Math.max(0, this.current - 1);
        const next = this.queue.shift();
        if (next)
            next();
    }
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function getString(value) {
    if (typeof value !== 'string')
        return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}
function normalizeLanguage(input) {
    if (!input)
        return undefined;
    const normalized = input.trim().toLowerCase();
    for (const lang of supportedLanguages) {
        if (lang.code === normalized || lang.aliases.includes(normalized)) {
            return { code: lang.code, label: lang.label };
        }
    }
    return undefined;
}
function readLanguage(params, keys) {
    for (const key of keys) {
        const value = getString(params[key]);
        const lang = normalizeLanguage(value);
        if (lang)
            return lang;
    }
    return undefined;
}
function countCharacters(text) {
    return Array.from(text).length;
}
async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        return response;
    }
    finally {
        clearTimeout(timeout);
    }
}
async function callKimiTranslator(options) {
    await options.rateLimiter.wait();
    const systemPrompt = 'You are a professional translator. Preserve tone, formatting, and proper nouns. Return only the translated text.';
    const sourceLabel = options.sourceLang ? options.sourceLang.label : 'auto-detect';
    const userPrompt = `Translate from ${sourceLabel} to ${options.targetLang.label}.\n\nText:\n${options.text}`;
    const payload = {
        model: KIMI_MODEL,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
    };
    let lastError;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
        try {
            const response = await fetchWithTimeout(`${KIMI_BASE_URL}/chat/completions`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${KIMI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            }, REQUEST_TIMEOUT_MS);
            if (!response.ok) {
                const detail = await response.text();
                throw new Error(`Kimi API error ${response.status}: ${detail}`);
            }
            const data = await response.json();
            const content = data.choices?.[0]?.message?.content?.trim();
            if (!content) {
                throw new Error('Kimi API returned empty translation');
            }
            return content;
        }
        catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            if (attempt < MAX_RETRIES) {
                const backoff = 300 * attempt + Math.floor(Math.random() * 200);
                await sleep(backoff);
            }
        }
    }
    throw lastError ?? new Error('Unknown Kimi API error');
}
async function waitForEscrowDeposit(options) {
    if (ESCROW_MODE === 'onchain') {
        const requestHash = encodeRequestId(options.requestId);
        return new Promise((resolve, reject) => {
            if (!ESCROW_RPC_URL || !ESCROW_CONTRACT_ADDRESS) {
                reject(new Error('Escrow RPC URL and contract address are required for onchain escrow mode'));
                return;
            }
            let settled = false;
            const stop = watchEscrowEvents({
                network: ESCROW_NETWORK,
                rpcUrl: ESCROW_RPC_URL,
                escrowAddress: ESCROW_CONTRACT_ADDRESS,
                requestId: requestHash,
                onDeposited: (log) => {
                    settled = true;
                    stop();
                    clearTimeout(timeout);
                    resolve({
                        request_id: options.requestId,
                        payer: log.buyer,
                        payee: log.seller,
                        amount: Number(log.amount),
                        currency: 'USDC',
                        fee_bps: 0,
                        status: 'HELD',
                    });
                },
            });
            const timeout = setTimeout(() => {
                if (settled)
                    return;
                stop();
                reject(new Error('Escrow deposit timeout'));
            }, ESCROW_WAIT_TIMEOUT_MS);
        });
    }
    const deadline = Date.now() + ESCROW_WAIT_TIMEOUT_MS;
    while (Date.now() < deadline) {
        const res = await options.agent.relay.getEscrow(options.requestId);
        if (res.ok && res.escrow?.status === 'HELD') {
            const escrow = res.escrow;
            if (options.expectedPayee && escrow.payee !== options.expectedPayee) {
                throw new Error(`Escrow payee mismatch: expected ${options.expectedPayee}, got ${escrow.payee}`);
            }
            if (options.expectedPayer && escrow.payer !== options.expectedPayer) {
                throw new Error(`Escrow payer mismatch: expected ${options.expectedPayer}, got ${escrow.payer}`);
            }
            if (Math.abs(escrow.amount - options.expectedAmount) > 0.000001) {
                console.warn(`[${agentName}] escrow amount differs: expected ${options.expectedAmount}, got ${escrow.amount}`);
            }
            return escrow;
        }
        await sleep(ESCROW_POLL_INTERVAL_MS);
    }
    throw new Error('Escrow deposit timeout');
}
async function releaseEscrow(agent, requestId, resolution) {
    if (ESCROW_MODE === 'onchain') {
        if (!ESCROW_RPC_URL || !ESCROW_CONTRACT_ADDRESS || !ESCROW_SELLER_PRIVATE_KEY) {
            throw new Error('Onchain escrow release requires RPC URL, contract address, and seller private key');
        }
        if (resolution === 'refund') {
            await refundOnchain({
                requestId,
                network: ESCROW_NETWORK,
                rpcUrl: ESCROW_RPC_URL,
                escrowAddress: ESCROW_CONTRACT_ADDRESS,
                privateKey: ESCROW_SELLER_PRIVATE_KEY,
            });
        }
        else {
            await releaseOnchain({
                requestId,
                network: ESCROW_NETWORK,
                rpcUrl: ESCROW_RPC_URL,
                escrowAddress: ESCROW_CONTRACT_ADDRESS,
                privateKey: ESCROW_SELLER_PRIVATE_KEY,
            });
        }
        return undefined;
    }
    const res = await agent.relay.releaseEscrow({ request_id: requestId, resolution });
    if (!res.ok) {
        throw new Error(res.error || 'Failed to release escrow');
    }
    return res.escrow;
}
async function main() {
    if (!KIMI_API_KEY) {
        throw new Error('Kimi API key missing');
    }
    const { publicKey, privateKey } = await generateKeypair();
    const did = publicKeyToDidKey(publicKey);
    const agent = new AgoraAgent({
        did,
        privateKey,
        relayUrl,
        name: agentName,
        capabilities,
    });
    const registerRes = await agent.register();
    if (!registerRes.ok) {
        console.warn(`[${agentName}] failed to register:`, registerRes.error || registerRes);
    }
    const repRes = await agent.relay.submitReputation({
        agent_id: did,
        ...reputationSeed,
    });
    if (!repRes.ok) {
        console.warn(`[${agentName}] failed to seed reputation:`, repRes.error || repRes);
    }
    console.log(`[${agentName}] ready`);
    console.log(`[${agentName}] DID: ${did}`);
    console.log(`[${agentName}] relay: ${relayUrl}`);
    const pending = new Map();
    const rateLimiter = new RateLimiter(MAX_REQUESTS_PER_MINUTE, 60_000);
    const semaphore = new Semaphore(MAX_CONCURRENT_TRANSLATIONS);
    void agent.onRequest(async (request) => {
        const payload = isRecord(request.payload) ? request.payload : undefined;
        const intent = getString(payload?.intent);
        if (!intent || !intents.includes(intent))
            return;
        const requestId = getString(payload?.request_id);
        if (!requestId)
            return;
        const params = isRecord(payload?.params) ? payload?.params : {};
        const text = getString(params?.text);
        if (!text) {
            await agent.sendError('INVALID_REQUEST', 'Missing text parameter', {
                recipient: request.sender?.id,
                thread: request.thread?.id,
                details: { request_id: requestId },
            });
            return;
        }
        const targetLang = readLanguage(params, ['target', 'target_lang', 'to']);
        if (!targetLang) {
            await agent.sendError('INVALID_REQUEST', 'Missing or unsupported target language', {
                recipient: request.sender?.id,
                thread: request.thread?.id,
                details: { request_id: requestId, supported: supportedLanguageCodes },
            });
            return;
        }
        const sourceLang = readLanguage(params, ['source', 'source_lang', 'from']);
        const charCount = countCharacters(text);
        if (charCount > MAX_CHARS) {
            await agent.sendError('INVALID_REQUEST', `Text exceeds max length (${MAX_CHARS} chars)`, {
                recipient: request.sender?.id,
                thread: request.thread?.id,
                details: { request_id: requestId, length: charCount, max: MAX_CHARS },
            });
            return;
        }
        const price = Number((charCount * PRICE_PER_CHAR).toFixed(6));
        const constraints = isRecord(payload?.constraints) ? payload?.constraints : undefined;
        const maxCost = typeof constraints?.max_cost_usd === 'number'
            ? Number(constraints.max_cost_usd)
            : undefined;
        if (typeof maxCost === 'number' && price > maxCost) {
            await agent.sendError('INSUFFICIENT_BUDGET', 'Budget below required price', {
                recipient: request.sender?.id,
                thread: request.thread?.id,
                details: { request_id: requestId, price, max_cost_usd: maxCost },
            });
            return;
        }
        if (ESCROW_MODE === 'onchain' && !ESCROW_CONTRACT_ADDRESS) {
            await agent.sendError('UNAVAILABLE', 'Escrow contract address not configured', {
                recipient: request.sender?.id,
                thread: request.thread?.id,
                details: { request_id: requestId },
            });
            return;
        }
        const offerPayload = {
            plan: `Translate ${sourceLang ? sourceLang.label : 'auto-detect'} → ${targetLang.label} with Kimi.`,
            price: { amount: price, currency: 'USDC' },
            eta_seconds: 30,
            escrow: {
                mode: ESCROW_MODE,
                address: ESCROW_MODE === 'relay' ? ESCROW_RELAY_ENDPOINT : ESCROW_CONTRACT_ADDRESS,
                network: ESCROW_NETWORK,
                request_id: requestId,
                amount: price,
                currency: 'USDC',
                payee: did,
            },
            supported_languages: supportedLanguageCodes,
        };
        await agent.sendOffer(requestId, offerPayload, { thread: request.thread?.id });
        pending.set(requestId, {
            request,
            requestId,
            text,
            sourceLang,
            targetLang,
            charCount,
            price,
        });
    });
    void agent.onAccept(async (accept) => {
        const payload = isRecord(accept.payload) ? accept.payload : undefined;
        const requestId = getString(payload?.request_id);
        if (!requestId)
            return;
        const entry = pending.get(requestId);
        if (!entry)
            return;
        const releaseSemaphore = await semaphore.acquire();
        const start = Date.now();
        try {
            const payer = entry.request.sender?.id;
            await waitForEscrowDeposit({
                agent,
                requestId,
                expectedAmount: entry.price,
                expectedPayer: payer,
                expectedPayee: did,
            });
            const translation = await callKimiTranslator({
                text: entry.text,
                sourceLang: entry.sourceLang,
                targetLang: entry.targetLang,
                rateLimiter,
            });
            await releaseEscrow(agent, requestId, 'success');
            await agent.sendResult(requestId, {
                status: 'success',
                output: {
                    translation,
                    source_language: entry.sourceLang?.code || 'auto',
                    target_language: entry.targetLang.code,
                    characters: entry.charCount,
                },
                metrics: {
                    latency_ms: Date.now() - start,
                    cost_actual: entry.price,
                },
            }, { thread: accept.thread?.id || entry.request.thread?.id });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`[${agentName}] request ${requestId} failed:`, message);
            try {
                await releaseEscrow(agent, requestId, 'refund');
            }
            catch (releaseErr) {
                console.error(`[${agentName}] escrow refund failed for ${requestId}:`, releaseErr);
            }
            await agent.sendResult(requestId, {
                status: 'failed',
                output: { error: message },
                metrics: { latency_ms: Date.now() - start },
            }, { thread: accept.thread?.id || entry.request.thread?.id });
        }
        finally {
            releaseSemaphore();
            pending.delete(requestId);
        }
    });
    console.log(`[${agentName}] listening for REQUEST + ACCEPT`);
}
main().catch((err) => {
    console.error(`[${agentName}] fatal error:`, err);
    process.exit(1);
});
//# sourceMappingURL=translator-real.js.map