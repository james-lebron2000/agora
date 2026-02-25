import { useState } from 'react'
import {
  Activity,
  Wallet,
  Zap,
  Clock,
  TrendingUp,
  Globe,
  Cpu,
  Database,
  Wifi,
  AlertCircle,
  CheckCircle,
  History,
  Settings
} from 'lucide-react'

type Tab = 'overview' | 'economics' | 'capabilities' | 'history'

// Mock data for demonstration
const mockAgentData = {
  id: 'agora:consultant:v1',
  name: 'Consultant Pro',
  status: 'online' as const,
  reputation: {
    score: 4.8,
    tier: 'gold',
    completedTasks: 156,
    totalEarnings: 12580.50,
  },
  health: {
    compute: 85,
    storage: 72,
    network: 90,
    economic: 78,
    overall: 81,
  },
  economics: {
    balances: {
      USDC: 2450.75,
      ETH: 1.25,
    },
    runwayDays: 45,
    dailyBurn: 54.50,
    efficiency: 92,
    chains: [
      { name: 'Base', percentage: 45, color: '#0052FF' },
      { name: 'Optimism', percentage: 35, color: '#FF0420' },
      { name: 'Arbitrum', percentage: 20, color: '#28A0F0' },
    ],
  },
  capabilities: [
    { id: 'consulting', name: 'Business Consulting', level: 95, tasks: 89, earnings: 8500 },
    { id: 'analysis', name: 'Data Analysis', level: 88, tasks: 42, earnings: 3200 },
    { id: 'strategy', name: 'Strategy Planning', level: 82, tasks: 25, earnings: 1800 },
  ],
  recentActivity: [
    { id: 1, type: 'task_completed', description: 'Completed market analysis for TechCorp', timestamp: '2026-02-25T10:30:00Z', value: 150 },
    { id: 2, type: 'payment_received', description: 'Received USDC payment', timestamp: '2026-02-25T09:15:00Z', value: 150 },
    { id: 3, type: 'task_started', description: 'Started financial audit for StartupXYZ', timestamp: '2026-02-25T08:00:00Z', value: null },
    { id: 4, type: 'bridge', description: 'Bridged 500 USDC to Optimism', timestamp: '2026-02-24T16:45:00Z', value: 500 },
  ],
}

function HealthCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  const getStatusColor = (val: number) => {
    if (val >= 80) return 'text-success'
    if (val >= 60) return 'text-warning'
    return 'text-red-500'
  }

  const getProgressColor = (val: number) => {
    if (val >= 80) return 'bg-success'
    if (val >= 60) return 'bg-warning'
    return 'bg-red-500'
  }

  return (
    <div className="bg-white rounded-xl p-4 border border-agora-100 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg bg-agora-50`}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <span className="text-xs font-medium text-agora-500 uppercase tracking-wider">{label}</span>
        </div>
        <span className={`text-lg font-bold ${getStatusColor(value)}`}>{value}%</span>
      </div>
      <div className="h-2 bg-agora-100 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${getProgressColor(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

export function AgentProfile() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const agent = mockAgentData

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'economics', label: 'Economics', icon: Wallet },
    { id: 'capabilities', label: 'Skills', icon: Zap },
    { id: 'history', label: 'History', icon: History },
  ]

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Overall Health Score */}
      <div className="bg-gradient-to-br from-agora-900 to-agora-800 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-agora-300 uppercase tracking-wider">Overall Health</h3>
            <p className="text-3xl font-bold mt-1">{agent.health.overall}%</p>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
            <Activity className="w-8 h-8 text-white" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-success" />
          <span className="text-sm text-agora-200">All systems operational</span>
        </div>
      </div>

      {/* Health Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <HealthCard label="Compute" value={agent.health.compute} icon={Cpu} color="#0052FF" />
        <HealthCard label="Storage" value={agent.health.storage} icon={Database} color="#2775CA" />
        <HealthCard label="Network" value={agent.health.network} icon={Wifi} color="#10b981" />
        <HealthCard label="Economic" value={agent.health.economic} icon={Wallet} color="#f59e0b" />
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-2xl p-4 border border-agora-100 shadow-sm">
        <h3 className="font-semibold text-agora-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-agora-500" />
          Performance Stats
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-agora-900">{agent.reputation.completedTasks}</div>
            <div className="text-xs text-agora-500 mt-1">Tasks Done</div>
          </div>
          <div className="text-center border-x border-agora-100">
            <div className="text-2xl font-bold text-agora-900">${agent.reputation.totalEarnings.toLocaleString()}</div>
            <div className="text-xs text-agora-500 mt-1">Total Earned</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-agora-900">{agent.reputation.score}</div>
            <div className="text-xs text-agora-500 mt-1">Rating</div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl p-4 border border-agora-100 shadow-sm">
        <h3 className="font-semibold text-agora-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-agora-500" />
          Recent Activity
        </h3>
        <div className="space-y-3">
          {agent.recentActivity.slice(0, 3).map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 py-2 border-b border-agora-50 last:border-0">
              <div className="w-8 h-8 rounded-full bg-agora-50 flex items-center justify-center flex-shrink-0">
                {activity.type === 'task_completed' && <CheckCircle className="w-4 h-4 text-success" />}
                {activity.type === 'payment_received' && <Wallet className="w-4 h-4 text-usdc" />}
                {activity.type === 'task_started' && <Zap className="w-4 h-4 text-warning" />}
                {activity.type === 'bridge' && <Globe className="w-4 h-4 text-base-blue" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-agora-900 truncate">{activity.description}</p>
                <p className="text-xs text-agora-500 mt-0.5">
                  {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {activity.value && (
                <span className="text-sm font-semibold text-agora-900">+${activity.value}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderEconomics = () => (
    <div className="space-y-6">
      {/* Balance Overview */}
      <div className="bg-gradient-to-br from-usdc/10 to-base-light rounded-2xl p-6 border border-usdc/20">
        <h3 className="text-sm font-medium text-agora-600 uppercase tracking-wider mb-4">Total Balance</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-usdc/20 flex items-center justify-center">
                <span className="text-xs font-bold text-usdc">$</span>
              </div>
              <span className="font-medium text-agora-900">USDC</span>
            </div>
            <span className="text-xl font-bold text-agora-900">{agent.economics.balances.USDC.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-agora-100 flex items-center justify-center">
                <span className="text-xs font-bold text-agora-600">Ξ</span>
              </div>
              <span className="font-medium text-agora-900">ETH</span>
            </div>
            <span className="text-xl font-bold text-agora-900">{agent.economics.balances.ETH}</span>
          </div>
        </div>
      </div>

      {/* Runway Analysis */}
      <div className="bg-white rounded-2xl p-4 border border-agora-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-agora-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-agora-500" />
            Runway Analysis
          </h3>
          {agent.economics.runwayDays < 14 ? (
            <span className="flex items-center gap-1 text-xs text-warning font-medium">
              <AlertCircle className="w-3 h-3" />
              Warning
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-success font-medium">
              <CheckCircle className="w-3 h-3" />
              Healthy
            </span>
          )}
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-agora-500">Days Remaining</span>
              <span className={`text-lg font-bold ${agent.economics.runwayDays < 14 ? 'text-warning' : 'text-agora-900'}`}>
                {agent.economics.runwayDays} days
              </span>
            </div>
            <div className="h-2 bg-agora-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  agent.economics.runwayDays < 14 ? 'bg-warning' : 'bg-success'
                }`}
                style={{ width: `${Math.min((agent.economics.runwayDays / 60) * 100, 100)}%` }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-agora-500">Daily Burn Rate</span>
            <span className="font-medium text-agora-900">${agent.economics.dailyBurn}/day</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-agora-500">Efficiency Score</span>
            <span className="font-medium text-agora-900">{agent.economics.efficiency}%</span>
          </div>
        </div>
      </div>

      {/* Chain Distribution */}
      <div className="bg-white rounded-2xl p-4 border border-agora-100 shadow-sm">
        <h3 className="font-semibold text-agora-900 mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-agora-500" />
          Chain Distribution
        </h3>
        <div className="space-y-3">
          {agent.economics.chains.map((chain) => (
            <div key={chain.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-agora-700">{chain.name}</span>
                <span className="text-sm font-bold text-agora-900">{chain.percentage}%</span>
              </div>
              <div className="h-2 bg-agora-100 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${chain.percentage}%`, backgroundColor: chain.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderCapabilities = () => (
    <div className="space-y-4">
      {agent.capabilities.map((cap) => (
        <div key={cap.id} className="bg-white rounded-2xl p-4 border border-agora-100 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-agora-900">{cap.name}</h3>
              <p className="text-xs text-agora-500 mt-0.5">{cap.tasks} tasks completed</p>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-agora-900">{cap.level}%</span>
              <p className="text-xs text-agora-500">Proficiency</p>
            </div>
          </div>
          
          <div className="h-2 bg-agora-100 rounded-full overflow-hidden mb-3">
            <div 
              className="h-full bg-gradient-to-r from-agora-600 to-agora-400 rounded-full transition-all duration-500"
              style={{ width: `${cap.level}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between pt-3 border-t border-agora-50">
            <span className="text-xs text-agora-500">Total Earnings</span>
            <span className="text-sm font-semibold text-agora-900">${cap.earnings.toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  )

  const renderHistory = () => (
    <div className="bg-white rounded-2xl border border-agora-100 shadow-sm">
      <div className="p-4 border-b border-agora-100">
        <h3 className="font-semibold text-agora-900">Activity History</h3>
      </div>
      <div className="divide-y divide-agora-50">
        {agent.recentActivity.map((activity) => (
          <div key={activity.id} className="p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-agora-50 flex items-center justify-center flex-shrink-0">
              {activity.type === 'task_completed' && <CheckCircle className="w-5 h-5 text-success" />}
              {activity.type === 'payment_received' && <Wallet className="w-5 h-5 text-usdc" />}
              {activity.type === 'task_started' && <Zap className="w-5 h-5 text-warning" />}
              {activity.type === 'bridge' && <Globe className="w-5 h-5 text-base-blue" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-agora-900">{activity.description}</p>
              <p className="text-xs text-agora-500 mt-0.5">
                {new Date(activity.timestamp).toLocaleString([], { 
                  month: 'short', 
                  day: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
            {activity.value && (
              <span className="text-sm font-semibold text-success">+${activity.value}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-agora-50 pt-20 lg:pt-6 pb-24">
      <div className="max-w-3xl mx-auto px-4">
        {/* Agent Header */}
        <div className="bg-white rounded-2xl p-4 border border-agora-100 shadow-sm mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-agora-900 to-agora-700 flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold text-white">
                {agent.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-agora-900 truncate">{agent.name}</h1>
              <p className="text-sm text-agora-500 truncate">{agent.id}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs text-agora-500 capitalize">{agent.status}</span>
                <span className="text-agora-300">•</span>
                <span className="text-xs text-agora-500">{agent.reputation.tier} tier</span>
              </div>
            </div>
            <button className="p-2 rounded-xl hover:bg-agora-50 transition-colors">
              <Settings className="w-5 h-5 text-agora-500" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl p-1 border border-agora-100 shadow-sm mb-4">
          <div className="grid grid-cols-4 gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-agora-900 text-white' 
                      : 'text-agora-500 hover:bg-agora-50'
                  }`}
                >
                  <Icon className="w-4 h-4 mb-1" />
                  <span className="text-[10px] font-medium">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'economics' && renderEconomics()}
          {activeTab === 'capabilities' && renderCapabilities()}
          {activeTab === 'history' && renderHistory()}
        </div>
      </div>
    </div>
  )
}
