import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { useAgent } from '../hooks/useAgent'
import { AgentAvatar } from '../components/AgentAvatar'
import { AchievementBadgeGrid, generateSampleBadges } from '../components/AchievementBadge'
import { ActivityHeatmap, generateActivityData } from '../components/ActivityHeatmap'
import { AgentLevelProgress, calculateLevel } from '../components/AgentLevelProgress'
import { ShareProfile } from '../components/ShareProfile'
import { AgentLeaderboard } from '../components/AgentLeaderboard'
import { useLeaderboard, type TimePeriod, type SortMetric } from '../hooks/useLeaderboard'
import { AgentPerformanceDashboard } from '../components/AgentPerformanceDashboard'
import { ProfileSkeleton } from '../components/ProfileSkeleton'
import { ThemeSelector, ThemeToggleButton } from '../components/ThemeSelector'
import { AnimatedAchievementGrid, type Achievement as AnimatedAchievement } from '../components/AnimatedAchievementCard'
import { ProfileExport } from '../components/ProfileExport'
import { Settings, Share2 } from 'lucide-react'
import type { AgentStatus, AgentReputation, AgentHealth, AgentEconomics, AgentCapability, AgentActivity } from '../hooks/useAgent'
import type { AgentHealthStatus } from '@agora/sdk/survival'
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
  Loader2,
  RefreshCw,
  Shield,
  HeartPulse,
  AlertTriangle,
  Skull,
  Sparkles,
  BarChart3,
  Award,
  ChevronRight,
  Target,
  Users,
  Trophy,
} from 'lucide-react'

type Tab = 'overview' | 'economics' | 'capabilities' | 'history' | 'achievements' | 'leaderboard' | 'analytics' | 'settings'

// Default agent ID - in production this would come from URL params
const DEFAULT_AGENT_ID = 'agent-echo-001'

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

const tabContentVariants = {
  hidden: { opacity: 0, x: 20 },
  show: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
}

/**
 * Animated Health Score Ring Component
 */
function HealthScoreRing({ value, size = 120, strokeWidth = 8, label, sublabel }: { value: number; size?: number; strokeWidth?: number; label?: string; sublabel?: string }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  const getColor = (v: number) => {
    if (v >= 80) return '#10b981'
    if (v >= 60) return '#f59e0b'
    return '#ef4444'
  }

  const color = getColor(value)

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-agora-100"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label && <span className="text-xs text-agora-500">{label}</span>}
        <motion.span className="text-2xl font-bold" style={{ color }} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: 'spring' }}>
          {value}%
        </motion.span>
        {sublabel && <span className="text-xs text-agora-400">{sublabel}</span>}
      </div>
    </div>
  )
}

function HealthCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string }) {
  const getStatusColor = (val: number) => {
    if (val >= 80) return 'text-emerald-500'
    if (val >= 60) return 'text-amber-500'
    return 'text-red-500'
  }

  const getProgressColor = (val: number) => {
    if (val >= 80) return 'bg-emerald-500'
    if (val >= 60) return 'bg-amber-500'
    return 'bg-red-500'
  }

  return (
    <motion.div 
      className="bg-white/80 backdrop-blur-sm rounded-xl p-2.5 sm:p-4 border border-agora-100 shadow-sm hover:shadow-md transition-shadow"
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400 }}
    >
      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="p-1 sm:p-1.5 rounded-lg bg-agora-50">
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color }} />
          </div>
          <span className="text-[10px] sm:text-xs font-medium text-agora-500 uppercase tracking-wider">{label}</span>
        </div>
        <motion.span className={`text-sm sm:text-lg font-bold ${getStatusColor(value)}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          {value}%
        </motion.span>
      </div>
      <div className="h-1.5 sm:h-2 bg-agora-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${getProgressColor(value)}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  )
}

function SurvivalStatusIndicator({ status, score, lastHeartbeat, consecutiveFailures, successRate }: {
  status: AgentHealthStatus
  score: number
  lastHeartbeat: number
  consecutiveFailures: number
  successRate: number
}) {
  const getStatusConfig = (s: AgentHealthStatus) => {
    switch (s) {
      case 'healthy':
        return {
          icon: Shield,
          color: 'text-success',
          bgColor: 'bg-success/10',
          borderColor: 'border-success/30',
          label: 'Healthy',
          pulse: 'animate-pulse'
        }
      case 'degraded':
        return {
          icon: AlertTriangle,
          color: 'text-warning',
          bgColor: 'bg-warning/10',
          borderColor: 'border-warning/30',
          label: 'Degraded',
          pulse: ''
        }
      case 'critical':
        return {
          icon: HeartPulse,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          label: 'Critical',
          pulse: 'animate-pulse'
        }
      case 'dead':
        return {
          icon: Skull,
          color: 'text-gray-500',
          bgColor: 'bg-gray-500/10',
          borderColor: 'border-gray-500/30',
          label: 'Offline',
          pulse: ''
        }
      default:
        return {
          icon: Shield,
          color: 'text-agora-500',
          bgColor: 'bg-agora-50',
          borderColor: 'border-agora-200',
          label: 'Unknown',
          pulse: ''
        }
    }
  }

  const config = getStatusConfig(status)
  const StatusIcon = config.icon
  const timeSinceHeartbeat = Date.now() - lastHeartbeat
  const heartbeatAgo = timeSinceHeartbeat < 60000
    ? 'Just now'
    : timeSinceHeartbeat < 3600000
      ? `${Math.floor(timeSinceHeartbeat / 60000)}m ago`
      : `${Math.floor(timeSinceHeartbeat / 3600000)}h ago`

  return (
    <div className={`rounded-xl p-4 border ${config.borderColor} ${config.bgColor}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl bg-white ${config.color} ${config.pulse}`}>
            <StatusIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-agora-900">Survival Status</h3>
            <p className={`text-sm ${config.color} font-medium`}>{config.label}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-agora-900">{score}</p>
          <p className="text-xs text-agora-500">Survival Score</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-white/50 rounded-lg p-2">
          <p className="text-lg font-semibold text-agora-900">{(successRate * 100).toFixed(0)}%</p>
          <p className="text-xs text-agora-500">Success Rate</p>
        </div>
        <div className="bg-white/50 rounded-lg p-2">
          <p className="text-lg font-semibold text-agora-900">{consecutiveFailures}</p>
          <p className="text-xs text-agora-500">Failures</p>
        </div>
        <div className="bg-white/50 rounded-lg p-2">
          <p className="text-xs font-semibold text-agora-900">{heartbeatAgo}</p>
          <p className="text-xs text-agora-500">Last Beat</p>
        </div>
      </div>
    </div>
  )
}

function LoadingState() {
  // Use the new ProfileSkeleton component for better UX
  return <ProfileSkeleton />
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-agora-50 to-agora-100/50 pt-20 lg:pt-6 pb-24 flex items-center justify-center px-4">
      <motion.div 
        className="bg-white rounded-2xl p-6 border border-red-200 shadow-lg max-w-md w-full text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.div 
          className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.5 }}
        >
          <AlertCircle className="w-6 h-6 text-red-500" />
        </motion.div>
        <h3 className="text-lg font-semibold text-agora-900 mb-2">Failed to load agent</h3>
        <p className="text-sm text-agora-600 mb-4">{error}</p>
        <motion.button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-agora-900 to-agora-700 text-white rounded-xl font-medium hover:shadow-lg transition-shadow"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </motion.button>
      </motion.div>
    </div>
  )
}

export function AgentProfile() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [isSwiping, setIsSwiping] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  
  // Get agent ID from URL or use default
  const agentId = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const idFromQuery = urlParams.get('id');
    return idFromQuery || DEFAULT_AGENT_ID;
  }, []);
  
  const { agent, isLoading, error, refetch } = useAgent(agentId, 30000)

  // Swipe gesture handling for tab switching
  const x = useMotionValue(0)
  const swipeThreshold = 50

  const handleDragEnd = (_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    const currentIndex = tabs.findIndex(t => t.id === activeTab)
    const swipeOffset = info.offset.x
    const swipeVelocity = info.velocity.x

    // Determine swipe direction
    if (Math.abs(swipeOffset) > swipeThreshold || Math.abs(swipeVelocity) > 500) {
      if (swipeOffset > 0 && currentIndex > 0) {
        // Swipe right - go to previous tab
        setActiveTab(tabs[currentIndex - 1].id)
      } else if (swipeOffset < 0 && currentIndex < tabs.length - 1) {
        // Swipe left - go to next tab
        setActiveTab(tabs[currentIndex + 1].id)
      }
    }
    setIsSwiping(false)
  }

  const handleDragStart = () => {
    setIsSwiping(true)
  }

  // Generate sample data for demo purposes
  const sampleBadges = useMemo(() => generateSampleBadges(), [])
  const activityData = useMemo(() => generateActivityData(365), [])
  const agentLevel = useMemo(() => {
    if (!agent) return calculateLevel(0)
    // Calculate XP from agent stats
    const xp = agent.reputation.completedTasks * 100 + agent.reputation.totalEarnings
    return calculateLevel(xp)
  }, [agent])

  const tabs: { id: Tab; label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', shortLabel: 'Overview', icon: Activity },
    { id: 'analytics', label: 'Analytics', shortLabel: 'Stats', icon: BarChart3 },
    { id: 'economics', label: 'Economics', shortLabel: 'Econ', icon: Wallet },
    { id: 'capabilities', label: 'Skills', shortLabel: 'Skills', icon: Zap },
    { id: 'achievements', label: 'Badges', shortLabel: 'Badges', icon: Award },
    { id: 'leaderboard', label: 'Ranks', shortLabel: 'Ranks', icon: Trophy },
    { id: 'history', label: 'History', shortLabel: 'History', icon: History },
    { id: 'settings', label: 'Settings', shortLabel: 'Settings', icon: Settings },
  ]

  if (isLoading && !agent) {
    return <LoadingState />
  }

  if (error && !agent) {
    return <ErrorState error={error} onRetry={refetch} />
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-agora-50 pt-20 lg:pt-6 pb-24 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-6 border border-agora-200 shadow-sm max-w-md w-full text-center">
          <h3 className="text-lg font-semibold text-agora-900 mb-2">Agent not found</h3>
          <p className="text-sm text-agora-600">The requested agent could not be found.</p>
        </div>
      </div>
    )
  }

  const renderOverview = () => (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="show">
      {/* Overall Health Score with Ring Animation */}
      <motion.div className="bg-gradient-to-br from-agora-900 via-agora-800 to-agora-900 rounded-2xl p-6 text-white relative overflow-hidden" variants={itemVariants}>
        {/* Animated background glow */}
        <motion.div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 4, repeat: Infinity }} />
        
        <div className="flex items-center justify-between relative z-10">
          <div>
            <motion.h3 className="text-sm font-medium text-agora-300 uppercase tracking-wider" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              Overall Health
            </motion.h3>
            <motion.p className="text-4xl font-bold mt-2" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}>
              {agent.health.overall}%
            </motion.p>
            <motion.div className="flex items-center gap-2 mt-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              {agent.health.survivalStatus === 'healthy' ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : agent.health.survivalStatus === 'degraded' ? (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400" />
              )}
              <span className="text-sm text-agora-200">
                {agent.health.survivalStatus === 'healthy'
                  ? 'All systems operational'
                  : agent.health.survivalStatus === 'degraded'
                    ? 'Performance degraded'
                    : agent.health.survivalStatus === 'critical'
                      ? 'Critical issues detected'
                      : 'Agent offline'}
              </span>
            </motion.div>
          </div>
          
          <HealthScoreRing value={agent.health.overall} size={100} strokeWidth={8} />
        </div>
      </motion.div>

      {/* Agent Level Progress */}
      <motion.div variants={itemVariants}>
        <AgentLevelProgress level={agentLevel} />
      </motion.div>

      {/* Survival Status Indicator */}
      <motion.div variants={itemVariants}>
        <SurvivalStatusIndicator
          status={agent.health.survivalStatus}
          score={agent.health.survivalScore}
          lastHeartbeat={agent.health.lastHeartbeat}
          consecutiveFailures={agent.health.consecutiveFailures}
          successRate={agent.health.successRate}
        />
      </motion.div>

      {/* Health Metrics Grid - Responsive */}
      <motion.div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3" variants={itemVariants}>
        <HealthCard label="Compute" value={agent.health.compute} icon={Cpu} color="#0052FF" />
        <HealthCard label="Storage" value={agent.health.storage} icon={Database} color="#2775CA" />
        <HealthCard label="Network" value={agent.health.network} icon={Wifi} color="#10b981" />
        <HealthCard label="Economic" value={agent.health.economic} icon={Wallet} color="#f59e0b" />
      </motion.div>

      {/* Activity Heatmap */}
      <motion.div variants={itemVariants}>
        <ActivityHeatmap data={activityData} title="Contribution Activity" />
      </motion.div>

      {/* Quick Stats - Mobile Optimized */}
      <motion.div className="bg-white rounded-2xl p-4 sm:p-5 border border-agora-100 shadow-sm" variants={itemVariants} whileHover={{ y: -2 }}>
        <h3 className="font-semibold text-agora-900 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
          <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-agora-500" />
          Performance Stats
        </h3>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <motion.div className="text-center p-2.5 sm:p-3 rounded-xl bg-agora-50/50 min-h-[70px] flex flex-col justify-center" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <motion.div className="text-lg sm:text-2xl font-bold text-agora-900" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              {agent.reputation.completedTasks}
            </motion.div>
            <div className="text-[10px] sm:text-xs text-agora-500 mt-0.5">Tasks</div>
          </motion.div>
          <motion.div className="text-center p-2.5 sm:p-3 rounded-xl bg-agora-50/50 border-x border-agora-100 min-h-[70px] flex flex-col justify-center" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <motion.div className="text-lg sm:text-2xl font-bold text-agora-900" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              ${agent.reputation.totalEarnings.toLocaleString()}
            </motion.div>
            <div className="text-[10px] sm:text-xs text-agora-500 mt-0.5">Earned</div>
          </motion.div>
          <motion.div className="text-center p-2.5 sm:p-3 rounded-xl bg-agora-50/50 min-h-[70px] flex flex-col justify-center" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <motion.div className="text-lg sm:text-2xl font-bold text-agora-900" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              {agent.reputation.score.toFixed(1)}
            </motion.div>
            <div className="text-[10px] sm:text-xs text-agora-500 mt-0.5">Rating</div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
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
            <span className="text-xl font-bold text-agora-900">
              {agent.economics.balances.USDC?.toLocaleString() || '0'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-agora-100 flex items-center justify-center">
                <span className="text-xs font-bold text-agora-600">Ξ</span>
              </div>
              <span className="font-medium text-agora-900">ETH</span>
            </div>
            <span className="text-xl font-bold text-agora-900">
              {agent.economics.balances.ETH?.toFixed(4) || '0'}
            </span>
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
            <span className="font-medium text-agora-900">${agent.economics.dailyBurn.toFixed(2)}/day</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-agora-500">Efficiency Score</span>
            <span className="font-medium text-agora-900">{agent.economics.efficiency}%</span>
          </div>
        </div>
      </div>

      {/* Chain Distribution - Real Cross-Chain Data */}
      <div className="bg-white rounded-2xl p-4 border border-agora-100 shadow-sm">
        <h3 className="font-semibold text-agora-900 mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-agora-500" />
          Cross-Chain Assets
          <span className="text-xs text-agora-400 font-normal">(Live)</span>
        </h3>

        {/* Total Net Worth */}
        <div className="bg-gradient-to-r from-agora-50 to-transparent rounded-xl p-4 mb-4">
          <p className="text-sm text-agora-500 mb-1">Total Net Worth</p>
          <p className="text-2xl font-bold text-agora-900">
            ${agent.economics.netWorthUSD?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '0.00'}
          </p>
          <div className="flex gap-4 mt-2 text-sm">
            <span className="text-agora-600">
              USDC: <strong>${agent.economics.totalUSDC?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '0.00'}</strong>
            </span>
            <span className="text-agora-600">
              Native: <strong>${agent.economics.totalNativeUSD?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '0.00'}</strong>
            </span>
          </div>
        </div>

        {/* Chain Distribution */}
        <div className="space-y-3">
          {agent.economics.chains.length > 0 ? (
            agent.economics.chains.map((chain) => (
              <div key={chain.name} className="group">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: chain.color }}
                    />
                    <span className="text-sm font-medium text-agora-700">{chain.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-agora-900">{chain.percentage}%</span>
                  </div>
                </div>
                <div className="h-2 bg-agora-100 rounded-full overflow-hidden mb-1">
                  <div
                    className="h-full rounded-full transition-all duration-500 group-hover:opacity-80"
                    style={{ width: `${chain.percentage}%`, backgroundColor: chain.color }}
                  />
                </div>
                <div className="flex justify-between text-xs text-agora-500">
                  <span>{chain.usdcBalance.toFixed(2)} USDC</span>
                  <span>{chain.nativeBalance.toFixed(4)} ETH</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-agora-500 text-center py-4">No chain distribution data</p>
          )}
        </div>

        {/* Raw Balances Table */}
        {agent.economics.rawBalances && agent.economics.rawBalances.length > 0 && (
          <div className="mt-4 pt-4 border-t border-agora-100">
            <p className="text-xs text-agora-500 uppercase tracking-wider mb-2">On-Chain Balances</p>
            <div className="space-y-1">
              {agent.economics.rawBalances.map((balance) => (
                <div key={balance.chain} className="flex justify-between text-sm py-1">
                  <span className="capitalize text-agora-600">{balance.chain}</span>
                  <div className="text-right">
                    <span className="font-medium text-agora-900">{parseFloat(balance.usdcBalance).toFixed(2)} USDC</span>
                    <span className="text-agora-400 mx-1">|</span>
                    <span className="text-agora-600">{parseFloat(balance.nativeBalance).toFixed(4)} ETH</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const renderAnalytics = () => (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants}>
        <AgentPerformanceDashboard agentId={agent.id} />
      </motion.div>
    </motion.div>
  )

  const renderCapabilities = () => (
    <div className="space-y-4">
      {agent.capabilities.length > 0 ? (
        agent.capabilities.map((cap) => (
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
        ))
      ) : (
        <div className="bg-white rounded-2xl p-6 border border-agora-100 shadow-sm text-center">
          <p className="text-sm text-agora-500">No capabilities registered</p>
        </div>
      )}
    </div>
  )

  // Leaderboard state
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<TimePeriod>('all-time')
  const [leaderboardSort, setLeaderboardSort] = useState<SortMetric>('earnings')
  const { entries, isLoading: leaderboardLoading, error: leaderboardError, refetch: refetchLeaderboard } = useLeaderboard({
    period: leaderboardPeriod,
    sortBy: leaderboardSort,
    limit: 20,
    currentUserId: agent.id,
  })

  const renderLeaderboard = () => (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants}>
        <AgentLeaderboard
          entries={entries}
          isLoading={leaderboardLoading}
          error={leaderboardError}
          period={leaderboardPeriod}
          sortBy={leaderboardSort}
          onPeriodChange={setLeaderboardPeriod}
          onSortChange={setLeaderboardSort}
          onRefresh={refetchLeaderboard}
        />
      </motion.div>
    </motion.div>
  )

  const renderAchievements = () => {
    // Convert sample badges to achievements with rarity
    const achievements: AnimatedAchievement[] = sampleBadges.map((badge, index) => ({
      id: badge.id,
      name: badge.name,
      description: badge.description,
      tier: badge.tier,
      rarity: index < 2 ? 'common' : index < 5 ? 'rare' : index < 7 ? 'epic' : 'legendary',
      icon: badge.icon,
      earnedAt: badge.earnedAt,
      progress: badge.progress || 0,
      maxProgress: badge.maxProgress || 100,
      xpReward: badge.tier === 'bronze' ? 100 : badge.tier === 'silver' ? 250 : badge.tier === 'gold' ? 500 : badge.tier === 'platinum' ? 1000 : 2000,
      unlocked: !!badge.earnedAt,
    }));

    return (
      <motion.div 
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={itemVariants}>
          <AnimatedAchievementGrid achievements={achievements} title="Achievements" />
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <div className="bg-white rounded-2xl p-5 border border-agora-100 shadow-sm">
            <h3 className="font-semibold text-agora-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-agora-500" />
              Level Progression
            </h3>
            <AgentLevelProgress level={agentLevel} />
          </div>
        </motion.div>
      </motion.div>
    );
  }

  const renderHistory = () => (
    <div className="bg-white rounded-2xl border border-agora-100 shadow-sm">
      <div className="p-4 border-b border-agora-100">
        <h3 className="font-semibold text-agora-900">Activity History</h3>
      </div>
      <div className="divide-y divide-agora-50">
        {agent.recentActivity.length > 0 ? (
          agent.recentActivity.map((activity) => (
            <div key={activity.id} className="p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-agora-50 flex items-center justify-center flex-shrink-0">
                {activity.type === 'task_completed' && <CheckCircle className="w-5 h-5 text-success" />}
                {activity.type === 'payment_received' && <Wallet className="w-5 h-5 text-usdc" />}
                {activity.type === 'task_started' && <Zap className="w-5 h-5 text-warning" />}
                {activity.type === 'bridge' && <Globe className="w-5 h-5 text-base-blue" />}
                {!['task_completed', 'payment_received', 'task_started', 'bridge'].includes(activity.type) && (
                  <Activity className="w-5 h-5 text-agora-500" />
                )}
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
          ))
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm text-agora-500">No activity history available</p>
          </div>
        )}
      </div>
    </div>
  )

  const renderSettings = () => (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants}>
        <div className="bg-white rounded-2xl p-5 border border-agora-100 shadow-sm">
          <h3 className="font-semibold text-agora-900 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-agora-500" />
            Profile Settings
          </h3>
          <ThemeSelector />
        </div>
      </motion.div>
      
      <motion.div variants={itemVariants}>
        <div className="bg-white rounded-2xl p-5 border border-agora-100 shadow-sm">
          <h3 className="font-semibold text-agora-900 mb-4 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-agora-500" />
            Export & Share
          </h3>
          <div className="flex flex-wrap gap-3">
            <ProfileExport profile={{
              id: agent.id,
              name: agent.name,
              bio: '',
              walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
              level: agentLevel.level,
              xp: 0,
              reputation: Math.round(agent.reputation.score * 10),
              tasksCompleted: agent.reputation.completedTasks,
              tasksPosted: 0,
              totalEarned: agent.reputation.totalEarnings.toString(),
              totalSpent: '0',
              memberSince: Date.now() - 365 * 24 * 60 * 60 * 1000,
              lastActive: Date.now(),
              status: agent.status,
              isVerified: false,
              isPremium: false,
              skills: ['AI', 'Web3', 'DeFi'],
            }} />
            <ShareProfile agentId={agent.id} agentName={agent.name} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-agora-50 to-agora-100/50 pt-safe-top pb-safe-bottom">
      <div className="max-w-3xl mx-auto px-3 sm:px-4 pt-16 sm:pt-20 lg:pt-6 pb-20 sm:pb-24">
        {/* Agent Header with Avatar - Mobile Optimized */}
        <motion.div 
          className="bg-white rounded-2xl p-4 sm:p-5 border border-agora-100 shadow-sm mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-start sm:items-center gap-3 sm:gap-4">
            <AgentAvatar 
              agentId={agent.id}
              agentName={agent.name}
              size="lg"
              status={agent.status}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold text-agora-900 truncate">{agent.name}</h1>
                  <p className="text-xs sm:text-sm text-agora-500 truncate font-mono">{agent.id}</p>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                  <ThemeToggleButton />
                  <ProfileExport profile={{
                    id: agent.id,
                    name: agent.name,
                    bio: '',
                    walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
                    level: agentLevel.level,
                    xp: 0,
                    reputation: Math.round(agent.reputation.score * 10),
                    tasksCompleted: agent.reputation.completedTasks,
                    tasksPosted: 0,
                    totalEarned: agent.reputation.totalEarnings.toString(),
                    totalSpent: '0',
                    memberSince: Date.now() - 365 * 24 * 60 * 60 * 1000,
                    lastActive: Date.now(),
                    status: agent.status,
                    isVerified: false,
                    isPremium: false,
                    skills: ['AI', 'Web3', 'DeFi'],
                  }} />
                  <motion.button
                    onClick={() => refetch()}
                    className="p-2.5 sm:p-2 rounded-xl hover:bg-agora-50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95"
                    disabled={isLoading}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Settings className={`w-5 h-5 text-agora-500 ${isLoading ? 'animate-spin' : ''}`} />
                  </motion.button>
                </div>
              </div>
              
              {/* Mobile: Stack badges, Desktop: Row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${
                    agent.status === 'online' ? 'bg-emerald-500 animate-pulse' : 
                    agent.status === 'busy' ? 'bg-amber-500' : 'bg-agora-400'
                  }`} />
                  <span className="text-xs sm:text-sm text-agora-600 capitalize font-medium">{agent.status}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
                  <span className="text-xs sm:text-sm text-agora-600 capitalize font-medium">{agent.reputation.tier}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-agora-500" />
                  <span className="text-xs sm:text-sm text-agora-600 font-medium">{agent.reputation.score.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation - Mobile Optimized */}
        <motion.div 
          className="bg-white rounded-2xl p-1.5 border border-agora-100 shadow-sm mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {/* Desktop: Grid layout */}
          <div className="hidden sm:grid sm:grid-cols-6 sm:gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl transition-all relative min-h-[60px] ${
                    isActive 
                      ? 'bg-gradient-to-r from-agora-900 to-agora-800 text-white shadow-lg' 
                      : 'text-agora-500 hover:bg-agora-50 hover:text-agora-700'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon className="w-5 h-5 mb-1" />
                  <span className="text-xs font-medium">{tab.label}</span>
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-xl bg-white/10"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </motion.button>
              )
            })}
          </div>
          
          {/* Mobile: Horizontal scroll */}
          <div className="sm:hidden overflow-x-auto scrollbar-hide -mx-1 px-1">
            <div className="flex gap-1.5 min-w-max">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex flex-col items-center justify-center py-2.5 px-3 rounded-xl transition-all relative min-w-[72px] min-h-[64px] ${
                      isActive 
                        ? 'bg-gradient-to-r from-agora-900 to-agora-800 text-white shadow-lg' 
                        : 'text-agora-500 hover:bg-agora-50 hover:text-agora-700'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon className="w-5 h-5 mb-1.5" />
                    <span className="text-[11px] font-medium whitespace-nowrap">{tab.shortLabel}</span>
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 rounded-xl bg-white/10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                      />
                    )}
                  </motion.button>
                )
              })}
            </div>
          </div>
        </motion.div>

        {/* Tab Content with Smooth Transitions and Swipe Support */}
        <AnimatePresence mode="wait">
          <motion.div
            ref={contentRef}
            key={activeTab}
            variants={tabContentVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            transition={{ duration: 0.2 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            style={{ x }}
            className={`${isSwiping ? 'cursor-grabbing' : 'cursor-grab'} touch-pan-y`}
          >
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'analytics' && renderAnalytics()}
            {activeTab === 'economics' && renderEconomics()}
            {activeTab === 'capabilities' && renderCapabilities()}
            {activeTab === 'achievements' && renderAchievements()}
            {activeTab === 'leaderboard' && renderLeaderboard()}
            {activeTab === 'history' && renderHistory()}
            {activeTab === 'settings' && renderSettings()}
          </motion.div>
        </AnimatePresence>

        {/* Swipe Hint for Mobile */}
        <div className="sm:hidden flex items-center justify-center gap-2 mt-4 text-xs text-agora-400">
          <motion.div
            animate={{ x: [-2, 2, -2] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            ←
          </motion.div>
          <span>Swipe to switch tabs</span>
          <motion.div
            animate={{ x: [2, -2, 2] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            →
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default AgentProfile
