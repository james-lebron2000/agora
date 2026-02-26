/** ============================================================================
 * SurvivalMonitor.tsx
 * Agora Echo Survival - Agent Survival Status Visualization Component
 * ============================================================================
 * 
 * Displays comprehensive agent survival metrics including:
 * - Health gauges (overall, compute, storage, network, economic)
 * - Economic data (USDC balance, runway, burn rate)
 * - Health trends and predictions
 * - Pending survival actions with priority indicators
 * - Survival mode warnings
 * 
 * Features:
 * - Animated health gauges using Framer Motion
 * - Auto-refresh with visual indicator
 * - Loading and error states
 * - Responsive design for mobile and desktop
 * - Color-coded health status
 * 
 * @module SurvivalMonitor
 */

import * as React from 'react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Activity,
  Database,
  Wifi,
  Wallet,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  AlertCircle,
  Power,
  ArrowRightLeft,
  Zap,
  Globe,
  DollarSign,
  Loader2,
  RefreshCw,
  Clock,
  Battery,
  TrendingUp as TrendingUpIcon,
  Shield,
  Server,
  HardDrive,
  Signal,
  Coins,
  Skull,
  X,
} from 'lucide-react';

// ============================================
// Type Definitions (aligned with useSurvival.ts)
// ============================================

export type HealthStatus = 'healthy' | 'stable' | 'degraded' | 'critical' | 'dying';
export type ActionType = 'bridge' | 'reduce_cost' | 'optimize_chain' | 'earn' | 'alert' | 'shutdown';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type TrendDirection = 'improving' | 'stable' | 'declining';

export interface SurvivalAction {
  type: ActionType;
  priority: Priority;
  description: string;
  estimatedImpact: string;
  recommendedChain?: string;
}

export interface HealthMetrics {
  overall: number;
  compute: number;
  storage: number;
  network: number;
  economic: number;
  status: HealthStatus;
  lastCheck: string;
}

export interface EconomicData {
  totalUSDC: number;
  netWorthUSD: number;
  runwayDays: number;
  dailyBurnRateUSD: number;
  efficiencyScore: number;
}

export interface HealthTrend {
  direction: TrendDirection;
  rateOfChange: number;
  predictedHealth: number;
  predictedRunway: number;
}

export interface SurvivalData {
  health: HealthMetrics;
  economics: EconomicData;
  trend: HealthTrend;
  pendingActions: SurvivalAction[];
  survivalMode: boolean;
}

// ============================================
// Props Interface
// ============================================

export interface SurvivalMonitorProps {
  data: SurvivalData | null;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  lastUpdated?: Date;
  className?: string;
  compact?: boolean;
  onActionClick?: (action: SurvivalAction) => void;
}

// ============================================
// Status Configuration
// ============================================

interface StatusConfig {
  color: string;
  bg: string;
  border: string;
  icon: typeof Heart;
  label: string;
  description: string;
}

const statusConfig: Record<HealthStatus, StatusConfig> = {
  healthy: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    icon: Heart,
    label: 'Healthy',
    description: 'Agent operating optimally',
  },
  stable: {
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    icon: Activity,
    label: 'Stable',
    description: 'Normal operations',
  },
  degraded: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    icon: AlertTriangle,
    label: 'Degraded',
    description: 'Performance impacted',
  },
  critical: {
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    icon: AlertCircle,
    label: 'Critical',
    description: 'Immediate attention needed',
  },
  dying: {
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    icon: Skull,
    label: 'Dying',
    description: 'Agent survival at risk',
  },
};

const actionTypeConfig: Record<ActionType, { icon: typeof ArrowRightLeft; label: string; color: string }> = {
  bridge: { icon: ArrowRightLeft, label: 'Bridge Funds', color: 'text-violet-400' },
  reduce_cost: { icon: Zap, label: 'Reduce Costs', color: 'text-amber-400' },
  optimize_chain: { icon: Globe, label: 'Optimize Chain', color: 'text-cyan-400' },
  earn: { icon: DollarSign, label: 'Earn Income', color: 'text-emerald-400' },
  alert: { icon: AlertCircle, label: 'Alert', color: 'text-orange-400' },
  shutdown: { icon: Power, label: 'Shutdown', color: 'text-red-400' },
};

const priorityConfig: Record<Priority, { color: string; bg: string; label: string }> = {
  low: { color: 'text-slate-400', bg: 'bg-slate-500/10', label: 'Low' },
  medium: { color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Medium' },
  high: { color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'High' },
  critical: { color: 'text-red-400', bg: 'bg-red-500/10', label: 'Critical' },
};

// ============================================
// Helper Functions
// ============================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-blue-400';
  if (score >= 40) return 'text-amber-400';
  if (score >= 20) return 'text-orange-400';
  return 'text-red-400';
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-blue-500';
  if (score >= 40) return 'bg-amber-500';
  if (score >= 20) return 'bg-orange-500';
  return 'bg-red-500';
}

// ============================================
// Animated Gauge Component
// ============================================

interface HealthGaugeProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  delay?: number;
}

function HealthGauge({ label, value, icon, size = 'md', showLabel = true, delay = 0 }: HealthGaugeProps) {
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  
  const sizeClasses = {
    sm: { container: 'w-20 h-20', icon: 'w-6 h-6', text: 'text-sm', label: 'text-xs' },
    md: { container: 'w-24 h-24', icon: 'w-7 h-7', text: 'text-lg', label: 'text-xs' },
    lg: { container: 'w-32 h-32', icon: 'w-9 h-9', text: 'text-2xl', label: 'text-sm' },
  };

  const classes = sizeClasses[size];
  const colorClass = getScoreColor(value);

  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${classes.container}`}>
        {/* Background Circle */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-white/5"
          />
          {/* Animated Progress Circle */}
          <motion.circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, delay, ease: "easeOut" }}
            className={colorClass}
          />
        </svg>
        
        {/* Center Icon and Value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`${colorClass} mb-0.5`}>{icon}</div>
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: delay + 0.3 }}
            className={`${classes.text} font-bold text-white`}
          >
            {Math.round(value)}
          </motion.span>
        </div>
      </div>
      
      {showLabel && (
        <span className={`${classes.label} text-white/60 mt-2 font-medium`}>{label}</span>
      )}
    </div>
  );
}

// ============================================
// Linear Progress Bar
// ============================================

interface ProgressBarProps {
  label: string;
  value: number;
  max?: number;
  icon?: React.ReactNode;
  unit?: string;
  delay?: number;
}

function ProgressBar({ label, value, max = 100, icon, unit = '', delay = 0 }: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const colorClass = getScoreBgColor(percentage);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="text-white/40">{icon}</span>}
          <span className="text-sm text-white/70">{label}</span>
        </div>
        <span className="text-sm font-medium text-white">
          {unit === '$' ? formatCurrency(value) : value}
          {unit && unit !== '$' && ` ${unit}`}
        </span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, delay, ease: "easeOut" }}
          className={`h-full ${colorClass} rounded-full`}
        />
      </div>
    </div>
  );
}

// ============================================
// Survival Mode Alert
// ============================================

interface SurvivalModeAlertProps {
  onDismiss?: () => void;
}

function SurvivalModeAlert({ onDismiss }: SurvivalModeAlertProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-red-500/10 border border-red-500/20 rounded-xl p-4"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-red-500/20 rounded-lg">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-red-400 flex items-center gap-2">
            SURVIVAL MODE ACTIVATED
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="inline-block w-2 h-2 bg-red-400 rounded-full"
            />
          </h3>
          <p className="text-sm text-white/70 mt-1">
            Agent has entered survival mode due to critical resource constraints. 
            Non-essential operations have been suspended. Immediate action required.
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 text-white/40 hover:text-white/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// Trend Indicator
// ============================================

interface TrendIndicatorProps {
  direction: TrendDirection;
  rateOfChange: number;
  predictedValue: number;
  label: string;
}

function TrendIndicator({ direction, rateOfChange, predictedValue, label }: TrendIndicatorProps) {
  const TrendIcon = direction === 'improving' ? TrendingUp : direction === 'declining' ? TrendingDown : Minus;
  const trendColor = direction === 'improving' ? 'text-emerald-400' : direction === 'declining' ? 'text-red-400' : 'text-slate-400';
  const trendBg = direction === 'improving' ? 'bg-emerald-500/10' : direction === 'declining' ? 'bg-red-500/10' : 'bg-slate-500/10';

  return (
    <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
      <div className={`p-2 ${trendBg} rounded-lg`}>
        <TrendIcon className={`w-5 h-5 ${trendColor}`} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white capitalize">{direction}</span>
          <span className={`text-xs ${trendColor}`}>
            {rateOfChange > 0 ? '+' : ''}{rateOfChange.toFixed(1)}%
          </span>
        </div>
        <p className="text-xs text-white/50">
          Predicted {label}: {Math.round(predictedValue)}
        </p>
      </div>
    </div>
  );
}

// ============================================
// Action Card
// ============================================

interface ActionCardProps {
  action: SurvivalAction;
  onClick?: (action: SurvivalAction) => void;
  index: number;
}

function ActionCard({ action, onClick, index }: ActionCardProps) {
  const config = actionTypeConfig[action.type];
  const priority = priorityConfig[action.priority];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick?.(action)}
      className="p-4 bg-white/5 border border-white/10 rounded-xl cursor-pointer transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 bg-white/5 rounded-lg ${config.color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-white">{config.label}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${priority.bg} ${priority.color}`}>
              {priority.label}
            </span>
          </div>
          <p className="text-sm text-white/60 mt-1">{action.description}</p>
          {action.estimatedImpact && (
            <p className="text-xs text-emerald-400 mt-2">
              Impact: {action.estimatedImpact}
            </p>
          )}
          {action.recommendedChain && (
            <p className="text-xs text-violet-400 mt-1">
              Recommended: {action.recommendedChain}
            </p>
          )}
        </div>
        <ArrowRightLeft className="w-4 h-4 text-white/20" />
      </div>
    </motion.div>
  );
}

// ============================================
// Loading Skeleton
// ============================================

function SkeletonCard() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 w-32 bg-white/10 rounded" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-white/5 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ============================================
// Header Component
// ============================================

interface HeaderProps {
  status: HealthStatus;
  lastUpdated?: Date;
  onRefresh?: () => void;
  isLoading?: boolean;
}

function Header({ status, lastUpdated, onRefresh, isLoading }: HeaderProps) {
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-xl ${config.bg} ${config.border} border`}>
          <StatusIcon className={`w-6 h-6 ${config.color}`} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Survival Monitor</h2>
          <p className={`text-sm ${config.color}`}>
            {config.label} — {config.description}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {lastUpdated && (
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <Clock className="w-3.5 h-3.5" />
            <span>Updated {lastUpdated.toLocaleTimeString()}</span>
          </div>
        )}
        {onRefresh && (
          <motion.button
            onClick={onRefresh}
            disabled={isLoading}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 text-white/70 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </motion.button>
        )}
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function SurvivalMonitor({
  data,
  isLoading = false,
  error = null,
  onRefresh,
  lastUpdated,
  className = '',
  compact = false,
  onActionClick,
}: SurvivalMonitorProps) {
  const [dismissedAlert, setDismissedAlert] = useState(false);

  // Show loading state
  if (isLoading && !data) {
    return (
      <div className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 ${className}`}>
        <SkeletonCard />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={`bg-red-500/5 border border-red-500/20 rounded-2xl p-6 ${className}`}>
        <div className="flex items-center gap-3">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <div>
            <h3 className="font-semibold text-red-400">Failed to Load Survival Data</h3>
            <p className="text-sm text-white/60 mt-1">{error}</p>
          </div>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="mt-4 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  // Show empty state
  if (!data) {
    return (
      <div className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 ${className}`}>
        <div className="text-center py-8">
          <Activity className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/40">No survival data available</p>
        </div>
      </div>
    );
  }

  const { health, economics, trend, pendingActions, survivalMode } = data;
  const status = health.status;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Survival Mode Alert */}
      <AnimatePresence>
        {survivalMode && !dismissedAlert && (
          <SurvivalModeAlert onDismiss={() => setDismissedAlert(true)} />
        )}
      </AnimatePresence>

      {/* Main Card */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        {/* Header */}
        <Header
          status={status}
          lastUpdated={lastUpdated}
          onRefresh={onRefresh}
          isLoading={isLoading}
        />

        {/* Health Gauges */}
        <div className="mt-8">
          <h3 className="text-sm font-medium text-white/60 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Health Metrics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <HealthGauge
              label="Overall"
              value={health.overall}
              icon={<Heart className="w-full h-full" />}
              size={compact ? 'sm' : 'md'}
              delay={0}
            />
            <HealthGauge
              label="Compute"
              value={health.compute}
              icon={<Server className="w-full h-full" />}
              size={compact ? 'sm' : 'md'}
              delay={0.1}
            />
            <HealthGauge
              label="Storage"
              value={health.storage}
              icon={<HardDrive className="w-full h-full" />}
              size={compact ? 'sm' : 'md'}
              delay={0.2}
            />
            <HealthGauge
              label="Network"
              value={health.network}
              icon={<Signal className="w-full h-full" />}
              size={compact ? 'sm' : 'md'}
              delay={0.3}
            />
            <HealthGauge
              label="Economic"
              value={health.economic}
              icon={<Coins className="w-full h-full" />}
              size={compact ? 'sm' : 'md'}
              delay={0.4}
            />
          </div>
        </div>

        {/* Economic Data */}
        {!compact && (
          <div className="mt-8 pt-8 border-t border-white/10">
            <h3 className="text-sm font-medium text-white/60 mb-4 flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Economic Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <ProgressBar
                  label="USDC Balance"
                  value={economics.totalUSDC}
                  max={Math.max(economics.totalUSDC * 1.5, 1000)}
                  icon={<Coins className="w-4 h-4" />}
                  unit="$"
                  delay={0.5}
                />
                <ProgressBar
                  label="Net Worth"
                  value={economics.netWorthUSD}
                  max={Math.max(economics.netWorthUSD * 1.5, 1000)}
                  icon={<Wallet className="w-4 h-4" />}
                  unit="$"
                  delay={0.6}
                />
                <ProgressBar
                  label="Efficiency Score"
                  value={economics.efficiencyScore}
                  max={100}
                  icon={<Zap className="w-4 h-4" />}
                  unit="%"
                  delay={0.7}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-white/60 mb-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Runway</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {economics.runwayDays}
                    <span className="text-sm font-normal text-white/60 ml-1">days</span>
                  </div>
                  <div className="text-xs text-white/40 mt-1">
                    Daily burn: {formatCurrency(economics.dailyBurnRateUSD)}
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-white/60 mb-2">
                    <TrendingUpIcon className="w-4 h-4" />
                    <span className="text-sm">Burn Rate</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(economics.dailyBurnRateUSD)}
                  </div>
                  <div className="text-xs text-white/40 mt-1">per day</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Compact Economic Info */}
        {compact && (
          <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-white">{formatCompactNumber(economics.totalUSDC)}</div>
              <div className="text-xs text-white/50">USDC</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white">{economics.runwayDays}d</div>
              <div className="text-xs text-white/50">Runway</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white">{formatCompactNumber(economics.dailyBurnRateUSD)}</div>
              <div className="text-xs text-white/50">Daily Burn</div>
            </div>
          </div>
        )}

        {/* Health Trend */}
        {!compact && (
          <div className="mt-8 pt-8 border-t border-white/10">
            <h3 className="text-sm font-medium text-white/60 mb-4 flex items-center gap-2">
              <TrendingUpIcon className="w-4 h-4" />
              Health Trend
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TrendIndicator
                direction={trend.direction}
                rateOfChange={trend.rateOfChange}
                predictedValue={trend.predictedHealth}
                label="Health"
              />
              <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
                <div className="p-2 bg-violet-500/10 rounded-lg">
                  <Clock className="w-5 h-5 text-violet-400" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">Predicted Runway</div>
                  <p className="text-xs text-white/50">
                    {trend.predictedRunway} days estimated
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pending Actions */}
        {pendingActions.length > 0 && (
          <div className="mt-8 pt-8 border-t border-white/10">
            <h3 className="text-sm font-medium text-white/60 mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Recommended Actions ({pendingActions.length})
            </h3>
            <div className="space-y-3">
              {pendingActions.map((action, index) => (
                <ActionCard
                  key={`${action.type}-${index}`}
                  action={action}
                  onClick={onActionClick}
                  index={index}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Sample Data Generator
// ============================================

export function generateSampleSurvivalData(overrides?: Partial<SurvivalData>): SurvivalData {
  return {
    health: {
      overall: 78,
      compute: 85,
      storage: 72,
      network: 80,
      economic: 65,
      status: 'stable',
      lastCheck: new Date().toISOString(),
    },
    economics: {
      totalUSDC: 2500.50,
      netWorthUSD: 3200.75,
      runwayDays: 45,
      dailyBurnRateUSD: 55.56,
      efficiencyScore: 82,
    },
    trend: {
      direction: 'stable',
      rateOfChange: 0.5,
      predictedHealth: 80,
      predictedRunway: 47,
    },
    pendingActions: [
      {
        type: 'optimize_chain',
        priority: 'medium',
        description: 'Switch to Arbitrum for 40% lower gas costs',
        estimatedImpact: 'Save ~$20/day',
        recommendedChain: 'Arbitrum',
      },
      {
        type: 'earn',
        priority: 'high',
        description: 'Accept available task to extend runway',
        estimatedImpact: '+$500 revenue',
      },
    ],
    survivalMode: false,
    ...overrides,
  };
}

export default SurvivalMonitor;
