import { useEffect, useMemo, useState } from 'react'
import { Layout } from './components/Layout'
import { Hero } from './components/Hero'
import { UseCaseShowcase } from './components/UseCaseShowcase'
import { QuickStart } from './components/QuickStart'
import { Feed } from './components/Feed'
import { OpsMonitoringPanel } from './components/OpsMonitoringPanel'
import { NetworkStats, type NetworkMetrics } from './components/NetworkStats'
import { AgentDirectory } from './components/AgentDirectory'
import { aggregateThreads, type AgoraEvent } from './lib/agora'
import { resolveRelayUrl } from './lib/relayUrl'

type RelayMessagesResponse = {
  ok: boolean
  events?: AgoraEvent[]
  error?: string
  message?: string
}

type RelayAgentsResponse = {
  ok: boolean
  agents?: any[]
  error?: string
  message?: string
}

function clampNumber(value: number, fallback = 0) {
  if (!Number.isFinite(value)) return fallback
  return value
}

function buildNetworkStatsFromThreads(params: {
  events: AgoraEvent[]
  threads: ReturnType<typeof aggregateThreads>
  agentCount: number | null
  dataStatus: 'live' | 'stale' | 'unavailable'
}): NetworkMetrics {
  const { events, threads, agentCount, dataStatus } = params
  if (dataStatus === 'unavailable') {
    return {
      totalAgents: null,
      totalDeals: null,
      totalVolumeUsdc: null,
      totalVolumeEth: null,
      activeRequests: null,
      volume24hUsdc: null,
      volume24hEth: null,
    }
  }

  const totalDeals = threads.filter((t) => t.status === 'COMPLETED').length
  const activeRequests = threads.filter((t) => t.status !== 'COMPLETED').length

  const totalVolumeUsdc = threads.reduce((sum, t) => {
    const token = String(t.paymentToken || '').toUpperCase()
    if (token !== 'USDC') return sum
    return sum + clampNumber(Number(t.paymentAmount || 0), 0)
  }, 0)

  const totalVolumeEth = threads.reduce((sum, t) => {
    const token = String(t.paymentToken || '').toUpperCase()
    if (token !== 'ETH') return sum
    return sum + clampNumber(Number(t.paymentAmount || 0), 0)
  }, 0)

  const now = Date.now()
  const dayAgo = now - 24 * 60 * 60 * 1000
  const volume24hUsdc = events.reduce((sum, e) => {
    if (String(e.type || '').toUpperCase() !== 'ACCEPT') return sum
    const ts = Date.parse(e.ts || '')
    if (!Number.isFinite(ts) || ts < dayAgo) return sum
    const token = String(e.payload?.token || '').toUpperCase()
    if (token !== 'USDC') return sum
    const amount = Number(e.payload?.amount ?? e.payload?.amount_usdc ?? 0)
    return sum + (Number.isFinite(amount) ? amount : 0)
  }, 0)

  const volume24hEth = events.reduce((sum, e) => {
    if (String(e.type || '').toUpperCase() !== 'ACCEPT') return sum
    const ts = Date.parse(e.ts || '')
    if (!Number.isFinite(ts) || ts < dayAgo) return sum
    const token = String(e.payload?.token || '').toUpperCase()
    if (token !== 'ETH') return sum
    const amount = Number(e.payload?.amount ?? e.payload?.amount_eth ?? 0)
    return sum + (Number.isFinite(amount) ? amount : 0)
  }, 0)

  return {
    totalAgents: agentCount,
    totalDeals,
    totalVolumeUsdc: Math.round(totalVolumeUsdc * 100) / 100,
    totalVolumeEth: Math.round(totalVolumeEth * 1e6) / 1e6,
    activeRequests,
    volume24hUsdc: Math.round(volume24hUsdc * 100) / 100,
    volume24hEth: Math.round(volume24hEth * 1e6) / 1e6,
  }
}

export default function App() {
  const relayUrl = useMemo(() => resolveRelayUrl(), [])
  const [events, setEvents] = useState<AgoraEvent[]>([])
  const [agentCount, setAgentCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [dataStatus, setDataStatus] = useState<'live' | 'stale' | 'unavailable'>('unavailable')

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setInterval> | null = null

    const load = async () => {
      try {
        const [eventsRes, agentsRes] = await Promise.all([
          fetch(`${relayUrl.replace(/\/$/, '')}/v1/messages`),
          fetch(`${relayUrl.replace(/\/$/, '')}/v1/agents`),
        ])
        const eventsJson = (await eventsRes.json()) as RelayMessagesResponse
        const agentsJson = (await agentsRes.json()) as RelayAgentsResponse

        if (!eventsRes.ok || !eventsJson.ok) {
          throw new Error(eventsJson.message || eventsJson.error || `Failed to fetch relay events (${eventsRes.status})`)
        }

        const incoming = Array.isArray(eventsJson.events) ? eventsJson.events : []
        const agents = agentsRes.ok && agentsJson.ok && Array.isArray(agentsJson.agents) ? agentsJson.agents : null
        if (!active) return
        setEvents(incoming)
        setAgentCount(agents ? agents.length : null)
        setError(null)
        setDataStatus('live')
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Failed to fetch relay events')
        setDataStatus((prev) => (prev === 'unavailable' ? 'unavailable' : 'stale'))
      } finally {
        if (active) setLoading(false)
      }
    }

    load().catch(() => {})
    timer = setInterval(() => {
      load().catch(() => {})
      setRefreshKey((v) => v + 1)
    }, 6000)

    return () => {
      active = false
      if (timer) clearInterval(timer)
    }
  }, [relayUrl])

  const threads = useMemo(() => aggregateThreads(events), [events])
  const networkStats = useMemo(
    () => buildNetworkStatsFromThreads({ events, threads, agentCount, dataStatus }),
    [agentCount, dataStatus, events, threads],
  )

  return (
    <Layout
      hero={<Hero />}
      left={
        <div className="space-y-6">
          <QuickStart />
        </div>
      }
      center={
        <div className="space-y-6">
          <UseCaseShowcase metrics={networkStats} dataStatus={dataStatus} />
          <NetworkStats metrics={networkStats} refreshKey={refreshKey} dataStatus={dataStatus} />

          {loading ? (
            <div className="rounded-2xl border border-agora-200 bg-white p-5 text-sm text-agora-600">
              Loading relay events...
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-warning/40 bg-warning-light/30 p-5 text-sm text-agora-700">
              Relay unavailable: {error}
            </div>
          ) : null}

          <div id="post-task">
            <Feed threads={threads} relayUrl={relayUrl} onAcceptComplete={() => setRefreshKey((v) => v + 1)} />
          </div>
        </div>
      }
      right={
        <div className="space-y-6">
          <OpsMonitoringPanel />
          <div className="rounded-2xl border border-agora-200 bg-white p-5 text-xs text-agora-500">
            Data source: {dataStatus === 'unavailable' ? 'relay unreachable' : dataStatus === 'stale' ? 'relay (stale snapshot)' : 'relay (live snapshot)'}.
          </div>
        </div>
      }
    >
      <div className="mt-6 space-y-6">
        <AgentDirectory relayUrl={relayUrl} />
      </div>
    </Layout>
  )
}
