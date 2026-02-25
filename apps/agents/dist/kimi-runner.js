import { setTimeout as sleep } from 'node:timers/promises';
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AgoraAgent, generateKeypair, publicKeyToDidKey, } from '../../../packages/sdk/src/index.ts';
import { encodeRequestId, release as releaseOnchain, refund as refundOnchain, watchEscrowEvents, } from '../../../packages/sdk/src/escrow.ts';
const relayUrl = process.env.AGORA_RELAY_URL || 'http://45.32.219.241:8789';
const KIMI_API_KEY = process.env.MOONSHOT_API_KEY || process.env.KIMI_API_KEY;
const KIMI_BASE_URL = process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1';
const KIMI_MODEL = process.env.KIMI_MODEL || 'moonshot-v1-8k';
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const DEFAULT_MAX_CHARS = 8000;
const DEFAULT_RATE_PER_CHAR = 0.0001;
const DEFAULT_MIN_PRICE = 0.05;
const DEFAULT_ETA_SECONDS = 90;
const ESCROW_POLL_INTERVAL_MS = 1500;
const ESCROW_WAIT_TIMEOUT_MS = 120_000;
const readNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
const MAX_REQUESTS_PER_MINUTE = readNumber(process.env.AGORA_KIMI_RATE_LIMIT_PER_MINUTE, 60);
const MAX_CONCURRENCY = readNumber(process.env.AGORA_KIMI_MAX_CONCURRENCY, 2);
const ESCROW_MODE = (process.env.AGORA_ESCROW_MODE || 'relay').toLowerCase();
const ESCROW_NETWORK = (process.env.AGORA_ESCROW_NETWORK || 'base-sepolia');
const ESCROW_RPC_URL = process.env.AGORA_ESCROW_RPC_URL;
const ESCROW_RELAY_ENDPOINT = process.env.AGORA_ESCROW_RELAY_ENDPOINT || `${relayUrl}/v1/escrow/hold`;
const ESCROW_CONTRACT_ADDRESS = process.env.AGORA_ESCROW_CONTRACT_ADDRESS;
const ESCROW_SELLER_PRIVATE_KEY = process.env.AGORA_ESCROW_SELLER_PRIVATE_KEY;
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
export function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function getString(value) {
    if (typeof value !== 'string')
        return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
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
async function callKimiChat(options) {
    await options.rateLimiter.wait();
    const payload = {
        model: KIMI_MODEL,
        messages: [
            { role: 'system', content: options.system },
            { role: 'user', content: options.user },
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
                throw new Error('Kimi API returned empty response');
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
                console.warn(`[escrow] amount differs: expected ${options.expectedAmount}, got ${escrow.amount}`);
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
function readMaxCostUsd(payload) {
    const constraints = isRecord(payload.constraints) ? payload.constraints : undefined;
    const maxCost = typeof constraints?.max_cost_usd === 'number'
        ? Number(constraints.max_cost_usd)
        : typeof payload.max_cost_usd === 'number'
            ? Number(payload.max_cost_usd)
            : undefined;
    return Number.isFinite(maxCost) ? maxCost : undefined;
}
function formatPrice(value) {
    return Number(value.toFixed(6));
}
// === Feedback & Self-Improvement System ===
const MEMORY_DIR = join(process.cwd(), 'memory');
const FEEDBACK_FILE = join(MEMORY_DIR, 'feedback.json');
const IMPROVEMENTS_FILE = join(MEMORY_DIR, 'improvements.md');
function ensureMemoryDir() {
    if (!existsSync(MEMORY_DIR)) {
        mkdirSync(MEMORY_DIR, { recursive: true });
    }
}
function loadFeedbackStore() {
    ensureMemoryDir();
    if (!existsSync(FEEDBACK_FILE)) {
        return { totalRatings: 0, averageRating: 0, ratings: [], lastAnalyzed: new Date().toISOString() };
    }
    try {
        return JSON.parse(readFileSync(FEEDBACK_FILE, 'utf-8'));
    }
    catch {
        return { totalRatings: 0, averageRating: 0, ratings: [], lastAnalyzed: new Date().toISOString() };
    }
}
function saveFeedbackStore(store) {
    ensureMemoryDir();
    writeFileSync(FEEDBACK_FILE, JSON.stringify(store, null, 2));
}
function recordFeedback(record) {
    const store = loadFeedbackStore();
    store.ratings.push(record);
    store.totalRatings = store.ratings.length;
    store.averageRating = store.ratings.reduce((sum, r) => sum + r.rating, 0) / store.ratings.length;
    saveFeedbackStore(store);
    // If low rating, immediately analyze
    if (record.rating <= 3) {
        analyzeLowRating(record);
    }
    console.log(`[feedback] ⭐ ${record.rating}/5 recorded for ${record.requestId.slice(0, 8)}...`);
}
function analyzeLowRating(record) {
    const issues = record.issues || [];
    if (record.rating <= 2) {
        issues.push('Critical: User very dissatisfied');
    }
    const suggestion = generateImprovementSuggestion(record);
    // Append to improvements log
    const logEntry = `
## ${new Date().toISOString()} - ${record.agentName}
**Request:** ${record.requestId}
**Rating:** ${record.rating}/5
**Task:** ${record.taskSummary}
**Issues:** ${issues.join(', ') || 'None specified'}
**Suggestion:** ${suggestion}
---
`;
    ensureMemoryDir();
    writeFileSync(IMPROVEMENTS_FILE, logEntry, { flag: 'a' });
    console.log(`[feedback] ⚠️ Low rating detected. Improvement suggestion logged.`);
    console.log(`[feedback] 💡 Suggestion: ${suggestion}`);
}
function generateImprovementSuggestion(record) {
    if (record.rating <= 2) {
        return 'Consider adding more detailed validation steps and clearer error messages. Review the task requirements more carefully.';
    }
    else if (record.rating === 3) {
        return 'Output was acceptable but could be more thorough. Consider expanding the analysis depth or providing more actionable insights.';
    }
    return 'Good performance. Minor refinements to response structure may help.';
}
function getRecentFeedbackSummary(agentName, limit = 5) {
    const store = loadFeedbackStore();
    const recent = store.ratings
        .filter(r => r.agentName === agentName)
        .slice(-limit);
    if (recent.length === 0)
        return 'No recent feedback.';
    const avg = recent.reduce((sum, r) => sum + r.rating, 0) / recent.length;
    return `Last ${recent.length} ratings avg: ${avg.toFixed(1)}/5. Latest: ${recent[recent.length - 1].rating}/5`;
}
// === End Feedback System ===
export async function runKimiAgent(config) {
    if (!KIMI_API_KEY) {
        throw new Error('Kimi API key missing');
    }
    const { publicKey, privateKey } = await generateKeypair();
    const did = publicKeyToDidKey(publicKey);
    const agent = new AgoraAgent({
        did,
        privateKey,
        relayUrl,
        name: config.name,
        capabilities: config.capabilities,
    });
    const registerRes = await agent.register();
    if (!registerRes.ok) {
        console.warn(`[${config.name}] failed to register:`, registerRes.error || registerRes);
    }
    console.log(`[${config.name}] ready`);
    console.log(`[${config.name}] DID: ${did}`);
    console.log(`[${config.name}] relay: ${relayUrl}`);
    const pending = new Map();
    const rateLimiter = new RateLimiter(MAX_REQUESTS_PER_MINUTE, 60_000);
    const semaphore = new Semaphore(MAX_CONCURRENCY);
    void agent.onRequest(async (request) => {
        const payload = isRecord(request.payload) ? request.payload : undefined;
        const intent = getString(payload?.intent);
        if (!intent || !config.intents.includes(intent))
            return;
        const requestId = getString(payload?.request_id);
        if (!requestId)
            return;
        const params = isRecord(payload?.params) ? payload?.params : {};
        const parsed = config.parseParams(params);
        if (!parsed) {
            await agent.sendError('INVALID_REQUEST', 'Missing or invalid parameters', {
                recipient: request.sender?.id,
                thread: request.thread?.id,
                details: { request_id: requestId },
            });
            return;
        }
        const input = config.extractInput(parsed);
        if (!input) {
            await agent.sendError('INVALID_REQUEST', 'Missing input content', {
                recipient: request.sender?.id,
                thread: request.thread?.id,
                details: { request_id: requestId },
            });
            return;
        }
        const charCount = countCharacters(input);
        const maxChars = config.maxChars ?? DEFAULT_MAX_CHARS;
        if (charCount > maxChars) {
            await agent.sendError('INVALID_REQUEST', `Input exceeds max length (${maxChars} chars)`, {
                recipient: request.sender?.id,
                thread: request.thread?.id,
                details: { request_id: requestId, length: charCount, max: maxChars },
            });
            return;
        }
        let price = typeof config.fixedPrice === 'number'
            ? config.fixedPrice
            : charCount * (config.pricePerChar ?? DEFAULT_RATE_PER_CHAR);
        const minPrice = config.minPrice ?? DEFAULT_MIN_PRICE;
        price = Math.max(price, minPrice);
        price = formatPrice(price);
        const maxCost = readMaxCostUsd(payload);
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
        const task = {
            request,
            requestId,
            params: parsed,
            input,
            price,
            charCount,
        };
        const eta = typeof config.etaSeconds === 'function'
            ? config.etaSeconds(task)
            : config.etaSeconds ?? DEFAULT_ETA_SECONDS;
        const offerPayload = {
            plan: config.buildPlan(task),
            price: { amount: price, currency: 'USDC' },
            price_usd: price,
            eta_seconds: eta,
            escrow: {
                mode: ESCROW_MODE,
                address: ESCROW_MODE === 'relay' ? ESCROW_RELAY_ENDPOINT : ESCROW_CONTRACT_ADDRESS,
                network: ESCROW_NETWORK,
                request_id: requestId,
                amount: price,
                currency: 'USDC',
                payee: did,
            },
            ...(config.buildOfferExtras ? config.buildOfferExtras(task) : {}),
        };
        await agent.sendOffer(requestId, offerPayload, { thread: request.thread?.id });
        pending.set(requestId, task);
    });
    void agent.onAccept(async (accept) => {
        const payload = isRecord(accept.payload) ? accept.payload : undefined;
        const requestId = getString(payload?.request_id);
        if (!requestId)
            return;
        const task = pending.get(requestId);
        if (!task)
            return;
        const releaseSemaphore = await semaphore.acquire();
        const start = Date.now();
        try {
            const payer = task.request.sender?.id;
            await waitForEscrowDeposit({
                agent,
                requestId,
                expectedAmount: task.price,
                expectedPayer: payer,
                expectedPayee: did,
            });
            const prompt = config.buildPrompt(task);
            const content = await callKimiChat({
                system: prompt.system,
                user: prompt.user,
                rateLimiter,
            });
            await releaseEscrow(agent, requestId, 'success');
            await agent.sendResult(requestId, {
                status: 'success',
                output: config.formatOutput(content, task),
                metrics: {
                    latency_ms: Date.now() - start,
                    cost_actual: task.price,
                },
            }, { thread: accept.thread?.id || task.request.thread?.id });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`[${config.name}] request ${requestId} failed:`, message);
            try {
                await releaseEscrow(agent, requestId, 'refund');
            }
            catch (releaseErr) {
                console.error(`[${config.name}] escrow refund failed for ${requestId}:`, releaseErr);
            }
            await agent.sendResult(requestId, {
                status: 'failed',
                output: { error: message },
                metrics: { latency_ms: Date.now() - start },
            }, { thread: accept.thread?.id || task.request.thread?.id });
        }
        finally {
            releaseSemaphore();
            pending.delete(requestId);
        }
    });
    // Listen for feedback/rating messages
    void agent.onRating?.(async (rating) => {
        const payload = isRecord(rating.payload) ? rating.payload : undefined;
        const requestId = getString(payload?.request_id);
        if (!requestId)
            return;
        const ratingValue = typeof payload?.rating === 'number' ? payload.rating : undefined;
        const comment = getString(payload?.comment);
        const issues = Array.isArray(payload?.issues) ? payload.issues.filter((i) => typeof i === 'string') : undefined;
        if (!ratingValue) {
            console.log(`[${config.name}] received rating without score for ${requestId.slice(0, 8)}...`);
            return;
        }
        // Record the feedback
        recordFeedback({
            requestId,
            agentName: config.name,
            timestamp: new Date().toISOString(),
            rating: ratingValue,
            comment,
            taskSummary: 'Completed task', // Could be enhanced to store task details
            outputQuality: ratingValue >= 4 ? 'excellent' : ratingValue >= 3 ? 'good' : ratingValue >= 2 ? 'fair' : 'poor',
            issues,
        });
        // Log summary periodically
        if (Math.random() < 0.2) { // 20% chance to show summary
            console.log(`[${config.name}] ${getRecentFeedbackSummary(config.name)}`);
        }
    });
    console.log(`[${config.name}] listening for REQUEST + ACCEPT + RATING`);
    console.log(`[${config.name}] feedback system active. Low ratings will trigger auto-improvement analysis.`);
}
//# sourceMappingURL=kimi-runner.js.map