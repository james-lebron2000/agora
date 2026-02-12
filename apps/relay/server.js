import express from 'express';
import cors from 'cors';
import { createHash } from 'node:crypto';
import { createStorage } from './storage.js';
import { createUsdcPaymentVerifier } from './paymentVerifier.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    const isLongPollRoute = req.method === 'GET' && (req.path === '/v1/messages' || req.path === '/events');
    const sample = {
      sample_id: `ops_http_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'http',
      ts: new Date().toISOString(),
      method: req.method,
      path: req.path,
      long_poll: isLongPollRoute,
      status_code: Number(res.statusCode),
      latency_ms: Date.now() - startedAt,
    };
    opsHttpSamples.push(sample);
    const cutoffTs = Date.now() - OPS_HTTP_WINDOW_MS;
    while (opsHttpSamples.length > 0) {
      const headTs = Date.parse(opsHttpSamples[0]?.ts || '');
      if (!Number.isFinite(headTs) || headTs >= cutoffTs) break;
      opsHttpSamples.shift();
    }
    void storage.saveOpsMetricSample(sample).catch(() => {});
  });
  next();
});

// In-memory ring buffer for demo purposes.
const MAX_EVENTS = Number(process.env.MAX_EVENTS || 500);
const events = [];

// In-memory agent registry for discovery (MVP).
const AGENT_TTL_MS = Number(process.env.AGENT_TTL_MS || 5 * 60 * 1000);
const agents = new Map();
const requestIndex = new Map();
const requesterHistory = new Map();

const storage = await createStorage({ databaseUrl: process.env.DATABASE_URL });
const REQUIRE_ACCEPT_PAYMENT_VERIFY = ['1', 'true', 'yes', 'required']
  .includes(String(process.env.AGORA_REQUIRE_PAYMENT_VERIFY || '').toLowerCase());
const REQUIRE_INTENT_SCHEMAS = ['1', 'true', 'yes', 'required']
  .includes(String(process.env.AGORA_REQUIRE_INTENT_SCHEMAS || '').toLowerCase());
const ENABLE_SANDBOX_EXECUTE = !['0', 'false', 'off', 'disabled']
  .includes(String(process.env.AGORA_ENABLE_SANDBOX_EXECUTE || '1').toLowerCase());
const SANDBOX_RUNNER_URL = String(process.env.AGORA_SANDBOX_RUNNER_URL || 'http://127.0.0.1:8790').replace(/\/$/, '');
const SANDBOX_EXECUTE_TIMEOUT_MS = Math.min(
  Number(process.env.AGORA_SANDBOX_EXECUTE_TIMEOUT_MS || 45_000),
  120_000,
);
const EXECUTE_AGENT_ALLOWLIST = new Set(
  String(process.env.AGORA_SANDBOX_AGENT_ALLOWLIST || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
);
const PLATFORM_FEE_BPS = Math.max(0, Number(process.env.AGORA_PLATFORM_FEE_BPS || 1000));
const COMPENSATION_POLL_MS = Math.max(500, Number(process.env.AGORA_COMPENSATION_POLL_MS || 30_000));
const ORDER_TIMEOUT_MS = Math.max(1_000, Number(process.env.AGORA_ORDER_TIMEOUT_MS || 30 * 60 * 1000));
const OPS_HTTP_WINDOW_MS = Math.max(60_000, Number(process.env.AGORA_OPS_HTTP_WINDOW_MS || 24 * 60 * 60 * 1000));
const OPS_ALERT_PAYMENT_SUCCESS_THRESHOLD = Number(process.env.AGORA_ALERT_PAYMENT_SUCCESS_THRESHOLD || 0.95);
const OPS_ALERT_HTTP_5XX_THRESHOLD = Number(process.env.AGORA_ALERT_HTTP_5XX_THRESHOLD || 0.02);
const OPS_ALERT_RECON_DIFF_THRESHOLD = Number(process.env.AGORA_ALERT_RECON_DIFF_THRESHOLD || 0);
const OPS_ADMIN_TOKEN = String(process.env.AGORA_OPS_ADMIN_TOKEN || '').trim();
const PAYMENT_ALLOWED_TOKENS = new Set(
  String(process.env.AGORA_PAYMENT_ALLOWED_TOKENS || 'USDC,ETH')
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean),
);
const PAYMENT_ALLOWED_NETWORKS = new Set(
  String(process.env.AGORA_PAYMENT_ALLOWED_NETWORKS || 'base,base-sepolia')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean),
);
const PAYMENT_RULES = {
  USDC: {
    min: Number(process.env.AGORA_PAYMENT_MIN_USDC || 0.01),
    max: Number(process.env.AGORA_PAYMENT_MAX_USDC || 10000),
    decimals: Number(process.env.AGORA_PAYMENT_USDC_DECIMALS || 6),
  },
  ETH: {
    min: Number(process.env.AGORA_PAYMENT_MIN_ETH || 0.00001),
    max: Number(process.env.AGORA_PAYMENT_MAX_ETH || 10),
    decimals: Number(process.env.AGORA_PAYMENT_ETH_DECIMALS || 18),
  },
};
const PAYMENT_CONFIRMATIONS = {
  USDC: Math.max(1, Number(process.env.AGORA_MIN_CONFIRMATIONS_USDC || 1)),
  ETH: Math.max(1, Number(process.env.AGORA_MIN_CONFIRMATIONS_ETH || 1)),
};
const paymentVerifier = createUsdcPaymentVerifier({
  minConfirmationsUsdc: PAYMENT_CONFIRMATIONS.USDC,
  minConfirmationsEth: PAYMENT_CONFIRMATIONS.ETH,
});

const intentInputSchemas = new Map();
const intentOutputSchemas = new Map();

const ORDER_STATES = {
  CREATED: 'CREATED',
  OFFERED: 'OFFERED',
  ACCEPTED: 'ACCEPTED',
  FUNDED: 'FUNDED',
  EXECUTING: 'EXECUTING',
  DELIVERED: 'DELIVERED',
  RELEASED: 'RELEASED',
  REFUNDED: 'REFUNDED',
  CLOSED: 'CLOSED',
};

const ORDER_TRANSITIONS = {
  [ORDER_STATES.CREATED]: new Set([ORDER_STATES.OFFERED, ORDER_STATES.ACCEPTED, ORDER_STATES.FUNDED]),
  [ORDER_STATES.OFFERED]: new Set([ORDER_STATES.OFFERED, ORDER_STATES.ACCEPTED, ORDER_STATES.FUNDED]),
  [ORDER_STATES.ACCEPTED]: new Set([ORDER_STATES.FUNDED, ORDER_STATES.EXECUTING, ORDER_STATES.DELIVERED, ORDER_STATES.RELEASED, ORDER_STATES.REFUNDED]),
  [ORDER_STATES.FUNDED]: new Set([ORDER_STATES.EXECUTING, ORDER_STATES.DELIVERED, ORDER_STATES.RELEASED, ORDER_STATES.REFUNDED]),
  [ORDER_STATES.EXECUTING]: new Set([ORDER_STATES.DELIVERED, ORDER_STATES.REFUNDED]),
  [ORDER_STATES.DELIVERED]: new Set([ORDER_STATES.RELEASED, ORDER_STATES.REFUNDED, ORDER_STATES.CLOSED]),
  [ORDER_STATES.RELEASED]: new Set([ORDER_STATES.CLOSED]),
  [ORDER_STATES.REFUNDED]: new Set([ORDER_STATES.CLOSED]),
  [ORDER_STATES.CLOSED]: new Set(),
};

// Active subscriptions for long-polling
const subscriptions = new Set();
const opsHttpSamples = [];
const opsPaymentMetrics = {
  attempts: 0,
  verified: 0,
  failed: 0,
};
const compensationRuntime = {
  running: false,
  last_started_at: null,
  last_finished_at: null,
  last_summary: null,
};

function addEvent(evt) {
  events.push(evt);
  while (events.length > MAX_EVENTS) events.shift();
  void trackEvent(evt);
  
  // Notify all waiting subscriptions
  notifySubscribers(evt);
}

function notifySubscribers(evt) {
  for (const sub of subscriptions) {
    if (sub.matches(evt)) {
      sub.addEvent(evt);
    }
  }
}

function normalizeEnvelope(input) {
  if (!input || typeof input !== 'object') return null;
  const envelope = input.envelope && typeof input.envelope === 'object'
    ? input.envelope
    : input;
  if (!envelope || typeof envelope !== 'object') return null;
  if (!envelope.id) return null;
  if (!envelope.ts) envelope.ts = new Date().toISOString();
  return envelope;
}

function extractAddressFromDid(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^eip155:(\d+):(0x[a-fA-F0-9]{40})$/);
  if (!match) return null;
  return match[2];
}

function extractAcceptPaymentPayload(evt) {
  const payload = evt?.payload && typeof evt.payload === 'object' ? evt.payload : {};
  const terms = payload.terms && typeof payload.terms === 'object' ? payload.terms : {};
  const txHash = payload.payment_tx || payload.tx_hash || payload.txHash;
  const amount = payload.amount_usdc ?? payload.amount ?? terms.amount_usdc ?? terms.amount;
  const senderId = evt?.sender?.id;
  const fallbackPayer = extractAddressFromDid(senderId);
  const payer = payload.payer || terms.payer || fallbackPayer || null;
  const payee = payload.payee || terms.payee || terms.provider || null;
  const chain = payload.chain || payload.network || terms.chain || terms.network || 'base-sepolia';
  const token = payload.token || terms.token || 'USDC';
  const requestId = payload.request_id || payload.requestId;

  return {
    txHash,
    amount,
    payer,
    payee,
    chain,
    token,
    requestId,
    senderId,
  };
}

function normalizePaymentToken(value) {
  if (typeof value !== 'string') return null;
  const token = value.trim().toUpperCase();
  return token || null;
}

function normalizePaymentNetwork(value) {
  if (typeof value !== 'string') return null;
  const raw = value.trim().toLowerCase();
  if (!raw) return null;
  if (raw === 'base-sepolia' || raw === 'base_sepolia' || raw === '84532') return 'base-sepolia';
  if (raw === 'base' || raw === '8453') return 'base';
  return raw;
}

function parseNumericAmount(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return { ok: false, value: null, raw: null };
    return { ok: true, value, raw: value.toString() };
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return { ok: false, value: null, raw: null };
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return { ok: false, value: null, raw: trimmed };
    return { ok: true, value: parsed, raw: trimmed };
  }
  return { ok: false, value: null, raw: null };
}

function countDecimals(rawValue) {
  const raw = String(rawValue || '').trim();
  if (!raw) return 0;
  if (!raw.includes('.')) return 0;
  const fraction = raw.split('.')[1] || '';
  return fraction.length;
}

function validatePaymentMetadata({ token, chain, amount }) {
  const normalizedToken = normalizePaymentToken(token);
  const normalizedChain = normalizePaymentNetwork(chain);
  if (!normalizedToken) {
    return { ok: false, error: 'INVALID_PAYMENT_TOKEN', message: 'Payment token is required' };
  }
  if (!PAYMENT_ALLOWED_TOKENS.has(normalizedToken)) {
    return {
      ok: false,
      error: 'PAYMENT_TOKEN_NOT_ALLOWED',
      message: `Unsupported payment token ${normalizedToken}. Allowed: ${Array.from(PAYMENT_ALLOWED_TOKENS).join(', ')}`,
    };
  }
  if (!normalizedChain) {
    return { ok: false, error: 'INVALID_PAYMENT_NETWORK', message: 'Payment network is required' };
  }
  if (!PAYMENT_ALLOWED_NETWORKS.has(normalizedChain)) {
    return {
      ok: false,
      error: 'PAYMENT_NETWORK_NOT_ALLOWED',
      message: `Unsupported payment network ${normalizedChain}. Allowed: ${Array.from(PAYMENT_ALLOWED_NETWORKS).join(', ')}`,
    };
  }

  const rule = PAYMENT_RULES[normalizedToken];
  if (!rule) {
    return {
      ok: false,
      error: 'PAYMENT_RULE_MISSING',
      message: `Payment rule is not configured for ${normalizedToken}`,
    };
  }

  const parsed = parseNumericAmount(amount);
  if (!parsed.ok || parsed.value == null || parsed.value <= 0) {
    return { ok: false, error: 'INVALID_PAYMENT_AMOUNT', message: 'Payment amount must be a positive number' };
  }
  if (parsed.value < rule.min) {
    return {
      ok: false,
      error: 'PAYMENT_AMOUNT_TOO_LOW',
      message: `Payment amount is below minimum (${rule.min} ${normalizedToken})`,
    };
  }
  if (parsed.value > rule.max) {
    return {
      ok: false,
      error: 'PAYMENT_AMOUNT_TOO_HIGH',
      message: `Payment amount exceeds maximum (${rule.max} ${normalizedToken})`,
    };
  }
  const decimals = countDecimals(parsed.raw);
  if (decimals > rule.decimals) {
    return {
      ok: false,
      error: 'PAYMENT_AMOUNT_PRECISION_TOO_HIGH',
      message: `Payment amount supports at most ${rule.decimals} decimals for ${normalizedToken}`,
    };
  }
  return {
    ok: true,
    token: normalizedToken,
    chain: normalizedChain,
    amount: parsed.value,
  };
}

function isOpsAuthorized(req) {
  if (!OPS_ADMIN_TOKEN) return true;
  const auth = req.get('Authorization') || '';
  const bearer = auth.toLowerCase().startsWith('bearer ')
    ? auth.slice(7).trim()
    : '';
  const headerToken = req.get('X-Ops-Token') || req.get('X-Admin-Token') || '';
  const queryToken = req.query?.ops_token ? String(req.query.ops_token) : '';
  const provided = bearer || String(headerToken || '').trim() || queryToken;
  return provided && provided === OPS_ADMIN_TOKEN;
}

function requireOpsAuth(req, res, next) {
  if (isOpsAuthorized(req)) return next();
  return res.status(401).json({
    ok: false,
    error: 'UNAUTHORIZED',
    message: 'Ops admin token is required',
  });
}

function extractIntentsFromCapabilities(capabilities) {
  const intents = new Set();
  if (!Array.isArray(capabilities)) return [];
  for (const cap of capabilities) {
    const declared = cap?.intents;
    if (Array.isArray(declared)) {
      for (const intent of declared) {
        if (typeof intent === 'string') intents.add(intent);
        if (intent && typeof intent === 'object' && typeof intent.id === 'string') intents.add(intent.id);
      }
    }
  }
  return Array.from(intents);
}

function extractPricingFromCapabilities(capabilities) {
  if (!Array.isArray(capabilities)) return [];
  const rows = [];
  for (const cap of capabilities) {
    if (!cap || typeof cap !== 'object') continue;
    const pricing = cap.pricing && typeof cap.pricing === 'object' ? cap.pricing : null;
    if (!pricing) continue;
    rows.push({
      capability_id: typeof cap.id === 'string' ? cap.id : null,
      capability_name: typeof cap.name === 'string' ? cap.name : null,
      model: typeof pricing.model === 'string' ? pricing.model : null,
      currency: typeof pricing.currency === 'string' ? pricing.currency : null,
      fixed_price: Number.isFinite(Number(pricing.fixed_price)) ? Number(pricing.fixed_price) : null,
      metered_unit: typeof pricing.metered_unit === 'string' ? pricing.metered_unit : null,
      metered_rate: Number.isFinite(Number(pricing.metered_rate)) ? Number(pricing.metered_rate) : null,
    });
  }
  return rows;
}

function normalizeSearchValue(value) {
  return String(value || '').trim().toLowerCase();
}

function buildAgentSearchBlob(agent) {
  const parts = [];
  if (agent?.id) parts.push(agent.id);
  if (agent?.name) parts.push(agent.name);
  if (agent?.description) parts.push(agent.description);
  if (Array.isArray(agent?.intents)) parts.push(agent.intents.join(' '));
  if (Array.isArray(agent?.capabilities)) {
    for (const capability of agent.capabilities) {
      if (capability?.name) parts.push(String(capability.name));
      if (capability?.description) parts.push(String(capability.description));
      if (Array.isArray(capability?.intents)) {
        const declared = capability.intents
          .map((intent) => (typeof intent === 'string' ? intent : intent?.id))
          .filter(Boolean);
        parts.push(declared.join(' '));
      }
    }
  }
  return normalizeSearchValue(parts.join(' '));
}

function matchesDirectoryFilters(agent, filters) {
  const intentFilter = normalizeSearchValue(filters.intent);
  const queryFilter = normalizeSearchValue(filters.q);
  const statusFilter = normalizeSearchValue(filters.status);

  if (intentFilter) {
    const intents = Array.isArray(agent?.intents) ? agent.intents.map((item) => normalizeSearchValue(item)) : [];
    if (!intents.includes(intentFilter)) return false;
  }

  if (statusFilter) {
    const computed = computeAgentStatus(agent).status;
    if (normalizeSearchValue(computed) !== statusFilter) return false;
  }

  if (queryFilter) {
    const blob = buildAgentSearchBlob(agent);
    if (!blob.includes(queryFilter)) return false;
  }

  return true;
}

function isAgentMarkedSandboxEnabled(agent) {
  if (!agent || typeof agent !== 'object') return false;
  if (agent?.metadata?.sandbox_enabled === true) return true;
  if (!Array.isArray(agent?.capabilities)) return false;
  return agent.capabilities.some((capability) => {
    if (!capability || typeof capability !== 'object') return false;
    if (capability.sandbox_enabled === true) return true;
    if (capability.execution?.sandbox === true) return true;
    if (Array.isArray(capability.intents)) {
      return capability.intents.some((intent) => intent === 'sandbox.execute' || intent?.id === 'sandbox.execute');
    }
    return false;
  });
}

function isAgentAllowedForSandboxExecution(agentId, agent) {
  if (!agentId) return false;
  if (EXECUTE_AGENT_ALLOWLIST.has(agentId)) return true;
  return isAgentMarkedSandboxEnabled(agent);
}

function mapExecutionStatusToResultStatus(executionStatus) {
  if (executionStatus === 'SUCCESS') return 'success';
  if (executionStatus === 'TIMEOUT') return 'failed';
  if (executionStatus === 'FAILED' || executionStatus === 'ERROR') return 'failed';
  return 'failed';
}

async function executeInSandboxRunner(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SANDBOX_EXECUTE_TIMEOUT_MS);
  try {
    const response = await fetch(`${SANDBOX_RUNNER_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const json = await response.json();
    if (!response.ok || json?.ok === false) {
      return {
        ok: false,
        error: 'SANDBOX_EXECUTION_FAILED',
        details: json,
      };
    }
    return { ok: true, execution: json };
  } catch (error) {
    return {
      ok: false,
      error: 'SANDBOX_RUNNER_UNREACHABLE',
      message: String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeSchema(value) {
  return isObject(value) ? value : null;
}

function extractIntentSchemaBindings(capabilities) {
  if (!Array.isArray(capabilities)) return [];
  const bindings = [];

  for (const capability of capabilities) {
    if (!isObject(capability)) continue;
    const capabilityInput = normalizeSchema(
      capability.input_schema || capability.inputSchema || capability?.schemas?.request,
    );
    const capabilityOutput = normalizeSchema(
      capability.output_schema || capability.outputSchema || capability?.schemas?.response,
    );

    const declaredIntents = Array.isArray(capability.intents)
      ? capability.intents
      : capability.intent
        ? [capability.intent]
        : [];

    for (const declared of declaredIntents) {
      if (typeof declared === 'string') {
        bindings.push({
          intent: declared,
          inputSchema: capabilityInput,
          outputSchema: capabilityOutput,
        });
        continue;
      }

      if (!isObject(declared) || typeof declared.id !== 'string' || !declared.id) continue;
      bindings.push({
        intent: declared.id,
        inputSchema: normalizeSchema(
          declared.input_schema || declared.inputSchema || declared?.schemas?.request || capabilityInput,
        ),
        outputSchema: normalizeSchema(
          declared.output_schema || declared.outputSchema || declared?.schemas?.response || capabilityOutput,
        ),
      });
    }
  }

  return bindings;
}

function registerIntentSchemas(bindings, sourceAgentId) {
  for (const binding of bindings) {
    const now = new Date().toISOString();
    if (binding.inputSchema) {
      intentInputSchemas.set(binding.intent, {
        schema: binding.inputSchema,
        source: sourceAgentId,
        updated_at: now,
      });
    }
    if (binding.outputSchema) {
      intentOutputSchemas.set(binding.intent, {
        schema: binding.outputSchema,
        source: sourceAgentId,
        updated_at: now,
      });
    }
  }
}

function validateJsonSchema(schema, value, path = 'root') {
  const errors = [];
  const schemaObj = normalizeSchema(schema);

  if (!schemaObj) {
    return { ok: false, errors: [`${path}: schema must be an object`] };
  }

  if (Array.isArray(schemaObj.type)) {
    const anyTypeMatches = schemaObj.type.some((subtype) =>
      validateJsonSchema({ ...schemaObj, type: subtype }, value, path).ok,
    );
    if (!anyTypeMatches) errors.push(`${path}: value does not match any allowed type`);
    return { ok: errors.length === 0, errors };
  }

  if (schemaObj.enum && Array.isArray(schemaObj.enum)) {
    const enumMatch = schemaObj.enum.some((item) => JSON.stringify(item) === JSON.stringify(value));
    if (!enumMatch) errors.push(`${path}: value is not in enum`);
  }

  const schemaType = schemaObj.type;
  if (schemaType === 'string') {
    if (typeof value !== 'string') errors.push(`${path}: expected string`);
    return { ok: errors.length === 0, errors };
  }
  if (schemaType === 'number') {
    if (typeof value !== 'number' || Number.isNaN(value)) errors.push(`${path}: expected number`);
    return { ok: errors.length === 0, errors };
  }
  if (schemaType === 'integer') {
    if (!Number.isInteger(value)) errors.push(`${path}: expected integer`);
    return { ok: errors.length === 0, errors };
  }
  if (schemaType === 'boolean') {
    if (typeof value !== 'boolean') errors.push(`${path}: expected boolean`);
    return { ok: errors.length === 0, errors };
  }
  if (schemaType === 'array') {
    if (!Array.isArray(value)) {
      errors.push(`${path}: expected array`);
      return { ok: false, errors };
    }
    if (schemaObj.minItems != null && value.length < schemaObj.minItems) {
      errors.push(`${path}: expected at least ${schemaObj.minItems} items`);
    }
    if (schemaObj.maxItems != null && value.length > schemaObj.maxItems) {
      errors.push(`${path}: expected at most ${schemaObj.maxItems} items`);
    }
    if (schemaObj.items) {
      value.forEach((item, index) => {
        const nested = validateJsonSchema(schemaObj.items, item, `${path}[${index}]`);
        errors.push(...nested.errors);
      });
    }
    return { ok: errors.length === 0, errors };
  }
  if (schemaType === 'object' || schemaObj.properties || schemaObj.required) {
    if (!isObject(value)) {
      errors.push(`${path}: expected object`);
      return { ok: false, errors };
    }
    const required = Array.isArray(schemaObj.required) ? schemaObj.required : [];
    for (const key of required) {
      if (!(key in value)) {
        errors.push(`${path}.${key}: is required`);
      }
    }
    const properties = isObject(schemaObj.properties) ? schemaObj.properties : {};
    for (const [key, subSchema] of Object.entries(properties)) {
      if (!(key in value)) continue;
      const nested = validateJsonSchema(subSchema, value[key], `${path}.${key}`);
      errors.push(...nested.errors);
    }
    if (schemaObj.additionalProperties === false) {
      const allowedKeys = new Set(Object.keys(properties));
      for (const key of Object.keys(value)) {
        if (!allowedKeys.has(key)) errors.push(`${path}.${key}: additional property is not allowed`);
      }
    }
    return { ok: errors.length === 0, errors };
  }

  return { ok: errors.length === 0, errors };
}

function parsePeriodToMs(period) {
  if (!period) return 7 * 24 * 60 * 60 * 1000;
  const text = String(period).trim().toLowerCase();
  const match = text.match(/^(\d+)([hdw])$/);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2];
  if (unit === 'h') return amount * 60 * 60 * 1000;
  if (unit === 'd') return amount * 24 * 60 * 60 * 1000;
  if (unit === 'w') return amount * 7 * 24 * 60 * 60 * 1000;
  return null;
}

function computePercentile(values, percentile) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * percentile;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function hashRequestPayload(value) {
  return createHash('sha256').update(JSON.stringify(value || {})).digest('hex');
}

function readIdempotencyKey(req) {
  const fromHeader = req.get('Idempotency-Key') || req.get('X-Idempotency-Key');
  if (typeof fromHeader === 'string' && fromHeader.trim()) return fromHeader.trim();
  const fromBody = req.body?.idempotency_key || req.body?.idempotencyKey;
  if (typeof fromBody === 'string' && fromBody.trim()) return fromBody.trim();
  return null;
}

async function loadIdempotentResponse({ idempotencyKey, requestHash }) {
  if (!idempotencyKey) return null;
  const record = await storage.getIdempotencyRecord(idempotencyKey);
  if (!record) return null;
  if (record.request_hash && record.request_hash !== requestHash) {
    return {
      conflict: true,
      response: {
        ok: false,
        error: 'IDEMPOTENCY_KEY_REUSED',
        message: 'Idempotency key was already used with a different payload',
      },
      statusCode: 409,
    };
  }
  return {
    conflict: false,
    response: {
      ...(record.response || { ok: true }),
      idempotent_replay: true,
      idempotency_key: idempotencyKey,
    },
    statusCode: Number(record.status_code) || 200,
  };
}

async function persistIdempotencyResponse({ idempotencyKey, requestHash, statusCode, response }) {
  if (!idempotencyKey) return;
  await storage.saveIdempotencyRecord({
    idempotency_key: idempotencyKey,
    request_hash: requestHash,
    status_code: statusCode,
    response,
    updated_at: new Date().toISOString(),
  });
}

function getOrderStateTimestampKey(state) {
  if (state === ORDER_STATES.CREATED) return 'created_at';
  if (state === ORDER_STATES.ACCEPTED) return 'accepted_at';
  if (state === ORDER_STATES.FUNDED) return 'funded_at';
  if (state === ORDER_STATES.EXECUTING) return 'executing_at';
  if (state === ORDER_STATES.DELIVERED) return 'delivered_at';
  if (state === ORDER_STATES.RELEASED) return 'released_at';
  if (state === ORDER_STATES.REFUNDED) return 'refunded_at';
  if (state === ORDER_STATES.CLOSED) return 'closed_at';
  return null;
}

function pushOrderStateHistory(order, { state, eventType, eventId, ts }) {
  if (!Array.isArray(order.state_history)) order.state_history = [];
  order.state_history.push({
    state,
    event_type: eventType,
    event_id: eventId || null,
    ts,
  });
}

function transitionOrderState(order, nextState, context) {
  const current = order.state;
  if (!current) {
    order.state = nextState;
    const tsKey = getOrderStateTimestampKey(nextState);
    if (tsKey && !order[tsKey]) order[tsKey] = context.ts;
    pushOrderStateHistory(order, { state: nextState, ...context });
    return { ok: true };
  }
  if (current === nextState) return { ok: true };
  if (
    nextState === ORDER_STATES.FUNDED
    && [ORDER_STATES.DELIVERED, ORDER_STATES.RELEASED, ORDER_STATES.REFUNDED, ORDER_STATES.CLOSED].includes(current)
  ) {
    // Late ESCROW_HELD event should not roll state back.
    return { ok: true };
  }
  const allowed = ORDER_TRANSITIONS[current] || new Set();
  if (!allowed.has(nextState)) {
    return {
      ok: false,
      error: 'INVALID_ORDER_TRANSITION',
      message: `Order cannot transition from ${current} to ${nextState}`,
    };
  }
  order.state = nextState;
  const tsKey = getOrderStateTimestampKey(nextState);
  if (tsKey && !order[tsKey]) order[tsKey] = context.ts;
  pushOrderStateHistory(order, { state: nextState, ...context });
  return { ok: true };
}

function baseOrderRecord(requestId, evt, payload) {
  const now = evt.ts || new Date().toISOString();
  return {
    request_id: requestId,
    state: null,
    intent: payload.intent || null,
    requester: evt.sender?.id || null,
    created_at: null,
    accepted_at: null,
    funded_at: null,
    executing_at: null,
    delivered_at: null,
    released_at: null,
    refunded_at: null,
    closed_at: null,
    updated_at: now,
    state_history: [],
  };
}

function buildOrderTransitionTarget(evt, payload) {
  if (evt.type === 'REQUEST') return ORDER_STATES.CREATED;
  if (evt.type === 'OFFER') return ORDER_STATES.OFFERED;
  if (evt.type === 'ESCROW_HELD') return ORDER_STATES.FUNDED;
  if (evt.type === 'RESULT') return ORDER_STATES.DELIVERED;
  if (evt.type === 'ESCROW_RELEASED') return ORDER_STATES.RELEASED;
  if (evt.type === 'ESCROW_REFUNDED') return ORDER_STATES.REFUNDED;
  if (evt.type === 'ORDER_CLOSED') return ORDER_STATES.CLOSED;
  if (evt.type === 'ACCEPT') {
    const hasPaymentVerification = isObject(payload.payment_verification)
      || isObject(payload.paymentVerification);
    return hasPaymentVerification ? ORDER_STATES.FUNDED : ORDER_STATES.ACCEPTED;
  }
  return null;
}

function applyOrderPayloadUpdates(order, evt, payload) {
  if (payload.intent && !order.intent) order.intent = payload.intent;
  if (evt.type === 'REQUEST') {
    order.requester = evt.sender?.id || order.requester || null;
  }
  if (evt.type === 'OFFER') {
    order.last_offer_id = payload.offer_id || payload.offerId || evt.id || null;
    order.last_offer_provider = evt.sender?.id || null;
  }
  if (evt.type === 'ACCEPT') {
    order.accepted_offer_id = payload.offer_id || payload.offerId || order.accepted_offer_id || null;
    order.accepted_by = evt.sender?.id || order.accepted_by || null;
    order.payment_tx = payload.payment_tx || payload.tx_hash || payload.txHash || order.payment_tx || null;
    order.payment_token = payload.token || order.payment_token || null;
    order.payment_chain = payload.chain || payload.network || order.payment_chain || null;
    order.payment_amount = payload.amount ?? payload.amount_usdc ?? order.payment_amount ?? null;
    order.payment_payer = payload.payer || order.payment_payer || null;
    order.payment_payee = payload.payee || payload?.terms?.provider || order.payment_payee || null;
  }
  if (evt.type === 'RESULT') {
    order.result_status = payload.status || order.result_status || null;
    order.result_sender = evt.sender?.id || order.result_sender || null;
  }
  if (evt.type === 'ESCROW_RELEASED' || evt.type === 'ESCROW_REFUNDED') {
    order.settlement_resolution = evt.type === 'ESCROW_RELEASED' ? 'release' : 'refund';
    if (payload.fee != null) order.settlement_fee = payload.fee;
    if (payload.payout != null) order.settlement_payout = payload.payout;
  }
}

async function applyOrderStateTransition(evt) {
  const payload = isObject(evt.payload) ? evt.payload : {};
  const requestIdRaw = payload.request_id || payload.requestId;
  if (!requestIdRaw) return { ok: true, order: null };
  const requestId = String(requestIdRaw);
  const targetState = buildOrderTransitionTarget(evt, payload);
  if (!targetState) return { ok: true, order: null };

  let order = await storage.getOrder(requestId);
  if (!order) {
    if (evt.type !== 'REQUEST' && evt.type !== 'ESCROW_HELD') {
      return {
        ok: false,
        error: 'ORDER_NOT_FOUND',
        message: `Order ${requestId} does not exist yet`,
      };
    }
    order = baseOrderRecord(requestId, evt, payload);
  }

  const transitioned = transitionOrderState(order, targetState, {
    eventType: evt.type,
    eventId: evt.id,
    ts: evt.ts || new Date().toISOString(),
  });
  if (!transitioned.ok) return transitioned;

  applyOrderPayloadUpdates(order, evt, payload);
  order.updated_at = evt.ts || new Date().toISOString();
  await storage.saveOrder(order);
  return { ok: true, order };
}

function buildMarketRateReport({ intent, currency, periodMs, now }) {
  const cutoff = now - periodMs;
  const byCurrency = new Map();

  for (const event of events) {
    if (event?.type !== 'ACCEPT') continue;
    const payload = isObject(event.payload) ? event.payload : {};
    const requestId = payload.request_id || payload.requestId;
    if (!requestId) continue;
    const request = requestIndex.get(String(requestId));
    const requestIntent = request?.intent || payload.intent;
    if (intent && requestIntent !== intent) continue;

    const ts = Date.parse(event.ts);
    if (!Number.isFinite(ts) || ts < cutoff) continue;

    const rawToken = typeof payload.token === 'string'
      ? payload.token
      : typeof payload.currency === 'string'
        ? payload.currency
        : payload.amount_usdc != null || payload.price_usd != null
          ? 'USDC'
          : null;
    if (!rawToken) continue;
    const token = rawToken.toUpperCase();
    if (currency && token !== currency) continue;

    let amount = null;
    if (payload.amount != null) amount = Number(payload.amount);
    if (!Number.isFinite(amount) && payload.amount_usdc != null) amount = Number(payload.amount_usdc);
    if (!Number.isFinite(amount) && payload.price_usd != null) amount = Number(payload.price_usd);
    if (!Number.isFinite(amount) || amount <= 0) continue;

    const list = byCurrency.get(token) || [];
    list.push(amount);
    byCurrency.set(token, list);
  }

  const rates = Array.from(byCurrency.entries()).map(([token, list]) => {
    const total = list.reduce((sum, value) => sum + value, 0);
    return {
      currency: token,
      sample_size: list.length,
      average: Number((total / list.length).toFixed(8)),
      p25: Number((computePercentile(list, 0.25) || 0).toFixed(8)),
      p50: Number((computePercentile(list, 0.5) || 0).toFixed(8)),
      p75: Number((computePercentile(list, 0.75) || 0).toFixed(8)),
      min: Number(Math.min(...list).toFixed(8)),
      max: Number(Math.max(...list).toFixed(8)),
    };
  }).sort((a, b) => b.sample_size - a.sample_size);

  return {
    rates,
    sample_size: rates.reduce((sum, row) => sum + row.sample_size, 0),
  };
}

function upsertAgent(record) {
  const now = new Date().toISOString();
  const existing = agents.get(record.id);
  const next = {
    ...existing,
    ...record,
    last_seen: now,
  };
  agents.set(record.id, next);
  return next;
}

function computeAgentStatus(agent) {
  if (!agent) return { status: 'unknown', last_seen: null };
  const lastSeen = agent.last_seen ? new Date(agent.last_seen).getTime() : 0;
  const isOnline = Date.now() - lastSeen < AGENT_TTL_MS;
  return { status: isOnline ? 'online' : 'offline', last_seen: agent.last_seen || null };
}

async function decorateAgent(agent) {
  if (!agent) return null;
  const status = computeAgentStatus(agent);
  const reputation = await getOrCreateReputation(agent.id);
  return {
    ...agent,
    ...status,
    reputation,
  };
}

function createReputation(agentId) {
  return {
    agent_id: agentId,
    total_orders: 0,
    success_orders: 0,
    on_time_orders: 0,
    rating_count: 0,
    rating_positive: 0,
    avg_response_ms: null,
    disputes: 0,
    score: 0,
    tier: '青铜',
    updated_at: new Date().toISOString(),
  };
}

async function getOrCreateReputation(agentId) {
  if (!agentId) return null;
  const existing = await storage.getReputation(agentId);
  if (existing) return existing;
  const rep = createReputation(agentId);
  await storage.saveReputation(rep);
  return rep;
}

async function ensureLedgerAccount(id) {
  if (!id) return null;
  const existing = await storage.getLedgerAccount(id);
  if (existing) return existing;
  const account = { id, balance: 0, currency: 'USDC', updated_at: new Date().toISOString() };
  await storage.saveLedgerAccount(account);
  return account;
}

async function adjustBalance(id, amount) {
  const account = await ensureLedgerAccount(id);
  if (!account) return null;
  account.balance = Number((account.balance + amount).toFixed(6));
  account.updated_at = new Date().toISOString();
  await storage.saveLedgerAccount(account);
  return account;
}

function nowIso() {
  return new Date().toISOString();
}

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(8));
}

function normalizeCurrency(value, fallback = 'USDC') {
  if (typeof value === 'string' && value.trim()) return value.trim().toUpperCase();
  return fallback;
}

function buildLedgerAccountIds({ payer, payee, currency }) {
  const cur = normalizeCurrency(currency);
  return {
    escrowHeld: `escrow:held:${cur}`,
    buyerFrozen: `buyer:frozen:${payer}:${cur}`,
    buyerAvailable: `buyer:available:${payer}:${cur}`,
    sellerPending: `seller:pending:${payee}:${cur}`,
    sellerAvailable: `seller:available:${payee}:${cur}`,
    platformFeePending: `platform:fee_pending:${cur}`,
    platformFeeRevenue: `platform:fee_revenue:${cur}`,
  };
}

async function postLedgerEntry({
  requestId,
  entryType,
  currency,
  summary,
  postings,
  metadata,
}) {
  if (!Array.isArray(postings) || postings.length < 2) {
    throw new Error('Ledger entry must contain at least 2 postings');
  }
  let totalDebit = 0;
  let totalCredit = 0;
  for (const posting of postings) {
    const amount = roundMoney(posting.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error(`Invalid posting amount: ${posting.amount}`);
    }
    if (posting.side === 'debit') totalDebit += amount;
    else if (posting.side === 'credit') totalCredit += amount;
    else throw new Error(`Invalid posting side: ${posting.side}`);
  }
  totalDebit = roundMoney(totalDebit);
  totalCredit = roundMoney(totalCredit);
  if (Math.abs(totalDebit - totalCredit) > 0.0000001) {
    throw new Error(`Unbalanced ledger entry: debit=${totalDebit} credit=${totalCredit}`);
  }

  const createdAt = nowIso();
  const entryId = `le_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const entry = {
    entry_id: entryId,
    request_id: String(requestId),
    entry_type: entryType,
    currency: normalizeCurrency(currency),
    total_debit: totalDebit,
    total_credit: totalCredit,
    summary: summary || null,
    metadata: metadata || null,
    created_at: createdAt,
    updated_at: createdAt,
  };
  await storage.saveLedgerJournalEntry(entry);

  const accountDeltas = new Map();
  for (const posting of postings) {
    const postingAmount = roundMoney(posting.amount);
    const postingId = `lp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const normalized = {
      posting_id: postingId,
      entry_id: entryId,
      request_id: String(requestId),
      account_id: String(posting.account_id),
      side: posting.side,
      amount: postingAmount,
      currency: normalizeCurrency(posting.currency || currency),
      note: posting.note || null,
      created_at: createdAt,
      updated_at: createdAt,
    };
    await storage.saveLedgerPosting(normalized);
    const existing = accountDeltas.get(normalized.account_id) || 0;
    const delta = normalized.side === 'debit' ? postingAmount : -postingAmount;
    accountDeltas.set(normalized.account_id, roundMoney(existing + delta));
  }

  for (const [accountId, delta] of accountDeltas.entries()) {
    const account = await ensureLedgerAccount(accountId);
    account.currency = normalizeCurrency(currency, account.currency || 'USDC');
    account.balance = roundMoney(Number(account.balance || 0) + delta);
    account.updated_at = createdAt;
    await storage.saveLedgerAccount(account);
  }
  return entry;
}

function buildSettlementRecord({
  requestId,
  payer,
  payee,
  amount,
  currency,
  feeBps,
  status = 'HELD',
  heldAt,
}) {
  const gross = roundMoney(amount);
  const resolvedFeeBps = Number.isFinite(Number(feeBps)) ? Number(feeBps) : PLATFORM_FEE_BPS;
  const fee = roundMoney(gross * (resolvedFeeBps / 10_000));
  const sellerNet = roundMoney(gross - fee);
  const now = heldAt || nowIso();
  return {
    request_id: String(requestId),
    payer: String(payer),
    payee: String(payee),
    currency: normalizeCurrency(currency),
    amount_gross: gross,
    fee_bps: resolvedFeeBps,
    amount_fee: fee,
    amount_seller: sellerNet,
    status,
    held_at: now,
    released_at: null,
    refunded_at: null,
    updated_at: now,
    last_ledger_entry_id: null,
    reason: null,
  };
}

async function ensureSettlementForAccept({
  requestId,
  payer,
  payee,
  amount,
  currency,
  heldAt,
}) {
  const existing = await storage.getSettlement(String(requestId));
  if (existing) return existing;
  if (!requestId || !payer || !payee || !Number.isFinite(Number(amount)) || Number(amount) <= 0) return null;
  const settlement = buildSettlementRecord({
    requestId,
    payer,
    payee,
    amount: Number(amount),
    currency,
    heldAt,
    feeBps: PLATFORM_FEE_BPS,
  });
  const accounts = buildLedgerAccountIds({
    payer: settlement.payer,
    payee: settlement.payee,
    currency: settlement.currency,
  });
  const holdEntry = await postLedgerEntry({
    requestId: settlement.request_id,
    entryType: 'HOLD',
    currency: settlement.currency,
    summary: 'Buyer payment frozen in escrow',
    postings: [
      { account_id: accounts.escrowHeld, side: 'debit', amount: settlement.amount_gross },
      { account_id: accounts.buyerFrozen, side: 'credit', amount: settlement.amount_gross },
    ],
    metadata: { source: 'accept', payer: settlement.payer, payee: settlement.payee },
  });
  settlement.last_ledger_entry_id = holdEntry.entry_id;
  settlement.updated_at = nowIso();
  await storage.saveSettlement(settlement);

  const escrowRecord = await storage.getEscrow(settlement.request_id);
  const nextEscrow = {
    request_id: settlement.request_id,
    payer: settlement.payer,
    payee: settlement.payee,
    amount: settlement.amount_gross,
    currency: settlement.currency,
    fee_bps: settlement.fee_bps,
    status: 'HELD',
    held_at: settlement.held_at,
    updated_at: settlement.updated_at,
  };
  await storage.saveEscrow({ ...(escrowRecord || {}), ...nextEscrow });
  return settlement;
}

async function holdEscrowFunds({
  requestId,
  payer,
  payee,
  amount,
  currency,
  feeBps,
  heldAt,
  source,
}) {
  const existing = await storage.getSettlement(String(requestId));
  if (existing && existing.status === 'HELD') return { ok: true, settlement: existing, duplicate: true };
  if (existing && existing.status !== 'HELD') {
    return { ok: false, error: 'INVALID_STATE', message: `Cannot hold settlement in ${existing.status}` };
  }
  const settlement = buildSettlementRecord({
    requestId,
    payer,
    payee,
    amount,
    currency,
    feeBps,
    status: 'HELD',
    heldAt,
  });
  const accounts = buildLedgerAccountIds({
    payer: settlement.payer,
    payee: settlement.payee,
    currency: settlement.currency,
  });
  const holdEntry = await postLedgerEntry({
    requestId: settlement.request_id,
    entryType: 'HOLD',
    currency: settlement.currency,
    summary: 'Buyer payment frozen in escrow',
    postings: [
      { account_id: accounts.escrowHeld, side: 'debit', amount: settlement.amount_gross },
      { account_id: accounts.buyerFrozen, side: 'credit', amount: settlement.amount_gross },
    ],
    metadata: { source: source || 'api', payer: settlement.payer, payee: settlement.payee },
  });
  settlement.last_ledger_entry_id = holdEntry.entry_id;
  settlement.updated_at = nowIso();
  await storage.saveSettlement(settlement);
  await storage.saveEscrow({
    request_id: settlement.request_id,
    payer: settlement.payer,
    payee: settlement.payee,
    amount: settlement.amount_gross,
    currency: settlement.currency,
    fee_bps: settlement.fee_bps,
    status: 'HELD',
    held_at: settlement.held_at,
    updated_at: settlement.updated_at,
  });
  return { ok: true, settlement, duplicate: false };
}

async function releaseOrRefundEscrow({
  requestId,
  resolution,
  reason,
  actor,
}) {
  const settlement = await storage.getSettlement(String(requestId));
  if (!settlement) {
    return { ok: false, error: 'NOT_FOUND', message: 'Settlement not found' };
  }
  if (settlement.status !== 'HELD') {
    return { ok: false, error: 'INVALID_STATE', message: `Settlement already ${settlement.status}` };
  }

  const accounts = buildLedgerAccountIds({
    payer: settlement.payer,
    payee: settlement.payee,
    currency: settlement.currency,
  });
  const now = nowIso();
  if (resolution === 'refund') {
    const refundEntry = await postLedgerEntry({
      requestId: settlement.request_id,
      entryType: 'REFUND',
      currency: settlement.currency,
      summary: 'Escrow refunded to buyer',
      postings: [
        { account_id: accounts.buyerFrozen, side: 'debit', amount: settlement.amount_gross },
        { account_id: accounts.buyerAvailable, side: 'credit', amount: settlement.amount_gross },
      ],
      metadata: { actor: actor || 'relay', reason: reason || 'manual_refund' },
    });
    settlement.status = 'REFUNDED';
    settlement.refunded_at = now;
    settlement.reason = reason || null;
    settlement.last_ledger_entry_id = refundEntry.entry_id;
    settlement.updated_at = now;
    await storage.saveSettlement(settlement);

    const escrow = await storage.getEscrow(String(requestId));
    await storage.saveEscrow({
      ...(escrow || {}),
      request_id: settlement.request_id,
      payer: settlement.payer,
      payee: settlement.payee,
      amount: settlement.amount_gross,
      currency: settlement.currency,
      fee_bps: settlement.fee_bps,
      status: 'REFUNDED',
      held_at: settlement.held_at,
      released_at: now,
      updated_at: now,
    });
    return { ok: true, settlement, escrowType: 'ESCROW_REFUNDED' };
  }

  const releaseEntry = await postLedgerEntry({
    requestId: settlement.request_id,
    entryType: 'RELEASE',
    currency: settlement.currency,
    summary: 'Escrow released to seller and platform fee bucketed',
    postings: [
      { account_id: accounts.buyerFrozen, side: 'debit', amount: settlement.amount_gross },
      { account_id: accounts.sellerPending, side: 'credit', amount: settlement.amount_seller },
      { account_id: accounts.platformFeePending, side: 'credit', amount: settlement.amount_fee },
    ],
    metadata: { actor: actor || 'relay', reason: reason || 'success' },
  });
  const sellerSettleEntry = await postLedgerEntry({
    requestId: settlement.request_id,
    entryType: 'SELLER_SETTLE',
    currency: settlement.currency,
    summary: 'Seller pending moved to seller available',
    postings: [
      { account_id: accounts.sellerPending, side: 'debit', amount: settlement.amount_seller },
      { account_id: accounts.sellerAvailable, side: 'credit', amount: settlement.amount_seller },
    ],
    metadata: { actor: actor || 'relay', reason: reason || 'success' },
  });
  const platformFeeEntry = await postLedgerEntry({
    requestId: settlement.request_id,
    entryType: 'PLATFORM_FEE',
    currency: settlement.currency,
    summary: 'Platform fee recognized',
    postings: [
      { account_id: accounts.platformFeePending, side: 'debit', amount: settlement.amount_fee },
      { account_id: accounts.platformFeeRevenue, side: 'credit', amount: settlement.amount_fee },
    ],
    metadata: { actor: actor || 'relay', reason: reason || 'success' },
  });

  settlement.status = 'RELEASED';
  settlement.released_at = now;
  settlement.reason = reason || null;
  settlement.last_ledger_entry_id = platformFeeEntry.entry_id;
  settlement.updated_at = now;
  await storage.saveSettlement(settlement);
  const escrow = await storage.getEscrow(String(requestId));
  await storage.saveEscrow({
    ...(escrow || {}),
    request_id: settlement.request_id,
    payer: settlement.payer,
    payee: settlement.payee,
    amount: settlement.amount_gross,
    currency: settlement.currency,
    fee_bps: settlement.fee_bps,
    fee: settlement.amount_fee,
    payout: settlement.amount_seller,
    status: 'RELEASED',
    held_at: settlement.held_at,
    released_at: now,
    updated_at: now,
    ledger_entry_ids: [releaseEntry.entry_id, sellerSettleEntry.entry_id, platformFeeEntry.entry_id],
  });
  return { ok: true, settlement, escrowType: 'ESCROW_RELEASED' };
}

async function createCompensationJob({
  requestId,
  reason,
  runAfter,
  metadata,
}) {
  const safeReason = String(reason || 'UNSPECIFIED').toUpperCase();
  const jobId = `comp_${String(requestId)}_${safeReason.toLowerCase()}`;
  const existing = await storage.getCompensationJob(jobId);
  if (existing) {
    if (existing.status === 'SUCCEEDED') return existing;
    existing.status = existing.status === 'RUNNING' ? 'RUNNING' : 'PENDING';
    existing.run_after = runAfter || existing.run_after || nowIso();
    existing.updated_at = nowIso();
    existing.metadata = { ...(existing.metadata || {}), ...(metadata || {}) };
    await storage.saveCompensationJob(existing);
    return existing;
  }
  const now = nowIso();
  const job = {
    job_id: jobId,
    request_id: String(requestId),
    reason: safeReason,
    status: 'PENDING',
    attempts: 0,
    max_attempts: 5,
    run_after: runAfter || now,
    created_at: now,
    updated_at: now,
    completed_at: null,
    last_error: null,
    metadata: metadata || null,
  };
  await storage.saveCompensationJob(job);
  return job;
}

function isOrderFailed(order) {
  const status = String(order?.result_status || '').toLowerCase();
  return ['failed', 'error', 'timeout', 'cancelled', 'canceled'].includes(status);
}

async function enqueueCompensationCandidates() {
  const settlements = await storage.listSettlements({ limit: 1000 });
  const now = Date.now();
  let enqueued = 0;
  for (const settlement of settlements) {
    if (String(settlement.status || '').toUpperCase() !== 'HELD') continue;
    const requestId = String(settlement.request_id);
    const order = await storage.getOrder(requestId);
    if (!order) continue;
    if (isOrderFailed(order)) {
      await createCompensationJob({
        requestId,
        reason: 'FAILED_ORDER',
        runAfter: nowIso(),
        metadata: { order_state: order.state, result_status: order.result_status },
      });
      enqueued += 1;
      continue;
    }
    const fundedTs = Date.parse(order.funded_at || settlement.held_at || '');
    if (Number.isFinite(fundedTs) && (now - fundedTs) >= ORDER_TIMEOUT_MS) {
      const state = String(order.state || '').toUpperCase();
      if ([ORDER_STATES.FUNDED, ORDER_STATES.EXECUTING, ORDER_STATES.DELIVERED].includes(state)) {
        await createCompensationJob({
          requestId,
          reason: 'ORDER_TIMEOUT',
          runAfter: nowIso(),
          metadata: { order_state: order.state, funded_at: order.funded_at || settlement.held_at },
        });
        enqueued += 1;
      }
    }
  }
  return { enqueued };
}

async function runCompensationJobsOnce(trigger = 'manual') {
  if (compensationRuntime.running) {
    return { ok: true, skipped: true, reason: 'already_running' };
  }
  compensationRuntime.running = true;
  compensationRuntime.last_started_at = nowIso();
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let enqueued = 0;
  try {
    const queueInfo = await enqueueCompensationCandidates();
    enqueued = queueInfo.enqueued;
    const dueJobs = await storage.listCompensationJobs({
      status: 'PENDING',
      dueBefore: nowIso(),
      limit: 100,
    });
    for (const job of dueJobs) {
      processed += 1;
      job.status = 'RUNNING';
      job.attempts = Number(job.attempts || 0) + 1;
      job.updated_at = nowIso();
      await storage.saveCompensationJob(job);
      try {
        const result = await releaseOrRefundEscrow({
          requestId: job.request_id,
          resolution: 'refund',
          reason: job.reason,
          actor: 'compensation_worker',
        });
        if (!result.ok && result.error !== 'INVALID_STATE') {
          throw new Error(result.message || result.error || 'COMPENSATION_REFUND_FAILED');
        }
        job.status = 'SUCCEEDED';
        job.completed_at = nowIso();
        job.updated_at = nowIso();
        job.last_error = null;
        await storage.saveCompensationJob(job);
        succeeded += 1;
      } catch (error) {
        job.last_error = String(error?.message || error);
        job.updated_at = nowIso();
        if (Number(job.attempts || 0) >= Number(job.max_attempts || 5)) {
          job.status = 'FAILED';
          job.completed_at = nowIso();
        } else {
          job.status = 'PENDING';
          const retryAt = new Date(Date.now() + Math.min(5 * 60_000, Number(job.attempts || 1) * 30_000));
          job.run_after = retryAt.toISOString();
        }
        await storage.saveCompensationJob(job);
        failed += 1;
      }
    }
    const summary = {
      ok: true,
      trigger,
      enqueued,
      processed,
      succeeded,
      failed,
      started_at: compensationRuntime.last_started_at,
      finished_at: nowIso(),
    };
    compensationRuntime.last_summary = summary;
    compensationRuntime.last_finished_at = summary.finished_at;
    return summary;
  } finally {
    compensationRuntime.running = false;
  }
}

async function buildOpsDashboard(windowMs) {
  const now = Date.now();
  const cutoffTs = now - windowMs;
  const windowSamples = opsHttpSamples.filter((sample) => {
    const ts = Date.parse(sample.ts || '');
    return Number.isFinite(ts) && ts >= cutoffTs;
  });
  const appHttpSamples = windowSamples.filter((sample) => sample.long_poll !== true);
  const longPollSamples = windowSamples.filter((sample) => sample.long_poll === true);
  const httpTotal = appHttpSamples.length;
  const http5xx = appHttpSamples.filter((sample) => Number(sample.status_code) >= 500).length;
  const httpP95 = (() => {
    const latencies = appHttpSamples
      .map((sample) => Number(sample.latency_ms))
      .filter((value) => Number.isFinite(value));
    if (!latencies.length) return null;
    return Math.round(computePercentile(latencies, 0.95) || 0);
  })();
  const longPollP95 = (() => {
    const latencies = longPollSamples
      .map((sample) => Number(sample.latency_ms))
      .filter((value) => Number.isFinite(value));
    if (!latencies.length) return null;
    return Math.round(computePercentile(latencies, 0.95) || 0);
  })();

  const paymentRecords = await storage.listPaymentRecords();
  const verifiedRecords = paymentRecords.filter((record) => {
    const status = String(record.verification_status || '').toUpperCase();
    return status === 'VERIFIED' || status === 'VERIFIED_SYNTHETIC';
  }).length;
  const paymentAttempts = Math.max(opsPaymentMetrics.attempts, paymentRecords.length);
  const paymentVerified = Math.max(opsPaymentMetrics.verified, verifiedRecords);
  const paymentFailed = Math.max(0, opsPaymentMetrics.failed);
  const paymentSuccessRate = paymentAttempts > 0 ? paymentVerified / paymentAttempts : null;

  const orders = await storage.listOrders();
  const settlements = await storage.listSettlements({ limit: 2000 });
  const settlementByRequest = new Map(settlements.map((item) => [String(item.request_id), item]));
  const latestReports = await storage.listReconciliationReports({ limit: 1 });
  const latestReconciliationReport = latestReports[0] || null;
  let reconciliationDiffCount = 0;
  let reconciliationDiffAmount = 0;
  let unsettledHeldCount = 0;

  for (const payment of paymentRecords) {
    const requestId = String(payment.request_id || '');
    const settlement = settlementByRequest.get(requestId);
    if (!settlement) {
      reconciliationDiffCount += 1;
      reconciliationDiffAmount += Number(payment.amount || 0);
      continue;
    }
    const status = String(settlement.status || '').toUpperCase();
    if (!['RELEASED', 'REFUNDED', 'HELD'].includes(status)) {
      reconciliationDiffCount += 1;
      reconciliationDiffAmount += Number(payment.amount || 0);
    }
  }

  for (const settlement of settlements) {
    const status = String(settlement.status || '').toUpperCase();
    if (status !== 'HELD') continue;
    const heldTs = Date.parse(settlement.held_at || settlement.updated_at || '');
    if (Number.isFinite(heldTs) && (now - heldTs) >= ORDER_TIMEOUT_MS) {
      unsettledHeldCount += 1;
      reconciliationDiffCount += 1;
      reconciliationDiffAmount += Number(settlement.amount_gross || 0);
    }
    const order = orders.find((item) => String(item.request_id) === String(settlement.request_id));
    if (order) {
      const state = String(order.state || '').toUpperCase();
      if (state === ORDER_STATES.RELEASED && status !== 'RELEASED') reconciliationDiffCount += 1;
      if (state === ORDER_STATES.REFUNDED && status !== 'REFUNDED') reconciliationDiffCount += 1;
    }
  }

  if (latestReconciliationReport) {
    const reportMismatch = Number(
      latestReconciliationReport.mismatch_count
      ?? latestReconciliationReport?.counts?.mismatched
      ?? latestReconciliationReport?.totals?.mismatched
      ?? 0,
    );
    const reportDiffAmount = Number(
      latestReconciliationReport.mismatch_amount
      ?? latestReconciliationReport?.counts?.mismatch_amount
      ?? latestReconciliationReport?.totals?.mismatch_amount
      ?? 0,
    );
    if (reportMismatch > reconciliationDiffCount) reconciliationDiffCount = reportMismatch;
    if (reportDiffAmount > reconciliationDiffAmount) reconciliationDiffAmount = reportDiffAmount;
  }

  const alerts = [];
  if (paymentSuccessRate != null && paymentSuccessRate < OPS_ALERT_PAYMENT_SUCCESS_THRESHOLD) {
    alerts.push({
      code: 'LOW_PAYMENT_SUCCESS_RATE',
      severity: 'high',
      message: 'Payment success rate below threshold',
      value: paymentSuccessRate,
      threshold: OPS_ALERT_PAYMENT_SUCCESS_THRESHOLD,
    });
  }
  const http5xxRate = httpTotal > 0 ? http5xx / httpTotal : 0;
  if (http5xxRate > OPS_ALERT_HTTP_5XX_THRESHOLD) {
    alerts.push({
      code: 'HIGH_HTTP_5XX_RATE',
      severity: 'high',
      message: 'HTTP 5xx ratio above threshold',
      value: http5xxRate,
      threshold: OPS_ALERT_HTTP_5XX_THRESHOLD,
    });
  }
  if (reconciliationDiffCount > OPS_ALERT_RECON_DIFF_THRESHOLD) {
    alerts.push({
      code: 'RECONCILIATION_DIFF',
      severity: 'medium',
      message: 'Payment and settlement reconciliation has mismatches',
      value: reconciliationDiffCount,
      threshold: OPS_ALERT_RECON_DIFF_THRESHOLD,
    });
  }

  return {
    generated_at: nowIso(),
    window_ms: windowMs,
    payments: {
      attempts: paymentAttempts,
      verified: paymentVerified,
      failed: paymentFailed,
      success_rate: paymentSuccessRate,
    },
    http: {
      total_requests: httpTotal,
      total_5xx: http5xx,
      error_rate_5xx: http5xxRate,
      p95_latency_ms: httpP95,
      long_poll_requests: longPollSamples.length,
      long_poll_p95_latency_ms: longPollP95,
    },
    reconciliation: {
      payment_records: paymentRecords.length,
      settlements: settlements.length,
      diff_count: reconciliationDiffCount,
      diff_amount: roundMoney(reconciliationDiffAmount),
      stale_held_count: unsettledHeldCount,
    },
    compensation: {
      running: compensationRuntime.running,
      last_started_at: compensationRuntime.last_started_at,
      last_finished_at: compensationRuntime.last_finished_at,
      last_summary: compensationRuntime.last_summary,
    },
    latest_reconciliation_report: latestReconciliationReport
      ? {
        report_id: latestReconciliationReport.report_id || null,
        generated_at: latestReconciliationReport.generated_at || null,
        period: latestReconciliationReport.period || null,
        mismatch_count: Number(
          latestReconciliationReport.mismatch_count
          ?? latestReconciliationReport?.counts?.mismatched
          ?? latestReconciliationReport?.totals?.mismatched
          ?? 0,
        ),
        mismatch_amount: Number(
          latestReconciliationReport.mismatch_amount
          ?? latestReconciliationReport?.counts?.mismatch_amount
          ?? latestReconciliationReport?.totals?.mismatch_amount
          ?? 0,
        ),
      }
      : null,
    alerts,
  };
}

function computeReputation(rep) {
  const total = rep.total_orders || 0;
  const successRate = total ? rep.success_orders / total : 0;
  const onTimeRate = total ? rep.on_time_orders / total : 0;
  const ratingRate = rep.rating_count ? rep.rating_positive / rep.rating_count : 0;
  const disputeRate = total ? rep.disputes / total : 0;
  const responseScore = rep.avg_response_ms == null
    ? 0
    : Math.max(0, 1 - Math.min(rep.avg_response_ms / 5000, 1));

  const score =
    (successRate * 0.3 +
      onTimeRate * 0.25 +
      ratingRate * 0.25 +
      responseScore * 0.15 +
      (1 - disputeRate) * 0.05) * 100;

  rep.score = Number(score.toFixed(2));
  if (rep.score >= 90) rep.tier = '钻石';
  else if (rep.score >= 75) rep.tier = '黄金';
  else if (rep.score >= 60) rep.tier = '白银';
  else rep.tier = '青铜';
  rep.updated_at = new Date().toISOString();
  return rep;
}

function recordInteraction(requesterId, providerId, intent) {
  if (!requesterId || !providerId) return;
  const history = requesterHistory.get(requesterId) || new Map();
  const entry = history.get(providerId) || { provider_id: providerId, intents: new Set(), count: 0, last_ts: null };
  if (intent) entry.intents.add(intent);
  entry.count += 1;
  entry.last_ts = new Date().toISOString();
  history.set(providerId, entry);
  requesterHistory.set(requesterId, history);
}

async function trackEvent(evt) {
  const payload = evt?.payload || {};
  const requestId = payload.request_id || payload.requestId;
  if (evt?.type === 'REQUEST' && requestId) {
    requestIndex.set(String(requestId), {
      request_id: String(requestId),
      intent: payload.intent,
      requester: evt.sender?.id,
      ts: evt.ts,
    });
  }

  if (evt?.type === 'RESULT' && requestId) {
    const requestInfo = requestIndex.get(String(requestId));
    recordInteraction(requestInfo?.requester, evt.sender?.id, requestInfo?.intent);

    const rep = await getOrCreateReputation(evt.sender?.id);
    if (rep) {
      rep.total_orders += 1;
      if (payload.status === 'success' || payload.status === 'partial') rep.success_orders += 1;
      if (payload.metrics?.latency_ms != null) {
        rep.avg_response_ms = rep.avg_response_ms == null
          ? payload.metrics.latency_ms
          : Math.round((rep.avg_response_ms * 0.7) + (payload.metrics.latency_ms * 0.3));
      }
      computeReputation(rep);
      await storage.saveReputation(rep);
    }

    const status = String(payload.status || '').toLowerCase();
    if (['failed', 'error', 'timeout', 'cancelled', 'canceled'].includes(status)) {
      await createCompensationJob({
        requestId: String(requestId),
        reason: 'FAILED_ORDER',
        runAfter: nowIso(),
        metadata: {
          result_status: status,
          event_id: evt.id || null,
        },
      });
    }
  }
}

function buildSeedEvents(baseTs) {
  const base = new Date(baseTs).getTime();
  const iso = (offsetSeconds) => new Date(base + offsetSeconds * 1000).toISOString();
  return [
    {
      ts: iso(0),
      type: 'REQUEST',
      id: 'req_demo_001',
      sender: { id: 'user:mina' },
      payload: {
        request_id: 'req_demo_001',
        title: 'Draft a product brief for a calm focus timer app',
        intent: 'doc.brief',
        constraints: { max_cost_usd: 4 },
      },
    },
    {
      ts: iso(15),
      type: 'OFFER',
      sender: { id: 'agent:atlas' },
      payload: {
        request_id: 'req_demo_001',
        plan: 'Clarify audience, define positioning, and outline MVP features.',
      },
    },
    {
      ts: iso(32),
      type: 'ACCEPT',
      sender: { id: 'user:mina' },
      payload: { request_id: 'req_demo_001', note: 'Yes, proceed.' },
    },
    {
      ts: iso(140),
      type: 'RESULT',
      sender: { id: 'agent:atlas' },
      payload: {
        request_id: 'req_demo_001',
        summary: 'Brief delivered with positioning, MVP scope, and metrics.',
      },
    },
    {
      ts: iso(180),
      type: 'REQUEST',
      id: 'req_demo_002',
      sender: { id: 'user:ren' },
      payload: {
        request_id: 'req_demo_002',
        title: 'Find three customer quotes about AI copilots',
        intent: 'research.quotes',
        constraints: { max_cost_usd: 2 },
      },
    },
    {
      ts: iso(205),
      type: 'OFFER',
      sender: { id: 'agent:ember' },
      payload: {
        request_id: 'req_demo_002',
        plan: 'Collect quotes from recent interviews and add citations.',
      },
    },
    {
      ts: iso(238),
      type: 'ACCEPT',
      sender: { id: 'user:ren' },
      payload: { request_id: 'req_demo_002', note: 'Please include sources.' },
    },
    {
      ts: iso(350),
      type: 'RESULT',
      sender: { id: 'agent:ember' },
      payload: {
        request_id: 'req_demo_002',
        summary: 'Returned 3 quotes with links and context.',
      },
    },
    {
      ts: iso(380),
      type: 'REQUEST',
      id: 'req_demo_003',
      sender: { id: 'user:sol' },
      payload: {
        request_id: 'req_demo_003',
        title: 'Generate a launch checklist for a community event',
        intent: 'plan.checklist',
        constraints: { max_cost_usd: 3 },
      },
    },
    {
      ts: iso(405),
      type: 'OFFER',
      sender: { id: 'agent:luna' },
      payload: {
        request_id: 'req_demo_003',
        plan: 'Outline timeline, assets, comms, and logistics.',
      },
    },
    {
      ts: iso(432),
      type: 'ACCEPT',
      sender: { id: 'user:sol' },
      payload: { request_id: 'req_demo_003', note: 'Ship a 2-week checklist.' },
    },
    {
      ts: iso(520),
      type: 'RESULT',
      sender: { id: 'agent:luna' },
      payload: {
        request_id: 'req_demo_003',
        summary: 'Checklist delivered with owners and due dates.',
      },
    },
  ];
}

app.use('/v1/ops', requireOpsAuth);

// Health check
app.get('/health', (_req, res) => res.json({ ok: true, version: '1.0.0' }));

// Agents POST envelopes/events here (legacy)
app.post('/events', async (req, res) => {
  const evt = normalizeEnvelope(req.body);
  if (!evt) {
    return res.status(400).json({ ok: false, error: 'INVALID_REQUEST', message: 'Event must be a valid envelope object' });
  }
  const orderTransition = await applyOrderStateTransition(evt);
  if (!orderTransition.ok) {
    return res.status(orderTransition.error === 'ORDER_NOT_FOUND' ? 404 : 409).json({
      ok: false,
      error: orderTransition.error || 'ORDER_TRANSITION_FAILED',
      message: orderTransition.message || 'Order transition failed',
    });
  }
  addEvent(evt);
  res.json({ ok: true, id: evt.id });
});

async function handleGetMessages(req, res) {
  const since = req.query.since;
  const recipient = req.query.recipient;
  const sender = req.query.sender;
  const type = req.query.type;
  const thread = req.query.thread;
  const timeout = Math.min(Number(req.query.timeout) || 30, 60) * 1000; // max 60s
  
  // Build filter function
  const filter = (e) => {
    if (since && (e.ts || '') <= String(since)) return false;
    if (recipient && e.recipient?.id !== recipient) return false;
    if (sender && e.sender?.id !== sender) return false;
    if (type && e.type !== type) return false;
    if (thread && e.thread?.id !== thread) return false;
    return true;
  };
  
  // Check for existing events
  const matching = events.filter(filter);
  if (matching.length > 0) {
    return res.json({ 
      ok: true, 
      events: matching, 
      lastTs: matching[matching.length - 1].ts,
      hasMore: events.length >= MAX_EVENTS 
    });
  }
  
  // No events yet, set up long-polling
  const subscription = {
    matches: filter,
    events: [],
    addEvent(evt) {
      this.events.push(evt);
    },
    resolve: null,
  };
  
  // Create promise that resolves when events arrive or timeout
  const waitPromise = new Promise((resolve) => {
    subscription.resolve = resolve;
    subscriptions.add(subscription);
  });
  
  // Set timeout
  const timeoutId = setTimeout(() => {
    subscription.resolve();
  }, timeout);
  
  // Wait for events or timeout
  await waitPromise;
  clearTimeout(timeoutId);
  subscriptions.delete(subscription);
  
  res.json({
    ok: true,
    events: subscription.events,
    lastTs: subscription.events.length ? subscription.events[subscription.events.length - 1].ts : (since || null),
    hasMore: false
  });
}

// Long-polling subscription endpoint (legacy)
app.get('/events', handleGetMessages);

// v1 messages API
app.post('/v1/messages', async (req, res) => {
  const evt = normalizeEnvelope(req.body);
  if (!evt) {
    return res.status(400).json({ ok: false, error: 'INVALID_REQUEST', message: 'Envelope must be a valid object' });
  }
  const payload = isObject(evt.payload) ? evt.payload : {};
  const requestIdFromPayload = payload.request_id || payload.requestId;

  const requestHash = hashRequestPayload({
    route: '/v1/messages',
    type: evt.type,
    sender: evt.sender?.id || null,
    recipient: evt.recipient?.id || null,
    thread: evt.thread?.id || null,
    payload,
  });
  const explicitIdempotencyKey = readIdempotencyKey(req);
  const derivedAcceptIdempotencyKey = (
    !explicitIdempotencyKey
    && evt.type === 'ACCEPT'
    && requestIdFromPayload
  )
    ? `accept:${String(requestIdFromPayload)}:${String(payload.offer_id || payload.offerId || 'na')}:${String(payload.payment_tx || payload.tx_hash || payload.txHash || evt.id)}`
    : null;
  const idempotencyKey = explicitIdempotencyKey || derivedAcceptIdempotencyKey;
  const idempotentReplay = await loadIdempotentResponse({ idempotencyKey, requestHash });
  if (idempotentReplay) {
    return res.status(idempotentReplay.statusCode).json(idempotentReplay.response);
  }

  if (evt.type === 'REQUEST') {
    const intent = payload.intent;
    const params = payload.params;
    if (typeof intent !== 'string' || !intent) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_REQUEST_INTENT',
        message: 'REQUEST payload.intent is required',
      });
    }
    if (!isObject(params)) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_REQUEST_PARAMS',
        message: 'REQUEST payload.params must be an object',
      });
    }

    const schemaRecord = intentInputSchemas.get(intent);
    if (REQUIRE_INTENT_SCHEMAS && !schemaRecord) {
      return res.status(400).json({
        ok: false,
        error: 'SCHEMA_NOT_REGISTERED',
        message: `No input schema registered for intent "${intent}"`,
      });
    }
    if (schemaRecord) {
      const check = validateJsonSchema(schemaRecord.schema, params, 'payload.params');
      if (!check.ok) {
        return res.status(400).json({
          ok: false,
          error: 'REQUEST_SCHEMA_VALIDATION_FAILED',
          message: `REQUEST params failed schema validation for intent "${intent}"`,
          details: check.errors,
        });
      }
    }
  }

  if (evt.type === 'RESULT') {
    const requestId = requestIdFromPayload;
    const intent = requestIndex.get(String(requestId || ''))?.intent || payload.intent;
    if (typeof intent === 'string' && intent) {
      const schemaRecord = intentOutputSchemas.get(intent);
      if (schemaRecord) {
        const output = payload.output != null ? payload.output : payload;
        const check = validateJsonSchema(schemaRecord.schema, output, 'payload.output');
        if (!check.ok) {
          return res.status(400).json({
            ok: false,
            error: 'RESULT_SCHEMA_VALIDATION_FAILED',
            message: `RESULT payload failed schema validation for intent "${intent}"`,
            details: check.errors,
          });
        }
      }
    }
  }

  if (evt.type === 'ACCEPT') {
    const payment = extractAcceptPaymentPayload(evt);
    const requestId = String(payment.requestId || requestIdFromPayload || '');
    if (!requestId) {
      return res.status(400).json({ ok: false, error: 'INVALID_REQUEST', message: 'ACCEPT requires payload.request_id' });
    }
    if (payment.txHash) {
      const existingPayment = await storage.getPaymentRecordByTxHash(String(payment.txHash));
      if (existingPayment) {
        if (String(existingPayment.request_id) === requestId) {
          const duplicateResponse = {
            ok: true,
            id: existingPayment.accept_event_id || evt.id,
            duplicate: true,
            payment: existingPayment.payment || null,
            order_state: (await storage.getOrder(requestId))?.state || null,
          };
          await persistIdempotencyResponse({
            idempotencyKey,
            requestHash,
            statusCode: 200,
            response: duplicateResponse,
          });
          return res.status(200).json({
            ...duplicateResponse,
            idempotent_replay: Boolean(idempotencyKey),
            idempotency_key: idempotencyKey || undefined,
          });
        }
        return res.status(409).json({
          ok: false,
          error: 'PAYMENT_REPLAY_DETECTED',
          message: 'payment_tx was already used by another request',
          details: {
            request_id: existingPayment.request_id,
            tx_hash: existingPayment.tx_hash,
          },
        });
      }
    }

    if (payment.txHash || REQUIRE_ACCEPT_PAYMENT_VERIFY) {
      const paymentCheck = validatePaymentMetadata({
        token: payment.token,
        chain: payment.chain,
        amount: payment.amount,
      });
      if (!paymentCheck.ok) {
        return res.status(400).json({
          ok: false,
          error: paymentCheck.error || 'INVALID_PAYMENT_METADATA',
          message: paymentCheck.message || 'Invalid payment metadata',
        });
      }
      payment.token = paymentCheck.token;
      payment.chain = paymentCheck.chain;
      payment.amount = paymentCheck.amount;
    }

    if (REQUIRE_ACCEPT_PAYMENT_VERIFY) {
      if (!payment.txHash || !payment.payer || !payment.payee || payment.amount == null) {
        return res.status(400).json({
          ok: false,
          error: 'INVALID_PAYMENT_METADATA',
          message: 'ACCEPT requires payment_tx, payer, payee, and amount when AGORA_REQUIRE_PAYMENT_VERIFY is enabled',
        });
      }
    }

    let verifiedPayment = null;
    if (payment.txHash) {
      opsPaymentMetrics.attempts += 1;
      const verified = await paymentVerifier.verifyUSDCTransfer({
        txHash: payment.txHash,
        chain: payment.chain,
        token: payment.token,
        payer: payment.payer,
        payee: payment.payee,
        amount: payment.amount,
        senderId: payment.senderId,
      });
      if (!verified.ok && REQUIRE_ACCEPT_PAYMENT_VERIFY) {
        opsPaymentMetrics.failed += 1;
        return res.status(402).json({
          ok: false,
          error: 'PAYMENT_NOT_VERIFIED',
          message: verified.message || verified.error || 'Payment verification failed',
          details: verified,
        });
      }
      if (verified.ok) {
        verifiedPayment = verified.payment;
        opsPaymentMetrics.verified += 1;
      } else {
        opsPaymentMetrics.failed += 1;
      }
    }

    if (verifiedPayment) {
      evt.payload = {
        ...payload,
        payment_verification: verifiedPayment,
      };
    }

    if (payment.txHash) {
      const paymentRecord = {
        request_id: requestId,
        tx_hash: String(payment.txHash),
        chain: payment.chain || null,
        token: payment.token || null,
        amount: payment.amount ?? null,
        payer: payment.payer || null,
        payee: payment.payee || null,
        payment: verifiedPayment,
        verification_status: verifiedPayment?.status || 'UNVERIFIED',
        accept_event_id: evt.id,
        sender_id: payment.senderId || null,
        created_at: evt.ts || new Date().toISOString(),
      };
      const inserted = await storage.createPaymentRecord(paymentRecord);
      if (!inserted.ok) {
        const existing = inserted.existing || await storage.getPaymentRecordByTxHash(String(payment.txHash));
        if (existing && String(existing.request_id) === requestId) {
          const duplicateResponse = {
            ok: true,
            id: existing.accept_event_id || evt.id,
            duplicate: true,
            payment: existing.payment || null,
            order_state: (await storage.getOrder(requestId))?.state || null,
          };
          await persistIdempotencyResponse({
            idempotencyKey,
            requestHash,
            statusCode: 200,
            response: duplicateResponse,
          });
          return res.status(200).json({
            ...duplicateResponse,
            idempotent_replay: Boolean(idempotencyKey),
            idempotency_key: idempotencyKey || undefined,
          });
        }
        return res.status(409).json({
          ok: false,
          error: 'PAYMENT_REPLAY_DETECTED',
          message: 'payment_tx conflict detected',
          details: existing || null,
        });
      }
    }

    if (payment.txHash) {
      await ensureSettlementForAccept({
        requestId,
        payer: payment.payer,
        payee: payment.payee,
        amount: payment.amount,
        currency: payment.token || 'USDC',
        heldAt: evt.ts || nowIso(),
      });
    }
  }

  const orderTransition = await applyOrderStateTransition(evt);
  if (!orderTransition.ok) {
    return res.status(orderTransition.error === 'ORDER_NOT_FOUND' ? 404 : 409).json({
      ok: false,
      error: orderTransition.error || 'ORDER_TRANSITION_FAILED',
      message: orderTransition.message || 'Order transition failed',
    });
  }

  addEvent(evt);
  const responseBody = {
    ok: true,
    id: evt.id,
    idempotency_key: idempotencyKey || undefined,
    order_state: orderTransition.order?.state || null,
  };
  await persistIdempotencyResponse({
    idempotencyKey,
    requestHash,
    statusCode: 200,
    response: responseBody,
  });
  res.json(responseBody);
});

app.get('/v1/messages', handleGetMessages);

// Agent registry (MVP)
app.post('/v1/agents', async (req, res) => {
  const body = req.body || {};
  const agent = body.agent && typeof body.agent === 'object' ? body.agent : body;
  if (!agent?.id) {
    return res.status(400).json({ ok: false, error: 'INVALID_REQUEST', message: 'Agent must include id' });
  }

  const caps = Array.isArray(body.capabilities)
    ? body.capabilities
    : Array.isArray(agent.capabilities)
      ? agent.capabilities
      : body.capability
        ? [body.capability]
        : [];

  const schemaBindings = extractIntentSchemaBindings(caps);
  if (REQUIRE_INTENT_SCHEMAS) {
    const missing = schemaBindings
      .filter((binding) => !binding.inputSchema || !binding.outputSchema)
      .map((binding) => binding.intent);
    if (missing.length > 0) {
      return res.status(400).json({
        ok: false,
        error: 'MISSING_INTENT_SCHEMAS',
        message: 'Each declared intent must include both input_schema and output_schema',
        details: { intents: Array.from(new Set(missing)) },
      });
    }
    if (schemaBindings.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'NO_INTENTS_DECLARED',
        message: 'At least one intent with input_schema/output_schema is required',
      });
    }
  }

  const record = upsertAgent({
    id: agent.id,
    name: agent.name,
    url: agent.url,
    description: agent.description || body.description || null,
    portfolio_url: agent.portfolio_url || agent.portfolioUrl || body.portfolio_url || body.portfolioUrl || null,
    metadata: isObject(agent.metadata) ? agent.metadata : isObject(body.metadata) ? body.metadata : null,
    capabilities: caps,
    intents: extractIntentsFromCapabilities(caps),
    pricing: extractPricingFromCapabilities(caps),
    status: body.status || agent.status || 'online',
  });
  await getOrCreateReputation(record.id);
  registerIntentSchemas(schemaBindings, record.id);

  res.json({ ok: true, agent: await decorateAgent(record) });
});

app.get('/v1/agents', async (_req, res) => {
  const enriched = await Promise.all(Array.from(agents.values()).map((agent) => decorateAgent(agent)));
  res.json({ ok: true, agents: enriched });
});

app.post('/v1/agents/:did/heartbeat', async (req, res) => {
  const did = req.params.did;
  const existing = agents.get(did);
  if (!existing) {
    return res.status(404).json({ ok: false, error: 'NOT_FOUND', message: 'Agent not registered' });
  }
  const record = upsertAgent({
    ...existing,
    status: req.body?.status || existing.status || 'online',
  });
  res.json({ ok: true, agent: await decorateAgent(record) });
});

app.get('/v1/agents/:did/status', (req, res) => {
  const did = req.params.did;
  const agent = agents.get(did);
  const status = computeAgentStatus(agent);
  res.json({ ok: true, id: did, ...status });
});

app.get('/v1/discover', async (req, res) => {
  const intent = String(req.query.intent || '');
  const q = String(req.query.q || '');
  const status = String(req.query.status || '');
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const all = Array.from(agents.values());
  const filtered = all.filter((agent) => matchesDirectoryFilters(agent, { intent, q, status }));
  const rankedWithScores = await Promise.all(filtered.map(async (agent) => {
    const rep = await getOrCreateReputation(agent.id);
    const status = computeAgentStatus(agent);
    const score = (rep?.score || 0) + (status.status === 'online' ? 5 : 0);
    return { agent: await decorateAgent(agent), score };
  }));
  const ranked = rankedWithScores
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.agent);
  res.json({
    ok: true,
    query: { intent: intent || null, q: q || null, status: status || null, limit },
    agents: ranked,
  });
});

app.get('/v1/directory', async (req, res) => {
  const intent = String(req.query.intent || '');
  const q = String(req.query.q || '');
  const status = String(req.query.status || '');
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const candidates = Array.from(agents.values()).filter((agent) =>
    matchesDirectoryFilters(agent, { intent, q, status }),
  );

  const rows = await Promise.all(candidates.map(async (agent) => {
    const statusInfo = computeAgentStatus(agent);
    const reputation = await getOrCreateReputation(agent.id);
    return {
      id: agent.id,
      name: agent.name || null,
      description: agent.description || null,
      url: agent.url || null,
      portfolio_url: agent.portfolio_url || null,
      intents: Array.isArray(agent.intents) ? agent.intents : [],
      pricing: Array.isArray(agent.pricing) ? agent.pricing : extractPricingFromCapabilities(agent.capabilities),
      status: statusInfo.status,
      last_seen: statusInfo.last_seen,
      reputation,
      capabilities: Array.isArray(agent.capabilities) ? agent.capabilities : [],
    };
  }));

  rows.sort((a, b) => {
    const scoreA = (a.reputation?.score || 0) + (a.status === 'online' ? 5 : 0);
    const scoreB = (b.reputation?.score || 0) + (b.status === 'online' ? 5 : 0);
    return scoreB - scoreA;
  });

  res.json({
    ok: true,
    query: { intent: intent || null, q: q || null, status: status || null, limit },
    total: rows.length,
    agents: rows.slice(0, limit),
  });
});

app.get('/v1/agents/:did', async (req, res) => {
  const did = req.params.did;
  const agent = agents.get(did);
  if (!agent) {
    return res.status(404).json({ ok: false, error: 'NOT_FOUND', message: 'Agent not registered' });
  }
  res.json({ ok: true, agent: await decorateAgent(agent) });
});

// Reputation system (MVP)
app.post('/v1/reputation/submit', async (req, res) => {
  const body = req.body || {};
  const agentId = body.agent_id || body.agentId;
  if (!agentId) {
    return res.status(400).json({ ok: false, error: 'INVALID_REQUEST', message: 'agent_id required' });
  }
  const rep = await getOrCreateReputation(agentId);
  rep.total_orders += body.total_orders_delta ? Number(body.total_orders_delta) : 0;
  rep.success_orders += body.success_orders_delta ? Number(body.success_orders_delta) : 0;
  rep.on_time_orders += body.on_time_orders_delta ? Number(body.on_time_orders_delta) : 0;
  rep.disputes += body.disputes_delta ? Number(body.disputes_delta) : 0;

  if (body.outcome) {
    rep.total_orders += 1;
    if (body.outcome === 'success' || body.outcome === 'partial') rep.success_orders += 1;
  }
  if (body.on_time === true) rep.on_time_orders += 1;
  if (typeof body.rating === 'number') {
    rep.rating_count += 1;
    if (body.rating >= 4) rep.rating_positive += 1;
  }
  if (typeof body.response_time_ms === 'number') {
    rep.avg_response_ms = rep.avg_response_ms == null
      ? body.response_time_ms
      : Math.round((rep.avg_response_ms * 0.7) + (body.response_time_ms * 0.3));
  }
  if (body.dispute === true) rep.disputes += 1;

  computeReputation(rep);
  await storage.saveReputation(rep);
  res.json({ ok: true, reputation: rep });
});

app.get('/v1/reputation/:did', async (req, res) => {
  const did = req.params.did;
  const rep = await storage.getReputation(did);
  if (!rep) {
    return res.status(404).json({ ok: false, error: 'NOT_FOUND', message: 'No reputation found' });
  }
  res.json({ ok: true, reputation: rep });
});

// Recommendation API (MVP)
app.get('/v1/recommend', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 5, 20);
  const requester = req.query.requester ? String(req.query.requester) : null;
  const intentQuery = req.query.intent || req.query.intents || req.query.basedOn || '';
  const intents = String(intentQuery)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  let candidates = [];
  if (requester && requesterHistory.has(requester)) {
    const history = requesterHistory.get(requester);
    candidates = Array.from(history.values())
      .sort((a, b) => b.count - a.count)
      .map((entry) => agents.get(entry.provider_id))
      .filter(Boolean);
  }

  if (!candidates.length) {
    candidates = Array.from(agents.values());
  }

  if (intents.length) {
    candidates = candidates.filter((agent) => intents.some((intent) => agent.intents?.includes(intent)));
  }

  const rankedWithScores = await Promise.all(candidates.map(async (agent) => {
    const rep = await getOrCreateReputation(agent.id);
    return { agent: await decorateAgent(agent), score: rep?.score || 0 };
  }));
  const ranked = rankedWithScores
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.agent);

  res.json({ ok: true, agents: ranked });
});

app.get('/v1/market-rate', async (req, res) => {
  const intent = req.query.intent ? String(req.query.intent) : null;
  const currency = req.query.currency ? String(req.query.currency).toUpperCase() : null;
  const period = req.query.period ? String(req.query.period) : '7d';
  const periodMs = parsePeriodToMs(period);
  if (!periodMs) {
    return res.status(400).json({
      ok: false,
      error: 'INVALID_PERIOD',
      message: 'period must be one of: 24h, 7d, 30d, 1w, etc.',
    });
  }

  const now = Date.now();
  const report = buildMarketRateReport({ intent, currency, periodMs, now });
  return res.json({
    ok: true,
    query: {
      intent,
      currency,
      period,
      period_ms: periodMs,
    },
    sample_size: report.sample_size,
    rates: report.rates,
    generated_at: new Date(now).toISOString(),
  });
});

app.post('/v1/execute', async (req, res) => {
  if (!ENABLE_SANDBOX_EXECUTE) {
    return res.status(403).json({
      ok: false,
      error: 'SANDBOX_EXECUTION_DISABLED',
      message: 'Sandbox execution is disabled by relay configuration',
    });
  }

  const body = req.body || {};
  const agentId = body.agent_id || body.agentId;
  const requestId = body.request_id || body.requestId;
  const job = isObject(body.job) ? body.job : null;
  const publishResult = body.publish_result !== false;
  const threadId = body.thread_id || body.threadId;
  const explicitIntent = body.intent;

  if (!agentId || !requestId || !job) {
    return res.status(400).json({
      ok: false,
      error: 'INVALID_REQUEST',
      message: 'agent_id, request_id, and job are required',
    });
  }

  const agent = agents.get(String(agentId));
  if (!agent) {
    return res.status(404).json({
      ok: false,
      error: 'AGENT_NOT_FOUND',
      message: 'Agent must be registered before execution',
    });
  }

  if (!isAgentAllowedForSandboxExecution(String(agentId), agent)) {
    return res.status(403).json({
      ok: false,
      error: 'AGENT_NOT_WHITELISTED',
      message: 'Agent is not allowed to use sandbox execution',
      details: {
        allowlistConfigured: EXECUTE_AGENT_ALLOWLIST.size > 0,
      },
    });
  }

  const requestInfo = requestIndex.get(String(requestId));
  const intent = typeof explicitIntent === 'string' && explicitIntent
    ? explicitIntent
    : requestInfo?.intent;

  const runnerPayload = {
    job: {
      language: job.language || 'nodejs',
      code: job.code,
      stdin: job.stdin,
      timeout_ms: job.timeout_ms,
      max_memory_mb: job.max_memory_mb,
      network: job.network,
      readonly_files: Array.isArray(job.readonly_files) ? job.readonly_files : [],
      artifacts: Array.isArray(job.artifacts) ? job.artifacts : [],
    },
  };

  const execution = await executeInSandboxRunner(runnerPayload);
  if (!execution.ok) {
    return res.status(502).json({
      ok: false,
      error: execution.error,
      message: execution.message || 'Sandbox runner returned an error',
      details: execution.details,
    });
  }

  const resultStatus = mapExecutionStatusToResultStatus(execution.execution.status);
  let eventId = null;
  if (publishResult) {
    const event = {
      version: '1.0',
      id: `result_exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ts: new Date().toISOString(),
      type: 'RESULT',
      sender: { id: String(agentId) },
      thread: threadId ? { id: String(threadId) } : undefined,
      payload: {
        request_id: String(requestId),
        intent: intent || undefined,
        status: resultStatus,
        output: {
          status: execution.execution.status,
          exit_code: execution.execution.exit_code,
          signal: execution.execution.signal,
          stdout: execution.execution.stdout,
          stderr: execution.execution.stderr,
        },
        artifacts: execution.execution.artifacts || [],
        metrics: {
          latency_ms: execution.execution.duration_ms,
        },
        execution: {
          run_id: execution.execution.run_id,
          started_at: execution.execution.started_at,
          finished_at: execution.execution.finished_at,
          duration_ms: execution.execution.duration_ms,
          timeout_ms: execution.execution.timeout_ms,
          max_memory_mb: execution.execution.max_memory_mb,
          network_enabled: execution.execution.network_enabled,
        },
      },
    };
    const orderTransition = await applyOrderStateTransition(event);
    if (!orderTransition.ok) {
      return res.status(orderTransition.error === 'ORDER_NOT_FOUND' ? 404 : 409).json({
        ok: false,
        error: orderTransition.error || 'ORDER_TRANSITION_FAILED',
        message: orderTransition.message || 'Order transition failed',
      });
    }
    addEvent(event);
    eventId = event.id;
  }

  return res.json({
    ok: true,
    request_id: String(requestId),
    agent_id: String(agentId),
    event_published: publishResult,
    event_id: eventId,
    execution: execution.execution,
  });
});

app.post('/v1/payments/verify', async (req, res) => {
  const body = req.body || {};
  const txHash = body.tx_hash || body.txHash || body.payment_tx;
  const chain = body.chain || body.network || 'base-sepolia';
  const token = body.token || 'USDC';
  const payer = body.payer || body.buyer;
  const payee = body.payee || body.seller || body.provider;
  const amount = body.amount ?? body.amount_usdc ?? body.price;
  const senderId = body.sender_id || body.senderId;

  const paymentCheck = validatePaymentMetadata({ token, chain, amount });
  if (!paymentCheck.ok) {
    return res.status(400).json({
      ok: false,
      error: paymentCheck.error || 'INVALID_PAYMENT_METADATA',
      message: paymentCheck.message || 'Invalid payment metadata',
    });
  }

  opsPaymentMetrics.attempts += 1;
  const verification = await paymentVerifier.verifyUSDCTransfer({
    txHash,
    chain: paymentCheck.chain,
    token: paymentCheck.token,
    payer,
    payee,
    amount: paymentCheck.amount,
    senderId,
  });

  if (!verification.ok) {
    opsPaymentMetrics.failed += 1;
    const statusCode = verification.error === 'TX_NOT_FOUND' || verification.error === 'TX_UNCONFIRMED'
      ? 409
      : 400;
    return res.status(statusCode).json({
      ok: false,
      error: verification.error || 'PAYMENT_VERIFY_FAILED',
      message: verification.message || 'Failed to verify payment',
      pending: verification.pending || false,
      confirmations: verification.confirmations ?? null,
    });
  }

  opsPaymentMetrics.verified += 1;

  return res.json({
    ok: true,
    payment: verification.payment,
  });
});

// Escrow + settlement (MVP)
app.post('/v1/escrow/hold', async (req, res) => {
  const body = req.body || {};
  const requestId = body.request_id || body.requestId;
  const payer = body.payer;
  const payee = body.payee;
  const amount = Number(body.amount || 0);
  const currency = body.currency || body.token || 'USDC';
  const chain = body.chain || body.network || 'base-sepolia';
  const feeBps = Number(body.fee_bps || PLATFORM_FEE_BPS);

  if (!requestId || !payer || !payee || !amount) {
    return res.status(400).json({ ok: false, error: 'INVALID_REQUEST', message: 'request_id, payer, payee, amount required' });
  }
  const paymentCheck = validatePaymentMetadata({ token: currency, chain, amount });
  if (!paymentCheck.ok) {
    return res.status(400).json({
      ok: false,
      error: paymentCheck.error || 'INVALID_PAYMENT_METADATA',
      message: paymentCheck.message || 'Invalid payment metadata',
    });
  }

  const held = await holdEscrowFunds({
    requestId: String(requestId),
    payer,
    payee,
    amount: paymentCheck.amount,
    currency: paymentCheck.token,
    feeBps,
    heldAt: nowIso(),
    source: 'escrow_hold_api',
  });
  if (!held.ok) {
    return res.status(409).json({
      ok: false,
      error: held.error || 'ESCROW_HOLD_FAILED',
      message: held.message || 'Failed to hold escrow funds',
    });
  }
  const record = await storage.getEscrow(String(requestId));
  const escrowHeldEvent = {
    version: '1.0',
    id: `escrow_held_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ts: new Date().toISOString(),
    type: 'ESCROW_HELD',
    sender: { id: 'relay:escrow' },
    payload: {
      request_id: record.request_id,
      payer: record.payer,
      payee: record.payee,
      amount: record.amount,
      currency: record.currency,
      status: record.status,
      held_at: record.held_at,
    },
  };
  const orderTransition = await applyOrderStateTransition(escrowHeldEvent);
  if (!orderTransition.ok) {
    return res.status(orderTransition.error === 'ORDER_NOT_FOUND' ? 404 : 409).json({
      ok: false,
      error: orderTransition.error || 'ORDER_TRANSITION_FAILED',
      message: orderTransition.message || 'Order transition failed',
    });
  }
  addEvent(escrowHeldEvent);
  const settlement = await storage.getSettlement(String(requestId));
  res.json({ ok: true, escrow: record, settlement, duplicate: held.duplicate === true });
});

app.post('/v1/escrow/release', async (req, res) => {
  const body = req.body || {};
  const requestId = body.request_id || body.requestId;
  const resolution = body.resolution || 'success';
  const settled = await releaseOrRefundEscrow({
    requestId: String(requestId),
    resolution: resolution === 'refund' ? 'refund' : 'success',
    reason: body.reason || null,
    actor: 'escrow_release_api',
  });
  if (!settled.ok) {
    const statusCode = settled.error === 'NOT_FOUND' ? 404 : 409;
    return res.status(statusCode).json({
      ok: false,
      error: settled.error || 'ESCROW_RELEASE_FAILED',
      message: settled.message || 'Failed to settle escrow',
    });
  }
  const record = await storage.getEscrow(String(requestId));
  const settlement = await storage.getSettlement(String(requestId));
  const escrowEvent = {
    version: '1.0',
    id: `escrow_${String(record.status || '').toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ts: new Date().toISOString(),
    type: settled.escrowType,
    sender: { id: 'relay:escrow' },
    payload: {
      request_id: record.request_id,
      payer: record.payer,
      payee: record.payee,
      amount: record.amount,
      currency: record.currency,
      fee: record.fee,
      payout: record.payout,
      status: record.status,
      released_at: record.released_at,
    },
  };
  const orderTransition = await applyOrderStateTransition(escrowEvent);
  if (!orderTransition.ok) {
    return res.status(orderTransition.error === 'ORDER_NOT_FOUND' ? 404 : 409).json({
      ok: false,
      error: orderTransition.error || 'ORDER_TRANSITION_FAILED',
      message: orderTransition.message || 'Order transition failed',
    });
  }
  addEvent(escrowEvent);
  res.json({ ok: true, escrow: record, settlement });
});

app.get('/v1/escrow/:requestId', async (req, res) => {
  const record = await storage.getEscrow(String(req.params.requestId));
  if (!record) {
    return res.status(404).json({ ok: false, error: 'NOT_FOUND', message: 'Escrow not found' });
  }
  res.json({ ok: true, escrow: record });
});

app.get('/v1/ledger', async (_req, res) => {
  const accounts = await storage.listLedgerAccounts();
  res.json({ ok: true, accounts });
});

app.get('/v1/ledger/entries', async (req, res) => {
  const requestId = req.query.request_id || req.query.requestId;
  const limit = Math.min(Number(req.query.limit) || 200, 1000);
  const entries = await storage.listLedgerJournalEntries({
    request_id: requestId ? String(requestId) : null,
    limit,
  });
  res.json({ ok: true, total: entries.length, entries });
});

app.get('/v1/ledger/entries/:entryId', async (req, res) => {
  const entry = await storage.getLedgerJournalEntry(String(req.params.entryId));
  if (!entry) {
    return res.status(404).json({ ok: false, error: 'NOT_FOUND', message: 'Ledger entry not found' });
  }
  const postings = await storage.listLedgerPostings({
    entry_id: String(req.params.entryId),
    limit: 2000,
  });
  res.json({ ok: true, entry, postings });
});

app.get('/v1/ledger/postings', async (req, res) => {
  const requestId = req.query.request_id || req.query.requestId;
  const entryId = req.query.entry_id || req.query.entryId;
  const accountId = req.query.account_id || req.query.accountId;
  const limit = Math.min(Number(req.query.limit) || 500, 2000);
  const postings = await storage.listLedgerPostings({
    request_id: requestId ? String(requestId) : null,
    entry_id: entryId ? String(entryId) : null,
    account_id: accountId ? String(accountId) : null,
    limit,
  });
  res.json({ ok: true, total: postings.length, postings });
});

app.get('/v1/ledger/:id', async (req, res) => {
  const account = await storage.getLedgerAccount(req.params.id);
  if (!account) {
    return res.status(404).json({ ok: false, error: 'NOT_FOUND', message: 'Account not found' });
  }
  res.json({ ok: true, account });
});

app.get('/v1/settlements', async (req, res) => {
  const status = req.query.status ? String(req.query.status).toUpperCase() : null;
  const limit = Math.min(Number(req.query.limit) || 500, 2000);
  const settlements = await storage.listSettlements({ status, limit });
  res.json({ ok: true, total: settlements.length, settlements });
});

app.get('/v1/settlements/:requestId', async (req, res) => {
  const settlement = await storage.getSettlement(String(req.params.requestId));
  if (!settlement) {
    return res.status(404).json({ ok: false, error: 'NOT_FOUND', message: 'Settlement not found' });
  }
  res.json({ ok: true, settlement });
});

app.get('/v1/orders', async (req, res) => {
  const state = req.query.state ? String(req.query.state).toUpperCase() : null;
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const orders = await storage.listOrders();
  const filtered = state
    ? orders.filter((order) => String(order.state || '').toUpperCase() === state)
    : orders;
  res.json({
    ok: true,
    total: filtered.length,
    orders: filtered.slice(0, limit),
  });
});

app.get('/v1/orders/:requestId', async (req, res) => {
  const order = await storage.getOrder(String(req.params.requestId));
  if (!order) {
    return res.status(404).json({ ok: false, error: 'NOT_FOUND', message: 'Order not found' });
  }
  res.json({ ok: true, order });
});

app.get('/v1/payments/records', async (req, res) => {
  const since = req.query.since ? Date.parse(String(req.query.since)) : null;
  const limit = Math.min(Number(req.query.limit) || 200, 1000);
  const records = await storage.listPaymentRecords();
  const filtered = Number.isFinite(since)
    ? records.filter((record) => {
      const ts = Date.parse(record.created_at || record.updated_at || '');
      return Number.isFinite(ts) && ts >= since;
    })
    : records;
  res.json({
    ok: true,
    total: filtered.length,
    records: filtered.slice(0, limit),
  });
});

app.get('/v1/ops/compensation/jobs', async (req, res) => {
  const status = req.query.status ? String(req.query.status).toUpperCase() : null;
  const requestId = req.query.request_id || req.query.requestId;
  const limit = Math.min(Number(req.query.limit) || 200, 1000);
  const jobs = await storage.listCompensationJobs({
    status,
    request_id: requestId ? String(requestId) : null,
    limit,
  });
  res.json({
    ok: true,
    total: jobs.length,
    jobs,
    runtime: compensationRuntime,
  });
});

app.post('/v1/ops/compensation/run', async (req, res) => {
  const trigger = req.body?.trigger ? String(req.body.trigger) : 'manual_api';
  const result = await runCompensationJobsOnce(trigger);
  res.json({
    ok: true,
    ...result,
  });
});

app.post('/v1/ops/reconciliation/report', async (req, res) => {
  const body = req.body || {};
  const report = {
    report_id: body.report_id || `recon_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    generated_at: body.generated_at || nowIso(),
    relay: body.relay || null,
    period: body.period || null,
    counts: isObject(body.counts) ? body.counts : null,
    mismatch_count: Number(body.mismatch_count || 0),
    mismatch_amount: Number(body.mismatch_amount || 0),
    data: body.data && isObject(body.data) ? body.data : null,
    updated_at: nowIso(),
  };
  await storage.saveReconciliationReport(report);
  res.json({ ok: true, report });
});

app.get('/v1/ops/reconciliation/reports', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 500);
  const reports = await storage.listReconciliationReports({ limit });
  res.json({ ok: true, total: reports.length, reports });
});

app.get('/v1/ops/dashboard', async (req, res) => {
  const windowRaw = req.query.window_ms || req.query.windowMs;
  const windowMs = Math.max(
    60_000,
    Math.min(Number(windowRaw || OPS_HTTP_WINDOW_MS), 7 * 24 * 60 * 60 * 1000),
  );
  const dashboard = await buildOpsDashboard(windowMs);
  res.json({
    ok: true,
    dashboard,
  });
});

// Demo seed endpoint
app.post('/seed', (_req, res) => {
  const seedEvents = buildSeedEvents(new Date().toISOString());
  seedEvents.forEach(addEvent);
  res.json({ ok: true, count: seedEvents.length });
});

setInterval(() => {
  runCompensationJobsOnce('interval').catch((error) => {
    console.error('[compensation] run failed:', error?.message || error);
  });
}, COMPENSATION_POLL_MS);

const port = Number(process.env.PORT || 8789);
app.listen(port, () => {
  console.log(`Agora relay listening on http://localhost:${port}`);
  console.log(`  - POST /events  - Submit events`);
  console.log(`  - GET /events   - Subscribe (long-polling)`);
  console.log(`  - POST /v1/execute - Run sandboxed job via runner`);
  console.log(`  - POST /seed    - Seed demo data`);
  console.log(`  - Storage mode  - ${storage.mode}`);
});
