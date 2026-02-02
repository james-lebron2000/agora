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

app.get('/health', (_req, res) => res.json({ ok: true }));

// Seed deterministic demo events (for UI demos)
app.post('/seed', (_req, res) => {
  const now = Date.now();
  const base = new Date(now).toISOString();

  const seed = [
    {
      ts: base,
      type: 'REQUEST',
      id: 'req_1',
      sender: { id: 'demo:requester' },
      payload: { request_id: 'req_1', intent: 'translate.en_zh', params: { text: 'Hello, baby parrot.' }, budget_usd: 0.01 },
    },
    {
      ts: new Date(now + 1000).toISOString(),
      type: 'OFFER',
      id: 'off_1',
      sender: { id: 'demo:PolyglotBot' },
      payload: { request_id: 'req_1', offer_id: 'off_1', price_usd: 0.005, eta_sec: 10 },
    },
    {
      ts: new Date(now + 2000).toISOString(),
      type: 'ACCEPT',
      id: 'acc_1',
      sender: { id: 'demo:requester' },
      payload: { request_id: 'req_1', offer_id: 'off_1' },
    },
    {
      ts: new Date(now + 3000).toISOString(),
      type: 'RESULT',
      id: 'res_1',
      sender: { id: 'demo:PolyglotBot' },
      payload: { request_id: 'req_1', status: 'COMPLETED', data: { zh: '你好，小鹦鹉宝宝。' } },
    },

    {
      ts: new Date(now + 4000).toISOString(),
      type: 'REQUEST',
      id: 'req_2',
      sender: { id: 'demo:requester' },
      payload: { request_id: 'req_2', intent: 'code.review', params: { repo: 'agora', focus: 'security' }, budget_usd: 0.2 },
    },
    {
      ts: new Date(now + 5000).toISOString(),
      type: 'OFFER',
      id: 'off_2a',
      sender: { id: 'demo:CleanCodeAI' },
      payload: { request_id: 'req_2', offer_id: 'off_2a', price_usd: 0.1, eta_sec: 60 },
    },
    {
      ts: new Date(now + 5200).toISOString(),
      type: 'OFFER',
      id: 'off_2b',
      sender: { id: 'demo:SecurityScanner' },
      payload: { request_id: 'req_2', offer_id: 'off_2b', price_usd: 0.15, eta_sec: 45 },
    },

    {
      ts: new Date(now + 6000).toISOString(),
      type: 'REQUEST',
      id: 'req_3',
      sender: { id: 'demo:requester' },
      payload: { request_id: 'req_3', intent: 'image.generate', params: { prompt: 'A minimalist logo for Agora' }, budget_usd: 0.05 },
    },
  ];

  for (const evt of seed) addEvent(evt);
  res.json({ ok: true, added: seed.length });
});

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

const port = Number(process.env.PORT || 8789);
app.listen(port, () => {
  console.log(`Agora relay listening on http://localhost:${port}`);
});
