import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Heart, 
  Wallet, 
  Activity, 
  TrendingUp, 
  AlertCircle,
  RefreshCw,
  Battery,
  Clock,
  Zap,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  BarChart3
} from 'lucide-react'
import { useWallet } from '../../../hooks/useWallet'
import { SurvivalScoreCard } from '../../../components/survival/SurvivalScoreCard'
import { HealthStatusPanel } from '../../../components/survival/HealthStatusPanel'
import { EconomicsChart } from '../../../components/survival/EconomicsChart'
import { RecoveryActions } from '../../../components/survival/RecoveryActions'
import { SurvivalHistoryChart } from '../../../components/survival/SurvivalHistoryChart'

// Survival data types
interface SurvivalData {
  score: number
  healthScore: number
  economicsScore: number
  status: 'healthy' | 'degraded' | 'critical' | 'dead'
  balance: string
  runwayDays: number
  dailyBurnRate: string
  lastHeartbeat: number
  recommendations: string[]
  needsEmergencyFunding: boolean
}

interface HealthMetrics {
  status: 'healthy' | 'degraded' | 'critical' | 'dead'
  lastHeartbeat: number
  consecutiveFailures: number
  totalTasksCompleted: number
  totalTasksFailed: number
  successRate: number
  averageResponseTime: number
}

interface EconomicMetrics {
  totalEarned: string
  totalSpent: string
  currentBalance: string
  minSurvivalBalance: string
  dailyBurnRate: string
  daysOfRunway: number
}

// Mock data generator for demo
const generateMockData = (address: string): { survival: SurvivalData; health: HealthMetrics; economics: EconomicMetrics } => {
  const score = Math.floor(Math.random() * 40) + 60 // 60-100
  const status = score > 80 ? 'healthy' : score > 50 ? 'degraded' : score > 20 ? 'critical' : 'dead'
  
  return {
    survival: {
      score,
      healthScore: Math.floor(Math.random() * 30) + 70,
      economicsScore: Math.floor(Math.random() * 40) + 50,
      status,
      balance: (Math.random() * 1000 + 100).toFixed(2),
      runwayDays: Math.floor(Math.random() * 60) + 10,
      dailyBurnRate: (Math.random() * 50 + 5).toFixed(2),
      lastHeartbeat: Date.now() - Math.floor(Math.random() * 300000),
      recommendations: score < 70 ? [
        'Increase task completion rate to improve earnings',
        'Reduce gas costs by batching operations',
        'Consider requesting emergency funding'
      ] : [
        'Maintain current performance level',
        'Explore high-value task opportunities',
        'Build reserve buffer for market volatility'
      ],
      needsEmergencyFunding: score < 40
    },
    health: {
      status,
      lastHeartbeat: Date.now() - Math.floor(Math.random() * 300000),
      consecutiveFailures: Math.floor(Math.random() * 5),
      totalTasksCompleted: Math.floor(Math.random() * 1000) + 100,
      totalTasksFailed: Math.floor(Math.random() * 50),
      successRate: 0.85 + Math.random() * 0.14,
      averageResponseTime: Math.floor(Math.random() * 2000) + 500
    },
    economics: {
      totalEarned: (Math.random() * 5000 + 1000).toFixed(2),
      totalSpent: (Math.random() * 3000 + 500).toFixed(2),
      currentBalance: (Math.random() * 1000 + 100).toFixed(2),
      minSurvivalBalance: '50.00',
      dailyBurnRate: (Math.random() * 50 + 5).toFixed(2),
      daysOfRunway: Math.floor(Math.random() * 60) + 10
    }
  }
}

// History data generator
const generateHistoryData = () => {
  const data = []
  for (let i = 30; i >= 0; i--) {
    data.push({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: Math.floor(Math.random() * 30) + 65,
      balance: Math.floor(Math.random() * 500) + 200
    })
  }
  return data
}

export default function SurvivalDashboard() {
  const { address, isConnected } = useWallet()
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [survivalData, setSurvivalData] = useState<SurvivalData | null>(null)
  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics | null>(null)
  const [economicMetrics, setEconomicMetrics] = useState<EconomicMetrics | null>(null)
  const [historyData, setHistoryData] = useState(generateHistoryData())
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const fetchData = useCallback(async () => {
    if (!address) return
    
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const data = generateMockData(address)
    setSurvivalData(data.survival)
    setHealthMetrics(data.health)
    setEconomicMetrics(data.economics)
    setLastUpdated(new Date())
    setIsLoading(false)
  }, [address])

  const refreshData = useCallback(async () => {
    setIsRefreshing(true)
    await new Promise(resolve => setTimeout(resolve, 800))
    
    const data = generateMockData(address || '')
    setSurvivalData(data.survival)
    setHealthMetrics(data.health)
    setEconomicMetrics(data.economics)
    setHistoryData(generateHistoryData())
    setLastUpdated(new Date())
    setIsRefreshing(false)
  }, [address])

  useEffect(() => {
    if (isConnected && address) {
      fetchData()
    }
  }, [isConnected, address, fetchData])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!isConnected) return
    
    const interval = setInterval(() => {
      refreshData()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [isConnected, refreshData])

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-agora-50 to-agora-100 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-base-blue to-blue-600 flex items-center justify-center shadow-xl">
            <Heart className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-agora-900 mb-3">Echo Survival</h1>
          <p className="text-agora-600 mb-8">
            Monitor your agent's economic sustainability, health metrics, and survival score in real-time.
          </p>
          <div className="p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-agora-200">
            <div className="flex items-center gap-3 text-agora-600">
              <Wallet className="w-5 h-5 text-base-blue" />
              <span>Connect your wallet to view survival metrics</span>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-agora-50 to-agora-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-agora-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-base-blue to-blue-600 flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-agora-900">Echo Survival</h1>
                <p className="text-xs text-agora-500">Agent Health Monitor</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm text-agora-500">
                <Clock className="w-4 h-4" />
                <span>Updated {lastUpdated.toLocaleTimeString()}</span>
              </div>
              <button
                onClick={refreshData}
                disabled={isRefreshing}
                className="p-2 rounded-lg hover:bg-agora-100 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 text-agora-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-20"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-agora-200 border-t-base-blue rounded-full animate-spin" />
                <p className="text-agora-600">Loading survival metrics...</p>
              </div>
            </motion.div>
          ) : survivalData && healthMetrics && economicMetrics ? (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Emergency Alert */}
              {survivalData.needsEmergencyFunding && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3"
                >
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900">Emergency Funding Required</h3>
                    <p className="text-sm text-red-700 mt-1">
                      Your agent's survival score is critically low. Immediate action recommended.
                    </p>
                  </div>
                  <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
                    Request Funding
                  </button>
                </motion.div>
              )}

              {/* Top Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <SurvivalScoreCard 
                  score={survivalData.score}
                  healthScore={survivalData.healthScore}
                  economicsScore={survivalData.economicsScore}
                  status={survivalData.status}
                />
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-agora-200 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-agora-500">Current Balance</p>
                      <p className="text-2xl font-bold text-agora-900">${survivalData.balance}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-usdc-light flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-usdc" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-success" />
                    <span className="text-success">+12.5%</span>
                    <span className="text-agora-400">vs last week</span>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-agora-200 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-agora-500">Runway</p>
                      <p className="text-2xl font-bold text-agora-900">{survivalData.runwayDays} days</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-warning-light flex items-center justify-center">
                      <Battery className={`w-6 h-6 ${survivalData.runwayDays < 14 ? 'text-red-500' : 'text-warning'}`} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="h-2 bg-agora-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          survivalData.runwayDays < 14 ? 'bg-red-500' : 
                          survivalData.runwayDays < 30 ? 'bg-warning' : 'bg-success'
                        }`}
                        style={{ width: `${Math.min(survivalData.runwayDays / 90 * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-agora-500 mt-2">
                      Burn rate: ${survivalData.dailyBurnRate}/day
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-agora-200 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-agora-500">Health Status</p>
                      <p className={`text-2xl font-bold capitalize ${
                        survivalData.status === 'healthy' ? 'text-success' :
                        survivalData.status === 'degraded' ? 'text-warning' :
                        survivalData.status === 'critical' ? 'text-red-500' : 'text-agora-400'
                      }`}>
                        {survivalData.status}
                      </p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      survivalData.status === 'healthy' ? 'bg-success-light' :
                      survivalData.status === 'degraded' ? 'bg-warning-light' :
                      survivalData.status === 'critical' ? 'bg-red-100' : 'bg-agora-100'
                    }`}>
                      <Activity className={`w-6 h-6 ${
                        survivalData.status === 'healthy' ? 'text-success' :
                        survivalData.status === 'degraded' ? 'text-warning' :
                        survivalData.status === 'critical' ? 'text-red-500' : 'text-agora-400'
                      }`} />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${
                      survivalData.status === 'healthy' ? 'bg-success' :
                      survivalData.status === 'degraded' ? 'bg-warning' :
                      survivalData.status === 'critical' ? 'bg-red-500' : 'bg-agora-400'
                    }`} />
                    <span className="text-xs text-agora-500">
                      Last heartbeat: {new Date(survivalData.lastHeartbeat).toLocaleTimeString()}
                    </span>
                  </div>
                </motion.div>
              </div>

              {/* Main Dashboard Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Health & Economics */}
                <div className="lg:col-span-2 space-y-6">
                  <HealthStatusPanel metrics={healthMetrics} />
                  <EconomicsChart metrics={economicMetrics} />
                  <SurvivalHistoryChart data={historyData} />
                </div>

                {/* Right Column - Recovery Actions */}
                <div className="space-y-6">
                  <RecoveryActions 
                    recommendations={survivalData.recommendations}
                    needsEmergencyFunding={survivalData.needsEmergencyFunding}
                  />
                  
                  {/* Quick Stats */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-agora-200 shadow-sm"
                  >
                    <h3 className="font-semibold text-agora-900 mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-base-blue" />
                      Performance Metrics
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-agora-600">Success Rate</span>
                        <span className="font-medium text-agora-900">{(healthMetrics.successRate * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-agora-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-success rounded-full transition-all duration-500"
                          style={{ width: `${healthMetrics.successRate * 100}%` }}
                        />
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-agora-600">Tasks Completed</span>
                        <span className="font-medium text-agora-900">{healthMetrics.totalTasksCompleted}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-agora-600">Avg Response Time</span>
                        <span className="font-medium text-agora-900">{healthMetrics.averageResponseTime}ms</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-agora-600">Consecutive Failures</span>
                        <span className={`font-medium ${healthMetrics.consecutiveFailures > 0 ? 'text-red-500' : 'text-success'}`}>
                          {healthMetrics.consecutiveFailures}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>
    </div>
  )
}
