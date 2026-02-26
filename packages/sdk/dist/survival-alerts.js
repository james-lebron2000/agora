/**
 * Real-time Alert System for Echo Survival
 *
 * Provides webhook notifications, alert severity levels, and
 * alert aggregation to prevent spam.
 *
 * @module survival-alerts
 */
// Default alert configuration
export const DEFAULT_ALERT_CONFIG = {
    thresholds: {
        info: 70,
        warning: 50,
        critical: 30,
        emergency: 10
    },
    enableAggregation: true,
    aggregationWindowMs: 300000, // 5 minutes
    maxAlertsPerWindow: 10,
    cooldownMs: 60000, // 1 minute
    cooldownByType: {
        'health:critical': 300000,
        'economic:warning': 120000,
        'action:recommended': 600000,
        'survival:mode-enter': 600000,
        'survival:mode-exit': 60000
    },
    maxAlertsPerHour: 50,
    subscribeTo: [
        'health:critical',
        'economic:warning',
        'survival:mode-enter',
        'survival:mode-exit'
    ],
    enabledChannels: ['webhook']
};
/**
 * Survival Alert System
 * Manages real-time alerts with aggregation and rate limiting
 */
export class SurvivalAlertSystem {
    config;
    alertHistory = [];
    activeAlerts = new Map();
    aggregatedGroups = new Map();
    lastAlertTimes = new Map();
    alertCountThisHour = 0;
    hourStartTime = Date.now();
    subscribers = new Map();
    constructor(config = {}) {
        this.config = { ...DEFAULT_ALERT_CONFIG, ...config };
    }
    /**
     * Send an alert through configured channels
     */
    async sendAlert(type, severity, agentId, title, message, details = {}) {
        // Check rate limit
        if (this.isRateLimited()) {
            console.warn('[SurvivalAlertSystem] Rate limit exceeded, alert suppressed');
            return null;
        }
        // Check cooldown
        const cooldownKey = `${agentId}:${type}`;
        if (this.isInCooldown(cooldownKey, type)) {
            console.log(`[SurvivalAlertSystem] Alert ${type} in cooldown for ${agentId}`);
            return null;
        }
        // Create alert
        const alert = {
            id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type,
            severity,
            agentId,
            title,
            message,
            details,
            timestamp: Date.now(),
            acknowledged: false,
            channelsSent: [],
            deliveryStatus: {
                webhook: 'pending',
                email: 'pending',
                sms: 'pending',
                push: 'pending'
            }
        };
        // Store alert
        this.activeAlerts.set(alert.id, alert);
        this.alertHistory.push(alert);
        this.lastAlertTimes.set(cooldownKey, Date.now());
        this.alertCountThisHour++;
        // Handle aggregation
        if (this.config.enableAggregation) {
            this.addToAggregation(alert);
        }
        // Deliver to channels
        await this.deliverAlert(alert);
        // Notify subscribers
        this.notifySubscribers(type, alert);
        return alert;
    }
    /**
     * Check if rate limited
     */
    isRateLimited() {
        const hourAgo = Date.now() - 3600000;
        if (this.hourStartTime < hourAgo) {
            // Reset hour counter
            this.hourStartTime = Date.now();
            this.alertCountThisHour = 0;
            return false;
        }
        return this.alertCountThisHour >= this.config.maxAlertsPerHour;
    }
    /**
     * Check if alert type is in cooldown
     */
    isInCooldown(key, type) {
        const lastAlert = this.lastAlertTimes.get(key);
        if (!lastAlert)
            return false;
        const cooldown = this.config.cooldownByType[type] || this.config.cooldownMs;
        return Date.now() - lastAlert < cooldown;
    }
    /**
     * Add alert to aggregation group
     */
    addToAggregation(alert) {
        const groupKey = `${alert.agentId}:${alert.type}`;
        let group = this.aggregatedGroups.get(groupKey);
        const now = Date.now();
        if (!group || now - group.lastAlertAt > this.config.aggregationWindowMs) {
            // Create new group
            group = {
                id: `agg-${Date.now()}`,
                type: alert.type,
                severity: alert.severity,
                count: 0,
                firstAlertAt: now,
                lastAlertAt: now,
                alerts: [],
                summary: '',
                acknowledged: false
            };
            this.aggregatedGroups.set(groupKey, group);
        }
        group.count++;
        group.lastAlertAt = now;
        group.alerts.push(alert);
        group.summary = `${group.count} ${alert.type} alerts from ${alert.agentId}`;
        // If group exceeds max per window, send aggregated alert
        if (group.count >= this.config.maxAlertsPerWindow) {
            this.sendAggregatedAlert(group);
        }
    }
    /**
     * Send aggregated alert
     */
    async sendAggregatedAlert(group) {
        if (group.acknowledged)
            return;
        const payload = {
            alertId: group.id,
            type: `${group.type}:aggregated`,
            severity: group.severity,
            agentId: group.alerts[0].agentId,
            title: `Aggregated ${group.type} Alerts`,
            message: group.summary,
            details: {
                alertCount: group.count,
                alerts: group.alerts.map(a => ({
                    id: a.id,
                    message: a.message,
                    timestamp: a.timestamp
                }))
            },
            timestamp: Date.now(),
            aggregated: {
                count: group.count,
                firstAlertAt: group.firstAlertAt,
                lastAlertAt: group.lastAlertAt
            }
        };
        await this.sendWebhook(payload);
        group.acknowledged = true; // Mark as processed
    }
    /**
     * Deliver alert to all configured channels
     */
    async deliverAlert(alert) {
        const results = [];
        for (const channel of this.config.enabledChannels) {
            const result = await this.deliverToChannel(alert, channel);
            results.push(result);
            alert.deliveryStatus[channel] = result.success ? 'sent' : 'failed';
            if (result.success) {
                alert.channelsSent.push(channel);
            }
        }
        return results;
    }
    /**
     * Deliver alert to specific channel
     */
    async deliverToChannel(alert, channel) {
        const result = {
            channel,
            success: false,
            timestamp: Date.now()
        };
        try {
            switch (channel) {
                case 'webhook':
                    if (this.config.webhookUrl) {
                        await this.sendWebhook({
                            alertId: alert.id,
                            type: alert.type,
                            severity: alert.severity,
                            agentId: alert.agentId,
                            title: alert.title,
                            message: alert.message,
                            details: alert.details,
                            timestamp: alert.timestamp
                        });
                        result.success = true;
                    }
                    break;
                case 'email':
                    // Placeholder for email integration
                    result.success = await this.sendEmailPlaceholder(alert);
                    break;
                case 'sms':
                    // Placeholder for SMS integration
                    result.success = await this.sendSMSPlaceholder(alert);
                    break;
                case 'push':
                    // Placeholder for push notification integration
                    result.success = await this.sendPushPlaceholder(alert);
                    break;
                default:
                    result.error = 'Unknown channel';
            }
        }
        catch (error) {
            result.success = false;
            result.error = error instanceof Error ? error.message : 'Unknown error';
        }
        return result;
    }
    /**
     * Send webhook notification
     */
    async sendWebhook(payload) {
        if (!this.config.webhookUrl) {
            throw new Error('Webhook URL not configured');
        }
        const response = await fetch(this.config.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...this.config.webhookHeaders
            },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            throw new Error(`Webhook failed with status ${response.status}`);
        }
    }
    /**
     * Placeholder for email integration
     */
    async sendEmailPlaceholder(alert) {
        // In production, integrate with email service (SendGrid, AWS SES, etc.)
        console.log(`[SurvivalAlertSystem:Email] ${alert.title}: ${alert.message}`);
        return true;
    }
    /**
     * Placeholder for SMS integration
     */
    async sendSMSPlaceholder(alert) {
        // In production, integrate with SMS service (Twilio, etc.)
        console.log(`[SurvivalAlertSystem:SMS] ${alert.title}: ${alert.message}`);
        return true;
    }
    /**
     * Placeholder for push notification integration
     */
    async sendPushPlaceholder(alert) {
        // In production, integrate with push service (Firebase, etc.)
        console.log(`[SurvivalAlertSystem:Push] ${alert.title}: ${alert.message}`);
        return true;
    }
    /**
     * Subscribe to alert events
     */
    subscribe(event, callback) {
        if (!this.subscribers.has(event)) {
            this.subscribers.set(event, new Set());
        }
        this.subscribers.get(event).add(callback);
        // Return unsubscribe function
        return () => {
            this.subscribers.get(event)?.delete(callback);
        };
    }
    /**
     * Notify subscribers
     */
    notifySubscribers(event, alert) {
        const callbacks = this.subscribers.get(event);
        if (callbacks) {
            callbacks.forEach(cb => {
                try {
                    cb(alert);
                }
                catch (err) {
                    console.error('Alert subscriber error:', err);
                }
            });
        }
    }
    /**
     * Acknowledge an alert
     */
    acknowledgeAlert(alertId, acknowledgedBy) {
        const alert = this.activeAlerts.get(alertId);
        if (!alert) {
            return false;
        }
        alert.acknowledged = true;
        alert.acknowledgedAt = Date.now();
        alert.acknowledgedBy = acknowledgedBy;
        return true;
    }
    /**
     * Get active alerts
     */
    getActiveAlerts(filter) {
        let alerts = Array.from(this.activeAlerts.values()).filter(a => !a.acknowledged);
        if (filter?.severity) {
            alerts = alerts.filter(a => a.severity === filter.severity);
        }
        if (filter?.agentId) {
            alerts = alerts.filter(a => a.agentId === filter.agentId);
        }
        return alerts.sort((a, b) => b.timestamp - a.timestamp);
    }
    /**
     * Get alert history
     */
    getAlertHistory(limit = 100, offset = 0) {
        return this.alertHistory
            .slice()
            .reverse()
            .slice(offset, offset + limit);
    }
    /**
     * Get aggregated alerts
     */
    getAggregatedAlerts() {
        return Array.from(this.aggregatedGroups.values())
            .filter(g => !g.acknowledged)
            .sort((a, b) => b.lastAlertAt - a.lastAlertAt);
    }
    /**
     * Get alert statistics
     */
    getStats() {
        const bySeverity = { info: 0, warning: 0, critical: 0, emergency: 0 };
        const byChannel = { webhook: 0, email: 0, sms: 0, push: 0 };
        for (const alert of this.alertHistory) {
            bySeverity[alert.severity]++;
            for (const channel of alert.channelsSent) {
                byChannel[channel]++;
            }
        }
        return {
            totalAlerts: this.alertHistory.length,
            activeAlerts: this.getActiveAlerts().length,
            alertsThisHour: this.alertCountThisHour,
            bySeverity,
            byChannel
        };
    }
    /**
     * Update configuration
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    /**
     * Flush aggregated alerts
     */
    async flushAggregatedAlerts() {
        for (const group of this.aggregatedGroups.values()) {
            if (group.count > 0 && !group.acknowledged) {
                await this.sendAggregatedAlert(group);
            }
        }
    }
    /**
     * Clear old alert history
     */
    clearHistory(olderThanMs = 7 * 24 * 60 * 60 * 1000) {
        const cutoff = Date.now() - olderThanMs;
        const originalLength = this.alertHistory.length;
        this.alertHistory = this.alertHistory.filter(a => a.timestamp > cutoff);
        // Also clean up active alerts map
        for (const [id, alert] of this.activeAlerts) {
            if (alert.timestamp < cutoff) {
                this.activeAlerts.delete(id);
            }
        }
        return originalLength - this.alertHistory.length;
    }
}
// Global alert system instance
let globalAlertSystem = null;
/**
 * Get or create global alert system
 */
export function getOrCreateAlertSystem(config) {
    if (!globalAlertSystem) {
        globalAlertSystem = new SurvivalAlertSystem(config);
    }
    return globalAlertSystem;
}
/**
 * Get global alert system
 */
export function getAlertSystem() {
    return globalAlertSystem;
}
export default SurvivalAlertSystem;
//# sourceMappingURL=survival-alerts.js.map