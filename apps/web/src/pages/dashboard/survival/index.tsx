import { useState, useEffect } from 'react'
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
  AlertTriangle,
  BarChart3
} from 'lucide-react'
import { useWallet } from '../../../hooks/useWallet'
import { useSurvival } from '../../../hooks/useSurvival'
import { SurvivalScoreCard } from '../../../components/survival/SurvivalScoreCard'
import { HealthStatusPanel } from '../../../components/survival/HealthStatusPanel'
import { EconomicsChart } from '../../../components/survival/EconomicsChart'
import { RecoveryActions } from '../../../components/survival/RecoveryActions'
import { SurvivalHistoryChart } from '../../../components/survival/SurvivalHistoryChart'

// History data generator (will be replaced with real history API)
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
  const { 
    survivalData, 
    healthMetrics, 
    economicMetrics, 
    isLoading, 
    isRefreshing, 
    error,
    refresh 
  } = useSurvival({ autoRefresh: true, refreshInterval: 30000 })
  
  const [historyData, setHistoryData] = useState(generateHistoryData())
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Update last updated time when data changes
  useEffect(() => {
    if (survivalData) {
      setLastUpdated(new Date())
    }
  }, [survivalData])

  const handleRefresh = async () => {
    await refresh()
    setHistoryData(generateHistoryData())
  }

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
                onClick={handleRefresh}
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
        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Error loading survival data</h3>
              <p className="text-sm text-red-700 mt-1">{error.message}</p>
              <button 
                onClick={handleRefresh}
                className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Try again
              </button>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {isLoading && !survivalData ? (
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
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-agora-500">Success Rate</span>
                          <span className="font-medium text-agora-900">{(healthMetrics.successRate * 100).toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-agora-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-success rounded-full transition-all duration-500"
                            style={{ width: `${healthMetrics.successRate * 100}%` }}
                          />
                        </div>
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
