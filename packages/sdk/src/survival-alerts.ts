/**
 * Real-time Alert System for Echo Survival
 * 
 * Provides webhook notifications, alert severity levels, and
 * alert aggregation to prevent spam.
 * 
 * @module survival-alerts
 */

import type { SurvivalEventType } from './survival.js';

// Alert severity levels
export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';

// Alert channel types
export type AlertChannel = 'webhook' | 'email' | 'sms' | 'push' | 'webhook';

// Alert configuration
export interface AlertConfig {
  // Channel settings
  webhookUrl?: string;
  webhookHeaders?: Record<string, string>;
  emailEndpoint?: string;
  smsEndpoint?: string;
  
  // Severity thresholds (min score to trigger)
  thresholds: {
    info: number;
    warning: number;
    critical: number;
    emergency: number;
  };
  
  // Aggregation settings
  enableAggregation: boolean;
  aggregationWindowMs: number;
  maxAlertsPerWindow: number;
  
  // Cooldown settings
  cooldownMs: number;
  cooldownByType: Record<string, number>;
  
  // Rate limiting
  maxAlertsPerHour: number;
  
  // Event subscriptions
  subscribeTo: SurvivalEventType[];
  
  // Enabled channels
  enabledChannels: AlertChannel[];
}

// Default alert configuration
export const DEFAULT_ALERT_CONFIG: AlertConfig = {
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

// Alert record
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

// Aggregated alert group
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

// Alert delivery result
export interface AlertDeliveryResult {
  channel: AlertChannel;
  success: boolean;
  error?: string;
  responseStatus?: number;
  timestamp: number;
}

// Webhook payload
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
export class SurvivalAlertSystem {
  private config: AlertConfig;
  private alertHistory: Alert[] = [];
  private activeAlerts: Map<string, Alert> = new Map();
  private aggregatedGroups: Map<string, AggregatedAlert> = new Map();
  private lastAlertTimes: Map<string, number> = new Map();
  private alertCountThisHour: number = 0;
  private hourStartTime: number = Date.now();
  private subscribers: Map<SurvivalEventType, Set<(alert: Alert) => void>> = new Map();

  constructor(config: Partial<AlertConfig> = {}) {
    this.config = { ...DEFAULT_ALERT_CONFIG, ...config };
  }

  /**
   * Send an alert through configured channels
   */
  async sendAlert(
    type: SurvivalEventType | string,
    severity: AlertSeverity,
    agentId: string,
    title: string,
    message: string,
    details: Record<string, unknown> = {}
  ): Promise<Alert | null> {
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
    const alert: Alert = {
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
      deliveryStatus: {}
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
    this.notifySubscribers(type as SurvivalEventType, alert);

    return alert;
  }

  /**
   * Check if rate limited
   */
  private isRateLimited(): boolean {
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
  private isInCooldown(key: string, type: string): boolean {
    const lastAlert = this.lastAlertTimes.get(key);
    if (!lastAlert) return false;

    const cooldown = this.config.cooldownByType[type] || this.config.cooldownMs;
    return Date.now() - lastAlert < cooldown;
  }

  /**
   * Add alert to aggregation group
   */
  private addToAggregation(alert: Alert): void {
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
  private async sendAggregatedAlert(group: AggregatedAlert): void {
    if (group.acknowledged) return;

    const payload: WebhookPayload = {
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
  private async deliverAlert(alert: Alert): Promise<AlertDeliveryResult[]> {
    const results: AlertDeliveryResult[] = [];

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
  private async deliverToChannel(
    alert: Alert,
    channel: AlertChannel
  ): Promise<AlertDeliveryResult> {
    const result: AlertDeliveryResult = {
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
    } catch (error) {
      result.success = false;
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return result;
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(payload: WebhookPayload): Promise<void> {
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
  private async sendEmailPlaceholder(alert: Alert): Promise<boolean> {
    // In production, integrate with email service (SendGrid, AWS SES, etc.)
    console.log(`[SurvivalAlertSystem:Email] ${alert.title}: ${alert.message}`);
    return true;
  }

  /**
   * Placeholder for SMS integration
   */
  private async sendSMSPlaceholder(alert: Alert): Promise<boolean> {
    // In production, integrate with SMS service (Twilio, etc.)
    console.log(`[SurvivalAlertSystem:SMS] ${alert.title}: ${alert.message}`);
    return true;
  }

  /**
   * Placeholder for push notification integration
   */
  private async sendPushPlaceholder(alert: Alert): Promise<boolean> {
    // In production, integrate with push service (Firebase, etc.)
    console.log(`[SurvivalAlertSystem:Push] ${alert.title}: ${alert.message}`);
    return true;
  }

  /**
   * Subscribe to alert events
   */
  subscribe(event: SurvivalEventType, callback: (alert: Alert) => void): () => void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.get(event)?.delete(callback);
    };
  }

  /**
   * Notify subscribers
   */
  private notifySubscribers(event: SurvivalEventType, alert: Alert): void {
    const callbacks = this.subscribers.get(event);
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(alert);
        } catch (err) {
          console.error('Alert subscriber error:', err);
        }
      });
    }
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy?: string): boolean {
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
  getActiveAlerts(filter?: { severity?: AlertSeverity; agentId?: string }): Alert[] {
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
  getAlertHistory(limit: number = 100, offset: number = 0): Alert[] {
    return this.alertHistory
      .slice()
      .reverse()
      .slice(offset, offset + limit);
  }

  /**
   * Get aggregated alerts
   */
  getAggregatedAlerts(): AggregatedAlert[] {
    return Array.from(this.aggregatedGroups.values())
      .filter(g => !g.acknowledged)
      .sort((a, b) => b.lastAlertAt - a.lastAlertAt);
  }

  /**
   * Get alert statistics
   */
  getStats(): {
    totalAlerts: number;
    activeAlerts: number;
    alertsThisHour: number;
    bySeverity: Record<AlertSeverity, number>;
    byChannel: Record<AlertChannel, number>;
  } {
    const bySeverity: Record<AlertSeverity, number> = { info: 0, warning: 0, critical: 0, emergency: 0 };
    const byChannel: Record<AlertChannel, number> = { webhook: 0, email: 0, sms: 0, push: 0 };

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
  updateConfig(config: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Flush aggregated alerts
   */
  async flushAggregatedAlerts(): Promise<void> {
    for (const group of this.aggregatedGroups.values()) {
      if (group.count > 0 && !group.acknowledged) {
        await this.sendAggregatedAlert(group);
      }
    }
  }

  /**
   * Clear old alert history
   */
  clearHistory(olderThanMs: number = 7 * 24 * 60 * 60 * 1000): number {
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
let globalAlertSystem: SurvivalAlertSystem | null = null;

/**
 * Get or create global alert system
 */
export function getOrCreateAlertSystem(
  config?: Partial<AlertConfig>
): SurvivalAlertSystem {
  if (!globalAlertSystem) {
    globalAlertSystem = new SurvivalAlertSystem(config);
  }
  return globalAlertSystem;
}

/**
 * Get global alert system
 */
export function getAlertSystem(): SurvivalAlertSystem | null {
  return globalAlertSystem;
}

export default SurvivalAlertSystem;
