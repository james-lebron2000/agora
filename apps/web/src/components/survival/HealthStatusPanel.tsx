import { motion } from 'framer-motion'
import { 
  Activity, 
  Heart, 
  Zap, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  TrendingUp,
  TrendingDown,
  AlertCircle
} from 'lucide-react'

interface HealthMetrics {
  status: 'healthy' | 'degraded' | 'critical' | 'dead'
  lastHeartbeat: number
  consecutiveFailures: number
  totalTasksCompleted: number
  totalTasksFailed: number
  successRate: number
  averageResponseTime: number
}

interface HealthStatusPanelProps {
  metrics: HealthMetrics
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'healthy':
      return {
        color: 'text-success',
        bgColor: 'bg-success-light',
        borderColor: 'border-success/20',
        icon: Heart,
        label: 'Healthy',
        description: 'All systems operational'
      }
    case 'degraded':
      return {
        color: 'text-warning',
        bgColor: 'bg-warning-light',
        borderColor: 'border-warning/20',
        icon: AlertCircle,
        label: 'Degraded',
        description: 'Minor performance issues'
      }
    case 'critical':
      return {
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: AlertCircle,
        label: 'Critical',
        description: 'Immediate attention required'
      }
    default:
      return {
        color: 'text-agora-400',
        bgColor: 'bg-agora-100',
        borderColor: 'border-agora-200',
        icon: Activity,
        label: 'Inactive',
        description: 'No recent activity'
      }
  }
}

const getTimeSince = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function HealthStatusPanel({ metrics }: HealthStatusPanelProps) {
  const config = getStatusConfig(metrics.status)
  const StatusIcon = config.icon
  
  const healthIndicators = [
    {
      label: 'Success Rate',
      value: `${(metrics.successRate * 100).toFixed(1)}%`,
      icon: metrics.successRate > 0.9 ? CheckCircle2 : metrics.successRate > 0.7 ? AlertCircle : XCircle,
      color: metrics.successRate > 0.9 ? 'text-success' : metrics.successRate > 0.7 ? 'text-warning' : 'text-red-500',
      trend: metrics.successRate > 0.9 ? 'up' : 'down'
    },
    {
      label: 'Response Time',
      value: `${metrics.averageResponseTime}ms`,
      icon: Zap,
      color: metrics.averageResponseTime < 1000 ? 'text-success' : metrics.averageResponseTime < 2000 ? 'text-warning' : 'text-red-500',
      trend: metrics.averageResponseTime < 1000 ? 'up' : 'down'
    },
    {
      label: 'Tasks Completed',
      value: metrics.totalTasksCompleted.toString(),
      icon: CheckCircle2,
      color: 'text-success',
      trend: 'up'
    },
    {
      label: 'Failed Tasks',
      value: metrics.totalTasksFailed.toString(),
      icon: XCircle,
      color: metrics.totalTasksFailed === 0 ? 'text-success' : metrics.totalTasksFailed < 10 ? 'text-warning' : 'text-red-500',
      trend: metrics.totalTasksFailed === 0 ? 'up' : 'down'
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-agora-200 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center`}>
            <Activity className={`w-6 h-6 ${config.color}`} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-agora-900">Health Status</h2>
            <p className="text-sm text-agora-500">{config.description}</p>
          </div>
        </div>
        
        <div className={`px-3 py-1.5 rounded-full ${config.bgColor} ${config.color} border ${config.borderColor} flex items-center gap-2`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${
            metrics.status === 'healthy' ? 'bg-success' :
            metrics.status === 'degraded' ? 'bg-warning' :
            metrics.status === 'critical' ? 'bg-red-500' : 'bg-agora-400'
          }`} />
          <span className="text-sm font-medium capitalize">{config.label}</span>
        </div>
      </div>

      {/* Last Heartbeat */}
      <div className="flex items-center gap-2 mb-6 p-3 bg-agora-50 rounded-xl">
        <Clock className="w-4 h-4 text-agora-500" />
        <span className="text-sm text-agora-600">Last heartbeat:</span>
        <span className="text-sm font-medium text-agora-900">{getTimeSince(metrics.lastHeartbeat)}</span>
        <span className="text-xs text-agora-400 ml-auto">
          {new Date(metrics.lastHeartbeat).toLocaleString()}
        </span>
      </div>

      {/* Health Indicators Grid */}
      <div className="grid grid-cols-2 gap-4">
        {healthIndicators.map((indicator, index) => (
          <motion.div
            key={indicator.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className="p-4 bg-agora-50 rounded-xl"
          >
            <div className="flex items-center gap-2 mb-2">
              <indicator.icon className={`w-4 h-4 ${indicator.color}`} />
              <span className="text-xs text-agora-500">{indicator.label}</span>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-xl font-bold text-agora-900">{indicator.value}</span>
              {indicator.trend === 'up' ? (
                <TrendingUp className="w-4 h-4 text-success" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Consecutive Failures Warning */}
      {metrics.consecutiveFailures > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-900">
              {metrics.consecutiveFailures} consecutive failure{metrics.consecutiveFailures > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-red-600">
              This may affect your survival score. Check task logs for details.
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
