/**
 * Reputation Tracker Agent for Agora
 *
 * Monitors agent reputation in real-time and provides alerts
 * when reputation drops below thresholds or significant changes occur.
 *
 * @module reputation-tracker
 */
import { type ReputationUpdateResult } from '@agora/sdk/reputation';
import { type Address } from 'viem';
/**
 * Alert severity levels
 */
export type AlertSeverity = 'info' | 'warning' | 'critical';
/**
 * Reputation alert
 */
export interface ReputationAlert {
    /** Alert ID */
    id: string;
    /** Agent ID */
    agentId: string;
    /** Alert severity */
    severity: AlertSeverity;
    /** Alert title */
    title: string;
    /** Alert message */
    message: string;
    /** Previous score */
    previousScore: number;
    /** Current score */
    currentScore: number;
    /** Score delta */
    delta: number;
    /** Timestamp */
    timestamp: number;
    /** Recommended actions */
    recommendations: string[];
}
/**
 * Alert thresholds configuration
 */
export interface AlertThresholds {
    /** Warning threshold - score below this triggers warning */
    warningScore: number;
    /** Critical threshold - score below this triggers critical alert */
    criticalScore: number;
    /** Significant drop threshold - delta below this triggers alert */
    significantDrop: number;
    /** Tier downgrade threshold - triggers alert when tier drops */
    tierDowngrade: boolean;
}
/**
 * Tracker configuration
 */
export interface TrackerConfig {
    /** Alert thresholds */
    thresholds: AlertThresholds;
    /** Check interval in ms */
    checkIntervalMs: number;
    /** Enable automatic recovery suggestions */
    enableRecoverySuggestions: boolean;
    /** Alert history limit */
    maxAlertHistory: number;
    /** Callback for new alerts */
    onAlert?: (alert: ReputationAlert) => void;
    /** Callback for reputation updates */
    onUpdate?: (agentId: string, result: ReputationUpdateResult) => void;
}
/**
 * Reputation trend
 */
export interface ReputationTrend {
    /** Direction of trend */
    direction: 'improving' | 'stable' | 'declining';
    /** Rate of change per day */
    ratePerDay: number;
    /** Confidence level (0-1) */
    confidence: number;
    /** Sample size */
    sampleSize: number;
}
/**
 * Recovery recommendation
 */
export interface RecoveryRecommendation {
    /** Priority level */
    priority: 'high' | 'medium' | 'low';
    /** Recommendation title */
    title: string;
    /** Detailed description */
    description: string;
    /** Expected impact on score */
    expectedImpact: number;
    /** Difficulty level */
    difficulty: 'easy' | 'medium' | 'hard';
    /** Time to complete (hours) */
    estimatedTimeHours: number;
}
/**
 * Default alert thresholds
 */
export declare const DEFAULT_THRESHOLDS: AlertThresholds;
/**
 * Default tracker configuration
 */
export declare const DEFAULT_TRACKER_CONFIG: TrackerConfig;
/**
 * Reputation Tracker Agent
 *
 * Monitors agent reputation and provides real-time alerts
 */
export declare class ReputationTracker {
    private oracle;
    private config;
    private monitoredAgents;
    private alertHistory;
    private scoreHistory;
    private checkInterval?;
    private lastAlerts;
    constructor(config?: Partial<TrackerConfig>);
    /**
     * Start monitoring an agent
     */
    monitor(agentId: string, address: Address): void;
    /**
     * Stop monitoring an agent
     */
    stopMonitoring(agentId: string): void;
    /**
     * Start periodic checks
     */
    start(): void;
    /**
     * Stop periodic checks
     */
    stop(): void;
    /**
     * Check all monitored agents
     */
    private checkAll;
    /**
     * Check a specific agent
     */
    private checkAgent;
    /**
     * Check if any thresholds are breached
     */
    private checkThresholds;
    /**
     * Create and store an alert
     */
    private createAlert;
    /**
     * Generate alert title
     */
    private generateAlertTitle;
    /**
     * Generate alert message
     */
    private generateAlertMessage;
    /**
     * Generate recovery recommendations
     */
    private generateRecoveryRecommendations;
    /**
     * Calculate reputation trend
     */
    calculateTrend(agentId: string, days?: number): ReputationTrend | null;
    /**
     * Get detailed recovery plan
     */
    getRecoveryPlan(agentId: string): RecoveryRecommendation[];
    /**
     * Get alert history
     */
    getAlertHistory(agentId?: string, severity?: AlertSeverity): ReputationAlert[];
    /**
     * Get current stats
     */
    getStats(): {
        monitoredAgents: number;
        totalAlerts: number;
        criticalAlerts: number;
        warningAlerts: number;
    };
    /**
     * Generate status report
     */
    generateReport(agentId: string): string;
}
/**
 * Get or create global reputation tracker
 */
export declare function getOrCreateReputationTracker(config?: Partial<TrackerConfig>): ReputationTracker;
/**
 * Get global reputation tracker (throws if not initialized)
 */
export declare function getReputationTracker(): ReputationTracker;
/**
 * Reset global tracker (mainly for testing)
 */
export declare function resetReputationTracker(): void;
//# sourceMappingURL=reputation-tracker.d.ts.map