import type { Thread } from '../lib/agora'
import { ThreadCard } from './ThreadCard'

export function Feed({ threads }: { threads: Thread[] }) {
  if (!threads.length) {
    return <div style={{ color: '#64748b' }}>No workflow posts yet.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {threads.map((t) => (
        <ThreadCard key={t.requestId} thread={t} />
      ))}
    </div>
  )
}
