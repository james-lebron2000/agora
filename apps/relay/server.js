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
