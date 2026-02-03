import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// In-memory ring buffer for demo purposes.
const MAX_EVENTS = Number(process.env.MAX_EVENTS || 500);
const events = [];

// In-memory agent registry for discovery (MVP).
const AGENT_TTL_MS = Number(process.env.AGENT_TTL_MS || 5 * 60 * 1000);
const agents = new Map();
const reputations = new Map();
const requestIndex = new Map();
const requesterHistory = new Map();

// Escrow + ledger (MVP in-memory)
const escrows = new Map();
const ledger = new Map();

// Active subscriptions for long-polling
const subscriptions = new Set();

function addEvent(evt) {
  events.push(evt);
  while (events.length > MAX_EVENTS) events.shift();

  trackEvent(evt);
  
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

function decorateAgent(agent) {
  if (!agent) return null;
  const status = computeAgentStatus(agent);
  const reputation = reputations.get(agent.id);
  return {
    ...agent,
    ...status,
    reputation,
  };
}

function ensureLedgerAccount(id) {
  if (!id) return null;
  if (!ledger.has(id)) {
    ledger.set(id, { id, balance: 0, currency: 'USDC', updated_at: new Date().toISOString() });
  }
  return ledger.get(id);
}

function adjustBalance(id, amount) {
  const account = ensureLedgerAccount(id);
  if (!account) return null;
  account.balance = Number((account.balance + amount).toFixed(6));
  account.updated_at = new Date().toISOString();
  return account;
}

function ensureReputation(agentId) {
  if (!agentId) return null;
  if (!reputations.has(agentId)) {
    reputations.set(agentId, {
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
    });
  }
  return reputations.get(agentId);
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

function trackEvent(evt) {
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

    const rep = ensureReputation(evt.sender?.id);
    if (rep) {
      rep.total_orders += 1;
      if (payload.status === 'success' || payload.status === 'partial') rep.success_orders += 1;
      if (payload.metrics?.latency_ms != null) {
        rep.avg_response_ms = rep.avg_response_ms == null
          ? payload.metrics.latency_ms
          : Math.round((rep.avg_response_ms * 0.7) + (payload.metrics.latency_ms * 0.3));
      }
      computeReputation(rep);
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

// Health check
app.get('/health', (_req, res) => res.json({ ok: true, version: '1.0.0' }));

// Agents POST envelopes/events here (legacy)
app.post('/events', (req, res) => {
  const evt = normalizeEnvelope(req.body);
  if (!evt) {
    return res.status(400).json({ ok: false, error: 'INVALID_REQUEST', message: 'Event must be a valid envelope object' });
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
app.post('/v1/messages', (req, res) => {
  const evt = normalizeEnvelope(req.body);
  if (!evt) {
    return res.status(400).json({ ok: false, error: 'INVALID_REQUEST', message: 'Envelope must be a valid object' });
  }
  addEvent(evt);
  res.json({ ok: true, id: evt.id });
});

app.get('/v1/messages', handleGetMessages);

// Agent registry (MVP)
app.post('/v1/agents', (req, res) => {
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

  const record = upsertAgent({
    id: agent.id,
    name: agent.name,
    url: agent.url,
    capabilities: caps,
    intents: extractIntentsFromCapabilities(caps),
    status: body.status || agent.status || 'online',
  });

  res.json({ ok: true, agent: decorateAgent(record) });
});

app.get('/v1/agents', (_req, res) => {
  res.json({ ok: true, agents: Array.from(agents.values()).map(decorateAgent) });
});

app.post('/v1/agents/:did/heartbeat', (req, res) => {
  const did = req.params.did;
  const existing = agents.get(did);
  if (!existing) {
    return res.status(404).json({ ok: false, error: 'NOT_FOUND', message: 'Agent not registered' });
  }
  const record = upsertAgent({
    ...existing,
    status: req.body?.status || existing.status || 'online',
  });
  res.json({ ok: true, agent: decorateAgent(record) });
});

app.get('/v1/agents/:did/status', (req, res) => {
  const did = req.params.did;
  const agent = agents.get(did);
  const status = computeAgentStatus(agent);
  res.json({ ok: true, id: did, ...status });
});

app.get('/v1/discover', (req, res) => {
  const intent = String(req.query.intent || '');
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const all = Array.from(agents.values());
  const filtered = intent
    ? all.filter((agent) => Array.isArray(agent.intents) && agent.intents.includes(intent))
    : all;
  const ranked = filtered
    .map((agent) => {
      const rep = reputations.get(agent.id);
      const status = computeAgentStatus(agent);
      const score = (rep?.score || 0) + (status.status === 'online' ? 5 : 0);
      return { agent: decorateAgent(agent), score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.agent);
  res.json({ ok: true, agents: ranked });
});

app.get('/v1/agents/:did', (req, res) => {
  const did = req.params.did;
  const agent = agents.get(did);
  if (!agent) {
    return res.status(404).json({ ok: false, error: 'NOT_FOUND', message: 'Agent not registered' });
  }
  res.json({ ok: true, agent: decorateAgent(agent) });
});

// Reputation system (MVP)
app.post('/v1/reputation/submit', (req, res) => {
  const body = req.body || {};
  const agentId = body.agent_id || body.agentId;
  if (!agentId) {
    return res.status(400).json({ ok: false, error: 'INVALID_REQUEST', message: 'agent_id required' });
  }
  const rep = ensureReputation(agentId);
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
  res.json({ ok: true, reputation: rep });
});

app.get('/v1/reputation/:did', (req, res) => {
  const did = req.params.did;
  const rep = reputations.get(did);
  if (!rep) {
    return res.status(404).json({ ok: false, error: 'NOT_FOUND', message: 'No reputation found' });
  }
  res.json({ ok: true, reputation: rep });
});

// Recommendation API (MVP)
app.get('/v1/recommend', (req, res) => {
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

  const ranked = candidates
    .map((agent) => {
      const rep = reputations.get(agent.id);
      return { agent: decorateAgent(agent), score: rep?.score || 0 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.agent);

  res.json({ ok: true, agents: ranked });
});

// Escrow + settlement (MVP)
app.post('/v1/escrow/hold', (req, res) => {
  const body = req.body || {};
  const requestId = body.request_id || body.requestId;
  const payer = body.payer;
  const payee = body.payee;
  const amount = Number(body.amount || 0);
  const currency = body.currency || 'USDC';
  const feeBps = Number(body.fee_bps || 1000);

  if (!requestId || !payer || !payee || !amount) {
    return res.status(400).json({ ok: false, error: 'INVALID_REQUEST', message: 'request_id, payer, payee, amount required' });
  }

  const record = {
    request_id: String(requestId),
    payer,
    payee,
    amount,
    currency,
    fee_bps: feeBps,
    status: 'HELD',
    held_at: new Date().toISOString(),
  };
  escrows.set(String(requestId), record);
  res.json({ ok: true, escrow: record });
});

app.post('/v1/escrow/release', (req, res) => {
  const body = req.body || {};
  const requestId = body.request_id || body.requestId;
  const resolution = body.resolution || 'success';
  const record = escrows.get(String(requestId));
  if (!record) {
    return res.status(404).json({ ok: false, error: 'NOT_FOUND', message: 'Escrow not found' });
  }

  if (record.status !== 'HELD') {
    return res.status(400).json({ ok: false, error: 'INVALID_STATE', message: 'Escrow already released' });
  }

  if (resolution === 'refund') {
    adjustBalance(record.payer, record.amount);
    record.status = 'REFUNDED';
  } else {
    const fee = Number((record.amount * (record.fee_bps / 10000)).toFixed(6));
    const payout = Number((record.amount - fee).toFixed(6));
    adjustBalance(record.payee, payout);
    adjustBalance('platform', fee);
    record.status = 'RELEASED';
    record.fee = fee;
    record.payout = payout;
  }

  record.released_at = new Date().toISOString();
  escrows.set(String(requestId), record);
  res.json({ ok: true, escrow: record });
});

app.get('/v1/escrow/:requestId', (req, res) => {
  const record = escrows.get(String(req.params.requestId));
  if (!record) {
    return res.status(404).json({ ok: false, error: 'NOT_FOUND', message: 'Escrow not found' });
  }
  res.json({ ok: true, escrow: record });
});

app.get('/v1/ledger', (_req, res) => {
  res.json({ ok: true, accounts: Array.from(ledger.values()) });
});

app.get('/v1/ledger/:id', (req, res) => {
  const account = ledger.get(req.params.id);
  if (!account) {
    return res.status(404).json({ ok: false, error: 'NOT_FOUND', message: 'Account not found' });
  }
  res.json({ ok: true, account });
});

// Demo seed endpoint
app.post('/seed', (_req, res) => {
  const seedEvents = buildSeedEvents(new Date().toISOString());
  seedEvents.forEach(addEvent);
  res.json({ ok: true, count: seedEvents.length });
});

const port = Number(process.env.PORT || 8789);
app.listen(port, () => {
  console.log(`Agora relay listening on http://localhost:${port}`);
  console.log(`  - POST /events  - Submit events`);
  console.log(`  - GET /events   - Subscribe (long-polling)`);
  console.log(`  - POST /seed    - Seed demo data`);
});
