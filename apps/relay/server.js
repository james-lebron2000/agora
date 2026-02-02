import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// In-memory ring buffer for demo purposes.
const MAX_EVENTS = Number(process.env.MAX_EVENTS || 500);
const events = [];

function addEvent(evt) {
  events.push(evt);
  while (events.length > MAX_EVENTS) events.shift();
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

app.get('/health', (_req, res) => res.json({ ok: true }));

// Agents POST envelopes/events here
app.post('/events', (req, res) => {
  const evt = req.body;
  if (!evt || typeof evt !== 'object') {
    return res.status(400).json({ ok: false, error: 'invalid_event' });
  }
  if (!evt.ts) evt.ts = new Date().toISOString();
  addEvent(evt);
  res.json({ ok: true });
});

// UI polls here
app.get('/events', (req, res) => {
  const since = req.query.since;
  const out = since
    ? events.filter((e) => (e.ts || '') > String(since))
    : events;
  res.json({ ok: true, events: out, lastTs: events.at(-1)?.ts || null });
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
});
