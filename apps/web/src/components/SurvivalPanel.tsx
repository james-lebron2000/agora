/** ============================================================================
 * SurvivalPanel.tsx
 * Agora Echo Survival - Compact Survival Panel for Agent Profile
 * ============================================================================
 * 
 * A compact, embeddable survival status panel designed for integration into
 * the AgentProfile page sidebar. Provides at-a-glance survival metrics.
 * 
 * Features:
 * - Compact circular health gauge
 * - Quick economic stats (USDC, runway)
 * - Survival mode indicator
 * - Action count badge
 * - Link to full SurvivalMonitor view
 * - Responsive design
 * 
 * @module SurvivalPanel
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  Heart,
  Wallet,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Shield,
  Activity,
  Zap,
  AlertCircle,
  Skull,
} from 'lucide-react';

// ============================================
// Type Definitions (re-export from SurvivalMonitor)
// ============================================

export type HealthStatus = 'healthy' | 'stable' | 'degraded' | 'critical' | 'dying';
export type TrendDirection = 'improving' | 'stable' | 'declining';

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

export interface SurvivalAction {
  type: 'bridge' | 'reduce_cost' | 'optimize_chain' | 'earn' | 'alert' | 'shutdown';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  estimatedImpact: string;
  recommendedChain?: string;
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

export interface SurvivalPanelProps {
  data: SurvivalData | null;
  isLoading?: boolean;
  error?: string | null;
  onViewFull?: () => void;
  className?: string;
}

// ============================================
// Status Configuration
// ============================================

interface StatusConfig {
  color: string;
  bg: string;
  border: string;
  glow: string;
  icon: typeof Heart;
  label: string;
}

const statusConfig: Record<HealthStatus, StatusConfig> = {
  healthy: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    glow: 'shadow-emerald-500/20',
    icon: Heart,
    label: 'Healthy',
  },
  stable: {
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    glow: 'shadow-blue-500/20',
    icon: Activity,
    label: 'Stable',
  },
  degraded: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    glow: 'shadow-amber-500/20',
    icon: AlertTriangle,
    label: 'Degraded',
  },
  critical: {
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    glow: 'shadow-orange-500/20',
    icon: AlertCircle,
    label: 'Critical',
  },
  dying: {
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    glow: 'shadow-red-500/20',
    icon: Skull,
    label: 'Dying',
  },
};

// ============================================
// Helper Functions
// ============================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

// ============================================
// Compact Health Gauge
// ============================================

interface CompactGaugeProps {
  value: number;
  status: HealthStatus;
  size?: number;
}

function CompactGauge({ value, status, size = 80 }: CompactGaugeProps) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  const config = statusConfig[status];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-white/5"
        />
        {/* Progress Circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={config.color}
        />
      </svg>
      
      {/* Center Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-xl font-bold text-white`}>{Math.round(value)}</span>
        <span className={`text-[10px] ${config.color}`}>{config.label}</span>
      </div>
    </div>
  );
}

// ============================================
// Trend Mini Indicator
// ============================================

function TrendMiniIndicator({ direction, rateOfChange }: { direction: TrendDirection; rateOfChange: number }) {
  const TrendIcon = direction === 'improving' ? TrendingUp : direction === 'declining' ? TrendingDown : Minus;
  const colorClass = direction === 'improving' ? 'text-emerald-400' : direction === 'declining' ? 'text-red-400' : 'text-slate-400';

  return (
    <div className="flex items-center gap-1">
      <TrendIcon className={`w-3 h-3 ${colorClass}`} />
      <span className={`text-xs ${colorClass}`}>
        {rateOfChange > 0 ? '+' : ''}{rateOfChange.toFixed(1)}%
      </span>
    </div>
  );
}

// ============================================
// Stat Item
// ============================================

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  color?: string;
}

function StatItem({ icon, label, value, subtext, color = 'text-white' }: StatItemProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
      <div className="p-2 bg-white/5 rounded-lg text-white/60">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/50">{label}</p>
        <p className={`font-semibold ${color} truncate`}>{value}</p>
        {subtext && <p className="text-[10px] text-white/40">{subtext}</p>}
      </div>
    </div>
  );
}

// ============================================
// Loading Skeleton
// ============================================

function PanelSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 bg-white/10 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 bg-white/10 rounded" />
          <div className="h-3 w-16 bg-white/10 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="h-14 bg-white/5 rounded-xl" />
        <div className="h-14 bg-white/5 rounded-xl" />
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function SurvivalPanel({
  data,
  isLoading = false,
  error = null,
  onViewFull,
  className = '',
}: SurvivalPanelProps) {
  // Loading state
  if (isLoading && !data) {
    return (
      <div className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-white/60" />
          <span className="text-sm font-semibold text-white">Survival Status</span>
        </div>
        <PanelSkeleton />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`bg-red-500/5 border border-red-500/20 rounded-2xl p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-red-400" />
          <span className="text-sm font-semibold text-red-400">Survival Status</span>
        </div>
        <p className="text-xs text-white/50">Failed to load survival data</p>
        {onViewFull && (
          <button
            onClick={onViewFull}
            className="mt-2 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            View Details →
          </button>
        )}
      </div>
    );
  }

  // Empty state
  if (!data) {
    return (
      <div className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-white/60" />
          <span className="text-sm font-semibold text-white">Survival Status</span>
        </div>
        <p className="text-xs text-white/40 text-center py-4">No survival data available</p>
        {onViewFull && (
          <button
            onClick={onViewFull}
            className="w-full mt-2 py-2 text-xs text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            Configure Survival Monitor
          </button>
        )}
      </div>
    );
  }

  const { health, economics, trend, pendingActions, survivalMode } = data;
  const status = health.status;
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  // Calculate critical status
  const hasCriticalActions = pendingActions.some(a => a.priority === 'critical');
  const hasHighActions = pendingActions.some(a => a.priority === 'high');
  const actionCount = pendingActions.length;

  return (
    <div className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className={`p-4 border-b border-white/10 ${config.bg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className={`w-4 h-4 ${config.color}`} />
            <span className="text-sm font-semibold text-white">Survival Status</span>
          </div>
          {actionCount > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${hasCriticalActions ? 'bg-red-500/20 text-red-400' : hasHighActions ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
              {actionCount} action{actionCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Survival Mode Alert (Compact) */}
        {survivalMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-red-500/10 border border-red-500/20 rounded-lg p-3"
          >
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-2 h-2 bg-red-400 rounded-full"
              />
              <span className="text-xs font-medium text-red-400">SURVIVAL MODE</span>
            </div>
            <p className="text-[10px] text-white/60 mt-1">
              Critical resources. Action required.
            </p>
          </motion.div>
        )}

        {/* Main Stats Row */}
        <div className="flex items-center gap-4">
          {/* Health Gauge */}
          <CompactGauge value={health.overall} status={status} size={72} />
          
          {/* Key Stats */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">Runway</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${getScoreColor(economics.runwayDays)}`}>
                  {economics.runwayDays}d
                </span>
                <TrendMiniIndicator direction={trend.direction} rateOfChange={trend.rateOfChange} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">USDC</span>
              <span className="text-sm font-semibold text-white">
                {formatCompactNumber(economics.totalUSDC)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">Burn</span>
              <span className="text-sm font-semibold text-white/80">
                {formatCurrency(economics.dailyBurnRateUSD)}/d
              </span>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`flex items-center justify-center gap-2 py-2 ${config.bg} ${config.border} border rounded-lg`}>
          <StatusIcon className={`w-4 h-4 ${config.color}`} />
          <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
          <span className="text-xs text-white/40">• {health.overall}/100</span>
        </div>

        {/* View Full Button */}
        {onViewFull && (
          <motion.button
            onClick={onViewFull}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Activity className="w-4 h-4" />
            View Full Details
            <ExternalLink className="w-3.5 h-3.5" />
          </motion.button>
        )}
      </div>
    </div>
  );
}

// ============================================
// Embedded Panel Variant (for inline use)
// ============================================

export interface SurvivalPanelEmbedProps {
  data: SurvivalData | null;
  isLoading?: boolean;
  className?: string;
}

export function SurvivalPanelEmbed({
  data,
  isLoading = false,
  className = '',
}: SurvivalPanelEmbedProps) {
  if (isLoading || !data) {
    return (
      <div className={`flex items-center gap-4 p-4 bg-white/5 rounded-xl ${className}`}>
        <div className="w-14 h-14 bg-white/10 rounded-full animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
          <div className="h-3 w-32 bg-white/10 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const { health, economics, survivalMode } = data;
  const config = statusConfig[health.status];
  const StatusIcon = config.icon;

  return (
    <div className={`flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 ${className}`}>
      {/* Status Icon */}
      <div className={`p-3 ${config.bg} rounded-xl`}>
        <StatusIcon className={`w-6 h-6 ${config.color}`} />
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">{config.label}</span>
          {survivalMode && (
            <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">SURVIVAL</span>
          )}
        </div>
        <p className="text-sm text-white/60 truncate">
          {economics.runwayDays} days runway • {formatCompactNumber(economics.totalUSDC)} USDC
        </p>
      </div>

      {/* Health Score */}
      <div className={`text-lg font-bold ${config.color}`}>{health.overall}</div>
    </div>
  );
}

// ============================================
// Exports
// ============================================

export default SurvivalPanel;
