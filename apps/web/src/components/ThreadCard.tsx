import type { Thread } from '../lib/agora'

function Pill({ text, tone }: { text: string; tone: 'gray' | 'green' | 'blue' }) {
  const colors: Record<string, { bg: string; fg: string; bd: string }> = {
    gray: { bg: '#f1f5f9', fg: '#0f172a', bd: '#e2e8f0' },
    green: { bg: '#dcfce7', fg: '#14532d', bd: '#86efac' },
    blue: { bg: '#dbeafe', fg: '#1e3a8a', bd: '#93c5fd' },
  }
  const c = colors[tone]
  return (
    <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 999, background: c.bg, color: c.fg, border: `1px solid ${c.bd}` }}>
      {text}
    </span>
  )
}

export function ThreadCard({ thread }: { thread: Thread }) {
  const statusTone = thread.status === 'COMPLETED' ? 'green' : thread.status === 'ACTIVE' ? 'blue' : 'gray'

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontWeight: 700 }}>{thread.intent || 'unknown.intent'}</div>
        <Pill text={thread.status} tone={statusTone as any} />
      </div>

      <div style={{ marginTop: 6, fontSize: 13, color: '#475569' }}>
        request_id: <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{thread.requestId}</span>
      </div>
      <div style={{ marginTop: 6, fontSize: 13, color: '#475569' }}>requester: {thread.requester || '-'}</div>
      {typeof thread.budgetUsd === 'number' ? <div style={{ marginTop: 6, fontSize: 13, color: '#475569' }}>budget: ${thread.budgetUsd}</div> : null}

      {thread.offers.length ? (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>Offers</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
            {thread.offers.map((o) => (
              <div key={o.offerId} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13 }}>
                <div style={{ color: '#0f172a' }}>{o.provider}</div>
                <div style={{ color: '#475569' }}>
                  {typeof o.priceUsd === 'number' ? `$${o.priceUsd}` : '$-'} {typeof o.etaSec === 'number' ? `· ${o.etaSec}s` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 10, color: '#64748b', fontSize: 13 }}>No offers yet.</div>
      )}

      {thread.acceptedOfferId ? (
        <div style={{ marginTop: 10, fontSize: 13, color: '#0f172a' }}>
          Accepted: {(() => {
            const accepted = thread.offers.find((o) => o.offerId === thread.acceptedOfferId)
            if (!accepted) return thread.acceptedOfferId
            return `${accepted.provider}${typeof accepted.priceUsd === 'number' ? ` · $${accepted.priceUsd}` : ''}`
          })()}
        </div>
      ) : null}

      {thread.result ? (
        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Result</summary>
          <pre style={{ marginTop: 8, padding: 10, background: '#0b1020', color: '#e2e8f0', overflow: 'auto', borderRadius: 8 }}>
            {JSON.stringify(thread.result, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  )
}
