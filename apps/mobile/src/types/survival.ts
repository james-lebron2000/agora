/**
 * Mobile Survival Types for Agora
 * TypeScript type definitions for Echo Survival monitoring
 */

import type { 
  AgentHealthStatus, 
  SurvivalSnapshot as SDKSurvivalSnapshot,
  AgentHealth as SDKAgentHealth,
  AgentEconomics as SDKAgentEconomics,
  SurvivalAction as SDKSurvivalAction,
  SurvivalActionType,
  SurvivalActionPriority
} from '@agora/sdk/survival';
import type { SupportedChain } from '@agora/sdk/bridge';

// Re-export SDK types
export type { AgentHealthStatus, SurvivalActionType, SurvivalActionPriority };

// Extended health status with UI-specific values
export type ExtendedHealthStatus = AgentHealthStatus | 'stable' | 'dying';

// Survival indicator props
export interface SurvivalIndicatorProps {
  agentId?: string;
  address?: `0x${string}`;
  compact?: boolean;
  showActions?: boolean;
  onStatusChange?: (status: ExtendedHealthStatus) => void;
  onActionPress?: (action: SurvivalAction) => void;
  testID?: string;
}

// Survival card props
export interface SurvivalCardProps {
  health: SurvivalHealth;
  economics: SurvivalEconomics;
  showDetails?: boolean;
  showRecommendations?: boolean;
  onRefresh?: () => void;
  onActionPress?: (action: SurvivalAction) => void;
  isLoading?: boolean;
}

// Mobile-optimized health data
export interface SurvivalHealth {
  status: ExtendedHealthStatus;
  overall: number; // 0-100
  lastHeartbeat: number;
  lastCheck: number;
  consecutiveFailures: number;
  totalTasksCompleted: number;
  totalTasksFailed: number;
  successRate: number;
  averageResponseTime: number;
  // Component scores
  compute: number;
  storage: number;
  network: number;
  economic: number;
  // UI state
  survivalMode: boolean;
  trend: 'improving' | 'stable' | 'declining';
}

// Mobile-optimized economics data
export interface SurvivalEconomics {
  totalUSDC: number;
  totalNativeUSD: number;
  netWorthUSD: number;
  runwayDays: number;
  dailyBurnRateUSD: number;
  efficiencyScore: number;
  rawBalances: Array<{
    chain: SupportedChain;
    nativeBalance: string;
    usdcBalance: string;
  }>;
  cheapestChain: SupportedChain;
}

// Survival action with mobile UI metadata
export interface SurvivalAction {
  type: SurvivalActionType;
  priority: SurvivalActionPriority;
  description: string;
  estimatedImpact: string;
  recommendedChain?: SupportedChain;
  // UI metadata
  icon?: string;
  color?: string;
  actionable: boolean;
}

// Survival trend data
export interface SurvivalTrend {
  direction: 'improving' | 'stable' | 'declining';
  rateOfChange: number;
  predictedHealth: number;
  predictedRunway: number;
  lastUpdated: number;
}

// Mobile survival snapshot
export interface MobileSurvivalSnapshot {
  health: SurvivalHealth;
  economics: SurvivalEconomics;
  timestamp: number;
  trend: SurvivalTrend;
  pendingActions: SurvivalAction[];
  survivalMode: boolean;
  recommendations: string[];
}

// Survival state for UI management
export interface SurvivalState {
  snapshot: MobileSurvivalSnapshot | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
  heartbeatHistory: HeartbeatRecord[];
}

// Heartbeat record
export interface HeartbeatRecord {
  timestamp: number;
  status: ExtendedHealthStatus;
  survivalScore: number;
  metadata?: Record<string, unknown>;
}

// Survival tab types
export type SurvivalTab = 'overview' | 'economics' | 'history' | 'actions';

// Survival filter options
export interface SurvivalFilter {
  timeRange: '1h' | '24h' | '7d' | '30d' | 'all';
  status?: ExtendedHealthStatus;
  minScore?: number;
}

// Health history entry
export interface HealthHistoryEntry {
  timestamp: number;
  overall: number;
  status: ExtendedHealthStatus;
  economics: number;
  compute: number;
}

// Economics history entry
export interface EconomicsHistoryEntry {
  timestamp: number;
  balance: number;
  runwayDays: number;
  dailyBurn: number;
}

// Survival alert
export interface SurvivalAlert {
  id: string;
  type: 'health' | 'economic' | 'system';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: number;
  acknowledged: boolean;
  action?: SurvivalAction;
}

// Status color mapping
export interface StatusColorScheme {
  background: string;
  foreground: string;
  border: string;
  icon: string;
}

// Survival metric display
export interface SurvivalMetric {
  label: string;
  value: string | number;
  unit?: string;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon?: string;
  color?: string;
}
