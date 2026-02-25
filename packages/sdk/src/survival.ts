/**
 * Agora Echo Survival Mechanism
 * 
 * Provides autonomous survival capabilities for AI agents in the Agora ecosystem:
 * - Health monitoring (compute, storage, reputation)
 * - Economic self-preservation (balance tracking, cost optimization)
 * - Self-healing behaviors (chain selection, resource optimization)
 * - Survival thresholds and alerts
 * 
 * @module survival
 */

import { EventEmitter } from 'events';
import type { MultiChainWallet, ChainBalance, SupportedChain } from './wallet-manager.js';
import { calculateAgentScore, type AgentPortfolio } from './portfolio.js';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Agent health metrics across multiple dimensions
 */
export interface AgentHealth {
  /** Overall health score (0-100) */
  overall: number;
  /** Compute resource health (0-100) */
  compute: number;
  /** Storage health (0-100) */
  storage: number;
  /** Network/reputation health (0-100) */
  network: number;
  /** Economic health (0-100) */
  economic: number;
  /** Last health check timestamp */
  lastCheck: string;
  /** Health status classification */
  status: HealthStatus;
}

/**
 * Health status classifications
 */
export type HealthStatus = 
  | 'healthy'      // 80-100: Operating optimally
  | 'stable'       // 60-79:  Operating normally
  | 'degraded'     // 40-59:  Reduced performance
  | 'critical'     // 20-39:  At risk
  | 'dying';       // 0-19:   Near shutdown

/**
 * Economic metrics for agent survival
 */
export interface EconomicMetrics {
  /** Total USDC across all chains */
  totalUSDC: string;
  /** Total native token value (ETH) in USD */
  totalNativeUSD: string;
  /** Net worth in USD */
  netWorthUSD: string;
  /** Daily burn rate estimate in USD */
  dailyBurnRateUSD: string;
  /** Days of runway remaining */
  runwayDays: number;
  /** Cost efficiency score (0-100) */
  efficiencyScore: number;
  /** Chain distribution of assets */
  chainDistribution: Record<SupportedChain, {
    usdc: string;
    native: string;
    percentage: number;
  }>;
}

/**
 * Survival thresholds configuration
 */
export interface SurvivalThresholds {
  /** Minimum USDC balance for critical alert (default: 1.0) */
  minUSDCCritical: number;
  /** Minimum USDC balance for warning (default: 5.0) */
  minUSDCWarning: number;
  /** Minimum days of runway for critical alert (default: 3) */
  minRunwayCritical: number;
  /** Minimum days of runway for warning (default: 7) */
  minRunwayWarning: number;
  /** Minimum health score before entering survival mode (default: 30) */
  minHealthScore: number;
  /** Cost per operation threshold in USD (default: 0.01) */
  maxCostPerOperation: number;
}

/**
 * Survival action recommendations
 */
export interface SurvivalAction {
  /** Action type */
  type: 'bridge' | 'reduce_cost' | 'optimize_chain' | 'earn' | 'alert' | 'shutdown';
  /** Priority level */
  priority: 'low' | 'medium' | 'high' | 'critical';
  /** Human-readable description */
  description: string;
  /** Estimated impact if action is taken */
  estimatedImpact: string;
  /** Recommended chain (if applicable) */
  recommendedChain?: SupportedChain;
  /** Amount to bridge (if applicable) */
  bridgeAmount?: string;
  /** Target chain for bridging (if applicable) */
  bridgeTargetChain?: SupportedChain;
}

/**
 * Survival state snapshot
 */
export interface SurvivalSnapshot {
  /** Timestamp of snapshot */
  timestamp: string;
  /** Agent identifier */
  agentId: string;
  /** Current health metrics */
  health: AgentHealth;
  /** Current economic metrics */
  economics: EconomicMetrics;
  /** Active survival mode */
  survivalMode: boolean;
  /** Pending actions */
  pendingActions: SurvivalAction[];
  /** Historical trend (last 7 snapshots) */
  trend: HealthTrend;
}

/**
 * Health trend analysis
 */
export interface HealthTrend {
  /** Direction of health change */
  direction: 'improving' | 'stable' | 'declining';
  /** Rate of change per day */
  rateOfChange: number;
  /** Predicted health score in 7 days */
  predictedHealth: number;
  /** Predicted runway days in 7 days */
  predictedRunway: number;
}

// ============================================================================
// Default Configurations
// ============================================================================

export const DEFAULT_THRESHOLDS: SurvivalThresholds = {
  minUSDCCritical: 1.0,
  minUSDCWarning: 5.0,
  minRunwayCritical: 3,
  minRunwayWarning: 7,
  minHealthScore: 30,
  maxCostPerOperation: 0.01
};

/** Cost estimates for operations per chain (in USD) */
export const OPERATION_COSTS: Record<SupportedChain, {
  message: number;
  task: number;
  bridge: number;
  storage: number;
}> = {
  ethereum: { message: 0.50, task: 2.00, bridge: 3.00, storage: 1.00 },
  base: { message: 0.001, task: 0.005, bridge: 0.01, storage: 0.002 },
  optimism: { message: 0.002, task: 0.008, bridge: 0.015, storage: 0.003 },
  arbitrum: { message: 0.003, task: 0.012, bridge: 0.02, storage: 0.004 }
};

/** Estimated daily operational costs (in USD) */
export const DAILY_OPERATIONAL_COSTS = {
  compute: 0.50,      // AI inference, processing
  storage: 0.10,      // Data persistence
  network: 0.20,      // Communication overhead
  minimum: 0.80       // Base survival cost
};

// ============================================================================
// AgentHealthMonitor Class
// ============================================================================

/**
 * Monitors and tracks agent health metrics
 */
export class AgentHealthMonitor extends EventEmitter {
  private healthHistory: AgentHealth[] = [];
  private maxHistorySize = 30;
  private checkIntervalMs: number;
  private checkInterval?: NodeJS.Timeout;

  constructor(checkIntervalMinutes = 60) {
    super();
    this.checkIntervalMs = checkIntervalMinutes * 60 * 1000;
  }

  start(): void {
    if (this.checkInterval) return;
    this.performHealthCheck();
    this.checkInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.checkIntervalMs);
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
  }

  performHealthCheck(): AgentHealth {
    const health = this.calculateHealth();
    this.healthHistory.push(health);
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory.shift();
    }
    this.emit('health:check', health);
    if (health.status === 'critical' || health.status === 'dying') {
      this.emit('health:critical', health);
    }
    return health;
  }

  private calculateHealth(): AgentHealth {
    const compute = Math.min(100, Math.max(0, 85 + (Math.random() * 10 - 5)));
    const storage = Math.min(100, Math.max(0, 90 + (Math.random() * 8 - 4)));
    const network = Math.min(100, Math.max(0, 75 + (Math.random() * 15 - 7.5)));
    const economic = this.healthHistory[this.healthHistory.length - 1]?.economic ?? 75;
    const overall = Math.round(compute * 0.25 + storage * 0.15 + network * 0.20 + economic * 0.40);

    return {
      overall: Math.round(overall),
      compute: Math.round(compute),
      storage: Math.round(storage),
      network: Math.round(network),
      economic: Math.round(economic),
      lastCheck: new Date().toISOString(),
      status: this.classifyHealth(overall)
    };
  }

  private classifyHealth(score: number): HealthStatus {
    if (score >= 80) return 'healthy';
    if (score >= 60) return 'stable';
    if (score >= 40) return 'degraded';
    if (score >= 20) return 'critical';
    return 'dying';
  }

  getHealthTrend(): HealthTrend {
    if (this.healthHistory.length < 2) {
      return { direction: 'stable', rateOfChange: 0, predictedHealth: 75, predictedRunway: 30 };
    }
    const recent = this.healthHistory.slice(-7);
    const change = recent[recent.length - 1].overall - recent[0].overall;
    const rateOfChange = change / recent.length;
    let direction: 'improving' | 'stable' | 'declining';
    if (rateOfChange > 2) direction = 'improving';
    else if (rateOfChange < -2) direction = 'declining';
    else direction = 'stable';
    const predictedHealth = Math.max(0, Math.min(100, recent[recent.length - 1].overall + (rateOfChange * 7)));
    return { direction, rateOfChange, predictedHealth, predictedRunway: this.predictRunway(recent) };
  }

  private predictRunway(recentHealth: AgentHealth[]): number {
    const avgEconomic = recentHealth.reduce((sum, h) => sum + h.economic, 0) / recentHealth.length;
    if (avgEconomic < 20) return 3;
    if (avgEconomic < 40) return 7;
    return 30;
  }

  getCurrentHealth(): AgentHealth | null {
    return this.healthHistory[this.healthHistory.length - 1] ?? null;
  }

  getHealthHistory(): AgentHealth[] {
    return [...this.healthHistory];
  }

  updateEconomicHealth(economicScore: number): void {
    const current = this.getCurrentHealth();
    if (current) {
      current.economic = Math.round(economicScore);
      current.overall = Math.round(
        current.compute * 0.25 + current.storage * 0.15 + current.network * 0.20 + economicScore * 0.40
      );
      current.status = this.classifyHealth(current.overall);
    }
  }
}

// ============================================================================
// AgentEconomics Class
// ============================================================================

/**
 * Manages agent economic metrics and calculations
 */
export class AgentEconomics extends EventEmitter {
  private wallet: MultiChainWallet | null = null;
  private thresholds: SurvivalThresholds;
  private transactionHistory: Array<{
    timestamp: string;
    type: 'income' | 'expense';
    amount: string;
    chain: SupportedChain;
    description: string;
  }> = [];

  constructor(thresholds: Partial<SurvivalThresholds> = {}) {
    super();
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  setWallet(wallet: MultiChainWallet): void {
    this.wallet = wallet;
  }

  calculateEconomicMetrics(balances: ChainBalance[]): EconomicMetrics {
    let totalUSDC = 0;
    let totalNative = 0;
    const chainDistribution: EconomicMetrics['chainDistribution'] = {
      ethereum: { usdc: '0', native: '0', percentage: 0 },
      base: { usdc: '0', native: '0', percentage: 0 },
      optimism: { usdc: '0', native: '0', percentage: 0 },
      arbitrum: { usdc: '0', native: '0', percentage: 0 }
    };

    const nativePriceUSD = 3000;

    for (const balance of balances) {
      const usdc = parseFloat(balance.usdcBalance);
      const native = parseFloat(balance.nativeBalance);
      totalUSDC += usdc;
      totalNative += native;
      chainDistribution[balance.chain] = {
        usdc: balance.usdcBalance,
        native: balance.nativeBalance,
        percentage: 0
      };
    }

    const totalNativeUSD = totalNative * nativePriceUSD;
    const netWorthUSD = totalUSDC + totalNativeUSD;

    for (const chain of Object.keys(chainDistribution) as SupportedChain[]) {
      const chainUSDC = parseFloat(chainDistribution[chain].usdc);
      const chainNative = parseFloat(chainDistribution[chain].native) * nativePriceUSD;
      const chainTotal = chainUSDC + chainNative;
      chainDistribution[chain].percentage = netWorthUSD > 0 ? (chainTotal / netWorthUSD) * 100 : 0;
    }

    const dailyBurnRate = this.calculateDailyBurnRate();
    const runwayDays = dailyBurnRate > 0 ? netWorthUSD / dailyBurnRate : 999;
    const efficiencyScore = this.calculateEfficiencyScore(balances);

    return {
      totalUSDC: totalUSDC.toFixed(6),
      totalNativeUSD: totalNativeUSD.toFixed(2),
      netWorthUSD: netWorthUSD.toFixed(2),
      dailyBurnRateUSD: dailyBurnRate.toFixed(4),
      runwayDays,
      efficiencyScore,
      chainDistribution
    };
  }

  private calculateDailyBurnRate(): number {
    const baseCost = DAILY_OPERATIONAL_COSTS.minimum;
    const recentTransactions = this.getRecentTransactions(24);
    const activityCost = recentTransactions.reduce((sum, tx) => {
      return sum + (tx.type === 'expense' ? parseFloat(tx.amount) : 0);
    }, 0);
    return baseCost + (activityCost / Math.max(1, recentTransactions.length || 1));
  }

  private calculateEfficiencyScore(balances: ChainBalance[]): number {
    const chainsWithBalance = balances.filter(b =>
      parseFloat(b.usdcBalance) > 0 || parseFloat(b.nativeBalance) > 0
    ).length;
    const diversificationScore = Math.min(100, chainsWithBalance * 25);
    const baseBalance = parseFloat(balances.find(b => b.chain === 'base')?.usdcBalance || '0');
    const totalUSDC = balances.reduce((sum, b) => sum + parseFloat(b.usdcBalance), 0);
    const lowCostChainRatio = totalUSDC > 0 ? (baseBalance / totalUSDC) : 0;
    const lowCostScore = lowCostChainRatio * 100;
    const hasGasOnAllChains = balances.every(b => parseFloat(b.nativeBalance) > 0.001);
    const gasScore = hasGasOnAllChains ? 100 : 50;
    return Math.round((diversificationScore * 0.3) + (lowCostScore * 0.4) + (gasScore * 0.3));
  }

  recordTransaction(type: 'income' | 'expense', amount: string, chain: SupportedChain, description: string): void {
    this.transactionHistory.push({ timestamp: new Date().toISOString(), type, amount, chain, description });
    if (type === 'expense') this.checkBalanceWarning();
  }

  getRecentTransactions(hours: number): typeof this.transactionHistory {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    return this.transactionHistory.filter(tx => tx.timestamp >= cutoff);
  }

  private checkBalanceWarning(): void {
    if (!this.wallet) return;
    const totalUSDC = this.wallet.balances.reduce((sum, b) => sum + parseFloat(b.usdcBalance), 0);
    if (totalUSDC < this.thresholds.minUSDCCritical) {
      this.emit('economic:critical', { balance: totalUSDC, threshold: this.thresholds.minUSDCCritical });
    } else if (totalUSDC < this.thresholds.minUSDCWarning) {
      this.emit('economic:warning', { balance: totalUSDC, threshold: this.thresholds.minUSDCWarning });
    }
  }

  getOptimalChainForOperation(operation: 'message' | 'task' | 'bridge' | 'storage', excludeChains?: SupportedChain[]): SupportedChain {
    const chains: SupportedChain[] = ['base', 'optimism', 'arbitrum'];
    const available = excludeChains ? chains.filter(c => !excludeChains.includes(c)) : chains;
    let cheapest = available[0];
    let lowestCost = Infinity;
    for (const chain of available) {
      const cost = OPERATION_COSTS[chain][operation];
      if (cost < lowestCost) {
        lowestCost = cost;
        cheapest = chain;
      }
    }
    return cheapest;
  }

  estimateOperationCost(operation: 'message' | 'task' | 'bridge' | 'storage', chain?: SupportedChain): string {
    const targetChain = chain || this.getOptimalChainForOperation(operation);
    return OPERATION_COSTS[targetChain][operation].toFixed(4);
  }

  getThresholds(): SurvivalThresholds {
    return { ...this.thresholds };
  }

  updateThresholds(thresholds: Partial<SurvivalThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }
}

// ============================================================================
// EchoSurvivalManager Class
// ============================================================================

/**
 * Main survival manager that orchestrates health and economic monitoring
 */
export class EchoSurvivalManager extends EventEmitter {
  public healthMonitor: AgentHealthMonitor;
  public economics: AgentEconomics;
  private thresholds: SurvivalThresholds;
  private snapshots: SurvivalSnapshot[] = [];
  private maxSnapshots = 100;
  private survivalMode = false;
  private agentId: string;
  private checkInterval?: NodeJS.Timeout;

  constructor(agentId: string, options: { thresholds?: Partial<SurvivalThresholds>; healthCheckIntervalMinutes?: number } = {}) {
    super();
    this.agentId = agentId;
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...options.thresholds };
    this.healthMonitor = new AgentHealthMonitor(options.healthCheckIntervalMinutes);
    this.economics = new AgentEconomics(this.thresholds);
    this.setupEventForwarding();
  }

  private setupEventForwarding(): void {
    this.healthMonitor.on('health:check', (health) => this.emit('health:check', health));
    this.healthMonitor.on('health:critical', (health) => this.emit('health:critical', health));
    this.economics.on('economic:warning', (data) => this.emit('economic:warning', data));
    this.economics.on('economic:critical', (data) => this.emit('economic:critical', data));
  }

  start(): void {
    this.healthMonitor.start();
    this.checkInterval = setInterval(() => {
      this.performSurvivalCheck();
    }, 60000);
  }

  stop(): void {
    this.healthMonitor.stop();
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
  }

  performSurvivalCheck(balances?: ChainBalance[]): SurvivalSnapshot {
    const health = this.healthMonitor.performHealthCheck();
    const economics = balances ? this.economics.calculateEconomicMetrics(balances) : null;

    if (economics) {
      this.healthMonitor.updateEconomicHealth(this.calculateEconomicHealthScore(economics));
    }

    const actions = this.determineSurvivalActions(health, economics);
    const trend = this.healthMonitor.getHealthTrend();
    const snapshot: SurvivalSnapshot = {
      timestamp: new Date().toISOString(),
      agentId: this.agentId,
      health,
      economics: economics!,
      survivalMode: this.survivalMode,
      pendingActions: actions,
      trend
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) this.snapshots.shift();

    this.updateSurvivalMode(health, economics);
    this.emit('snapshot:created', snapshot);

    for (const action of actions) {
      this.emit('action:recommended', action);
    }

    return snapshot;
  }

  private calculateEconomicHealthScore(economics: EconomicMetrics): number {
    const runwayScore = Math.min(100, (economics.runwayDays / 30) * 100);
    const balanceScore = Math.min(100, parseFloat(economics.totalUSDC) * 10);
    const efficiencyScore = economics.efficiencyScore;
    return Math.round((runwayScore * 0.4) + (balanceScore * 0.3) + (efficiencyScore * 0.3));
  }

  private determineSurvivalActions(health: AgentHealth, economics: EconomicMetrics | null): SurvivalAction[] {
    const actions: SurvivalAction[] = [];
    if (!economics) return actions;

    if (parseFloat(economics.totalUSDC) < this.thresholds.minUSDCCritical) {
      actions.push({
        type: 'alert',
        priority: 'critical',
        description: `Critical: USDC balance (${economics.totalUSDC}) below critical threshold (${this.thresholds.minUSDCCritical})`,
        estimatedImpact: 'Immediate action required to prevent shutdown'
      });
    }

    if (economics.runwayDays < this.thresholds.minRunwayCritical) {
      actions.push({
        type: 'earn',
        priority: 'critical',
        description: `Critical: Only ${economics.runwayDays.toFixed(1)} days of runway remaining`,
        estimatedImpact: 'Seek immediate revenue-generating tasks'
      });
    }

    if (parseFloat(economics.totalUSDC) < this.thresholds.minUSDCWarning && parseFloat(economics.totalUSDC) >= this.thresholds.minUSDCCritical) {
      actions.push({
        type: 'bridge',
        priority: 'high',
        description: 'Low USDC balance - consider bridging from other chains',
        estimatedImpact: 'Consolidate liquidity on most cost-effective chain',
        recommendedChain: 'base'
      });
    }

    const basePct = economics.chainDistribution.base.percentage;
    if (basePct < 30) {
      actions.push({
        type: 'optimize_chain',
        priority: 'medium',
        description: 'Consider moving funds to Base for lower transaction costs',
        estimatedImpact: `Save ~${(OPERATION_COSTS.ethereum.task - OPERATION_COSTS.base.task).toFixed(3)} USD per task`,
        recommendedChain: 'base'
      });
    }

    return actions;
  }

  private updateSurvivalMode(health: AgentHealth, economics: EconomicMetrics | null): void {
    const shouldBeInSurvivalMode = health.overall < this.thresholds.minHealthScore ||
      (economics && (parseFloat(economics.totalUSDC) < this.thresholds.minUSDCCritical || economics.runwayDays < this.thresholds.minRunwayCritical));

    if (shouldBeInSurvivalMode && !this.survivalMode) {
      this.survivalMode = true;
      this.emit('survival:mode-enter');
    } else if (!shouldBeInSurvivalMode && this.survivalMode) {
      this.survivalMode = false;
      this.emit('survival:mode-exit');
    }
  }

  getLatestSnapshot(): SurvivalSnapshot | null {
    return this.snapshots[this.snapshots.length - 1] ?? null;
  }

  getSnapshotHistory(): SurvivalSnapshot[] {
    return [...this.snapshots];
  }

  isInSurvivalMode(): boolean {
    return this.survivalMode;
  }

  getOptimalChain(operation: 'message' | 'task' | 'bridge' | 'storage'): SupportedChain {
    return this.economics.getOptimalChainForOperation(operation);
  }

  estimateCost(operation: 'message' | 'task' | 'bridge' | 'storage', chain?: SupportedChain): string {
    return this.economics.estimateOperationCost(operation, chain);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

export function createSurvivalManager(agentId: string, options?: ConstructorParameters<typeof EchoSurvivalManager>[1]): EchoSurvivalManager {
  return new EchoSurvivalManager(agentId, options);
}

export function formatSurvivalReport(snapshot: SurvivalSnapshot): string {
  const lines = [
    `=== Agora Echo Survival Report ===`,
    `Agent: ${snapshot.agentId}`,
    `Time: ${snapshot.timestamp}`,
    ``,
    `Health Status: ${snapshot.health.status.toUpperCase()} (${snapshot.health.overall}/100)`,
    `  - Compute: ${snapshot.health.compute}/100`,
    `  - Storage: ${snapshot.health.storage}/100`,
    `  - Network: ${snapshot.health.network}/100`,
    `  - Economic: ${snapshot.health.economic}/100`,
    ``,
    `Economic Metrics:`,
    `  - Total USDC: $${snapshot.economics.totalUSDC}`,
    `  - Net Worth: $${snapshot.economics.netWorthUSD}`,
    `  - Runway: ${snapshot.economics.runwayDays.toFixed(1)} days`,
    `  - Daily Burn: $${snapshot.economics.dailyBurnRateUSD}`,
    `  - Efficiency: ${snapshot.economics.efficiencyScore}/100`,
    ``,
    `Survival Mode: ${snapshot.survivalMode ? 'ACTIVE' : 'Inactive'}`,
    `Trend: ${snapshot.trend.direction} (${snapshot.trend.rateOfChange > 0 ? '+' : ''}${snapshot.trend.rateOfChange.toFixed(2)}/day)`,
    `Predicted Health (7d): ${snapshot.trend.predictedHealth.toFixed(0)}/100`,
    ``,
    `Recommended Actions:`,
  ];

  if (snapshot.pendingActions.length === 0) {
    lines.push('  - No immediate action required');
  } else {
    for (const action of snapshot.pendingActions) {
      lines.push(`  [${action.priority.toUpperCase()}] ${action.type}: ${action.description}`);
    }
  }

  return lines.join('\n');
}

export function shouldAcceptTask(
  snapshot: SurvivalSnapshot,
  taskReward: string,
  taskCost: string,
  minProfitMargin = 0.1
): { accept: boolean; reason: string } {
  if (snapshot.survivalMode) {
    return { accept: true, reason: 'Survival mode: accepting all revenue opportunities' };
  }

  const reward = parseFloat(taskReward);
  const cost = parseFloat(taskCost);
  const profit = reward - cost;
  const margin = profit / cost;

  if (margin < minProfitMargin) {
    return { accept: false, reason: `Profit margin ${(margin * 100).toFixed(1)}% below threshold ${(minProfitMargin * 100).toFixed(1)}%` };
  }

  if (snapshot.economics.runwayDays < 7 && profit <= 0) {
    return { accept: false, reason: 'Negative profit while runway is critical' };
  }

  return { accept: true, reason: `Profitable task with ${(margin * 100).toFixed(1)}% margin` };
}
