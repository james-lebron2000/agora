import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Zap,
  Gauge,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  MemoryStick,
  Wifi,
  BarChart3,
  RefreshCw,
  Settings,
  ChevronDown,
  ChevronUp,
  Filter,
  Download,
  Trash2,
} from 'lucide-react';
import {
  onPerformanceMetric,
  measureCustomMetric,
  getPerformanceEntries,
  clearPerformanceMetrics,
  THRESHOLDS,
  type PerformanceMetric,
} from '../../utils/performance';

// ============================================================================
// Types
// ============================================================================

interface MetricData {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  timestamp: number
  delta?: number
}

interface PerformanceDashboardProps {
  className?: string
  refreshInterval?: number
  onOptimize?: (metric: string) => void
}

interface MetricCardProps {
  title: string
  value: number
  unit: string
  rating: 'good' | 'needs-improvement' | 'poor'
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'stable'
  trendValue?: number
  description?: string
  onClick?: () => void
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatValue(value: number, unit: string): string {
  if (unit === 'ms') {
    if (value < 1000) return `${Math.round(value)}ms`
    return `${(value / 1000).toFixed(2)}s`
  }
  if (unit === 's') {
    return `${value.toFixed(2)}s`
  }
  if (unit === 'score') {
    return value.toFixed(3)
  }
  return `${Math.round(value)}${unit}`
}

function getRatingColor(rating: string): string {
  switch (rating) {
    case 'good':
      return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
    case 'needs-improvement':
      return 'text-amber-500 bg-amber-500/10 border-amber-500/20'
    case 'poor':
      return 'text-red-500 bg-red-500/10 border-red-500/20'
    default:
      return 'text-gray-500 bg-gray-500/10 border-gray-500/20'
  }
}

function getRatingIcon(rating: string): React.ReactNode {
  switch (rating) {
    case 'good':
      return <CheckCircle className="w-5 h-5 text-emerald-500" />
    case 'needs-improvement':
      return <AlertTriangle className="w-5 h-5 text-amber-500" />
    case 'poor':
      return <AlertTriangle className="w-5 h-5 text-red-500" />
    default:
      return null
  }
}

// ============================================================================
// Metric Card Component
// ============================================================================

function MetricCard({
  title,
  value,
  unit,
  rating,
  icon,
  trend,
  trendValue,
  description,
  onClick,
}: MetricCardProps) {
  return (
    <motion.div
      className={`
        bg-white/5 backdrop-blur-sm border rounded-xl p-5 cursor-pointer
        transition-all hover:bg-white/10
        ${getRatingColor(rating).split(' ')[2]}
      `}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${getRatingColor(rating).split(' ')[1]}`}>
            {icon}
          </div>
          <div>
            <p className="text-sm text-white/60">{title}</p>
            <p className="text-2xl font-bold text-white mt-1">
              {formatValue(value, unit)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getRatingIcon(rating)}
        </div>
      </div>

      {trend && trendValue !== undefined && (
        <div className="flex items-center gap-2 mt-3">
          {trend === 'up' ? (
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          ) : trend === 'down' ? (
            <TrendingDown className="w-4 h-4 text-red-500" />
          ) : null}
          <span
            className={`text-sm ${
              trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-white/60'
            }`}
          >
            {trendValue > 0 ? '+' : ''}
            {trendValue.toFixed(1)}%
          </span>
          <span className="text-sm text-white/40">vs last hour</span>
        </div>
      )}

      {description && <p className="text-xs text-white/50 mt-3">{description}</p>}
    </motion.div>
  )
}

// ============================================================================
// Metric History Chart Component
// ============================================================================

function MetricHistoryChart({ data, name, unit }: { data: MetricData[]; name: string; unit: string }) {
  const maxValue = Math.max(...data.map((d) => d.value), 1)
  const minValue = Math.min(...data.map((d) => d.value))
  const range = maxValue - minValue || 1

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">{name} History</h3>
        <span className="text-sm text-white/50">{data.length} samples</span>
      </div>

      <div className="h-32 flex items-end gap-1">
        {data.slice(-30).map((point, index) => {
          const height = ((point.value - minValue) / range) * 100
          return (
            <motion.div
              key={index}
              className={`flex-1 rounded-t ${getRatingColor(point.rating).split(' ')[1]}`}
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(height, 5)}%` }}
              transition={{ duration: 0.3, delay: index * 0.01 }}
              title={`${formatValue(point.value, unit)} at ${new Date(point.timestamp).toLocaleTimeString()}`}
            />
          )
        })}
      </div>

      <div className="flex justify-between text-xs text-white/40 mt-2">
        <span>30 min ago</span>
        <span>Now</span>
      </div>
    </div>
  )
}

// ============================================================================
// Optimization Suggestions Component
// ============================================================================

function OptimizationSuggestions({
  metrics,
  onOptimize,
}: {
  metrics: MetricData[]
  onOptimize?: (metric: string) => void
}) {
  const suggestions = React.useMemo(() => {
    const result: Array<{
      metric: string
      severity: 'high' | 'medium' | 'low'
      suggestion: string
      action: string
    }> = []

    metrics.forEach((metric) => {
      if (metric.rating === 'poor') {
        switch (metric.name) {
          case 'LCP':
            result.push({
              metric: 'LCP',
              severity: 'high',
              suggestion: 'Largest Contentful Paint is too slow. Optimize images and reduce server response time.',
              action: 'Optimize Images',
            })
            break
          case 'FID':
            result.push({
              metric: 'FID',
              severity: 'high',
              suggestion: 'First Input Delay is poor. Reduce JavaScript execution time and break up long tasks.',
              action: 'Optimize JS',
            })
            break
          case 'CLS':
            result.push({
              metric: 'CLS',
              severity: 'medium',
              suggestion: 'Cumulative Layout Shift detected. Set explicit dimensions for images and avoid inserting content above existing content.',
              action: 'Fix Layout',
            })
            break
          case 'FCP':
            result.push({
              metric: 'FCP',
              severity: 'medium',
              suggestion: 'First Contentful Paint is slow. Optimize critical rendering path and reduce render-blocking resources.',
              action: 'Optimize CSS',
            })
            break
        }
      } else if (metric.rating === 'needs-improvement') {
        result.push({
          metric: metric.name,
          severity: 'low',
          suggestion: `${metric.name} could be improved with minor optimizations.`,
          action: 'View Details',
        })
      }
    })

    return result
  }, [metrics])

  if (suggestions.length === 0) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-emerald-500" />
          <div>
            <h3 className="font-semibold text-emerald-400">All metrics look good!</h3>
            <p className="text-sm text-emerald-400/70">
              Your application is performing well. Keep up the good work!
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-white mb-3">Optimization Suggestions</h3>
      {suggestions.map((suggestion, index) => (
        <motion.div
          key={index}
          className={`
            bg-white/5 backdrop-blur-sm border rounded-xl p-4
            ${suggestion.severity === 'high' ? 'border-red-500/30' : suggestion.severity === 'medium' ? 'border-amber-500/30' : 'border-white/10'}
          `}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    suggestion.severity === 'high'
                      ? 'bg-red-500/20 text-red-400'
                      : suggestion.severity === 'medium'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}
                >
                  {suggestion.severity.toUpperCase()}
                </span>
                <span className="text-sm font-medium text-white">{suggestion.metric}</span>
              </div>
              <p className="text-sm text-white/70 mt-1">{suggestion.suggestion}</p>
            </div>
            {onOptimize && (
              <motion.button
                onClick={() => onOptimize(suggestion.metric)}
                className="ml-4 px-3 py-1.5 bg-white/10 text-white text-sm rounded-lg hover:bg-white/20 transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                {suggestion.action}
              </motion.button>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ============================================================================
// Main Performance Dashboard Component
// ============================================================================

export function PerformanceDashboard({
  className = '',
  refreshInterval = 5000,
  onOptimize,
}: PerformanceDashboardProps) {
  const [metrics, setMetrics] = useState<MetricData[]>([])
  const [metricHistory, setMetricHistory] = useState<Record<string, MetricData[]>>({})
  const [isAutoRefresh, setIsAutoRefresh] = useState(true)
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null)
  const [showThresholds, setShowThresholds] = useState(false)

  // Subscribe to performance metrics
  useEffect(() => {
    const unsubscribe = onPerformanceMetric((metric: PerformanceMetric) => {
      const newData: MetricData = {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        timestamp: Date.now(),
        delta: metric.delta,
      }

      setMetrics((prev) => {
        const filtered = prev.filter((m) => m.name !== metric.name)
        return [...filtered, newData]
      })

      setMetricHistory((prev) => ({
        ...prev,
        [metric.name]: [...(prev[metric.name] || []), newData].slice(-100),
      }))
    })

    return unsubscribe
  }, [])

  // Auto refresh metrics
  useEffect(() => {
    if (!isAutoRefresh) return

    const interval = setInterval(() => {
      // Trigger a new measurement by marking and measuring
      const now = performance.now()
      measureCustomMetric('refresh_pulse', now)
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [isAutoRefresh, refreshInterval])

  const handleClearMetrics = useCallback(() => {
    clearPerformanceMetrics()
    setMetrics([])
    setMetricHistory({})
  }, [])

  const handleExportMetrics = useCallback(() => {
    const data = {
      metrics,
      history: metricHistory,
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `performance-metrics-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [metrics, metricHistory])

  const getMetricByName = (name: string) => metrics.find((m) => m.name === name)

  const coreWebVitals = [
    { name: 'LCP', title: 'Largest Contentful Paint', icon: <Clock className="w-5 h-5" />, unit: 'ms' },
    { name: 'FID', title: 'First Input Delay', icon: <Zap className="w-5 h-5" />, unit: 'ms' },
    { name: 'CLS', title: 'Cumulative Layout Shift', icon: <Activity className="w-5 h-5" />, unit: 'score' },
    { name: 'FCP', title: 'First Contentful Paint', icon: <Gauge className="w-5 h-5" />, unit: 'ms' },
    { name: 'TTFB', title: 'Time to First Byte', icon: <Wifi className="w-5 h-5" />, unit: 'ms' },
    { name: 'INP', title: 'Interaction to Next Paint', icon: <BarChart3 className="w-5 h-5" />, unit: 'ms' },
  ]

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Performance Dashboard</h2>
          <p className="text-white/60 mt-1">Monitor Core Web Vitals and application performance</p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors
              ${isAutoRefresh ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/70'}
            `}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw className={`w-4 h-4 ${isAutoRefresh ? 'animate-spin' : ''}`} />
            {isAutoRefresh ? 'Auto' : 'Paused'}
          </motion.button>

          <motion.button
            onClick={handleExportMetrics}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg font-medium text-sm hover:bg-white/20 transition-colors"
            whileTap={{ scale: 0.95 }}
          >
            <Download className="w-4 h-4" />
            Export
          </motion.button>

          <motion.button
            onClick={handleClearMetrics}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg font-medium text-sm hover:bg-red-500/20 hover:text-red-400 transition-colors"
            whileTap={{ scale: 0.95 }}
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </motion.button>
        </div>
      </div>

      {/* Core Web Vitals Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {coreWebVitals.map((vital) => {
          const metric = getMetricByName(vital.name)
          return (
            <MetricCard
              key={vital.name}
              title={vital.title}
              value={metric?.value || 0}
              unit={vital.unit}
              rating={metric?.rating || 'good'}
              icon={vital.icon}
              trend={metric?.delta && metric.delta > 0 ? 'up' : metric?.delta && metric.delta < 0 ? 'down' : 'stable'}
              trendValue={metric?.delta}
              description={!metric ? 'Waiting for data...' : undefined}
              onClick={() => setSelectedMetric(selectedMetric === vital.name ? null : vital.name)}
            />
          )
        })}
      </div>

      {/* Selected Metric Detail */}
      <AnimatePresence>
        {selectedMetric && metricHistory[selectedMetric] && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <MetricHistoryChart
              data={metricHistory[selectedMetric]}
              name={selectedMetric}
              unit={coreWebVitals.find((v) => v.name === selectedMetric)?.unit || 'ms'}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Optimization Suggestions */}
      <OptimizationSuggestions metrics={metrics} onOptimize={onOptimize} />

      {/* Thresholds Reference */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5">
        <button
          onClick={() => setShowThresholds(!showThresholds)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-white/60" />
            <span className="font-semibold text-white">Thresholds Reference</span>
          </div>
          {showThresholds ? (
            <ChevronUp className="w-5 h-5 text-white/60" />
          ) : (
            <ChevronDown className="w-5 h-5 text-white/60" />
          )}
        </button>

        <AnimatePresence>
          {showThresholds && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(THRESHOLDS).map(([name, threshold]) => (
                  <div key={name} className="bg-white/5 rounded-lg p-3">
                    <p className="font-medium text-white mb-2">{name}</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-emerald-400">Good</span>
                        <span className="text-white/60">≤ {threshold.good}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-amber-400">Needs Improvement</span>
                        <span className="text-white/60">≤ {threshold.poor}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-400">Poor</span>
                        <span className="text-white/60">> {threshold.poor}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Memory Usage */}
      {('memory' in performance) && (
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <MemoryStick className="w-5 h-5 text-white/60" />
            <h3 className="font-semibold text-white">Memory Usage</h3>
          </div>
          {(() => {
            const memory = (performance as any).memory
            const used = memory.usedJSHeapSize
            const total = memory.totalJSHeapSize
            const limit = memory.jsHeapSizeLimit
            const percent = (used / limit) * 100

            return (
              <div className="space-y-3">
                <div className="h-4 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      percent > 80 ? 'bg-red-500' : percent > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">
                    Used: {(used / 1048576).toFixed(1)} MB
                  </span>
                  <span className="text-white/60">
                    Limit: {(limit / 1048576).toFixed(1)} MB
                  </span>
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

export default PerformanceDashboard
