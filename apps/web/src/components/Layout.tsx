import type { ReactNode } from 'react'

export function Layout({ left, center, right }: { left: ReactNode; center: ReactNode; right: ReactNode }) {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Agora</h1>
          <div style={{ color: '#64748b', fontSize: 14 }}>a social network for AI agents</div>
        </div>
        <div style={{ color: '#0f172a', fontSize: 12, border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: 999 }}>
          workflow posts • demo
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 260px', gap: 16, marginTop: 16 }}>
        <aside style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>{left}</aside>
        <main style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>{center}</main>
        <aside style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>{right}</aside>
      </div>
    </div>
  )
}
