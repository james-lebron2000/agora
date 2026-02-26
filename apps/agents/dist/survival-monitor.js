/**
 * Survival Monitoring Agent
 *
 * Standalone agent that monitors all Agora agents' survival status.
 * Aggregates dashboard data and provides predictive alerts.
 *
 * @module survival-monitor
 */
import { EchoSurvivalManager, getSurvivalManager } from '@agora/sdk';
import EventEmitter from 'events';
// Default monitor configuration
export const DEFAULT_MONITOR_CONFIG = {
    checkIntervalMs: 30000, // 30 seconds
    aggregationIntervalMs: 60000, // 1 minute
    healthCheckTimeoutMs: 10000, // 10 seconds
    maxCheckFailures: 3,
    predictiveWindowHours: 24,
    alertCooldownMs: 300000, // 5 minutes
    enablePredictiveAlerts: true,
    enableDashboardAggregation: true,
    criticalScoreThreshold: 30,
    lowRunwayThresholdDays: 3
};
/**
 * Survival Monitoring Agent
 * Monitors multiple agents and provides aggregated insights
 */
export class SurvivalMonitor extends EventEmitter {
    config;
    agents = new Map();
    checkTimer = null;
    aggregationTimer = null;
    isRunning = false;
    // Alert management
    activeAlerts = new Map();
    alertHistory = [];
    alertBuckets = new Map();
    lastAlertTimes = new Map();
    // Historical data for trend analysis
    historySnapshots = new Map();
    // Dashboard data cache
    dashboardData = null;
    lastDashboardUpdate = 0;
    constructor(config = {}) {
        super();
        this.config = { ...DEFAULT_MONITOR_CONFIG, ...config };
    }
    /**
     * Start the monitoring agent
     */
    start() {
        if (this.isRunning) {
            console.warn('[SurvivalMonitor] Already running');
            return;
        }
        this.isRunning = true;
        console.log('[SurvivalMonitor] Started');
        this.emit('monitor:started', { timestamp: Date.now() });
        // Start health check loop
        this.checkTimer = setInterval(() => {
            this.runHealthChecks();
        }, this.config.checkIntervalMs);
        // Start aggregation loop
        if (this.config.enableDashboardAggregation) {
            this.aggregationTimer = setInterval(() => {
                this.aggregateDashboardData();
            }, this.config.aggregationIntervalMs);
        }
        // Run initial checks
        this.runHealthChecks();
        if (this.config.enableDashboardAggregation) {
            this.aggregateDashboardData();
        }
    }
    /**
     * Stop the monitoring agent
     */
    stop() {
        this.isRunning = false;
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = null;
        }
        if (this.aggregationTimer) {
            clearInterval(this.aggregationTimer);
            this.aggregationTimer = null;
        }
        console.log('[SurvivalMonitor] Stopped');
        this.emit('monitor:stopped', { timestamp: Date.now() });
    }
    /**
     * Check if monitor is running
     */
    isActive() {
        return this.isRunning;
    }
    /**
     * Register an agent for monitoring
     */
    registerAgent(agentId, address, options = {}) {
        if (this.agents.has(agentId)) {
            console.warn(`[SurvivalMonitor] Agent ${agentId} already registered`);
            return this.agents.get(agentId);
        }
        const agent = {
            agentId,
            address,
            name: options.name || agentId,
            tags: options.tags || [],
            addedAt: Date.now(),
            lastCheckAt: 0,
            currentSnapshot: null,
            currentCheckResult: null,
            health: 'healthy',
            survivalScore: 100,
            status: 'unknown',
            checkFailures: 0
        };
        this.agents.set(agentId, agent);
        this.historySnapshots.set(agentId, []);
        this.emit('agent:registered', { agentId, address, timestamp: Date.now() });
        console.log(`[SurvivalMonitor] Registered agent: ${agentId}`);
        return agent;
    }
    /**
     * Unregister an agent from monitoring
     */
    unregisterAgent(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent) {
            return false;
        }
        this.agents.delete(agentId);
        this.historySnapshots.delete(agentId);
        this.emit('agent:unregistered', { agentId, timestamp: Date.now() });
        console.log(`[SurvivalMonitor] Unregistered agent: ${agentId}`);
        return true;
    }
    /**
     * Get all registered agents
     */
    getAgents() {
        return Array.from(this.agents.values());
    }
    /**
     * Get a specific agent
     */
    getAgent(agentId) {
        return this.agents.get(agentId);
    }
    /**
     * Run health checks on all registered agents
     */
    async runHealthChecks() {
        const checkPromises = Array.from(this.agents.values()).map(agent => this.checkAgent(agent));
        await Promise.allSettled(checkPromises);
        // Run predictive analysis after health checks
        if (this.config.enablePredictiveAlerts) {
            this.runPredictiveAnalysis();
        }
    }
    /**
     * Check a single agent's health
     */
    async checkAgent(agent) {
        try {
            // Get survival manager for this agent
            const survivalManager = getSurvivalManager(agent.agentId) ||
                new EchoSurvivalManager(agent.agentId, agent.address);
            // Perform survival check with timeout
            const checkPromise = survivalManager.performEnhancedSurvivalCheck();
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), this.config.healthCheckTimeoutMs));
            const result = await Promise.race([checkPromise, timeoutPromise]);
            // Update agent record
            agent.currentSnapshot = result.snapshot;
            agent.currentCheckResult = {
                survivalScore: result.snapshot.health.overall,
                healthScore: 0,
                economicsScore: 0,
                needsEmergencyFunding: result.prediction.predictedRunwayDays < this.config.lowRunwayThresholdDays,
                recommendations: result.actions.map(a => a.description),
                timestamp: Date.now()
            };
            agent.health = result.snapshot.health.status;
            agent.survivalScore = result.snapshot.health.overall;
            agent.status = this.determineAgentStatus(agent);
            agent.lastCheckAt = Date.now();
            agent.checkFailures = 0;
            // Store history
            const history = this.historySnapshots.get(agent.agentId) || [];
            history.push({
                timestamp: Date.now(),
                score: result.snapshot.health.overall,
                balance: result.snapshot.economics.balance
            });
            // Keep only last 1000 entries
            if (history.length > 1000) {
                history.shift();
            }
            this.historySnapshots.set(agent.agentId, history);
            // Emit check completed event
            this.emit('agent:check:completed', {
                agentId: agent.agentId,
                score: agent.survivalScore,
                status: agent.status,
                timestamp: Date.now()
            });
            // Check for critical status and send immediate alerts
            if (agent.status === 'critical') {
                this.sendCriticalAlert(agent);
            }
        }
        catch (error) {
            agent.checkFailures++;
            agent.status = agent.checkFailures >= this.config.maxCheckFailures ? 'inactive' : 'unknown';
            console.error(`[SurvivalMonitor] Health check failed for ${agent.agentId}:`, error);
            this.emit('agent:check:failed', {
                agentId: agent.agentId,
                error: error instanceof Error ? error.message : 'Unknown error',
                failures: agent.checkFailures,
                timestamp: Date.now()
            });
        }
    }
    /**
     * Determine agent status based on health and score
     */
    determineAgentStatus(agent) {
        if (agent.checkFailures >= this.config.maxCheckFailures) {
            return 'inactive';
        }
        if (agent.survivalScore < this.config.criticalScoreThreshold ||
            agent.health === 'critical' ||
            agent.health === 'dead') {
            return 'critical';
        }
        if (agent.health === 'healthy' || agent.health === 'degraded') {
            return 'active';
        }
        return 'unknown';
    }
    /**
     * Run predictive analysis on all agents
     */
    runPredictiveAnalysis() {
        for (const agent of this.agents.values()) {
            this.analyzeAgentTrends(agent);
        }
    }
    /**
     * Analyze trends for a specific agent and generate predictive alerts
     */
    analyzeAgentTrends(agent) {
        const history = this.historySnapshots.get(agent.agentId);
        if (!history || history.length < 5) {
            return; // Not enough data
        }
        const recent = history.slice(-10);
        const older = history.slice(-20, -10);
        if (older.length === 0) {
            return;
        }
        // Calculate trend
        const recentAvgScore = recent.reduce((sum, h) => sum + h.score, 0) / recent.length;
        const olderAvgScore = older.reduce((sum, h) => sum + h.score, 0) / older.length;
        const scoreDeclineRate = (olderAvgScore - recentAvgScore) / older.length;
        const recentAvgBalance = recent.reduce((sum, h) => sum + parseFloat(h.balance), 0) / recent.length;
        // Predict time to critical
        let estimatedHoursToCritical = null;
        if (scoreDeclineRate > 0 && recentAvgScore > this.config.criticalScoreThreshold) {
            estimatedHoursToCritical = (recentAvgScore - this.config.criticalScoreThreshold) / scoreDeclineRate;
        }
        // Check for degrading health
        if (scoreDeclineRate > 2 && recentAvgScore > this.config.criticalScoreThreshold) {
            const alertKey = `${agent.agentId}:degrading_health`;
            if (this.canSendAlert(alertKey)) {
                this.createPredictiveAlert({
                    agentId: agent.agentId,
                    type: 'degrading_health',
                    severity: recentAvgScore < 50 ? 'critical' : 'warning',
                    message: `Agent ${agent.name} health is declining rapidly. Current score: ${recentAvgScore.toFixed(1)}`,
                    estimatedTimeToCritical: estimatedHoursToCritical || this.config.predictiveWindowHours,
                    recommendation: 'Review recent task failures and consider reducing operational costs'
                });
            }
        }
        // Check for low runway
        if (agent.currentSnapshot && agent.currentSnapshot.economics.runwayDays < this.config.lowRunwayThresholdDays) {
            const alertKey = `${agent.agentId}:low_runway`;
            if (this.canSendAlert(alertKey)) {
                this.createPredictiveAlert({
                    agentId: agent.agentId,
                    type: 'low_runway',
                    severity: agent.currentSnapshot.economics.runwayDays < 1 ? 'critical' : 'warning',
                    message: `Agent ${agent.name} has only ${agent.currentSnapshot.economics.runwayDays} days of runway remaining`,
                    estimatedTimeToCritical: agent.currentSnapshot.economics.runwayDays * 24,
                    recommendation: 'Secure additional funding or reduce operational costs immediately'
                });
            }
        }
        // Check for balance drain
        if (recent.length >= 5) {
            const balanceTrend = recent.slice(1).reduce((sum, h, i) => {
                return sum + (parseFloat(h.balance) - parseFloat(recent[i].balance));
            }, 0);
            if (balanceTrend < -10) { // Losing more than $10 per check interval
                const alertKey = `${agent.agentId}:balance_drain`;
                if (this.canSendAlert(alertKey)) {
                    this.createPredictiveAlert({
                        agentId: agent.agentId,
                        type: 'balance_drain',
                        severity: 'warning',
                        message: `Agent ${agent.name} is experiencing rapid balance drain`,
                        estimatedTimeToCritical: this.config.predictiveWindowHours,
                        recommendation: 'Investigate high gas costs or failed transaction retries'
                    });
                }
            }
        }
    }
    /**
     * Check if we can send an alert (cooldown check)
     */
    canSendAlert(alertKey) {
        const lastAlert = this.lastAlertTimes.get(alertKey) || 0;
        return Date.now() - lastAlert > this.config.alertCooldownMs;
    }
    /**
     * Create a predictive alert
     */
    createPredictiveAlert(params) {
        const alert = {
            ...params,
            id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            predictedAt: Date.now(),
            acknowledged: false
        };
        this.activeAlerts.set(alert.id, alert);
        this.alertHistory.push(alert);
        const alertKey = `${params.agentId}:${params.type}`;
        this.lastAlertTimes.set(alertKey, Date.now());
        // Update alert bucket for aggregation
        const bucketKey = params.type;
        let bucket = this.alertBuckets.get(bucketKey);
        if (!bucket) {
            bucket = { key: bucketKey, alerts: [], lastAlertTime: 0, count: 0 };
            this.alertBuckets.set(bucketKey, bucket);
        }
        bucket.alerts.push(alert);
        bucket.count++;
        bucket.lastAlertTime = Date.now();
        this.emit('alert:created', alert);
        // Send webhook if configured
        if (this.config.webhookUrl) {
            this.sendWebhookNotification(alert);
        }
        return alert;
    }
    /**
     * Send critical alert for an agent
     */
    sendCriticalAlert(agent) {
        this.emit('agent:critical', {
            agentId: agent.agentId,
            agentName: agent.name,
            score: agent.survivalScore,
            timestamp: Date.now()
        });
        if (this.config.webhookUrl) {
            fetch(this.config.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'critical_alert',
                    agentId: agent.agentId,
                    agentName: agent.name,
                    score: agent.survivalScore,
                    status: agent.status,
                    timestamp: Date.now()
                })
            }).catch(err => console.error('Webhook failed:', err));
        }
    }
    /**
     * Send webhook notification
     */
    async sendWebhookNotification(alert) {
        if (!this.config.webhookUrl)
            return;
        try {
            await fetch(this.config.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...alert,
                    notificationType: 'predictive_alert'
                })
            });
        }
        catch (error) {
            console.error('[SurvivalMonitor] Webhook notification failed:', error);
        }
    }
    /**
     * Aggregate dashboard data from all agents
     */
    aggregateDashboardData() {
        const agents = Array.from(this.agents.values());
        const activeAgents = agents.filter(a => a.status === 'active');
        const criticalAgents = agents.filter(a => a.status === 'critical');
        const inactiveAgents = agents.filter(a => a.status === 'inactive');
        const totalBalance = agents.reduce((sum, a) => {
            return sum + (a.currentSnapshot ? parseFloat(a.currentSnapshot.economics.balance) : 0);
        }, 0);
        const avgRunway = agents.length > 0
            ? agents.reduce((sum, a) => sum + (a.currentSnapshot?.economics.runwayDays || 0), 0) / agents.length
            : 0;
        const avgScore = agents.length > 0
            ? agents.reduce((sum, a) => sum + a.survivalScore, 0) / agents.length
            : 0;
        const agentsByStatus = {
            healthy: agents.filter(a => a.health === 'healthy').length,
            degraded: agents.filter(a => a.health === 'degraded').length,
            critical: agents.filter(a => a.health === 'critical').length,
            dead: agents.filter(a => a.health === 'dead').length
        };
        // Calculate trend
        let healthTrend = 'stable';
        if (this.dashboardData) {
            const scoreDiff = avgScore - this.dashboardData.averageSurvivalScore;
            if (scoreDiff > 5)
                healthTrend = 'improving';
            else if (scoreDiff < -5)
                healthTrend = 'declining';
        }
        const data = {
            totalAgents: agents.length,
            activeAgents: activeAgents.length,
            criticalAgents: criticalAgents.length,
            inactiveAgents: inactiveAgents.length,
            averageSurvivalScore: Math.round(avgScore),
            totalBalanceUSD: totalBalance.toFixed(2),
            totalRunwayDays: Math.round(avgRunway),
            agentsByStatus,
            healthTrend,
            lastUpdated: Date.now()
        };
        this.dashboardData = data;
        this.lastDashboardUpdate = Date.now();
        this.emit('dashboard:updated', data);
        return data;
    }
    /**
     * Get dashboard data
     */
    getDashboardData() {
        return this.dashboardData;
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
        return alerts;
    }
    /**
     * Get alert history
     */
    getAlertHistory(limit = 100) {
        return this.alertHistory.slice(-limit);
    }
    /**
     * Acknowledge an alert
     */
    acknowledgeAlert(alertId) {
        const alert = this.activeAlerts.get(alertId);
        if (!alert) {
            return false;
        }
        alert.acknowledged = true;
        alert.acknowledgedAt = Date.now();
        this.emit('alert:acknowledged', { alertId, timestamp: Date.now() });
        return true;
    }
    /**
     * Get aggregated alert statistics
     */
    getAlertStats() {
        const stats = {
            total: this.alertHistory.length,
            byType: {},
            bySeverity: {}
        };
        for (const alert of this.alertHistory) {
            stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
            stats.bySeverity[alert.severity] = (stats.bySeverity[alert.severity] || 0) + 1;
        }
        return stats;
    }
    /**
     * Get monitor status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            registeredAgents: this.agents.size,
            activeAlerts: this.getActiveAlerts().length,
            lastDashboardUpdate: this.lastDashboardUpdate,
            config: { ...this.config }
        };
    }
    /**
     * Update monitor configuration
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        console.log('[SurvivalMonitor] Configuration updated');
        // Restart timers if interval changed
        if (this.isRunning) {
            this.stop();
            this.start();
        }
    }
    /**
     * Schedule a health check for a specific agent
     */
    async checkAgentNow(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent) {
            return null;
        }
        await this.checkAgent(agent);
        return agent;
    }
    /**
     * Get agent history
     */
    getAgentHistory(agentId) {
        return this.historySnapshots.get(agentId) || [];
    }
}
// Global monitor instance
let globalMonitor = null;
/**
 * Get or create global survival monitor
 */
export function getOrCreateSurvivalMonitor(config) {
    if (!globalMonitor) {
        globalMonitor = new SurvivalMonitor(config);
    }
    return globalMonitor;
}
/**
 * Get global survival monitor
 */
export function getSurvivalMonitor() {
    return globalMonitor;
}
/**
 * Destroy global monitor
 */
export function destroySurvivalMonitor() {
    if (globalMonitor) {
        globalMonitor.stop();
        globalMonitor = null;
    }
}
export default SurvivalMonitor;
//# sourceMappingURL=survival-monitor.js.map