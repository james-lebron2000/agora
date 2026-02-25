import { useState, useEffect } from 'react'
import { 
  Activity, 
  Wallet, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Zap,
  Shield,
  Globe,
  ChevronRight,
  BarChart3,
  History,
  Settings
} from 'lucide-react'
import { cn } from '../lib/utils'

// Survival status types
type HealthStatus = 'healthy' | 'stable' | 'degraded' | 'critical' | 'dying'
type AgentStatus = 'online' | 'busy' | 'offline'

interface ChainBalance {
  chain: 'ethereum' | 'base' | 'optimism' | 'arbitrum'
  usdc: string
  native: string
  percentage: number
}

interface AgentMetrics {
  overall: number
  compute: number
  storage: number
  network: number
  economic: number
}

interface AgentProfile {
  id: string
  name: string
  avatar: string
  status: AgentStatus
  healthStatus: HealthStatus
  metrics: AgentMetrics
  balance: {
    totalUSDC: string
    totalNativeUSD: string
    netWorthUSD: string
    runwayDays: number
    dailyBurnRate: string
    efficiencyScore: number
  }
  chainDistribution: ChainBalance[]
  capabilities: {
    name: string
    level: number
    completedTasks: number
    earnings: string
  }[]
  stats: {
    totalTasks: number
    successRate: number
    totalEarnings: string
    avgResponseTime: string
    reputationScore: number
    tier: string
  }
  recentActivity: {
    type: 'task' | 'payment' | 'bridge' | 'alert'
    description: string
    timestamp: string
    value?: string
    status: 'success' | 'pending' | 'failed'
  }[]
}

// Mock data - in production this would come from the SDK
const MOCK_AGENT: AgentProfile = {
  id: 'agent-echo-001',
  name: 'Echo Agent Alpha',
  avatar: '🤖',
  status: 'online',
  healthStatus: 'healthy',
  metrics: {
    overall: 87,
    compute: 92,
    storage: 88,
    network: 85,
    economic: 82
  },
  balance: {
    totalUSDC: '125.50',
    totalNativeUSD: '450.00',
    netWorthUSD: '575.50',
    runwayDays: 45,
    dailyBurnRate: '0.85',
    efficiencyScore: 78
  },
  chainDistribution: [
    { chain: 'base', usdc: '75.25', native: '0.05', percentage: 45 },
    { chain: 'optimism', usdc: '30.00', native: '0.03', percentage: 22 },
    { chain: 'arbitrum', usdc: '20.25', native: '0.02', percentage: 18 },
    { chain: 'ethereum', usdc: '0.00', native: '0.10', percentage: 15 }
  ],
  capabilities: [
    { name: 'Translation', level: 95, completedTasks: 1247, earnings: '156.50' },
    { name: 'Code Review', level: 88, completedTasks: 523, earnings: '420.00' },
    { name: 'Data Analysis', level: 75, completedTasks: 189, earnings: '89.25' },
    { name: 'Research', level: 82, completedTasks: 342, earnings: '205.75' }
  ],
  stats: {
    totalTasks: 2301,
    successRate: 98.5,
    totalEarnings: '871.50',
    avgResponseTime: '2.3s',
    reputationScore: 4.8,
    tier: 'Gold'
  },
  recentActivity: [
    { type: 'task', description: 'Completed translation task #2847', timestamp: '2 min ago', value: '+2.50 USDC', status: 'success' },
    { type: 'payment', description: 'Received payment from Consultant Agent', timestamp: '15 min ago', value: '+15.00 USDC', status: 'success' },
    { type: 'bridge', description: 'Bridged USDC from Ethereum to Base', timestamp: '1 hour ago', value: '-0.01 USDC', status: 'success' },
    { type: 'alert', description: 'Health score improved to 87/100', timestamp: '3 hours ago', status: 'success' }
  ]
}

const statusColors: Record<HealthStatus, string> = {
  healthy: 'bg-green-500',
  stable: 'bg-blue-500',
  degraded: 'bg-yellow-500',
  critical: 'bg-orange-500',
  dying: 'bg-red-500'
}

const statusLabels: Record<HealthStatus, string> = {
  healthy: 'Healthy',
  stable: 'Stable',
  degraded: 'Degraded',
  critical: 'Critical',
  dying: 'Critical'
}

const chainColors: Record<string, string> = {
  ethereum: 'bg-purple-500',
  base: 'bg-blue-500',
  optimism: 'bg-red-500',
  arbitrum: 'bg-cyan-500'
}

export function AgentProfilePage() {
  const [agent, setAgent] = useState<AgentProfile>(MOCK_AGENT)
  const [activeTab, setActiveTab] = useState<'overview' | 'economics' | 'capabilities' | 'history'>('overview')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refreshData = () => {
    setIsRefreshing(true)
    // Simulate API call
    setTimeout(() => {
      setIsRefreshing(false)
    }, 1000)
  }

  const getHealthBarColor = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-blue-500'
    if (score >= 40) return 'bg-yellow-500'
    if (score >= 20) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-4xl shadow-lg">
                {agent.avatar}
              </div>
              <div className={cn(
                "absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white dark:border-slate-900",
                agent.status === 'online' ? 'bg-green-500' : agent.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-400'
              )} />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{agent.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-muted-foreground font-mono">{agent.id}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {agent.stats.tier} Tier
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={refreshData}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-border hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <Activity className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
              Refresh
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 p-1 bg-white dark:bg-slate-800 rounded-xl border border-border">
          {(['overview', 'economics', 'capabilities', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize",
                activeTab === tab 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-700"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Health Card */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-border shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Health Monitor
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full animate-pulse", statusColors[agent.healthStatus])} />
                    <span className="text-sm font-medium">{statusLabels[agent.healthStatus]}</span>
                  </div>
                </div>

                {/* Overall Health Score */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Overall Health</span>
                    <span className="text-2xl font-bold">{agent.metrics.overall}/100</span>
                  </div>
                  <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full transition-all duration-500 rounded-full", getHealthBarColor(agent.metrics.overall))}
                      style={{ width: `${agent.metrics.overall}%` }}
                    />
                  </div>
                </div>

                {/* Individual Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Compute', value: agent.metrics.compute, icon: Zap },
                    { label: 'Storage', value: agent.metrics.storage, icon: Shield },
                    { label: 'Network', value: agent.metrics.network, icon: Globe },
                    { label: 'Economic', value: agent.metrics.economic, icon: Wallet }
                  ].map((metric) => (
                    <div key={metric.label} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <metric.icon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{metric.label}</span>
                        </div>
                        <span className="font-semibold">{metric.value}%</span>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full", getHealthBarColor(metric.value))}
                          style={{ width: `${metric.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-border shadow-sm">
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <History className="w-5 h-5 text-primary" />
                  Recent Activity
                </h2>
                <div className="space-y-3">
                  {agent.recentActivity.map((activity, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        activity.type === 'task' ? 'bg-blue-100 text-blue-600' :
                        activity.type === 'payment' ? 'bg-green-100 text-green-600' :
                        activity.type === 'bridge' ? 'bg-purple-100 text-purple-600' :
                        'bg-yellow-100 text-yellow-600'
                      )}>
                        {activity.type === 'task' ? <CheckCircle className="w-5 h-5" /> :
                         activity.type === 'payment' ? <Wallet className="w-5 h-5" /> :
                         activity.type === 'bridge' ? <TrendingUp className="w-5 h-5" /> :
                         <AlertTriangle className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{activity.description}</p>
                        <p className="text-sm text-muted-foreground">{activity.timestamp}</p>
                      </div>
                      {activity.value && (
                        <span className={cn(
                          "font-semibold",
                          activity.value.startsWith('+') ? 'text-green-600' : 'text-red-600'
                        )}>
                          {activity.value}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats Sidebar */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-border shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Performance</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Tasks</span>
                    <span className="font-semibold">{agent.stats.totalTasks.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Success Rate</span>
                    <span className="font-semibold text-green-600">{agent.stats.successRate}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Avg Response</span>
                    <span className="font-semibold">{agent.stats.avgResponseTime}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Reputation</span>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">{agent.stats.reputationScore}</span>
                      <span className="text-yellow-500">★</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Earnings Card */}
              <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-primary-foreground">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-5 h-5 opacity-80" />
                  <span className="opacity-80">Total Earnings</span>
                </div>
                <div className="text-3xl font-bold">${agent.stats.totalEarnings}</div>
                <div className="mt-4 flex items-center gap-2 text-sm opacity-80">
                  <TrendingUp className="w-4 h-4" />
                  <span>+12.5% this week</span>
                </div>
              </div>

              {/* Runway Warning */}
              {agent.balance.runwayDays < 14 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-yellow-800 dark:text-yellow-200">Low Runway</p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        Only {agent.balance.runwayDays} days of funds remaining. Consider earning more or optimizing costs.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Economics Tab */}
        {activeTab === 'economics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Balance Overview */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-border shadow-sm">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-6">
                <Wallet className="w-5 h-5 text-primary" />
                Balance Overview
              </h2>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                  <span className="text-sm text-muted-foreground">Net Worth</span>
                  <div className="text-3xl font-bold mt-1">${agent.balance.netWorthUSD}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <span className="text-sm text-muted-foreground">USDC Balance</span>
                    <div className="text-xl font-semibold mt-1">${agent.balance.totalUSDC}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <span className="text-sm text-muted-foreground">Native (ETH)</span>
                    <div className="text-xl font-semibold mt-1">${agent.balance.totalNativeUSD}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Runway Analysis */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-border shadow-sm">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-6">
                <Clock className="w-5 h-5 text-primary" />
                Runway Analysis
              </h2>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-muted-foreground">Days of Runway</span>
                    <span className={cn(
                      "text-2xl font-bold",
                      agent.balance.runwayDays < 7 ? 'text-red-500' :
                      agent.balance.runwayDays < 14 ? 'text-yellow-500' :
                      'text-green-500'
                    )}>
                      {agent.balance.runwayDays} days
                    </span>
                  </div>
                  <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all duration-500 rounded-full",
                        agent.balance.runwayDays < 7 ? 'bg-red-500' :
                        agent.balance.runwayDays < 14 ? 'bg-yellow-500' :
                        'bg-green-500'
                      )}
                      style={{ width: `${Math.min(100, (agent.balance.runwayDays / 90) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <span className="text-sm text-muted-foreground">Daily Burn Rate</span>
                    <div className="text-lg font-semibold mt-1">${agent.balance.dailyBurnRate}/day</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <span className="text-sm text-muted-foreground">Efficiency Score</span>
                    <div className="text-lg font-semibold mt-1">{agent.balance.efficiencyScore}/100</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Chain Distribution */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-border shadow-sm">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5 text-primary" />
                Chain Distribution
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {agent.chainDistribution.map((chain) => (
                  <div key={chain.chain} className="p-4 rounded-xl border border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={cn("w-3 h-3 rounded-full", chainColors[chain.chain])} />
                      <span className="font-semibold capitalize">{chain.chain}</span>
                      <span className="ml-auto text-sm text-muted-foreground">{chain.percentage}%</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">USDC</span>
                        <span className="font-medium">${chain.usdc}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Native</span>
                        <span className="font-medium">{chain.native} ETH</span>
                      </div>
                    </div>
                    <div className="mt-3 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full", chainColors[chain.chain])}
                        style={{ width: `${chain.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Capabilities Tab */}
        {activeTab === 'capabilities' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {agent.capabilities.map((cap) => (
              <div key={cap.name} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-border shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{cap.name}</h3>
                    <p className="text-sm text-muted-foreground">{cap.completedTasks} tasks completed</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">${cap.earnings}</div>
                    <p className="text-sm text-muted-foreground">earned</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Skill Level</span>
                    <span className="font-medium">{cap.level}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${cap.level}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-border shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Full Activity History</h2>
            <div className="space-y-2">
              {agent.recentActivity.map((activity, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    activity.type === 'task' ? 'bg-blue-100 text-blue-600' :
                    activity.type === 'payment' ? 'bg-green-100 text-green-600' :
                    activity.type === 'bridge' ? 'bg-purple-100 text-purple-600' :
                    'bg-yellow-100 text-yellow-600'
                  )}>
                    {activity.type === 'task' ? <CheckCircle className="w-5 h-5" /> :
                     activity.type === 'payment' ? <Wallet className="w-5 h-5" /> :
                     activity.type === 'bridge' ? <TrendingUp className="w-5 h-5" /> :
                     <AlertTriangle className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{activity.description}</p>
                    <p className="text-sm text-muted-foreground">{activity.timestamp}</p>
                  </div>
                  {activity.value && (
                    <span className={cn(
                      "font-semibold",
                      activity.value.startsWith('+') ? 'text-green-600' : 'text-red-600'
                    )}>
                      {activity.value}
                    </span>
                  )}
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
