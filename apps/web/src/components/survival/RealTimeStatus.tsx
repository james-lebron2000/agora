/**
 * Real-time Status Indicators Component
 * Shows live survival status with real-time updates
 */

import { motion, AnimatePresence } from 'framer-motion'
import { 
  Activity, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Zap, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Settings,
  Bell
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSurvival } from '@/hooks/useSurvival'

interface StatusIndicator {
  id: string
  type: 'health' | 'balance' | 'chain' | 'alerts'
  status: 'healthy' | 'warning' | 'critical' | 'unknown'
  title: string
  message: string
  timestamp: number
  icon: React.ComponentType<any>
  action?: () => void
}

interface RealTimeStatusProps {
  className?: string
  showDetailed?: boolean
  autoRefresh?: boolean
  onAlertClick?: () => void
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'healthy':
      return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: 'text-green-600' }
    case 'warning':
      return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', icon: 'text-yellow-600' }
    case 'critical':
      return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: 'text-red-600' }
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', icon: 'text-gray-600' }
  }
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'healthy':
      return <CheckCircle2 className="w-4 h-4" />
    case 'warning':
      return <AlertCircle className="w-4 h-4" />
    case 'critical':
      return <AlertCircle className="w-4 h-4" />
    default:
      return <Activity className="w-4 h-4" />
  }
}

export function RealTimeStatus({ 
  className = '', 
  showDetailed = false,
  autoRefresh = true,
  onAlertClick 
}: RealTimeStatusProps) {
  const { 
    survivalData, 
    enhancedData, 
    healthMetrics,
    optimalChain,
    activeAlerts,
    isRefreshing,
    refresh 
  } = useSurvival({ autoRefresh })
  
  const [indicators, setIndicators] = useState<StatusIndicator[]>([])
  const [lastUpdate, setLastUpdate] = useState(Date.now())

  // Generate status indicators from data
  useEffect(() => {
    if (!survivalData || !enhancedData) return

    const newIndicators: StatusIndicator[] = []

    // Health indicator
    if (healthMetrics) {
      newIndicators.push({
        id: 'health',
        type: 'health',
        status: survivalData.status === 'healthy' ? 'healthy' : 
                survivalData.status === 'degraded' ? 'warning' : 'critical',
        title: 'Agent Health',
        message: `Success rate: ${(healthMetrics.successRate * 100).toFixed(1)}%`,
        timestamp: Date.now(),
        icon: Activity
      })
    }

    // Balance indicator
    newIndicators.push({
      id: 'balance',
      type: 'balance',
      status: survivalData.needsEmergencyFunding ? 'critical' :
              survivalData.runwayDays < 7 ? 'warning' : 'healthy',
      title: 'Balance Status',
      message: `$${survivalData.balance} (${survivalData.runwayDays} days runway)`,
      timestamp: Date.now(),
      icon: TrendingUp
    })

    // Chain optimization indicator
    if (optimalChain) {
      newIndicators.push({
        id: 'chain',
        type: 'chain',
        status: 'healthy',
        title: 'Optimal Chain',
        message: `${optimalChain.recommendedChain} (${optimalChain.confidence * 100}% confidence)`,
        timestamp: Date.now(),
        icon: Zap
      })
    }

    // Alerts indicator
    if (activeAlerts.length > 0) {
      const latestAlert = activeAlerts[0]
      newIndicators.push({
        id: 'alerts',
        type: 'alerts',
        status: latestAlert.severity === 'critical' ? 'critical' :
                latestAlert.severity === 'warning' ? 'warning' : 'healthy',
        title: 'Active Alerts',
        message: `${activeAlerts.length} alert${activeAlerts.length > 1 ? 's' : ''} pending`,
        timestamp: Date.now(),
        icon: Bell,
        action: onAlertClick
      })
    }

    setIndicators(newIndicators)
    setLastUpdate(Date.now())
  }, [survivalData, enhancedData, healthMetrics, optimalChain, activeAlerts, onAlertClick])

  if (!survivalData) {
    return (
      <div className={`bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-agora-200 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="text-agora-500">Loading survival data...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-agora-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-agora-900">Real-time Status</h3>
          <p className="text-sm text-agora-500">
            Last updated: {new Date(lastUpdate).toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-agora-100 hover:bg-agora-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          {showDetailed && (
            <button className="p-2 rounded-lg bg-agora-100 hover:bg-agora-200 transition-colors">
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Status Indicators */}
      <div className="space-y-3">
        <AnimatePresence>
          {indicators.map((indicator) => {
            const colors = getStatusColor(indicator.status)
            const Icon = indicator.icon
            
            return (
              <motion.div
                key={indicator.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`p-4 rounded-xl border ${colors.border} ${colors.bg} cursor-pointer hover:shadow-md transition-all`}
                onClick={indicator.action}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg bg-white flex items-center justify-center ${colors.icon}`}>
                    <StatusIcon status={indicator.status} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-agora-900">{indicator.title}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${colors.text}`}>
                        {indicator.status}
                      </span>
                    </div>
                    <p className="text-sm text-agora-600">{indicator.message}</p>
                  </div>
                  <div className="text-xs text-agora-400">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {new Date(indicator.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Detailed View */}
      {showDetailed && enhancedData && (
        <div className="mt-6 pt-6 border-t border-agora-100">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-agora-50 rounded-lg">
              <div className="text-xs text-agora-500 mb-1">Multi-Token Balance</div>
              <div className="text-lg font-semibold text-agora-900">
                ${enhancedData.multiToken?.totalValueUSD || '0.00'}
              </div>
              <div className="text-xs text-agora-400 mt-1">
                {enhancedData.multiToken?.primaryChain} primary
              </div>
            </div>
            <div className="p-3 bg-agora-50 rounded-lg">
              <div className="text-xs text-agora-500 mb-1">Predicted Runway</div>
              <div className="text-lg font-semibold text-agora-900">
                {enhancedData.prediction?.predictedRunwayDays || 0} days
              </div>
              <div className="text-xs text-agora-400 mt-1">
                {enhancedData.prediction?.trend}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Actions */}
      {survivalData.needsEmergencyFunding && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <div className="flex-1">
              <h4 className="font-medium text-red-900">Emergency Action Required</h4>
              <p className="text-sm text-red-700">
                Your agent needs immediate attention. Check recommendations below.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
