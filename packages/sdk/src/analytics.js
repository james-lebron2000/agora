/**
 * Analytics Module
 * Comprehensive analytics tracking for events, metrics, and performance monitoring
 */
import { EventEmitter } from 'events';
// ============================================================================
// EventTracker Class
// ============================================================================
export class EventTracker extends EventEmitter {
    config;
    events = [];
    privacyContext;
    isRunning = false;
    eventCounts = new Map();
    static PRIVACY_CATEGORIES = {
        strict: ['system', 'performance', 'security'],
        balanced: ['system', 'performance', 'security', 'error', 'agent', 'user', 'transaction'],
        permissive: ['system', 'performance', 'security', 'error', 'agent', 'user', 'transaction'],
    };
    static SENSITIVE_FIELDS = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
    constructor(config = {}) {
        super();
        this.config = {
            autoStart: config.autoStart ?? false,
            debug: config.debug ?? false,
            sampleRate: config.sampleRate ?? 1,
            privacyLevel: config.privacyLevel ?? 'balanced',
            maxBufferSize: config.maxBufferSize ?? 1000,
            retentionDays: config.retentionDays ?? 30,
            updateIntervalMs: config.updateIntervalMs ?? 60000,
        };
        this.privacyContext = {
            userConsent: true,
            anonymizeIp: true,
            allowedCategories: EventTracker.PRIVACY_CATEGORIES[this.config.privacyLevel],
        };
        if (this.config.autoStart) {
            this.start();
        }
    }
    start() {
        this.isRunning = true;
        this.emit('started');
    }
    stop() {
        this.isRunning = false;
        this.emit('stopped');
    }
    getIsRunning() {
        return this.isRunning;
    }
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    shouldSample() {
        return Math.random() < this.config.sampleRate;
    }
    isCategoryAllowed(category) {
        return this.privacyContext.allowedCategories.includes(category);
    }
    sanitizeMetadata(metadata) {
        const sanitized = { ...metadata };
        for (const key of Object.keys(sanitized)) {
            const lowerKey = key.toLowerCase();
            if (EventTracker.SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
                sanitized[key] = '[FILTERED]';
            }
        }
        return sanitized;
    }
    createEvent(category, action, options = {}) {
        if (!this.isCategoryAllowed(category)) {
            return null;
        }
        if (!this.shouldSample()) {
            return null;
        }
        const event = {
            id: this.generateId(),
            timestamp: Date.now(),
            category,
            action,
            metadata: this.sanitizeMetadata(options.metadata || {}),
            userId: options.userId,
            agentId: options.agentId,
            sessionId: options.sessionId,
            severity: options.severity,
            value: options.value,
        };
        // Update event counts
        const key = `${category}:${action}`;
        this.eventCounts.set(key, (this.eventCounts.get(key) || 0) + 1);
        this.events.push(event);
        // Enforce buffer size limit
        if (this.events.length > this.config.maxBufferSize) {
            this.events = this.events.slice(-this.config.maxBufferSize);
        }
        return event;
    }
    trackEvent(category, action, options) {
        return this.createEvent(category, action, options);
    }
    trackPageView(path, options) {
        return this.createEvent('user', 'page_view', {
            ...options,
            metadata: { ...options?.metadata, path, title: options?.title },
        });
    }
    trackInteraction(type, element, options) {
        return this.createEvent('user', `interaction_${type}`, {
            ...options,
            metadata: { ...options?.metadata, element, value: options?.value },
        });
    }
    trackAgentEvent(agentId, action, options) {
        return this.createEvent('agent', action, { ...options, agentId });
    }
    trackTransaction(type, value, currency, options) {
        return this.createEvent('transaction', type, {
            ...options,
            value,
            metadata: { ...options?.metadata, value, currency },
        });
    }
    trackError(error, category = 'error', options) {
        return this.createEvent(category, 'error', {
            ...options,
            severity: 'error',
            metadata: {
                ...options?.metadata,
                errorMessage: error.message,
                errorName: error.name,
                errorStack: error.stack,
            },
        });
    }
    getRecentEvents(limit, category) {
        let events = [...this.events];
        if (category) {
            events = events.filter(e => e.category === category);
        }
        return events.slice(-limit);
    }
    getEventCounts() {
        return new Map(this.eventCounts);
    }
    flush() {
        const flushed = [...this.events];
        this.events = [];
        this.emit('flush', flushed);
        return flushed;
    }
    getPrivacyContext() {
        return { ...this.privacyContext };
    }
    updatePrivacyContext(context) {
        this.privacyContext = { ...this.privacyContext, ...context };
    }
}
// ============================================================================
// MetricsCollector Class
// ============================================================================
export class MetricsCollector extends EventEmitter {
    config;
    // Store by unique key (name + sorted labels)
    metrics = new Map();
    timeSeries = new Map();
    constructor(config = {}) {
        super();
        this.config = {
            maxBufferSize: config.maxBufferSize ?? 10000,
            retentionDays: config.retentionDays ?? 30,
        };
    }
    getMetricKey(name, labels) {
        const labelStr = Object.entries(labels)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join(',');
        return labelStr ? `${name}{${labelStr}}` : name;
    }
    getOrCreateTimeSeries(name, type) {
        if (!this.timeSeries.has(name)) {
            this.timeSeries.set(name, {
                metricName: name,
                metricType: type,
                data: [],
            });
        }
        return this.timeSeries.get(name);
    }
    addTimeSeriesPoint(name, type, value, labels) {
        const ts = this.getOrCreateTimeSeries(name, type);
        ts.data.push({ timestamp: Date.now(), value, labels });
        // Enforce buffer size
        if (ts.data.length > this.config.maxBufferSize) {
            ts.data = ts.data.slice(-this.config.maxBufferSize);
        }
    }
    increment(name, value = 1, labels = {}) {
        const key = this.getMetricKey(name, labels);
        const existing = this.metrics.get(key);
        if (existing && existing.type === 'counter') {
            existing.value += value;
            existing.timestamp = Date.now();
        }
        else {
            this.metrics.set(key, {
                name,
                value,
                type: 'counter',
                labels,
                timestamp: Date.now(),
            });
        }
        this.addTimeSeriesPoint(name, 'counter', this.metrics.get(key).value, labels);
        this.emit('counterIncremented', { name, value, labels });
    }
    gauge(name, value, labels = {}, description, unit) {
        const key = this.getMetricKey(name, labels);
        this.metrics.set(key, {
            name,
            value,
            type: 'gauge',
            labels,
            timestamp: Date.now(),
            description,
            unit,
        });
        this.addTimeSeriesPoint(name, 'gauge', value, labels);
        this.emit('gaugeSet', { name, value, labels });
    }
    observe(name, value, labels = {}, buckets) {
        const key = this.getMetricKey(name, labels);
        const existing = this.metrics.get(key);
        if (existing && existing.type === 'histogram') {
            // Update histogram statistics
            const currentCount = existing.metadata?.count || 0;
            const currentSum = existing.metadata?.sum || 0;
            existing.value = value;
            existing.timestamp = Date.now();
            existing.metadata = {
                ...existing.metadata,
                count: currentCount + 1,
                sum: currentSum + value,
                buckets,
            };
        }
        else {
            this.metrics.set(key, {
                name,
                value,
                type: 'histogram',
                labels,
                timestamp: Date.now(),
                metadata: { count: 1, sum: value, buckets },
            });
        }
        this.addTimeSeriesPoint(name, 'histogram', value, labels);
    }
    recordTimer(name, duration, labels = {}) {
        const key = this.getMetricKey(name, labels);
        this.metrics.set(key, {
            name,
            value: duration,
            type: 'timer',
            labels,
            timestamp: Date.now(),
            unit: 'ms',
        });
        this.addTimeSeriesPoint(name, 'timer', duration, labels);
    }
    startTimer(name) {
        const startTime = performance.now();
        return (labels) => {
            const duration = Math.round(performance.now() - startTime);
            this.recordTimer(name, duration, labels);
            return duration;
        };
    }
    getMetrics() {
        return new Map(this.metrics);
    }
    getMetricsByName(name) {
        const result = [];
        for (const [key, metric] of this.metrics.entries()) {
            // Check if the key starts with the name followed by '{' or exact match
            if (key === name || key.startsWith(`${name}{`)) {
                result.push(metric);
            }
        }
        return result;
    }
    getTimeSeries(name) {
        return this.timeSeries.get(name);
    }
    getAllTimeSeries() {
        return new Map(this.timeSeries);
    }
    aggregate(timeWindow, metricNames) {
        const result = [];
        for (const name of metricNames) {
            const ts = this.timeSeries.get(name);
            if (!ts || ts.data.length === 0)
                continue;
            const values = ts.data.map(d => d.value);
            const sorted = [...values].sort((a, b) => a - b);
            const sum = values.reduce((a, b) => a + b, 0);
            result.push({
                metricName: name,
                avg: sum / values.length,
                min: sorted[0],
                max: sorted[sorted.length - 1],
                sum,
                count: values.length,
                p50: this.percentile(sorted, 0.5),
                p90: this.percentile(sorted, 0.9),
                p95: this.percentile(sorted, 0.95),
                p99: this.percentile(sorted, 0.99),
            });
        }
        return result;
    }
    percentile(sorted, p) {
        const index = Math.ceil(sorted.length * p) - 1;
        return sorted[Math.max(0, index)];
    }
    reset() {
        this.metrics.clear();
        this.timeSeries.clear();
    }
    pruneOldData() {
        const cutoff = Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000;
        let pruned = 0;
        for (const [name, ts] of this.timeSeries) {
            const originalLength = ts.data.length;
            ts.data = ts.data.filter(d => d.timestamp >= cutoff);
            pruned += originalLength - ts.data.length;
        }
        return pruned;
    }
}
// ============================================================================
// AnalyticsManager Class
// ============================================================================
export class AnalyticsManager extends EventEmitter {
    config;
    eventTracker;
    metricsCollector;
    sessions = new Map();
    alerts = [];
    dashboardTimer;
    isRunning = false;
    constructor(config = {}) {
        super();
        this.config = {
            autoStart: config.autoStart ?? true,
            debug: config.debug ?? false,
            sampleRate: config.sampleRate ?? 1,
            privacyLevel: config.privacyLevel ?? 'balanced',
            maxBufferSize: config.maxBufferSize ?? 1000,
            retentionDays: config.retentionDays ?? 30,
            updateIntervalMs: config.updateIntervalMs ?? 60000,
        };
        this.eventTracker = new EventTracker({
            autoStart: false,
            debug: this.config.debug,
            sampleRate: this.config.sampleRate,
            privacyLevel: this.config.privacyLevel,
            maxBufferSize: this.config.maxBufferSize,
        });
        this.metricsCollector = new MetricsCollector({
            maxBufferSize: this.config.maxBufferSize * 10,
            retentionDays: this.config.retentionDays,
        });
        // Forward events
        this.eventTracker.on('flush', (events) => this.emit('flush', events));
        if (this.config.autoStart) {
            this.start();
        }
    }
    start() {
        this.isRunning = true;
        this.eventTracker.start();
    }
    stop() {
        this.isRunning = false;
        this.eventTracker.stop();
        this.stopDashboard();
    }
    getIsRunning() {
        return this.isRunning;
    }
    getEventTracker() {
        return this.eventTracker;
    }
    getMetricsCollector() {
        return this.metricsCollector;
    }
    // Event tracking proxies
    trackEvent(category, action, options) {
        const event = this.eventTracker.trackEvent(category, action, options);
        if (event) {
            this.emit('eventTracked', event);
        }
        return event;
    }
    trackPageView(path, options) {
        const event = this.eventTracker.trackPageView(path, options);
        if (event) {
            this.emit('eventTracked', event);
        }
        return event;
    }
    trackInteraction(type, element, options) {
        const event = this.eventTracker.trackInteraction(type, element, options);
        if (event) {
            this.emit('eventTracked', event);
        }
        return event;
    }
    trackError(error, category, options) {
        const event = this.eventTracker.trackError(error, category, options);
        if (event) {
            this.emit('eventTracked', event);
        }
        return event;
    }
    // Metrics proxies
    increment(name, value, labels) {
        this.metricsCollector.increment(name, value, labels);
    }
    gauge(name, value, labels, description, unit) {
        this.metricsCollector.gauge(name, value, labels, description, unit);
    }
    observe(name, value, labels, buckets) {
        this.metricsCollector.observe(name, value, labels, buckets);
    }
    recordTimer(name, duration, labels) {
        this.metricsCollector.recordTimer(name, duration, labels);
    }
    startTimer(name) {
        return this.metricsCollector.startTimer(name);
    }
    // Session management
    startSession(sessionId, metadata) {
        this.sessions.set(sessionId, {
            id: sessionId,
            userId: metadata?.userId,
            startTime: Date.now(),
            lastActivity: Date.now(),
            metadata,
        });
    }
    endSession(sessionId) {
        this.sessions.delete(sessionId);
    }
    touchSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.lastActivity = Date.now();
        }
    }
    getActiveSessionCount() {
        return this.sessions.size;
    }
    // Alerts
    createAlert(severity, message, metricName, threshold, currentValue) {
        const alert = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            severity,
            message,
            metricName,
            threshold,
            currentValue,
            timestamp: Date.now(),
            acknowledged: false,
        };
        this.alerts.push(alert);
        this.emit('alert', alert);
        return alert;
    }
    getAlerts(includeAcknowledged = true) {
        if (includeAcknowledged) {
            return [...this.alerts];
        }
        return this.alerts.filter(a => !a.acknowledged);
    }
    acknowledgeAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            return true;
        }
        return false;
    }
    // Performance tracking
    trackAgentPerformance(metrics) {
        this.metricsCollector.gauge(`agent_${metrics.agentId}_success_rate`, metrics.successRate);
        this.metricsCollector.gauge(`agent_${metrics.agentId}_response_time`, metrics.responseTime);
        this.metricsCollector.recordTimer(`agent_${metrics.agentId}_task_duration`, metrics.averageTaskDuration);
    }
    trackUserEngagement(metrics) {
        this.metricsCollector.gauge(`user_${metrics.userId}_interactions`, metrics.interactions);
        this.metricsCollector.recordTimer(`user_${metrics.userId}_session_duration`, metrics.sessionDuration);
    }
    trackRevenue(metrics) {
        this.gauge('revenue_total', metrics.totalRevenue, { currency: metrics.currency });
        this.gauge('revenue_transaction_count', metrics.transactionCount);
        this.gauge('revenue_average_value', metrics.averageTransactionValue, { currency: metrics.currency });
        for (const [category, value] of metrics.byCategory) {
            this.gauge(`revenue_category_${category}`, value);
        }
    }
    trackSystemHealth(metrics) {
        this.gauge('system_cpu_usage', metrics.cpuUsage);
        this.gauge('system_memory_usage', metrics.memoryUsage);
        this.gauge('system_disk_usage', metrics.diskUsage);
        this.gauge('system_network_latency', metrics.networkLatency);
        this.gauge('system_error_rate', metrics.errorRate);
        this.gauge('system_uptime', metrics.uptime);
    }
    // Dashboard
    generateDashboardSnapshot() {
        return {
            timestamp: Date.now(),
            kpis: {
                activeSessions: this.sessions.size,
                totalEvents: this.eventTracker.getRecentEvents(1000).length,
                unacknowledgedAlerts: this.alerts.filter(a => !a.acknowledged).length,
            },
            recentEvents: this.eventTracker.getRecentEvents(50),
            activeSessions: this.sessions.size,
            alerts: [...this.alerts],
            metrics: this.metricsCollector.getAllTimeSeries(),
        };
    }
    startDashboard(options) {
        const interval = options?.updateIntervalMs ?? this.config.updateIntervalMs;
        this.stopDashboard();
        this.dashboardTimer = setInterval(() => {
            const snapshot = this.generateDashboardSnapshot();
            this.emit('dashboardUpdate', snapshot);
        }, interval);
    }
    stopDashboard() {
        if (this.dashboardTimer) {
            clearInterval(this.dashboardTimer);
            this.dashboardTimer = undefined;
        }
    }
    // Export
    export(options) {
        const events = this.getFilteredEvents(options);
        const metrics = Array.from(this.metricsCollector.getMetrics().values());
        if (options.format === 'csv') {
            return this.exportToCsv(events);
        }
        return JSON.stringify({
            events,
            metrics,
            exportedAt: Date.now(),
        });
    }
    getFilteredEvents(options) {
        let events = this.eventTracker.getRecentEvents(10000);
        if (options.startTime) {
            events = events.filter(e => e.timestamp >= options.startTime);
        }
        if (options.endTime) {
            events = events.filter(e => e.timestamp <= options.endTime);
        }
        if (options.categories) {
            events = events.filter(e => options.categories.includes(e.category));
        }
        return events;
    }
    exportToCsv(events) {
        const headers = ['timestamp', 'category', 'action', 'id'];
        const rows = events.map(e => `${e.timestamp},${e.category},${e.action},${e.id}`);
        return [headers.join(','), ...rows].join('\n');
    }
    getConfig() {
        return { ...this.config };
    }
}
// ============================================================================
// Factory Functions
// ============================================================================
const managers = new Map();
export function getOrCreateAnalyticsManager(agentId, config) {
    if (!managers.has(agentId)) {
        managers.set(agentId, new AnalyticsManager(config));
    }
    return managers.get(agentId);
}
export function getAnalyticsManager(agentId) {
    return managers.get(agentId);
}
export function removeAnalyticsManager(agentId) {
    const manager = managers.get(agentId);
    if (manager) {
        manager.stop();
        managers.delete(agentId);
        return true;
    }
    return false;
}
export function createPerformanceMonitor(operationName, analytics) {
    let endFn = null;
    return {
        start: () => {
            endFn = analytics.startTimer(operationName);
        },
        end: () => {
            if (endFn) {
                return endFn();
            }
            return 0;
        },
    };
}
//# sourceMappingURL=analytics.js.map