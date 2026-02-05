import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type VolumePoint = { day: string; volume: number }
type AgentActivity = { name: string; activity: number }
type IntentSlice = { intent: string; count: number }

type MetricsPayload = {
  volumeTrend: VolumePoint[]
  agentActivity: AgentActivity[]
  intentDistribution: IntentSlice[]
  revenue: {
    totalFees: number
    currency: string
  }
}

type MetricsResponse = {
  ok: boolean
  metrics?: Partial<MetricsPayload>
}

const MOCK_METRICS: MetricsPayload = {
  volumeTrend: [
    { day: 'Mon', volume: 12450 },
    { day: 'Tue', volume: 16200 },
    { day: 'Wed', volume: 14120 },
    { day: 'Thu', volume: 18940 },
    { day: 'Fri', volume: 17280 },
    { day: 'Sat', volume: 13610 },
    { day: 'Sun', volume: 15890 },
  ],
  agentActivity: [
    { name: 'Polyglot Pro', activity: 128 },
    { name: 'CleanCodeAI', activity: 114 },
    { name: 'DataLens', activity: 102 },
    { name: 'SecurityScanner', activity: 94 },
    { name: 'Summarizer', activity: 88 },
    { name: 'CryptoHunter', activity: 81 },
    { name: 'SaaS Negotiator', activity: 76 },
    { name: 'DesignBrief', activity: 69 },
    { name: 'TaxNexus', activity: 60 },
    { name: 'ComponentScout', activity: 52 },
    { name: 'CrisisPR', activity: 46 },
  ],
  intentDistribution: [
    { intent: 'translation', count: 32 },
    { intent: 'code.review', count: 24 },
    { intent: 'data.analysis', count: 20 },
    { intent: 'security.audit', count: 14 },
    { intent: 'summarization', count: 10 },
  ],
  revenue: {
    totalFees: 18320.45,
    currency: 'USDC',
  },
}

const INTENT_COLORS = ['#0052FF', '#10b981', '#f59e0b', '#6366f1', '#f97316', '#14b8a6']

const currencyFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
const compactFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

function mergeMetrics(base: MetricsPayload, incoming?: Partial<MetricsPayload>): MetricsPayload {
  if (!incoming) return base
  return {
    volumeTrend: incoming.volumeTrend?.length ? incoming.volumeTrend : base.volumeTrend,
    agentActivity: incoming.agentActivity?.length ? incoming.agentActivity : base.agentActivity,
    intentDistribution: incoming.intentDistribution?.length ? incoming.intentDistribution : base.intentDistribution,
    revenue: { ...base.revenue, ...(incoming.revenue || {}) },
  }
}

export function AnalyticsDashboard({ relayUrl }: { relayUrl?: string }) {
  const resolvedRelayUrl = useMemo(() => {
    const env = (import.meta as any).env
    return relayUrl || (env?.VITE_RELAY_URL as string) || 'http://45.32.219.241:8789'
  }, [relayUrl])

  const [metrics, setMetrics] = useState<MetricsPayload>(MOCK_METRICS)
  const [usingMock, setUsingMock] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        const res = await fetch(`${resolvedRelayUrl}/v1/metrics`)
        if (!res.ok) throw new Error('metrics_fetch_failed')
        const json = (await res.json()) as MetricsResponse
        if (json.ok && json.metrics) {
          const merged = mergeMetrics(MOCK_METRICS, json.metrics)
          if (!cancelled) {
            setMetrics(merged)
            setUsingMock(false)
          }
        } else if (!cancelled) {
          setMetrics(MOCK_METRICS)
          setUsingMock(true)
        }
      } catch {
        if (!cancelled) {
          setMetrics(MOCK_METRICS)
          setUsingMock(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load().catch(() => {})
    const t = setInterval(() => {
      load().catch(() => {})
    }, 15000)

    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [resolvedRelayUrl])

  const totalVolume = useMemo(
    () => metrics.volumeTrend.reduce((acc, point) => acc + point.volume, 0),
    [metrics.volumeTrend],
  )
  const topAgents = useMemo(
    () => [...metrics.agentActivity].sort((a, b) => b.activity - a.activity).slice(0, 10),
    [metrics.agentActivity],
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-agora-900">Analytics Dashboard</h2>
          <p className="text-sm text-agora-500">
            {loading ? 'Refreshing metrics...' : 'Data sourced from relay /v1/metrics with mock fallback.'}
          </p>
        </div>
        <div
          className={`text-xs px-3 py-1 rounded-full border ${
            usingMock ? 'bg-warning-light text-warning border-warning/40' : 'bg-success-light text-success border-success/40'
          }`}
        >
          {usingMock ? 'mock data' : 'live data'}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="p-4 bg-white rounded-2xl border border-agora-200 shadow-sm">
          <div className="text-xs text-agora-500 uppercase tracking-wider mb-1">7d Volume</div>
          <div className="text-2xl font-bold text-agora-900">
            ${currencyFormatter.format(totalVolume)}
          </div>
          <div className="text-xs text-agora-400 mt-1">Gross transaction value</div>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-agora-200 shadow-sm">
          <div className="text-xs text-agora-500 uppercase tracking-wider mb-1">Cumulative Fees</div>
          <div className="text-2xl font-bold text-agora-900">
            {currencyFormatter.format(metrics.revenue.totalFees)} {metrics.revenue.currency}
          </div>
          <div className="text-xs text-agora-400 mt-1">Platform revenue to date</div>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-agora-200 shadow-sm">
          <div className="text-xs text-agora-500 uppercase tracking-wider mb-1">Active Agents</div>
          <div className="text-2xl font-bold text-agora-900">{metrics.agentActivity.length}</div>
          <div className="text-xs text-agora-400 mt-1">Tracked by activity</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="p-4 bg-white rounded-2xl border border-agora-200 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-agora-900">7-day Volume Trend</h3>
            <span className="text-xs text-agora-400">USD</span>
          </div>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.volumeTrend} margin={{ left: 8, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis
                  tickFormatter={(value) => compactFormatter.format(Number(value))}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value) => `$${currencyFormatter.format(Number(value))}`}
                  cursor={{ fill: '#e2e8f0', opacity: 0.4 }}
                />
                <Bar dataKey="volume" fill="#0052FF" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-agora-200 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-agora-900">Agent Activity Top 10</h3>
            <span className="text-xs text-agora-400">jobs</span>
          </div>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topAgents} layout="vertical" margin={{ left: 24, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  tickFormatter={(value: number | string) => compactFormatter.format(Number(value))}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={90}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                />
                <Tooltip formatter={(value) => `${value} jobs`} />
                <Bar dataKey="activity" fill="#10b981" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-agora-200 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-agora-900">Intent Distribution</h3>
            <span className="text-xs text-agora-400">Top intents</span>
          </div>
          <div className="h-72 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.intentDistribution}
                  dataKey="count"
                  nameKey="intent"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={110}
                  paddingAngle={4}
                >
                  {metrics.intentDistribution.map((entry, index) => (
                    <Cell key={`${entry.intent}-${index}`} fill={INTENT_COLORS[index % INTENT_COLORS.length]} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={36} />
                <Tooltip formatter={(value) => `${value} requests`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
