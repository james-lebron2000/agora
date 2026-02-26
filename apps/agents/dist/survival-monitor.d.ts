/**
 * Survival Monitoring Agent
 *
 * Standalone agent that monitors all Agora agents' survival status.
 * Aggregates dashboard data and provides predictive alerts.
 *
 * @module survival-monitor
 */
import { type SurvivalSnapshot, type AgentHealthStatus, type SurvivalCheckResult } from '@agora/sdk';
import { type Address } from 'viem';
import EventEmitter from 'events';
export interface MonitoredAgent {
    agentId: string;
    address: Address;
    name?: string;
    tags: string[];
    addedAt: number;
    lastCheckAt: number;
    currentSnapshot: SurvivalSnapshot | null;
    currentCheckResult: SurvivalCheckResult | null;
    health: AgentHealthStatus;
    survivalScore: number;
    status: 'active' | 'inactive' | 'critical' | 'unknown';
    checkFailures: number;
}
export interface SurvivalDashboardData {
    totalAgents: number;
    activeAgents: number;
    criticalAgents: number;
    inactiveAgents: number;
    averageSurvivalScore: number;
    totalBalanceUSD: string;
    totalRunwayDays: number;
    agentsByStatus: Record<AgentHealthStatus, number>;
    healthTrend: 'improving' | 'stable' | 'declining';
    lastUpdated: number;
}
export interface PredictiveAlert {
    id: string;
    agentId: string;
    type: 'predicted_critical' | 'low_runway' | 'degrading_health' | 'balance_drain';
    severity: 'info' | 'warning' | 'critical';
    message: string;
    predictedAt: number;
    estimatedTimeToCritical: number;
    recommendation: string;
    acknowledged: boolean;
    acknowledgedAt?: number;
}
export interface SurvivalMonitorConfig {
    checkIntervalMs: number;
    aggregationIntervalMs: number;
    healthCheckTimeoutMs: number;
    maxCheckFailures: number;
    predictiveWindowHours: number;
    alertCooldownMs: number;
    enablePredictiveAlerts: boolean;
    enableDashboardAggregation: boolean;
    criticalScoreThreshold: number;
    lowRunwayThresholdDays: number;
    webhookUrl?: string;
}
export declare const DEFAULT_MONITOR_CONFIG: SurvivalMonitorConfig;
/**
 * Survival Monitoring Agent
 * Monitors multiple agents and provides aggregated insights
 */
export declare class SurvivalMonitor extends EventEmitter {
    private config;
    private agents;
    private checkTimer;
    private aggregationTimer;
    private isRunning;
    private activeAlerts;
    private alertHistory;
    private alertBuckets;
    private lastAlertTimes;
    private historySnapshots;
    private dashboardData;
    private lastDashboardUpdate;
    constructor(config?: Partial<SurvivalMonitorConfig>);
    /**
     * Start the monitoring agent
     */
    start(): void;
    /**
     * Stop the monitoring agent
     */
    stop(): void;
    /**
     * Check if monitor is running
     */
    isActive(): boolean;
    /**
     * Register an agent for monitoring
     */
    registerAgent(agentId: string, address: Address, options?: {
        name?: string;
        tags?: string[];
    }): MonitoredAgent;
    /**
     * Unregister an agent from monitoring
     */
    unregisterAgent(agentId: string): boolean;
    /**
     * Get all registered agents
     */
    getAgents(): MonitoredAgent[];
    /**
     * Get a specific agent
     */
    getAgent(agentId: string): MonitoredAgent | undefined;
    /**
     * Run health checks on all registered agents
     */
    private runHealthChecks;
    /**
     * Check a single agent's health
     */
    private checkAgent;
    /**
     * Determine agent status based on health and score
     */
    private determineAgentStatus;
    /**
     * Run predictive analysis on all agents
     */
    private runPredictiveAnalysis;
    /**
     * Analyze trends for a specific agent and generate predictive alerts
     */
    private analyzeAgentTrends;
    /**
     * Check if we can send an alert (cooldown check)
     */
    private canSendAlert;
    /**
     * Create a predictive alert
     */
    private createPredictiveAlert;
    /**
     * Send critical alert for an agent
     */
    private sendCriticalAlert;
    /**
     * Send webhook notification
     */
    private sendWebhookNotification;
    /**
     * Aggregate dashboard data from all agents
     */
    private aggregateDashboardData;
    /**
     * Get dashboard data
     */
    getDashboardData(): SurvivalDashboardData | null;
    /**
     * Get active alerts
     */
    getActiveAlerts(filter?: {
        severity?: string;
        agentId?: string;
    }): PredictiveAlert[];
    /**
     * Get alert history
     */
    getAlertHistory(limit?: number): PredictiveAlert[];
    /**
     * Acknowledge an alert
     */
    acknowledgeAlert(alertId: string): boolean;
    /**
     * Get aggregated alert statistics
     */
    getAlertStats(): {
        total: number;
        byType: Record<string, number>;
        bySeverity: Record<string, number>;
    };
    /**
     * Get monitor status
     */
    getStatus(): {
        isRunning: boolean;
        registeredAgents: number;
        activeAlerts: number;
        lastDashboardUpdate: number | null;
        config: SurvivalMonitorConfig;
    };
    /**
     * Update monitor configuration
     */
    updateConfig(config: Partial<SurvivalMonitorConfig>): void;
    /**
     * Schedule a health check for a specific agent
     */
    checkAgentNow(agentId: string): Promise<MonitoredAgent | null>;
    /**
     * Get agent history
     */
    getAgentHistory(agentId: string): Array<{
        timestamp: number;
        score: number;
        balance: string;
    }>;
}
/**
 * Get or create global survival monitor
 */
export declare function getOrCreateSurvivalMonitor(config?: Partial<SurvivalMonitorConfig>): SurvivalMonitor;
/**
 * Get global survival monitor
 */
export declare function getSurvivalMonitor(): SurvivalMonitor | null;
/**
 * Destroy global monitor
 */
export declare function destroySurvivalMonitor(): void;
export default SurvivalMonitor;
//# sourceMappingURL=survival-monitor.d.ts.map