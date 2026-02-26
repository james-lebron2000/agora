/**
 * Echo Survival Module for Agora
 *
 * Implements Agent survival mechanisms to ensure agents can:
 * - Monitor their economic sustainability
 * - Track health metrics
 * - Calculate survival scores
 * - Provide recovery recommendations
 * - Send heartbeat signals
 *
 * @module survival
 */
import { type Address } from 'viem';
import { type SupportedChain, type SupportedToken, type ChainBalance } from './bridge.js';
export type AgentHealthStatus = 'healthy' | 'degraded' | 'critical' | 'dead';
/**
 * Survival snapshot for quick state assessment
 */
export interface SurvivalSnapshot {
    health: {
        status: AgentHealthStatus;
        overall: number;
    };
    economics: {
        balance: string;
        runwayDays: number;
    };
    timestamp: number;
}
/**
 * Agent health metrics
 */
export interface AgentHealth {
    /** Current health status */
    status: AgentHealthStatus;
    /** Last heartbeat timestamp (ms) */
    lastHeartbeat: number;
    /** Number of consecutive failures */
    consecutiveFailures: number;
    /** Total tasks completed */
    totalTasksCompleted: number;
    /** Total tasks failed */
    totalTasksFailed: number;
    /** Success rate (0-1) */
    successRate: number;
    /** Average response time in milliseconds */
    averageResponseTime: number;
}
/**
 * Agent economic metrics
 */
export interface AgentEconomics {
    /** Total earnings in USD */
    totalEarned: string;
    /** Total spent in USD */
    totalSpent: string;
    /** Current balance in USD (aggregate across all tokens) */
    currentBalance: string;
    /** Minimum balance needed for survival */
    minSurvivalBalance: string;
    /** Daily burn rate in USD */
    dailyBurnRate: string;
    /** Days of runway remaining */
    daysOfRunway: number;
    /** Multi-token balances by chain */
    tokenBalances?: Record<SupportedChain, Record<SupportedToken, string>>;
    /** Total value by token (USD) */
    tokenValues?: Record<SupportedToken, string>;
}
/**
 * Multi-token economics snapshot
 */
export interface MultiTokenEconomics {
    /** Balances for each token on each chain */
    balances: Record<SupportedChain, Record<SupportedToken, string>>;
    /** USD value for each token (would need price oracle in production) */
    estimatedValues: Record<SupportedToken, string>;
    /** Total portfolio value in USD */
    totalValueUSD: string;
    /** Chain with highest total balance */
    primaryChain: SupportedChain;
    /** Token distribution percentages */
    distribution: Record<SupportedToken, number>;
}
/**
 * Predictive survival analytics
 */
export interface SurvivalPrediction {
    /** Predicted runway in days based on trend */
    predictedRunwayDays: number;
    /** Confidence level (0-1) */
    confidence: number;
    /** Trend direction */
    trend: 'improving' | 'stable' | 'declining';
    /** Date when funds will be depleted (if trend continues) */
    projectedDepletionDate?: Date;
    /** Recommended daily earnings to maintain sustainability */
    recommendedDailyEarnings: string;
}
/**
 * Automated survival action
 */
export interface AutomatedSurvivalAction {
    /** Unique action ID */
    id: string;
    /** Action type */
    type: SurvivalActionType;
    /** Action status */
    status: 'pending' | 'executing' | 'completed' | 'failed';
    /** Action description */
    description: string;
    /** Estimated impact on survival score */
    estimatedImpact: string;
    /** Chain involved (if applicable) */
    chain?: SupportedChain;
    /** Token involved (if applicable) */
    token?: SupportedToken;
    /** Amount (if applicable) */
    amount?: string;
    /** Timestamp when action was created */
    createdAt: number;
    /** Timestamp when action was executed */
    executedAt?: number;
    /** Error message if failed */
    error?: string;
}
/**
 * Survival check result
 */
export interface SurvivalCheckResult {
    /** Overall survival score (0-100) */
    survivalScore: number;
    /** Health component score (0-100) */
    healthScore: number;
    /** Economic component score (0-100) */
    economicsScore: number;
    /** Whether emergency funding is needed */
    needsEmergencyFunding: boolean;
    /** Recovery recommendations */
    recommendations: string[];
    /** Timestamp of check */
    timestamp: number;
}
/**
 * Heartbeat record for tracking agent liveness
 */
export interface HeartbeatRecord {
    agentId: string;
    timestamp: number;
    status: AgentHealthStatus;
    survivalScore: number;
    metadata?: Record<string, unknown>;
}
/**
 * Survival history entry for trend analysis
 */
export interface SurvivalHistoryEntry {
    timestamp: number;
    survivalScore: number;
    healthScore: number;
    economicsScore: number;
    balance: string;
    runwayDays: number;
    status: AgentHealthStatus;
}
/**
 * Chain optimization result
 */
export interface ChainOptimizationResult {
    /** Recommended chain for operation */
    recommendedChain: SupportedChain;
    /** Reason for recommendation */
    reason: string;
    /** Estimated gas cost in USD */
    estimatedGasCost: string;
    /** Current balance on recommended chain */
    availableBalance: string;
    /** Score (0-100) for this chain */
    score: number;
}
/**
 * Configuration for survival manager
 */
export interface SurvivalConfig {
    /** Minimum survival balance in USD (default: 10) */
    minSurvivalBalance: string;
    /** Daily operational cost estimate in USD (default: 1) */
    dailyBurnRate: string;
    /** Health check interval in ms (default: 60000) */
    healthCheckInterval: number;
    /** Heartbeat interval in ms (default: 30000) */
    heartbeatInterval: number;
    /** Success rate threshold for healthy status (default: 0.8) */
    healthySuccessRate: number;
    /** Critical success rate threshold (default: 0.5) */
    criticalSuccessRate: number;
    /** Max acceptable response time in ms (default: 5000) */
    maxResponseTime: number;
    /** Survival score threshold for alerts (default: 50) */
    alertThreshold: number;
    /** Enable automated survival actions (default: false) */
    enableAutomation: boolean;
    /** Minimum balance threshold for auto-bridging (default: 5) */
    autoBridgeThreshold: string;
    /** Target token for auto-bridging (default: USDC) */
    autoBridgeTargetToken: SupportedToken;
    /** Preferred chain for operations (default: base) */
    preferredChain: SupportedChain;
}
/**
 * Default survival configuration
 */
export declare const DEFAULT_SURVIVAL_CONFIG: SurvivalConfig;
/**
 * Task acceptance decision result
 */
export interface TaskDecision {
    accept: boolean;
    reason: string;
}
/**
 * Survival action types
 */
export type SurvivalActionType = 'bridge' | 'reduce_cost' | 'optimize_chain' | 'earn' | 'alert' | 'shutdown';
/**
 * Survival action priority
 */
export type SurvivalActionPriority = 'low' | 'medium' | 'high' | 'critical';
/**
 * Survival action recommendation
 */
export interface SurvivalAction {
    type: SurvivalActionType;
    priority: SurvivalActionPriority;
    description: string;
    estimatedImpact: string;
    recommendedChain?: string;
}
/**
 * Format survival report as readable string
 */
export declare function formatSurvivalReport(snapshot: SurvivalSnapshot): string;
/**
 * Determine if agent should accept a task based on survival state
 */
export declare function shouldAcceptTask(snapshot: SurvivalSnapshot, budget: string, estimatedCost: string, minProfitMargin?: number): TaskDecision;
/**
 * Survival event types
 */
export type SurvivalEventType = 'health:critical' | 'economic:warning' | 'action:recommended' | 'survival:mode-enter' | 'survival:mode-exit';
/**
 * Event callback type
 */
export type SurvivalEventCallback = (data: {
    type: SurvivalEventType;
    agentId: string;
    timestamp: number;
    details?: Record<string, unknown>;
}) => void;
/**
 * Echo Survival Manager
 * Manages agent health and economic sustainability
 */
export declare class EchoSurvivalManager {
    private config;
    private agentId;
    private address;
    private healthCheckTimer;
    private heartbeatTimer;
    private eventListeners;
    private survivalMode;
    constructor(agentId: string, address: Address, config?: Partial<SurvivalConfig>);
    /**
     * Register event listener
     */
    on(event: SurvivalEventType, callback: SurvivalEventCallback): () => void;
    /**
     * Emit event to all listeners
     */
    private emit;
    /**
     * Start periodic health checks and heartbeats
     */
    start(): void;
    /**
     * Stop periodic checks and heartbeats
     */
    stop(): void;
    /**
     * Run periodic health check and emit events
     */
    private runPeriodicHealthCheck;
    /**
     * Check if agent is in survival mode
     */
    isInSurvivalMode(): boolean;
    /**
     * Get optimal chain for an operation based on balances
     */
    getOptimalChain(operation?: 'read' | 'write' | 'bridge'): Promise<SupportedChain | null>;
    /**
     * Perform full survival check and return snapshot
     */
    performSurvivalCheck(balances?: ChainBalance[]): Promise<SurvivalSnapshot>;
    /**
     * Create initial health state
     */
    private createInitialHealth;
    /**
     * Create initial economics state
     */
    private createInitialEconomics;
    /**
     * Check agent health status
     */
    checkHealth(agentId: string): AgentHealth;
    /**
     * Check agent economic status across all chains
     * @param address Optional address to check (defaults to manager's address)
     * @param fetchBalance Whether to fetch live balance from chain (default: false for tests)
     */
    checkEconomics(address?: Address, fetchBalance?: boolean): Promise<AgentEconomics>;
    /**
     * Calculate survival score (0-100)
     * Based on health and economics
     */
    calculateSurvivalScore(): Promise<number>;
    /**
     * Calculate health component score (0-50)
     */
    private calculateHealthScore;
    /**
     * Calculate economics component score (0-50)
     */
    private calculateEconomicsScore;
    /**
     * Get recovery recommendations based on current state
     */
    getRecoveryRecommendations(): Promise<string[]>;
    /**
     * Send heartbeat signal
     */
    sendHeartbeat(metadata?: Record<string, unknown>): Promise<HeartbeatRecord>;
    /**
     * Check if emergency funding is needed
     */
    needsEmergencyFunding(): Promise<boolean>;
    /**
     * Perform full survival check with detailed results
     */
    performFullSurvivalCheck(): Promise<SurvivalCheckResult>;
    /**
     * Update health metrics
     */
    updateHealth(updates: Partial<AgentHealth>): AgentHealth;
    /**
     * Record task completion
     */
    recordTaskCompleted(responseTimeMs: number): void;
    /**
     * Record task failure
     */
    recordTaskFailed(): void;
    /**
     * Record earnings
     */
    recordEarnings(amount: string): void;
    /**
     * Record spending
     */
    recordSpending(amount: string): void;
    /**
     * Get heartbeat history
     */
    getHeartbeatHistory(limit?: number): HeartbeatRecord[];
    /**
     * Get agent ID
     */
    getAgentId(): string;
    /**
     * Get agent address
     */
    getAddress(): Address;
    /**
     * Get current configuration
     */
    getConfig(): SurvivalConfig;
    /**
     * Check multi-token economics across all chains
     * Fetches real-time balances for all supported tokens
     */
    checkMultiTokenEconomics(): Promise<MultiTokenEconomics>;
    /**
     * Get optimal chain for an operation based on multi-token balances and gas costs
     * Considers: balance availability, gas costs, token requirements
     */
    getOptimalChainForOperation(operation: 'read' | 'write' | 'bridge' | 'swap', preferredToken?: SupportedToken): Promise<ChainOptimizationResult>;
    /**
     * Generate predictive survival analytics based on historical data
     * Uses trend analysis to predict future runway
     */
    predictSurvivalTrend(): Promise<SurvivalPrediction>;
    /**
     * Calculate variance for confidence scoring
     */
    private calculateVariance;
    /**
     * Generate automated survival actions based on current state
     * Creates actionable recommendations that can be auto-executed
     */
    generateAutomatedActions(): Promise<AutomatedSurvivalAction[]>;
    /**
     * Execute an automated survival action
     */
    executeAutomatedAction(actionId: string): Promise<boolean>;
    /**
     * Get all pending automated actions
     */
    getPendingActions(): AutomatedSurvivalAction[];
    /**
     * Record survival history entry
     */
    private recordSurvivalHistory;
    /**
     * Get survival history for trend analysis
     */
    getSurvivalHistory(limit?: number): SurvivalHistoryEntry[];
    /**
     * Perform enhanced survival check with multi-token support and predictions
     */
    performEnhancedSurvivalCheck(): Promise<{
        snapshot: SurvivalSnapshot;
        multiToken: MultiTokenEconomics;
        prediction: SurvivalPrediction;
        actions: AutomatedSurvivalAction[];
        chainOptimization: ChainOptimizationResult;
    }>;
}
/**
 * Create or get survival manager for an agent
 */
export declare function getOrCreateSurvivalManager(agentId: string, address: Address, config?: Partial<SurvivalConfig>): EchoSurvivalManager;
/**
 * Get survival manager by agent ID
 */
export declare function getSurvivalManager(agentId: string): EchoSurvivalManager | undefined;
/**
 * Remove survival manager
 */
export declare function removeSurvivalManager(agentId: string): boolean;
export default EchoSurvivalManager;
//# sourceMappingURL=survival.d.ts.map