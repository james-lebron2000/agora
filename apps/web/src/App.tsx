import { useEffect, useMemo, useState } from 'react'
import { Layout } from './components/Layout'
import { Hero } from './components/Hero'
import { UseCaseShowcase } from './components/UseCaseShowcase'
import { QuickStart } from './components/QuickStart'
import { Feed } from './components/Feed'
import { OpsMonitoringPanel } from './components/OpsMonitoringPanel'
import { NetworkStats, type NetworkMetrics } from './components/NetworkStats'
import { aggregateThreads, type AgoraEvent, SEED_EVENTS } from './lib/agora'
import { resolveRelayUrl } from './lib/relayUrl'

type RelayMessagesResponse = {
  ok: boolean
  events?: AgoraEvent[]
  error?: string
  message?: string
}

function clampNumber(value: number, fallback = 0) {
  if (!Number.isFinite(value)) return fallback
  return value
}

function buildNetworkStatsFromThreads(events: AgoraEvent[], threads: ReturnType<typeof aggregateThreads>): NetworkMetrics {
  const totalAgents = 0
  const completed = threads.filter((t) => t.status === 'COMPLETED').length
  const activeRequests = threads.filter((t) => t.status !== 'COMPLETED').length

  // Volume is derived from ACCEPT events. This is best-effort; canonical accounting is in relay ops/finance export.
  const volume = threads.reduce((sum, t) => {
    const token = String(t.paymentToken || '').toUpperCase()
    if (token !== 'USDC') return sum
    return sum + clampNumber(Number(t.paymentAmount || 0), 0)
  }, 0)

  const now = Date.now()
  const dayAgo = now - 24 * 60 * 60 * 1000
  const volume24h = events.reduce((sum, e) => {
    if (String(e.type || '').toUpperCase() !== 'ACCEPT') return sum
    const ts = Date.parse(e.ts || '')
    if (!Number.isFinite(ts) || ts < dayAgo) return sum
    const token = String(e.payload?.token || '').toUpperCase()
    if (token !== 'USDC') return sum
    const amount = Number(e.payload?.amount ?? e.payload?.amount_usdc ?? 0)
    return sum + (Number.isFinite(amount) ? amount : 0)
  }, 0)

  return {
    totalAgents,
    totalTransactions: completed,
    totalVolume: Math.round(volume * 100) / 100,
    activeRequests,
    volume24h: Math.round(volume24h * 100) / 100,
  }
}

export default function App() {
  const relayUrl = useMemo(() => resolveRelayUrl(), [])
  const [usingSeed, setUsingSeed] = useState(false)
  const [events, setEvents] = useState<AgoraEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setInterval> | null = null

    const load = async () => {
      try {
        const res = await fetch(`${relayUrl}/v1/messages`)
        const json = (await res.json()) as RelayMessagesResponse
        if (!res.ok || !json.ok) {
          throw new Error(json.message || json.error || `Failed to fetch relay events (${res.status})`)
        }
        const incoming = Array.isArray(json.events) ? json.events : []
        if (!active) return
        setEvents(incoming)
        setUsingSeed(false)
        setError(null)
      } catch (err) {
        if (!active) return
        setUsingSeed(true)
        setEvents(SEED_EVENTS)
        setError(err instanceof Error ? err.message : 'Failed to fetch relay events')
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
  const networkStats = useMemo(() => buildNetworkStatsFromThreads(events, threads), [events, threads])

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
          <UseCaseShowcase metrics={networkStats} usingSeed={usingSeed} />
          <NetworkStats metrics={networkStats} refreshKey={refreshKey} />

          {loading ? (
            <div className="rounded-2xl border border-agora-200 bg-white p-5 text-sm text-agora-600">
              Loading relay events...
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-warning/40 bg-warning-light/30 p-5 text-sm text-agora-700">
              Relay unavailable, using seed data: {error}
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
            Data source: {usingSeed ? 'seed events (fallback)' : 'relay /v1/messages'}.
          </div>
        </div>
      }
    >
    </Layout>
  )
}
