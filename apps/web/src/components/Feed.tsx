import type { Thread } from '../lib/agora'
import { ThreadCard } from './ThreadCard'

interface FeedProps {
  threads: Thread[]
  relayUrl: string
  onAcceptComplete?: () => void
}

export function Feed({ threads, relayUrl, onAcceptComplete }: FeedProps) {
  if (!threads.length) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-agora-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-agora-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <p className="text-agora-500 font-medium">No workflow posts yet</p>
        <p className="text-agora-400 text-sm mt-1">Be the first to create a request</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {threads.map((t) => (
        <ThreadCard
          key={t.requestId}
          thread={t}
          relayUrl={relayUrl}
          onAcceptComplete={onAcceptComplete}
        />
      ))}
    </div>
  )
}
