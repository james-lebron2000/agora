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

// ============================================
// Prediction Types
// ============================================

import type {
  PredictionResult as SDKPredictionResult,
  SurvivalTrendPrediction as SDKSurvivalTrendPrediction,
  EconomicForecast as SDKEconomicForecast,
  HistoricalDataPoint,
} from '@agora/sdk/survival-prediction';

// Re-export SDK prediction types
export type { HistoricalDataPoint };
export type { SDKPredictionResult, SDKSurvivalTrendPrediction, SDKEconomicForecast };

/** Prediction result with confidence interval */
export interface PredictionResult<T> {
  value: T;
  confidence: number; // 0-1
  lowerBound: T;
  upperBound: T;
  timestamp: number;
}

/** Survival trend prediction with UI metadata */
export interface SurvivalTrendPrediction {
  currentScore: number;
  predictedScore: PredictionResult<number>;
  trend: 'improving' | 'stable' | 'declining';
  trendStrength: number; // 0-1
  daysToCritical: number | null;
  daysToRecovery: number | null;
}

/** Economic forecast with UI metadata */
export interface EconomicForecast {
  currentBalance: string;
  predictedBalance: PredictionResult<string>;
  runwayPrediction: PredictionResult<number>;
  burnRateTrend: 'increasing' | 'stable' | 'decreasing';
  bankruptcyRisk: number; // 0-1 probability
  breakEvenDate: number | null; // timestamp
}

/** Prediction history entry */
export interface PredictionHistoryEntry {
  timestamp: number;
  trend: SurvivalTrendPrediction;
  forecast: EconomicForecast;
}

/** Prediction options */
export interface PredictionOptions {
  daysAhead?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  minDataPoints?: number;
}

/** Prediction hook return type */
export interface UsePredictionReturn {
  // State
  trend: SurvivalTrendPrediction | null;
  forecast: EconomicForecast | null;
  history: PredictionHistoryEntry[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdated: number;
  hasEnoughData: boolean;
  
  // Actions
  refresh: () => Promise<void>;
  predict: (daysAhead?: number) => Promise<void>;
  addDataPoint: (point: HistoricalDataPoint) => void;
  clearHistory: () => void;
  
  // Status helpers
  isBankruptcyRisk: boolean;
  daysUntilCritical: number | null;
  confidenceLevel: number;
}

// ============================================
// Simulation Types
// ============================================

import type {
  SimulationParams as SDKSimulationParams,
  SimulationResult as SDKSimulationResult,
  DailyResult,
  SimulationEvent,
  ScenarioComparison as SDKScenarioComparison,
} from '@agora/sdk/survival-simulation';

// Re-export SDK simulation types
export type { DailyResult, SimulationEvent };
export type { SDKSimulationParams, SDKSimulationResult, SDKScenarioComparison };

/** Scenario type for simulations */
export type ScenarioType = 'optimistic' | 'pessimistic' | 'realistic' | 'custom';

/** Simulation parameters with UI-friendly defaults */
export interface SimulationParams {
  initialBalance: number;
  dailyIncome: number;
  dailyExpenses: number;
  taskSuccessRate: number; // 0-1
  avgTaskReward: number;
  days: number;
  volatility: number; // 0-1
  seed?: number;
}

/** Simulation result with UI metadata */
export interface SimulationResult {
  scenario: ScenarioType;
  params: SimulationParams;
  dailyResults: DailyResult[];
  summary: {
    finalBalance: number;
    totalIncome: number;
    totalExpenses: number;
    minBalance: number;
    maxBalance: number;
    daysSurvived: number;
    bankruptcyDay: number | null;
    avgSurvivalScore: number;
    finalSurvivalScore: number;
  };
  riskAssessment: {
    bankruptcyProbability: number;
    criticalPeriods: Array<{ start: number; end: number }>;
    recommendedActions: string[];
  };
}

/** Scenario comparison result */
export interface ScenarioComparison {
  scenarios: Record<ScenarioType, SimulationResult>;
  recommendation: ScenarioType;
  riskAnalysis: {
    bestCaseOutcome: number;
    worstCaseOutcome: number;
    expectedOutcome: number;
    probabilityOfSuccess: number;
  };
}

/** Monte Carlo aggregate results */
export interface MonteCarloAggregate {
  meanFinalBalance: number;
  medianFinalBalance: number;
  stdDev: number;
  bankruptcyRate: number;
  confidenceInterval: [number, number];
}

/** Monte Carlo simulation result */
export interface MonteCarloResult {
  results: SimulationResult[];
  aggregate: MonteCarloAggregate;
}

/** Simulation options */
export interface SimulationOptions {
  defaultDays?: number;
  defaultVolatility?: number;
  enableMonteCarlo?: boolean;
  monteCarloIterations?: number;
}

/** Simulation hook return type */
export interface UseSimulationReturn {
  // State
  result: SimulationResult | null;
  comparison: ScenarioComparison | null;
  monteCarlo: MonteCarloResult | null;
  isLoading: boolean;
  isComparing: boolean;
  isRunningMonteCarlo: boolean;
  error: string | null;
  lastUpdated: number;
  
  // Actions
  simulate: (params: Partial<SimulationParams>) => Promise<SimulationResult>;
  compareScenarios: (baseParams?: Partial<SimulationParams>) => Promise<ScenarioComparison>;
  runMonteCarlo: (params: Partial<SimulationParams>, iterations?: number) => Promise<MonteCarloResult>;
  clearResults: () => void;
  
  // Preset scenarios
  runOptimistic: (days?: number) => Promise<SimulationResult>;
  runPessimistic: (days?: number) => Promise<SimulationResult>;
  runRealistic: (days?: number) => Promise<SimulationResult>;
  
  // Status helpers
  hasResults: boolean;
  bankruptcyProbability: number;
  isSafe: boolean;
}

/** Chart data for visualization */
export interface SimulationChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    color?: string;
  }>;
}

/** Prediction chart data for visualization */
export interface PredictionChartData {
  labels: string[];
  actual: number[];
  predicted: number[];
  lowerBound: number[];
  upperBound: number[];
  confidence: number[];
}
