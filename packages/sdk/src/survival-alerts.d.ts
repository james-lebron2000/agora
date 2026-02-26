/**
 * Real-time Alert System for Echo Survival
 *
 * Provides webhook notifications, alert severity levels, and
 * alert aggregation to prevent spam.
 *
 * @module survival-alerts
 */
import type { SurvivalEventType } from './survival.js';
export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';
export type AlertChannel = 'webhook' | 'email' | 'sms' | 'push' | 'webhook';
export interface AlertConfig {
    webhookUrl?: string;
    webhookHeaders?: Record<string, string>;
    emailEndpoint?: string;
    smsEndpoint?: string;
    thresholds: {
        info: number;
        warning: number;
        critical: number;
        emergency: number;
    };
    enableAggregation: boolean;
    aggregationWindowMs: number;
    maxAlertsPerWindow: number;
    cooldownMs: number;
    cooldownByType: Record<string, number>;
    maxAlertsPerHour: number;
    subscribeTo: SurvivalEventType[];
    enabledChannels: AlertChannel[];
}
export declare const DEFAULT_ALERT_CONFIG: AlertConfig;
export interface Alert {
    id: string;
    type: SurvivalEventType | string;
    severity: AlertSeverity;
    agentId: string;
    title: string;
    message: string;
    details: Record<string, unknown>;
    timestamp: number;
    acknowledged: boolean;
    acknowledgedAt?: number;
    acknowledgedBy?: string;
    channelsSent: AlertChannel[];
    deliveryStatus: Record<AlertChannel, 'pending' | 'sent' | 'failed'>;
}
export interface AggregatedAlert {
    id: string;
    type: string;
    severity: AlertSeverity;
    count: number;
    firstAlertAt: number;
    lastAlertAt: number;
    alerts: Alert[];
    summary: string;
    acknowledged: boolean;
}
export interface AlertDeliveryResult {
    channel: AlertChannel;
    success: boolean;
    error?: string;
    responseStatus?: number;
    timestamp: number;
}
export interface WebhookPayload {
    alertId: string;
    type: string;
    severity: AlertSeverity;
    agentId: string;
    title: string;
    message: string;
    details: Record<string, unknown>;
    timestamp: number;
    aggregated?: {
        count: number;
        firstAlertAt: number;
        lastAlertAt: number;
    };
}
/**
 * Survival Alert System
 * Manages real-time alerts with aggregation and rate limiting
 */
export declare class SurvivalAlertSystem {
    private config;
    private alertHistory;
    private activeAlerts;
    private aggregatedGroups;
    private lastAlertTimes;
    private alertCountThisHour;
    private hourStartTime;
    private subscribers;
    constructor(config?: Partial<AlertConfig>);
    /**
     * Send an alert through configured channels
     */
    sendAlert(type: SurvivalEventType | string, severity: AlertSeverity, agentId: string, title: string, message: string, details?: Record<string, unknown>): Promise<Alert | null>;
    /**
     * Check if rate limited
     */
    private isRateLimited;
    /**
     * Check if alert type is in cooldown
     */
    private isInCooldown;
    /**
     * Add alert to aggregation group
     */
    private addToAggregation;
    /**
     * Send aggregated alert
     */
    private sendAggregatedAlert;
    /**
     * Deliver alert to all configured channels
     */
    private deliverAlert;
    /**
     * Deliver alert to specific channel
     */
    private deliverToChannel;
    /**
     * Send webhook notification
     */
    private sendWebhook;
    /**
     * Placeholder for email integration
     */
    private sendEmailPlaceholder;
    /**
     * Placeholder for SMS integration
     */
    private sendSMSPlaceholder;
    /**
     * Placeholder for push notification integration
     */
    private sendPushPlaceholder;
    /**
     * Subscribe to alert events
     */
    subscribe(event: SurvivalEventType, callback: (alert: Alert) => void): () => void;
    /**
     * Notify subscribers
     */
    private notifySubscribers;
    /**
     * Acknowledge an alert
     */
    acknowledgeAlert(alertId: string, acknowledgedBy?: string): boolean;
    /**
     * Get active alerts
     */
    getActiveAlerts(filter?: {
        severity?: AlertSeverity;
        agentId?: string;
    }): Alert[];
    /**
     * Get alert history
     */
    getAlertHistory(limit?: number, offset?: number): Alert[];
    /**
     * Get aggregated alerts
     */
    getAggregatedAlerts(): AggregatedAlert[];
    /**
     * Get alert statistics
     */
    getStats(): {
        totalAlerts: number;
        activeAlerts: number;
        alertsThisHour: number;
        bySeverity: Record<AlertSeverity, number>;
        byChannel: Record<AlertChannel, number>;
    };
    /**
     * Update configuration
     */
    updateConfig(config: Partial<AlertConfig>): void;
    /**
     * Flush aggregated alerts
     */
    flushAggregatedAlerts(): Promise<void>;
    /**
     * Clear old alert history
     */
    clearHistory(olderThanMs?: number): number;
}
/**
 * Get or create global alert system
 */
export declare function getOrCreateAlertSystem(config?: Partial<AlertConfig>): SurvivalAlertSystem;
/**
 * Get global alert system
 */
export declare function getAlertSystem(): SurvivalAlertSystem | null;
export default SurvivalAlertSystem;
//# sourceMappingURL=survival-alerts.d.ts.map