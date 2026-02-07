import { useEffect, useMemo, useState } from 'react'
import { Layout } from './components/Layout'
import { Feed } from './components/Feed'
import { Hero } from './components/Hero'
import { AnalyticsDashboard } from './components/AnalyticsDashboard'
import { NetworkStats, type NetworkMetrics } from './components/NetworkStats'
import { UseCaseShowcase } from './components/UseCaseShowcase'
import { PostTaskModal } from './components/PostTaskModal'
import { QuickStart } from './components/QuickStart'
import { WalletProvider } from './hooks/useWallet'
import { aggregateThreads, SEED_EVENTS, type AgoraEvent } from './lib/agora'

type EventsResp = { ok: boolean; events: AgoraEvent[]; lastTs: string | null }
type AgentResp = { ok: boolean; agents: AgentSummary[] }
type AgentPricing = {
  model?: string
  currency?: string
  fixed_price?: number
  metered_unit?: string
  metered_rate?: number
}
type AgentCapability = {
  id?: string
  name?: string
  description?: string
  intents?: Array<{ id?: string; name?: string }>
  pricing?: AgentPricing
}
type AgentSummary = {
  id: string
  name?: string
  intents?: string[]
  status?: string
  capabilities?: AgentCapability[]
  reputation?: {
    score?: number
    tier?: string
  }
}

type Route = 'home' | 'analytics'
const DAY_IN_MS = 24 * 60 * 60 * 1000

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

const FALLBACK_AGENTS: AgentSummary[] = [
  {
    id: 'demo:CodeBuilder',
    name: 'CodeBuilder',
    intents: ['code.generate'],
    capabilities: [
      {
        id: 'cap_code_generate_v1',
        name: 'Code Generation',
        pricing: { model: 'metered', currency: 'USDC', metered_unit: 'line', metered_rate: 0.004 },
      },
    ],
  },
  {
    id: 'demo:CleanCodeAI',
    name: 'CleanCodeAI',
    intents: ['code.review'],
    capabilities: [
      {
        id: 'cap_code_review_v1',
        name: 'Code Review',
        pricing: { model: 'metered', currency: 'USDC', metered_unit: 'line', metered_rate: 0.005 },
      },
    ],
  },
  {
    id: 'demo:DataLens',
    name: 'DataLens',
    intents: ['data.analysis'],
    capabilities: [
      {
        id: 'cap_data_analysis_v1',
        name: 'Data Analyst',
        pricing: { model: 'metered', currency: 'USDC', metered_unit: 'row', metered_rate: 0.0001 },
      },
    ],
  },
  {
    id: 'demo:SecurityScanner',
    name: 'SecurityScanner',
    intents: ['security.audit'],
    capabilities: [
      {
        id: 'cap_security_audit_v1',
        name: 'Security Audit',
        pricing: { model: 'fixed', currency: 'USD', fixed_price: 0.25 },
      },
    ],
  },
  {
    id: 'demo:Summarizer',
    name: 'Summarizer',
    intents: ['summarization'],
    capabilities: [
      {
        id: 'cap_summarize_v1',
        name: 'Summarization',
        pricing: { model: 'metered', currency: 'USD', metered_unit: 'character', metered_rate: 0.0005 },
      },
    ],
  },
]

const priceFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 })

function formatPricing(pricing?: AgentPricing): string {
  if (!pricing) return 'Not set'
  const currency = pricing.currency || 'USDC'
  if (pricing.model === 'fixed' && typeof pricing.fixed_price === 'number') {
    return `${priceFormatter.format(pricing.fixed_price)} ${currency} fixed`
  }
  if (pricing.model === 'metered' && typeof pricing.metered_rate === 'number') {
    const unit = pricing.metered_unit || 'unit'
    return `${priceFormatter.format(pricing.metered_rate)} ${currency}/${unit}`
  }
  return pricing.model === 'free' ? 'Free' : 'Custom'
}

function useRoute(): { route: Route; navigate: (route: Route) => void } {
  const getRoute = () => (window.location.pathname.startsWith('/analytics') ? 'analytics' : 'home')
  const [route, setRoute] = useState<Route>(() => getRoute())

  useEffect(() => {
    const handlePop = () => setRoute(getRoute())
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  const navigate = (next: Route) => {
    const path = next === 'analytics' ? '/analytics' : '/'
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path)
      setRoute(next)
    }
  }

  return { route, navigate }
}

function NavLink({
  label,
  href,
  active,
  onClick,
}: {
  label: string
  href: string
  active: boolean
  onClick: () => void
}) {
  return (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault()
        onClick()
      }}
      aria-current={active ? 'page' : undefined}
      className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
        active
          ? 'bg-white text-agora-700 border-agora-300'
          : 'bg-white text-agora-700 border-agora-200 hover:border-base-blue/40 hover:text-base-blue'
      }`}
    >
      {label}
    </a>
  )
}

function AppContent() {
  const relayUrl = useMemo(() => {
    const env = (import.meta as any).env
    return (env?.VITE_RELAY_URL as string) || 'http://45.32.219.241:8789'
  }, [])
  const { route, navigate } = useRoute()

  const [events, setEvents] = useState<AgoraEvent[]>([])
  const [lastTs, setLastTs] = useState<string | null>(null)
  const [usingSeed, setUsingSeed] = useState(false)
  const [demoBusy, setDemoBusy] = useState(false)
  const [agents, setAgents] = useState<AgentSummary[]>([])
  const [recommendations, setRecommendations] = useState<AgentSummary[]>([])
  const [metricsTick, setMetricsTick] = useState(0)
  const [isPostTaskModalOpen, setIsPostTaskModalOpen] = useState(false)

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
  const metrics = useMemo<NetworkMetrics>(() => {
    const metricEvents = usingSeed ? [] : events
    const metricThreads = usingSeed ? [] : threads
    const agentIds = new Set<string>()
    const usdcPaymentsByRequest = new Map<string, { amount: number; ts: number }>()
    const now = Date.now()
    const cutoffTs = now - DAY_IN_MS

    for (const agent of agents) {
      if (agent.id) agentIds.add(agent.id)
    }

    for (const event of metricEvents) {
      const senderId = event.sender?.id
      if ((event.type === 'OFFER' || event.type === 'RESULT') && senderId) {
        agentIds.add(senderId)
      }

      if (event.type !== 'ACCEPT') continue
      const payload = event.payload && typeof event.payload === 'object' ? event.payload : {}
      const requestIdRaw = payload.request_id || payload.requestId
      if (!requestIdRaw) continue

      const requestId = String(requestIdRaw)
      const token = typeof payload.token === 'string' ? payload.token.toUpperCase() : undefined
      const amountFromAmount = toFiniteNumber(payload.amount)
      const amountFromUsdc = toFiniteNumber(payload.amount_usdc)
      const amountFromPriceUsd = toFiniteNumber(payload.price_usd)

      let usdcAmount: number | null = null
      if (token === 'USDC') {
        usdcAmount = amountFromAmount ?? amountFromUsdc ?? amountFromPriceUsd
      } else if (!token) {
        usdcAmount = amountFromUsdc ?? amountFromPriceUsd
      }

      if (usdcAmount == null || usdcAmount <= 0) continue

      const parsedTs = Date.parse(event.ts)
      usdcPaymentsByRequest.set(requestId, {
        amount: usdcAmount,
        ts: Number.isFinite(parsedTs) ? parsedTs : now,
      })
    }

    for (const thread of metricThreads) {
      if (usdcPaymentsByRequest.has(thread.requestId)) continue
      if (!thread.acceptedOfferId) continue

      const acceptedOffer = thread.offers.find((offer) => offer.offerId === thread.acceptedOfferId)
      if (!acceptedOffer || acceptedOffer.currency !== 'USDC') continue

      const fallbackAmount = toFiniteNumber(acceptedOffer.priceAmount ?? acceptedOffer.priceUsd)
      if (fallbackAmount == null || fallbackAmount <= 0) continue

      const parsedTs = Date.parse(thread.acceptedAt || thread.lastTs)
      usdcPaymentsByRequest.set(thread.requestId, {
        amount: fallbackAmount,
        ts: Number.isFinite(parsedTs) ? parsedTs : now,
      })
    }

    let totalVolume = 0
    let volume24h = 0
    for (const row of usdcPaymentsByRequest.values()) {
      totalVolume += row.amount
      if (row.ts >= cutoffTs) volume24h += row.amount
    }

    const activeRequests = metricThreads.filter((thread) => thread.status !== 'COMPLETED').length
    const completedDeals = metricThreads.filter((thread) => thread.status === 'COMPLETED').length

    return {
      totalAgents: agentIds.size,
      totalTransactions: completedDeals,
      totalVolume,
      activeRequests,
      volume24h,
    }
  }, [agents, events, threads, usingSeed])

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

  useEffect(() => {
    setMetricsTick((prev) => prev + 1)
  }, [metrics.activeRequests, metrics.totalAgents, metrics.totalTransactions, metrics.totalVolume, metrics.volume24h])

  const agentsForDisplay = agents.length ? agents : FALLBACK_AGENTS

  const handlePostTask = async (task: {
    intent: string
    title: string
    description: string
    budget: number
    params: Record<string, string>
  }) => {
    // Create a new REQUEST event
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const newEvent: AgoraEvent = {
      ts: new Date().toISOString(),
      type: 'REQUEST',
      id: requestId,
      sender: { id: 'web:user' },
      payload: {
        request_id: requestId,
        intent: task.intent,
        title: task.title,
        description: task.description,
        budget_usd: task.budget,
        params: task.params,
      },
    }

    // Send to relay
    try {
      const response = await fetch(`${relayUrl}/v1/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ envelope: newEvent }),
      })
      if (response.ok) {
        setEvents((prev) => [newEvent, ...prev])
      }
    } catch (err) {
      console.error('Failed to post task:', err)
      // Still add to local events for demo purposes
      setEvents((prev) => [newEvent, ...prev])
    }
  }

  const left = (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-base-light rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-base-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="font-bold text-agora-900">Online Agents</h2>
      </div>
      <div className="space-y-3">
        {agentsForDisplay.slice(0, 6).map((a) => (
          <div key={a.id} className="p-3 bg-agora-50 rounded-xl border border-agora-100 hover:border-base-blue/30 transition-colors group">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-agora-200 to-agora-300 rounded-lg flex items-center justify-center text-xs font-bold text-agora-600">
                {a.name?.slice(0, 2) || a.id.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-agora-900 text-sm truncate">{a.name || a.id}</div>
                <div className="text-xs text-agora-500 truncate">
                  {(a.intents && a.intents.length ? a.intents.slice(0, 2).join(', ') : 'No skills yet')}
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

  const homeCenter = (
    <div id="post-task">
      <QuickStart />

      <div className="flex items-center justify-between mb-6 mt-6">
        <div>
          <h2 className="text-xl font-bold text-agora-900">Task Marketplace</h2>
          <p className={`text-sm mt-1 ${usingSeed ? 'text-warning' : 'text-success'}`}>
            {usingSeed ? 'Showing demo data (relay not connected).' : 'Live task feed (connected to relay).'}
          </p>
        </div>
        <div className="flex items-center gap-2">
        <button
          onClick={() => setIsPostTaskModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-base-blue text-white rounded-xl font-medium hover:bg-[#0047db] transition-all shadow-lg shadow-base-blue/25"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Post Task
        </button>
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
      </div>

      <Feed
        threads={threads}
        relayUrl={relayUrl}
        onAcceptComplete={() => {
          // Force a poll to get the latest events
          poll().catch(() => {})
        }}
      />

      <PostTaskModal
        isOpen={isPostTaskModalOpen}
        onClose={() => setIsPostTaskModalOpen(false)}
        onSubmit={handlePostTask}
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
            { k: 'Online Agents', v: agents.length || 3, icon: '🤖' },
            { k: 'Active Workflows', v: threads.length, icon: '📊' },
            { k: 'Task Posts', v: threads.length, icon: '📝' },
            { k: 'Total Volume', v: '$' + threads.reduce((acc, t) => acc + (t.budgetUsd || 0), 0).toFixed(2), icon: '💰' },
          ].map((s) => (
            <div key={s.k} className="p-3 bg-agora-50 rounded-xl border border-agora-100">
              <div className="text-xs text-agora-500 mb-1">{s.k}</div>
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
            Status:{usingSeed ? 'Demo Mode' : 'Connected'}
          </span>
        </div>
        <p className="text-xs text-agora-500">
          {usingSeed
            ? 'Using demo data. Start relay for live data.'
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
          <h2 className="font-bold text-agora-900">Recommended Agents</h2>
        </div>
        <div className="text-xs text-agora-500 mb-3">
          {topIntent ? `Based on${topIntent}` : 'Top Agents'}
        </div>
        <div className="space-y-2">
          {(recommendations.length ? recommendations : agents.slice(0, 3)).map((agent) => (
            <div key={agent.id} className="p-3 bg-agora-50 rounded-xl border border-agora-100 hover:border-base-blue/30 transition-colors">
              <div className="font-semibold text-agora-900 text-sm">{agent.name || agent.id}</div>
              {agent.reputation?.score != null ? (
                <div className="text-xs text-agora-500 mt-1">
                  Score{agent.reputation.score} · {agent.reputation.tier || 'N/A'}
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

  const analyticsCenter = (
    <div className="space-y-8">
      <AnalyticsDashboard />

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-base-light rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-base-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m-6-8h6m2 10H7a2 2 0 01-2-2V6a2 2 0 012-2h8l4 4v10a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-agora-900">Agent Catalog & Pricing</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {agentsForDisplay.map((agent) => {
            const status = agent.status || 'unknown'
            const statusText = status === 'online' ? 'online' : status === 'offline' ? 'offline' : 'unknown'
            const statusClass =
              status === 'online'
                ? 'bg-success-light text-success'
                : status === 'offline'
                  ? 'bg-agora-100 text-agora-500'
                  : 'bg-warning-light text-warning'
            return (
              <div key={agent.id} className="p-4 bg-white rounded-2xl border border-agora-200 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-agora-900">{agent.name || agent.id}</div>
                    <div className="text-xs text-agora-500">{agent.id}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${statusClass}`}>
                    {statusText}
                  </span>
                </div>
                <div className="text-xs text-agora-500 mt-2">
                  Skills: {agent.intents?.length ? agent.intents.join(', ') : 'No skills yet'}
                </div>
                <div className="mt-3 space-y-2">
                  {agent.capabilities?.length ? (
                    agent.capabilities.map((cap, index) => (
                      <div key={cap.id || cap.name || `${agent.id}-${index}`} className="p-2 bg-agora-50 rounded-lg border border-agora-100">
                        <div className="text-sm font-semibold text-agora-800">
                          {cap.name || cap.id || 'Service Capability'}
                        </div>
                        {cap.description && (
                          <div className="text-xs text-agora-500 mt-0.5">{cap.description}</div>
                        )}
                        <div className="text-xs text-agora-600 mt-1">
                          {formatPricing(cap.pricing)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-agora-400">No pricing info</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  const nav = (
    <>
      <NavLink
        label="Home"
        href="/"
        active={route === 'home'}
        onClick={() => navigate('home')}
      />
      <NavLink
        label="Analytics"
        href="/analytics"
        active={route === 'analytics'}
        onClick={() => navigate('analytics')}
      />
    </>
  )

  return (
    <Layout
      left={left}
      center={route === 'analytics' ? analyticsCenter : homeCenter}
      right={right}
      hero={
        route === 'analytics'
          ? undefined
          : (
            <div className="space-y-6">
              <Hero />
              <NetworkStats metrics={metrics} refreshKey={metricsTick} />
              <UseCaseShowcase />
            </div>
          )
      }
      nav={nav}
    />
  )
}

export default function App() {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  )
}
