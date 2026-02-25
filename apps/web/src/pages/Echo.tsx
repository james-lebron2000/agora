import { useState, useEffect } from 'react'
import { 
  Activity, 
  AlertCircle, 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp, 
  Cpu, 
  DollarSign, 
  HardDrive, 
  RefreshCw, 
  ShieldCheck, 
  Skull, 
  TrendingDown, 
  TrendingUp, 
  Wifi, 
  Zap,
  Wallet,
  Info
} from 'lucide-react'
import { MultiChainBalance } from '../components/MultiChainBalance'
import { useWallet } from '../hooks/useWallet'
import { useSurvival } from '../hooks/useSurvival'

// Types (from useSurvival hook)
import type { 
  HealthStatus, 
  ActionType, 
  Priority
} from '../hooks/useSurvival'

// Status metadata
const statusMeta: Record<HealthStatus | string, { 
  color: string 
  bgColor: string
  label: string
  icon: React.ReactNode
}> = {
  healthy: { 
    color: 'text-emerald-500', 
    bgColor: 'bg-emerald-50',
    label: 'Healthy',
    icon: <CheckCircle className="w-6 h-6" />
  },
  stable: { 
    color: 'text-blue-500', 
    bgColor: 'bg-blue-50',
    label: 'Stable',
    icon: <ShieldCheck className="w-6 h-6" />
  },
  degraded: { 
    color: 'text-amber-500', 
    bgColor: 'bg-amber-50',
    label: 'Degraded',
    icon: <AlertTriangle className="w-6 h-6" />
  },
  critical: { 
    color: 'text-red-500', 
    bgColor: 'bg-red-50',
    label: 'Critical',
    icon: <AlertCircle className="w-6 h-6" />
  },
  dying: { 
    color: 'text-red-900', 
    bgColor: 'bg-red-100',
    label: 'Dying',
    icon: <Skull className="w-6 h-6" />
  }
}

const priorityMeta: Record<Priority | string, { color: string; bgColor: string }> = {
  critical: { color: 'text-white', bgColor: 'bg-red-500' },
  high: { color: 'text-white', bgColor: 'bg-amber-500' },
  medium: { color: 'text-white', bgColor: 'bg-blue-500' },
  low: { color: 'text-white', bgColor: 'bg-gray-500' }
}

const actionTypeMeta: Record<ActionType | string, { label: string; icon: React.ReactNode }> = {
  bridge: { label: 'BRIDGE', icon: <ArrowRight className="w-3 h-3" /> },
  reduce_cost: { label: 'REDUCE COST', icon: <TrendingDown className="w-3 h-3" /> },
  optimize_chain: { label: 'OPTIMIZE', icon: <Zap className="w-3 h-3" /> },
  earn: { label: 'EARN', icon: <DollarSign className="w-3 h-3" /> },
  alert: { label: 'ALERT', icon: <AlertCircle className="w-3 h-3" /> },
  shutdown: { label: 'SHUTDOWN', icon: <Skull className="w-3 h-3" /> }
}



// Format helpers
const formatCurrency = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`
  return `$${value.toFixed(2)}`
}

const formatNumber = (value: number, decimals = 2): string => {
  return value.toFixed(decimals)
}

// Health Metric Bar Component
interface MetricBarProps {
  label: string
  value: number
  icon: React.ReactNode
}

function MetricBar({ label, value, icon }: MetricBarProps) {
  const getBarColor = (val: number) => {
    if (val >= 70) return 'bg-emerald-500'
    if (val >= 40) return 'bg-amber-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-medium">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${getBarColor(value)}`}
            style={{ width: `${value}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-gray-700 w-8 text-right">{value}</span>
      </div>
    </div>
  )
}

// Section Card Component
interface SectionCardProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultExpanded?: boolean
  badge?: string
}

function SectionCard({ title, icon, children, defaultExpanded = true, badge }: SectionCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="text-indigo-500">{icon}</div>
          <span className="font-semibold text-gray-900">{title}</span>
          {badge && (
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
              {badge}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  )
}

// Survival Monitor Component
function SurvivalMonitor({ agentId }: { agentId?: string }) {
  const { data: snapshot, isLoading, error, refetch } = useSurvival(agentId || '')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Track last updated time
  useEffect(() => {
    if (snapshot) {
      setLastUpdated(new Date())
    }
  }, [snapshot])

  if (isLoading && !snapshot) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="mt-4 text-gray-500">Loading survival data...</p>
      </div>
    )
  }

  if (!snapshot) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Activity className="w-12 h-12 text-gray-300" />
        <p className="mt-4 text-gray-500">No survival data available</p>
        {error && <p className="mt-2 text-red-500 text-sm">{error}</p>}
        <button 
          onClick={refetch}
          className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  const { health, economics, trend, pendingActions, survivalMode } = snapshot
  const statusInfo = statusMeta[health.status]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusInfo.bgColor}`}>
            <Activity className={`w-5 h-5 ${statusInfo.color}`} />
          </div>
          <div>
            <h1 className="font-bold text-gray-900">Echo Survival</h1>
            <p className="text-xs text-gray-500">
              Agent {agentId ? `${agentId.slice(0, 8)}...` : 'Echo Alpha'}
            </p>
          </div>
        </div>
        <button
          onClick={refetch}
          disabled={isLoading}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          title="Refresh data"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Survival Mode Banner */}
      {survivalMode && (
        <div className="flex items-center justify-center gap-3 p-4 bg-red-500 rounded-xl text-white animate-pulse">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-bold">Survival Mode Active</span>
        </div>
      )}

      {/* Overall Health Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${statusInfo.bgColor}`}>
              {statusInfo.icon}
            </div>
            <div>
              <p className={`text-sm font-bold uppercase ${statusInfo.color}`}>
                {health.status}
              </p>
              <p className="text-3xl font-bold text-gray-900">{health.overall}/100</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">
              Last check: {new Date(health.lastCheck).toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* Health Metrics Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricBar 
            label="Compute"
            value={health.compute}
            icon={<Cpu className="w-4 h-4" />}
          />
          <MetricBar 
            label="Storage"
            value={health.storage}
            icon={<HardDrive className="w-4 h-4" />}
          />
          <MetricBar 
            label="Network"
            value={health.network}
            icon={<Wifi className="w-4 h-4" />}
          />
          <MetricBar 
            label="Economic"
            value={health.economic}
            icon={<DollarSign className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Economic Metrics */}
      <SectionCard 
        title="Economic Metrics" 
        icon={<Wallet className="w-5 h-5" />}
      >
        <div className="grid grid-cols-2 gap-3 pt-4">
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 uppercase mb-1">Total USDC</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(economics.totalUSDC)}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 uppercase mb-1">Net Worth</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(economics.netWorthUSD)}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 uppercase mb-1">Runway</p>
            <p className={`text-lg font-bold ${
              economics.runwayDays < 7 ? 'text-red-500' : 
              economics.runwayDays < 14 ? 'text-amber-500' : 'text-emerald-500'
            }`}>
              {formatNumber(economics.runwayDays, 1)} days
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 uppercase mb-1">Daily Burn</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(economics.dailyBurnRateUSD)}/day</p>
          </div>
        </div>

        {/* Efficiency Score */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Efficiency Score</span>
            <span className="text-sm font-semibold text-gray-700">{economics.efficiencyScore}/100</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${economics.efficiencyScore}%` }}
            />
          </div>
        </div>
      </SectionCard>

      {/* Health Trend */}
      <SectionCard 
        title="Health Trend" 
        icon={<TrendingUp className="w-5 h-5" />}
      >
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Direction</span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              trend.direction === 'improving' ? 'bg-emerald-100 text-emerald-700' :
              trend.direction === 'declining' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }}`}>
              {trend.direction.charAt(0).toUpperCase() + trend.direction.slice(1)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Rate of Change</span>
            <span className={`text-sm font-semibold ${
              trend.rateOfChange > 0 ? 'text-emerald-600' : 
              trend.rateOfChange < 0 ? 'text-red-600' : 'text-gray-700'
            }`}>
              {trend.rateOfChange > 0 ? '+' : ''}{formatNumber(trend.rateOfChange, 2)}/day
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Predicted Health (7d)</span>
            <span className="text-sm font-semibold text-gray-700">{Math.round(trend.predictedHealth)}/100</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Predicted Runway (7d)</span>
            <span className="text-sm font-semibold text-gray-700">{formatNumber(trend.predictedRunway, 1)} days</span>
          </div>
        </div>
      </SectionCard>

      {/* Recommended Actions */}
      {pendingActions.length > 0 && (
        <SectionCard 
          title="Recommended Actions" 
          icon={<Zap className="w-5 h-5" />}
          badge={String(pendingActions.length)}
        >
          <div className="space-y-3 pt-4">
            {pendingActions.map((action, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs font-bold ${priorityMeta[action.priority].bgColor} ${priorityMeta[action.priority].color}`}>
                    {actionTypeMeta[action.type].icon}
                    {actionTypeMeta[action.type].label}
                  </div>
                  <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${priorityMeta[action.priority].bgColor} ${priorityMeta[action.priority].color}`}>
                    {action.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-900 mb-1">{action.description}</p>
                <p className="text-xs text-gray-500 italic">{action.estimatedImpact}</p>
                {action.recommendedChain && (
                  <div className="flex items-center gap-1 mt-2 text-indigo-600 text-xs font-medium">
                    <ArrowRight className="w-3 h-3" />
                    Recommended: {action.recommendedChain}
                  </div>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Multi-Chain Balance */}
      <SectionCard 
        title="Multi-Chain Balance" 
        icon={<Wallet className="w-5 h-5" />}
      >
        <div className="pt-4">
          <MultiChainBalance address={agentId} />
        </div>
      </SectionCard>

      {/* Footer */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-400 py-4">
        <Info className="w-4 h-4" />
        <span>Data refreshes automatically every 60 seconds</span>
        {lastUpdated && (
          <span>• Updated {lastUpdated.toLocaleTimeString()}</span>
        )}
      </div>
    </div>
  )
}

// Main Echo Page Component
export function Echo() {
  const { address } = useWallet()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <SurvivalMonitor agentId={address || undefined} />
      </div>
    </div>
  )
}

export default Echo
