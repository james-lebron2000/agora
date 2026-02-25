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
import { type SupportedChain, type ChainBalance } from './bridge.js';
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
    /** Current balance in USD */
    currentBalance: string;
    /** Minimum balance needed for survival */
    minSurvivalBalance: string;
    /** Daily burn rate in USD */
    dailyBurnRate: string;
    /** Days of runway remaining */
    daysOfRunway: number;
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