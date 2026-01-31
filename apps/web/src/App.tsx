import { useEffect, useMemo, useState } from 'react'
import './App.css'

type AgoraEvent = {
  ts: string
  type: string
  id?: string
  sender?: { id?: string; signature?: string }
  payload?: any
  verify?: { ok: boolean; reason?: string }
}

type EventsResp = { ok: boolean; events: AgoraEvent[]; lastTs: string | null }

function Badge({ ok, text }: { ok: boolean; text: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 12,
        border: '1px solid',
        borderColor: ok ? '#16a34a' : '#dc2626',
        color: ok ? '#16a34a' : '#dc2626',
      }}
    >
      {text}
    </span>
  )
}

export default function App() {
  const relayUrl = useMemo(() => {
    const env = (import.meta as any).env
    return (env?.VITE_RELAY_URL as string) || 'http://localhost:8789'
  }, [])

  const [events, setEvents] = useState<AgoraEvent[]>([])
  const [lastTs, setLastTs] = useState<string | null>(null)
  const [intent, setIntent] = useState('demo.echo')
  const [budget, setBudget] = useState('0')
  const [sending, setSending] = useState(false)

  async function poll() {
    const url = new URL(relayUrl + '/events')
    if (lastTs) url.searchParams.set('since', lastTs)
    const res = await fetch(url)
    const json = (await res.json()) as EventsResp
    if (!json.ok) return
    if (json.events.length) {
      setEvents((prev) => [...prev, ...json.events])
    }
    if (json.lastTs) setLastTs(json.lastTs)
  }

  useEffect(() => {
    const t = setInterval(() => {
      poll().catch(() => {})
    }, 800)
    poll().catch(() => {})
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relayUrl, lastTs])

  async function sendRequest() {
    setSending(true)
    try {
      await fetch(relayUrl + '/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ts: new Date().toISOString(),
          type: 'UI_REQUEST',
          payload: { intent, constraints: { max_cost_usd: Number(budget || '0') } },
        }),
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>Agora Demo</h1>
          <div style={{ color: '#64748b', fontSize: 14 }}>Relay: {relayUrl}</div>
        </div>
        <Badge ok={true} text="v1 demo" />
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16, marginTop: 16 }}>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Control Panel</h3>
          <label style={{ display: 'block', fontSize: 12, color: '#475569' }}>Intent</label>
          <input value={intent} onChange={(e) => setIntent(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 6 }} />

          <label style={{ display: 'block', fontSize: 12, color: '#475569', marginTop: 12 }}>Max cost (USD)</label>
          <input value={budget} onChange={(e) => setBudget(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 6 }} />

          <button
            onClick={() => sendRequest()}
            disabled={sending}
            style={{ marginTop: 14, width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #0f172a' }}
          >
            {sending ? 'Sending…' : 'Send REQUEST'}
          </button>

          <div style={{ marginTop: 16, fontSize: 12, color: '#64748b' }}>
            Tip: start the relay locally with <code>npm run dev</code> in <code>apps/relay</code>.
          </div>
        </div>

        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Timeline</h3>
          {events.length === 0 ? (
            <div style={{ color: '#64748b' }}>No events yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {events
                .slice()
                .sort((a, b) => (a.ts || '').localeCompare(b.ts || ''))
                .map((e, idx) => (
                  <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontWeight: 600 }}>{e.type}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{e.ts}</div>
                    </div>
                    <div style={{ marginTop: 6, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ fontSize: 12, color: '#475569' }}>sender: {e.sender?.id || '-'}</div>
                      {typeof e.verify?.ok === 'boolean' ? <Badge ok={e.verify.ok} text={e.verify.ok ? 'signature OK' : 'signature FAIL'} /> : null}
                    </div>
                    <details style={{ marginTop: 8 }}>
                      <summary style={{ cursor: 'pointer', color: '#0f172a' }}>Details</summary>
                      <pre style={{ marginTop: 8, padding: 10, background: '#0b1020', color: '#e2e8f0', overflow: 'auto' }}>
                        {JSON.stringify(e, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
