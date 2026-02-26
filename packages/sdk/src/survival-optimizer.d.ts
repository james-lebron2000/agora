/**
 * Cross-Chain Survival Optimizer
 *
 * Integrates with Bridge module for cross-chain optimization:
 * - Auto-detect optimal chain for operations based on gas costs, balance availability, success rates
 * - Automatic fund rebalancing between chains
 * - Chain failover mechanism
 *
 * @module survival-optimizer
 */
import { CrossChainBridge, type SupportedChain, type SupportedToken } from './bridge.js';
import { type Address } from 'viem';
export interface ChainMetrics {
    chain: SupportedChain;
    totalBalanceUSD: number;
    nativeBalance: string;
    tokenBalances: Record<SupportedToken, string>;
    gasPrice: bigint;
    estimatedGasCostUSD: number;
    averageConfirmationTime: number;
    successRate: number;
    lastFailureAt?: number;
    score: number;
}
export interface ChainRecommendation {
    recommendedChain: SupportedChain;
    reason: string;
    confidence: number;
    estimatedSavings: string;
    estimatedTime: number;
    alternativeChains: SupportedChain[];
    metrics: ChainMetrics;
}
export interface RebalancingPlan {
    id: string;
    timestamp: number;
    targetDistribution: Record<SupportedChain, number>;
    currentDistribution: Record<SupportedChain, number>;
    moves: Array<{
        from: SupportedChain;
        to: SupportedChain;
        token: SupportedToken;
        amount: string;
        estimatedFee: string;
    }>;
    totalEstimatedFee: string;
    expectedImprovement: string;
}
export interface OptimizerConfig {
    preferredChain: SupportedChain;
    fallbackChain: SupportedChain;
    enableAutoRebalancing: boolean;
    rebalancingThreshold: number;
    maxRebalancingFee: string;
    minRebalanceAmount: string;
    weights: {
        balance: number;
        gasCost: number;
        successRate: number;
        speed: number;
    };
    enableFailover: boolean;
    failoverThreshold: number;
    failoverCooldownMs: number;
    maxGasPriceGwei: number;
    gasPriceCheckIntervalMs: number;
}
export declare const DEFAULT_OPTIMIZER_CONFIG: OptimizerConfig;
export interface FailoverState {
    isActive: boolean;
    failedChain: SupportedChain | null;
    failoverChain: SupportedChain | null;
    activatedAt: number;
    reason: string;
    autoRecovered: boolean;
}
/**
 * Cross-Chain Survival Optimizer
 * Optimizes agent operations across multiple chains
 */
export declare class CrossChainSurvivalOptimizer {
    private address;
    private bridge;
    private config;
    private chainMetrics;
    private performanceData;
    private failoverState;
    private lastFailoverTime;
    private gasPriceTimer;
    constructor(address: Address, bridge: CrossChainBridge, config?: Partial<OptimizerConfig>);
    /**
     * Start the optimizer monitoring
     */
    start(): void;
    /**
     * Stop the optimizer
     */
    stop(): void;
    /**
     * Update metrics for all chains
     */
    private updateChainMetrics;
    /**
     * Calculate chain score based on criteria
     */
    private calculateChainScore;
    /**
     * Get optimal chain for an operation
     */
    getOptimalChain(operation: 'read' | 'write' | 'bridge' | 'swap', preferredToken?: SupportedToken): Promise<ChainRecommendation>;
    /**
     * Check if rebalancing is needed and create a plan
     */
    generateRebalancingPlan(): Promise<RebalancingPlan | null>;
    /**
     * Execute a rebalancing plan
     */
    executeRebalancingPlan(plan: RebalancingPlan): Promise<{
        success: boolean;
        completedMoves: number;
        failedMoves: number;
        totalFees: string;
        errors: string[];
    }>;
    /**
     * Record transaction for performance tracking
     */
    recordTransaction(chain: SupportedChain, success: boolean, gasUsed: bigint, confirmationTime: number): void;
    /**
     * Check if failover should be activated
     */
    private checkFailoverConditions;
    /**
     * Activate failover to alternative chain
     */
    private activateFailover;
    /**
     * Attempt to recover from failover
     */
    attemptFailoverRecovery(): Promise<boolean>;
    /**
     * Get current failover state
     */
    getFailoverState(): FailoverState;
    /**
     * Get metrics for all chains
     */
    getChainMetrics(): ChainMetrics[];
    /**
     * Get optimizer status
     */
    getStatus(): {
        isRunning: boolean;
        config: OptimizerConfig;
        failoverState: FailoverState;
        chainCount: number;
        preferredChain: SupportedChain;
    };
    /**
     * Force switch to specific chain
     */
    forceChainSwitch(chain: SupportedChain): void;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<OptimizerConfig>): void;
}
/**
 * Get or create optimizer for an address
 */
export declare function getOrCreateSurvivalOptimizer(address: Address, bridge: CrossChainBridge, config?: Partial<OptimizerConfig>): CrossChainSurvivalOptimizer;
/**
 * Get optimizer by address
 */
export declare function getSurvivalOptimizer(address: string): CrossChainSurvivalOptimizer | undefined;
/**
 * Remove optimizer
 */
export declare function removeSurvivalOptimizer(address: string): boolean;
export default CrossChainSurvivalOptimizer;
//# sourceMappingURL=survival-optimizer.d.ts.map