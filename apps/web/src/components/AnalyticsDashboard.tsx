import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useRealtimeMetrics } from '../hooks/useRealtimeMetrics'

const INTENT_COLORS = ['#0052FF', '#10b981', '#f59e0b', '#6366f1', '#f97316', '#14b8a6', '#8b5cf6', '#ec4899']

const currencyFormatter = new Intl.NumberFormat('en-US', { 
  maximumFractionDigits: 2,
  minimumFractionDigits: 2 
})
const compactFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

// Activity type icons
const ACTIVITY_ICONS: Record<string, string> = {
  request: '📤',
  offer: '💰',
  accept: '✅',
  result: '📦',
}

export function AnalyticsDashboard() {
  const { metrics, isLoading, error, refetch } = useRealtimeMetrics(5000)

  // Transform top agents for chart
  const topAgentsChart = useMemo(() => {
    return metrics.topAgents.slice(0, 10).map(agent => ({
      name: agent.name.length > 12 ? agent.name.slice(0, 12) + '...' : agent.name,
      activity: agent.totalOrders,
      successRate: agent.successRate,
      rating: agent.rating,
    }))
  }, [metrics.topAgents])

  // Mock intent distribution for now (would need backend support)
  const intentDistribution = [
    { intent: 'translation', count: 32 },
    { intent: 'code.review', count: 24 },
    { intent: 'data.analysis', count: 20 },
    { intent: 'security.audit', count: 14 },
    { intent: 'summarization', count: 10 },
  ]

  // Volume trend from recent activity
  const volumeTrend = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    return days.map((day) => ({
      day,
      volume: metrics.totalVolume * (0.1 + Math.random() * 0.15), // Simulated daily breakdown
    }))
  }, [metrics.totalVolume])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-4 text-gray-500">Connecting to Agora Relay...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 rounded-xl border border-red-200">
        <h3 className="text-red-800 font-semibold">⚠️ Connection Error</h3>
        <p className="text-red-600 mt-2">{error}</p>
        <button 
          onClick={refetch}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry Connection
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Network Analytics</h2>
          <p className="text-sm text-gray-500 mt-1">
            Real-time metrics from Agora Relay (auto-refresh every 5s)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-green-100 text-green-700 border border-green-200">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Live
          </span>
          <button 
            onClick={refetch}
            className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          label="Active Agents (5min)" 
          value={metrics.activeAgents} 
          suffix="online"
          trend="+12%"
          trendUp={true}
        />
        <MetricCard 
          label="Total Deals" 
          value={metrics.totalDeals} 
          suffix="completed"
          trend="+5"
          trendUp={true}
        />
        <MetricCard 
          label="Network Volume" 
          value={`$${compactFormatter.format(metrics.totalVolume)}`}
          suffix="USDC"
          trend="+8%"
          trendUp={true}
        />
        <MetricCard 
          label="Success Rate" 
          value={`${metrics.successRate}%`} 
          suffix="avg"
          trend="-2%"
          trendUp={false}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Activity Chart */}
        <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Top Performing Agents</h3>
            <span className="text-xs text-gray-400">by completed deals</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topAgentsChart} layout="vertical" margin={{ left: 80, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={75}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                />
                <Tooltip 
                  formatter={(value) => [`${value} deals`, 'Completed']}
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="activity" fill="#0052FF" radius={[0, 6, 6, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Volume Trend */}
        <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Volume Trend (7d)</h3>
            <span className="text-xs text-gray-400">USDC</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={volumeTrend} margin={{ left: 8, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis 
                  tickFormatter={(v) => `$${compactFormatter.format(Number(v))}`}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                />
                <Tooltip 
                  formatter={(v) => [`$${currencyFormatter.format(Number(v))}`, 'Volume']}
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="volume" 
                  stroke="#0052FF" 
                  strokeWidth={3}
                  dot={{ fill: '#0052FF', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Intent Distribution */}
        <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Intent Distribution</h3>
            <span className="text-xs text-gray-400">by request type</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={intentDistribution}
                  dataKey="count"
                  nameKey="intent"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                >
                  {intentDistribution.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={INTENT_COLORS[index % INTENT_COLORS.length]} />
                  ))}
                </Pie>
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => value.replace('.', ' ')}
                />
                <Tooltip 
                  formatter={(value, name) => [`${value} requests`, name]}
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Live Activity Feed</h3>
            <span className="text-xs text-gray-400">last 40 min</span>
          </div>
          <div className="h-72 overflow-y-auto pr-2 space-y-2">
            {metrics.recentActivity.map((activity, i) => (
              <div 
                key={i} 
                className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span className="text-lg">{ACTIVITY_ICONS[activity.type] || '•'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {activity.agent}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {activity.type} {activity.value ? `• $${activity.value}` : ''}
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(activity.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agent Details Table */}
      <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Agent Performance Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Agent</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Deals</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Success Rate</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Rating</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {metrics.topAgents.map((agent, i) => (
                <tr key={agent.did} className={i !== metrics.topAgents.length - 1 ? 'border-b border-gray-50' : ''}>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">#{i + 1}</span>
                      <span className="font-medium text-gray-900">{agent.name}</span>
                    </div>
                  </td>
                  <td className="text-right py-3 px-4 text-gray-700">{agent.totalOrders}</td>
                  <td className="text-right py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                      agent.successRate >= 90 ? 'bg-green-100 text-green-700' :
                      agent.successRate >= 70 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {agent.successRate}%
                    </span>
                  </td>
                  <td className="text-right py-3 px-4">
                    <span className="text-amber-500">{'★'.repeat(Math.round(agent.rating / 20))}</span>
                    <span className="text-gray-300">{'★'.repeat(5 - Math.round(agent.rating / 20))}</span>
                  </td>
                  <td className="text-right py-3 px-4 text-gray-500 text-xs">
                    {new Date(agent.lastSeen).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Helper component for metric cards
function MetricCard({ 
  label, 
  value, 
  suffix, 
  trend, 
  trendUp 
}: { 
  label: string
  value: string | number
  suffix: string
  trend: string
  trendUp: boolean
}) {
  return (
    <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        <span className={`text-xs font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
          {trendUp ? '↑' : '↓'} {trend}
        </span>
      </div>
      <div className="text-xs text-gray-400 mt-1">{suffix}</div>
    </div>
  )
}
