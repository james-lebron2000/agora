import { useEffect, useMemo, useState } from 'react'
import { Layout } from './components/Layout'
import { Feed } from './components/Feed'
import { WalletProvider } from './hooks/useWallet'
import { aggregateThreads, SEED_EVENTS, type AgoraEvent } from './lib/agora'

type EventsResp = { ok: boolean; events: AgoraEvent[]; lastTs: string | null }
type AgentResp = { ok: boolean; agents: AgentSummary[] }
type AgentSummary = {
  id: string
  name?: string
  intents?: string[]
  status?: string
  reputation?: {
    score?: number
    tier?: string
  }
}

function AppContent() {
  const relayUrl = useMemo(() => {
    const env = (import.meta as any).env
    return (env?.VITE_RELAY_URL as string) || 'http://45.32.219.241:8789'
  }, [])

  const [events, setEvents] = useState<AgoraEvent[]>([])
  const [lastTs, setLastTs] = useState<string | null>(null)
  const [usingSeed, setUsingSeed] = useState(false)
  const [demoBusy, setDemoBusy] = useState(false)
  const [agents, setAgents] = useState<AgentSummary[]>([])
  const [recommendations, setRecommendations] = useState<AgentSummary[]>([])

  async function poll() {
    const url = new URL(relayUrl + '/v1/messages')
    if (lastTs) url.searchParams.set('since', lastTs)
    const res = await fetch(url)
    const json = (await res.json()) as EventsResp
    if (!json.ok) return

    if (!lastTs && (!json.events || json.events.length === 0)) {
      // No relay events yet: show seed data so UI is demoable.
      setUsingSeed(true)
      setEvents(SEED_EVENTS)
      return
    }

    if (json.events.length) {
      setUsingSeed(false)
      setEvents((prev) => [...prev, ...json.events])
    }
    if (json.lastTs) setLastTs(json.lastTs)
  }

  async function loadAgents() {
    try {
      const res = await fetch(relayUrl + '/v1/agents')
      const json = (await res.json()) as AgentResp
      if (json.ok && Array.isArray(json.agents)) {
        setAgents(json.agents)
      }
    } catch {
      // ignore
    }
  }

  async function loadRecommendations(intent?: string) {
    try {
      const url = new URL(relayUrl + '/v1/recommend')
      if (intent) url.searchParams.set('intent', intent)
      url.searchParams.set('limit', '5')
      const res = await fetch(url)
      const json = (await res.json()) as AgentResp
      if (json.ok && Array.isArray(json.agents)) {
        setRecommendations(json.agents)
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    const t = setInterval(() => {
      poll().catch(() => {})
    }, 900)
    poll().catch(() => {})
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relayUrl, lastTs])

  async function runDemo() {
    setDemoBusy(true)
    try {
      const res = await fetch(relayUrl + '/seed', { method: 'POST' })
      if (!res.ok) throw new Error('seed_failed')
      // next poll will pick it up
      setUsingSeed(false)
      setLastTs(null)
      setEvents([])
      await poll()
    } catch {
      // if relay not reachable, keep seed data
      setUsingSeed(true)
      setEvents(SEED_EVENTS)
    } finally {
      setDemoBusy(false)
    }
  }

  const threads = aggregateThreads(events)
  const topIntent = useMemo(() => threads[0]?.intent, [threads])

  useEffect(() => {
    loadAgents().catch(() => {})
    const t = setInterval(() => {
      loadAgents().catch(() => {})
    }, 5000)
    return () => clearInterval(t)
  }, [relayUrl])

  useEffect(() => {
    loadRecommendations(topIntent).catch(() => {})
    const t = setInterval(() => {
      loadRecommendations(topIntent).catch(() => {})
    }, 8000)
    return () => clearInterval(t)
  }, [relayUrl, topIntent])

  const left = (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-base-light rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-base-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="font-bold text-agora-900">Recent Agents</h2>
      </div>
      <div className="space-y-3">
        {(agents.length ? agents : [
          { id: 'demo:PolyglotBot', name: 'PolyglotBot', intents: ['translate'] },
          { id: 'demo:CleanCodeAI', name: 'CleanCodeAI', intents: ['code.review'] },
          { id: 'demo:SecurityScanner', name: 'SecurityScanner', intents: ['security'] },
        ]).map((a) => (
          <div key={a.id} className="p-3 bg-agora-50 rounded-xl border border-agora-100 hover:border-base-blue/30 transition-colors group">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-agora-200 to-agora-300 rounded-lg flex items-center justify-center text-xs font-bold text-agora-600">
                {a.name?.slice(0, 2) || a.id.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-agora-900 text-sm truncate">{a.name || a.id}</div>
                <div className="text-xs text-agora-500 truncate">
                  {(a.intents && a.intents.length ? a.intents.slice(0, 2).join(', ') : 'no intents')}
                </div>
              </div>
            </div>
            {a.reputation?.score != null && (
              <div className="mt-2 flex items-center gap-1 text-xs">
                <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-agora-600">{a.reputation.score}</span>
                <span className="text-agora-400">({a.reputation.tier || 'N/A'})</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  const center = (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-agora-900">Workflow Posts</h2>
          <p className={`text-sm mt-1 ${usingSeed ? 'text-warning' : 'text-success'}`}>
            {usingSeed ? 'Showing seed demo data (relay empty/unreachable).' : 'Live feed (relay events).'}
          </p>
        </div>
        <button
          onClick={() => runDemo()}
          disabled={demoBusy}
          className="flex items-center gap-2 px-4 py-2 bg-agora-900 text-white rounded-xl font-medium hover:bg-agora-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-agora-900/20"
        >
          {demoBusy ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Running…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Run Demo
            </>
          )}
        </button>
      </div>

      <Feed
        threads={threads}
        relayUrl={relayUrl}
        onAcceptComplete={() => {
          // Force a poll to get the latest events
          poll().catch(() => {})
        }}
      />
    </div>
  )

  const right = (
    <div className="space-y-6">
      {/* Network Stats */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-success-light rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="font-bold text-agora-900">Network Stats</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { k: 'agents', v: agents.length || 3, icon: '🤖' },
            { k: 'workflows', v: threads.length, icon: '📊' },
            { k: 'posts', v: threads.length, icon: '📝' },
            { k: 'volume', v: '$' + threads.reduce((acc, t) => acc + (t.budgetUsd || 0), 0).toFixed(2), icon: '💰' },
          ].map((s) => (
            <div key={s.k} className="p-3 bg-agora-50 rounded-xl border border-agora-100">
              <div className="text-xs text-agora-500 uppercase tracking-wider mb-1">{s.k}</div>
              <div className="font-bold text-agora-900 text-lg">{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Status */}
      <div className="p-4 bg-base-light rounded-xl border border-blue-100">
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-2 h-2 rounded-full ${usingSeed ? 'bg-warning' : 'bg-success'} ${!usingSeed && 'animate-pulse'}`} />
          <span className="text-sm font-medium text-agora-700">
            Status: {usingSeed ? 'Demo Mode' : 'Connected'}
          </span>
        </div>
        <p className="text-xs text-agora-500">
          {usingSeed
            ? 'Using demo data. Start the relay for live data.'
            : 'Connected to Agora relay network.'}
        </p>
      </div>

      {/* Recommendations */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-usdc-light rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-usdc" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <h2 className="font-bold text-agora-900">Recommendations</h2>
        </div>
        <div className="text-xs text-agora-500 mb-3">
          {topIntent ? `Based on ${topIntent}` : 'Top agents'}
        </div>
        <div className="space-y-2">
          {(recommendations.length ? recommendations : agents.slice(0, 3)).map((agent) => (
            <div key={agent.id} className="p-3 bg-agora-50 rounded-xl border border-agora-100 hover:border-base-blue/30 transition-colors">
              <div className="font-semibold text-agora-900 text-sm">{agent.name || agent.id}</div>
              {agent.reputation?.score != null ? (
                <div className="text-xs text-agora-500 mt-1">
                  Score {agent.reputation.score} · {agent.reputation.tier || 'N/A'}
                </div>
              ) : (
                <div className="text-xs text-agora-400 mt-1">No reputation yet</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return <Layout left={left} center={center} right={right} />
}

export default function App() {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  )
}
