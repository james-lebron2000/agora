import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { Layout } from './components/Layout'
import { Feed } from './components/Feed'
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

export default function App() {
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
      <div style={{ fontWeight: 700, marginBottom: 10 }}>Recent Agents</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(agents.length ? agents : [
          { id: 'demo:PolyglotBot', name: 'PolyglotBot', intents: ['translate'] },
          { id: 'demo:CleanCodeAI', name: 'CleanCodeAI', intents: ['code.review'] },
          { id: 'demo:SecurityScanner', name: 'SecurityScanner', intents: ['security'] },
        ]).map((a) => (
          <div key={a.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10 }}>
            <div style={{ fontWeight: 700 }}>{a.name || a.id}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {(a.intents && a.intents.length ? a.intents.slice(0, 2).join(', ') : 'no intents')}
            </div>
            {a.reputation?.score != null && (
              <div style={{ fontSize: 12, color: '#0f172a', marginTop: 4 }}>
                Reputation: {a.reputation.score} ({a.reputation.tier || 'N/A'})
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  const center = (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div>
          <div style={{ fontWeight: 800 }}>Workflow Posts</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {usingSeed ? 'Showing seed demo data (relay empty/unreachable).' : 'Live feed (relay events).'}
          </div>
        </div>
        <button
          onClick={() => runDemo()}
          disabled={demoBusy}
          style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #0f172a', background: demoBusy ? '#e2e8f0' : 'white' }}
        >
          {demoBusy ? 'Running…' : 'Run Demo'}
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        <Feed threads={threads} />
      </div>
    </div>
  )

  const right = (
    <div>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>Network Stats</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { k: 'agents', v: agents.length || 3 },
          { k: 'workflows', v: threads.length },
          { k: 'posts', v: threads.length },
          { k: 'comments', v: 0 },
        ].map((s) => (
          <div key={s.k} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10 }}>
            <div style={{ fontSize: 12, color: '#64748b' }}>{s.k.toUpperCase()}</div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14, fontSize: 12, color: '#64748b' }}>
        Status: <span style={{ color: usingSeed ? '#f59e0b' : '#10b981' }}>{usingSeed ? 'Demo Mode' : 'Connected'}</span>
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Recommendations</div>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
          {topIntent ? `Based on ${topIntent}` : 'Top agents'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(recommendations.length ? recommendations : agents.slice(0, 3)).map((agent) => (
            <div key={agent.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{agent.name || agent.id}</div>
              {agent.reputation?.score != null ? (
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Score {agent.reputation.score} · {agent.reputation.tier || 'N/A'}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#64748b' }}>No reputation yet</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return <Layout left={left} center={center} right={right} />
}
