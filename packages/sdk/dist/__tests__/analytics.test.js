/**
 * Analytics Module Tests
 * Comprehensive test suite for AnalyticsManager, EventTracker, and MetricsCollector
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AnalyticsManager, EventTracker, MetricsCollector, getOrCreateAnalyticsManager, getAnalyticsManager, removeAnalyticsManager, createPerformanceMonitor, } from '../analytics.js';
describe('Analytics Module', () => {
    console.log('[Unit Tests] Analytics module test suite loaded');
    describe('EventTracker', () => {
        let tracker;
        beforeEach(() => {
            tracker = new EventTracker({ autoStart: false, debug: false });
        });
        afterEach(() => {
            tracker.stop();
        });
        describe('initialization', () => {
            it('should create a new tracker with default config', () => {
                expect(tracker).toBeDefined();
                expect(tracker.getIsRunning()).toBe(false);
            });
            it('should create tracker with custom config', () => {
                const customTracker = new EventTracker({
                    sampleRate: 0.5,
                    privacyLevel: 'strict',
                    autoStart: false,
                });
                expect(customTracker.getPrivacyContext().allowedCategories).toEqual([
                    'system', 'performance', 'security'
                ]);
                customTracker.stop();
            });
            it('should auto-start when configured', () => {
                const autoTracker = new EventTracker({ autoStart: true });
                expect(autoTracker.getIsRunning()).toBe(true);
                autoTracker.stop();
            });
        });
        describe('event tracking', () => {
            it('should track a basic event', () => {
                const event = tracker.trackEvent('user', 'login', { userId: '123' });
                expect(event).toBeDefined();
                expect(event?.category).toBe('user');
                expect(event?.action).toBe('login');
            });
            it('should track event with metadata', () => {
                const event = tracker.trackEvent('agent', 'task_completed', {
                    metadata: { taskId: 'abc', duration: 5000 },
                    agentId: 'agent-001',
                });
                expect(event?.metadata.taskId).toBe('abc');
                expect(event?.metadata.duration).toBe(5000);
                expect(event?.agentId).toBe('agent-001');
            });
            it('should track page view', () => {
                const event = tracker.trackPageView('/dashboard', {
                    userId: 'user-001',
                    title: 'Dashboard',
                });
                expect(event?.action).toBe('page_view');
                expect(event?.metadata.path).toBe('/dashboard');
            });
            it('should track interaction', () => {
                const event = tracker.trackInteraction('click', 'submit-button', {
                    userId: 'user-001',
                    value: 1,
                });
                expect(event?.action).toBe('interaction_click');
                expect(event?.metadata.element).toBe('submit-button');
            });
            it('should track agent event', () => {
                const event = tracker.trackAgentEvent('agent-001', 'started', {
                    metadata: { version: '1.0.0' },
                });
                expect(event?.category).toBe('agent');
                expect(event?.action).toBe('started');
                expect(event?.agentId).toBe('agent-001');
            });
            it('should track transaction', () => {
                const event = tracker.trackTransaction('purchase', 100, 'USD', {
                    userId: 'user-001',
                });
                expect(event?.category).toBe('transaction');
                expect(event?.metadata.value).toBe(100);
                expect(event?.metadata.currency).toBe('USD');
            });
            it('should track error', () => {
                const error = new Error('Test error');
                const event = tracker.trackError(error, 'system', { userId: 'user-001' });
                expect(event?.severity).toBe('error');
                expect(event?.metadata.errorMessage).toBe('Test error');
                expect(event?.metadata.errorName).toBe('Error');
            });
            it('should respect privacy settings', () => {
                const strictTracker = new EventTracker({
                    privacyLevel: 'strict',
                    autoStart: false,
                });
                const event = strictTracker.trackEvent('user', 'login', { userId: '123' });
                // User events should be blocked in strict mode
                expect(event).toBeNull();
                strictTracker.stop();
            });
            it('should apply sampling', () => {
                const sampledTracker = new EventTracker({
                    sampleRate: 0,
                    autoStart: false,
                });
                const event = sampledTracker.trackEvent('system', 'heartbeat');
                expect(event).toBeNull();
                sampledTracker.stop();
            });
            it('should sanitize sensitive metadata', () => {
                const event = tracker.trackEvent('user', 'login', {
                    metadata: { password: 'secret123', token: 'abc', normalField: 'value' },
                });
                expect(event?.metadata.password).toBe('[FILTERED]');
                expect(event?.metadata.token).toBe('[FILTERED]');
                expect(event?.metadata.normalField).toBe('value');
            });
        });
        describe('event retrieval', () => {
            it('should get recent events', () => {
                tracker.trackEvent('system', 'event1');
                tracker.trackEvent('system', 'event2');
                tracker.trackEvent('user', 'event3');
                const events = tracker.getRecentEvents(2);
                expect(events.length).toBe(2);
            });
            it('should filter events by category', () => {
                tracker.trackEvent('system', 'event1');
                tracker.trackEvent('user', 'event2');
                tracker.trackEvent('system', 'event3');
                const systemEvents = tracker.getRecentEvents(10, 'system');
                expect(systemEvents.length).toBe(2);
                expect(systemEvents.every(e => e.category === 'system')).toBe(true);
            });
            it('should get event counts', () => {
                tracker.trackEvent('system', 'heartbeat');
                tracker.trackEvent('system', 'heartbeat');
                tracker.trackEvent('user', 'login');
                const counts = tracker.getEventCounts();
                expect(counts.get('system:heartbeat')).toBe(2);
                expect(counts.get('user:login')).toBe(1);
            });
        });
        describe('flush operations', () => {
            it('should flush events', () => {
                tracker.trackEvent('system', 'event1');
                tracker.trackEvent('system', 'event2');
                const flushed = tracker.flush();
                expect(flushed.length).toBe(2);
                expect(tracker.getRecentEvents(10).length).toBe(0);
            });
            it('should emit flush event', () => {
                const flushHandler = vi.fn();
                tracker.on('flush', flushHandler);
                tracker.trackEvent('system', 'event1');
                tracker.flush();
                expect(flushHandler).toHaveBeenCalled();
            });
            it('should return empty array when no events', () => {
                const flushed = tracker.flush();
                expect(flushed).toEqual([]);
            });
        });
        describe('privacy context', () => {
            it('should get privacy context', () => {
                const context = tracker.getPrivacyContext();
                expect(context.userConsent).toBe(true);
                expect(context.anonymizeIp).toBe(true);
            });
            it('should update privacy context', () => {
                tracker.updatePrivacyContext({ userConsent: false });
                const context = tracker.getPrivacyContext();
                expect(context.userConsent).toBe(false);
            });
        });
        describe('lifecycle', () => {
            it('should start and stop', () => {
                tracker.start();
                expect(tracker.getIsRunning()).toBe(true);
                tracker.stop();
                expect(tracker.getIsRunning()).toBe(false);
            });
            it('should emit started event', () => {
                const handler = vi.fn();
                tracker.on('started', handler);
                tracker.start();
                expect(handler).toHaveBeenCalled();
            });
            it('should emit stopped event', () => {
                const handler = vi.fn();
                tracker.on('stopped', handler);
                tracker.start();
                tracker.stop();
                expect(handler).toHaveBeenCalled();
            });
        });
    });
    describe('MetricsCollector', () => {
        let collector;
        beforeEach(() => {
            collector = new MetricsCollector({ maxBufferSize: 1000 });
        });
        describe('counters', () => {
            it('should increment counter', () => {
                collector.increment('requests_total', 1, { method: 'GET' });
                collector.increment('requests_total', 1, { method: 'GET' });
                const metrics = collector.getMetricsByName('requests_total');
                expect(metrics.length).toBe(1);
                expect(metrics[0].value).toBe(2);
            });
            it('should create counter with labels', () => {
                collector.increment('requests_total', 1, { method: 'GET', status: '200' });
                const metrics = collector.getMetrics();
                expect(metrics.size).toBe(1);
            });
            it('should handle multiple counter labels', () => {
                collector.increment('requests', 1, { method: 'GET' });
                collector.increment('requests', 1, { method: 'POST' });
                const metrics = collector.getMetricsByName('requests');
                expect(metrics.length).toBe(2);
            });
        });
        describe('gauges', () => {
            it('should set gauge value', () => {
                collector.gauge('active_connections', 42);
                const metrics = collector.getMetricsByName('active_connections');
                expect(metrics[0].value).toBe(42);
                expect(metrics[0].type).toBe('gauge');
            });
            it('should update gauge value', () => {
                collector.gauge('temperature', 25);
                collector.gauge('temperature', 30);
                const metrics = collector.getMetricsByName('temperature');
                expect(metrics[0].value).toBe(30);
            });
            it('should include unit in gauge', () => {
                collector.gauge('memory_usage', 1024, {}, 'Memory usage', 'bytes');
                const metrics = collector.getMetricsByName('memory_usage');
                expect(metrics[0].unit).toBe('bytes');
            });
        });
        describe('histograms', () => {
            it('should observe histogram values', () => {
                collector.observe('response_time', 100);
                collector.observe('response_time', 200);
                collector.observe('response_time', 150);
                const metrics = collector.getMetricsByName('response_time');
                expect(metrics.length).toBe(1);
            });
            it('should update histogram statistics', () => {
                collector.observe('latency', 100);
                collector.observe('latency', 200);
                const ts = collector.getTimeSeries('latency');
                expect(ts?.data.length).toBe(2);
            });
            it('should use custom buckets', () => {
                collector.observe('custom_metric', 50, {}, [10, 50, 100, 500]);
                const metrics = collector.getMetricsByName('custom_metric');
                expect(metrics.length).toBe(1);
            });
        });
        describe('timers', () => {
            it('should record timer value', () => {
                collector.recordTimer('query_time', 150, { table: 'users' });
                const metrics = collector.getMetricsByName('query_time');
                expect(metrics[0].value).toBe(150);
                expect(metrics[0].unit).toBe('ms');
            });
            it('should start and stop timer', () => {
                const end = collector.startTimer('operation');
                const duration = end();
                expect(duration).toBeGreaterThanOrEqual(0);
                const metrics = collector.getMetricsByName('operation');
                expect(metrics.length).toBe(1);
            });
            it('should record timer with labels', () => {
                const end = collector.startTimer('db_query');
                end({ table: 'users', operation: 'select' });
                const metrics = collector.getMetricsByName('db_query');
                expect(metrics.length).toBe(1);
            });
        });
        describe('time-series data', () => {
            it('should store time-series data', () => {
                collector.increment('test_counter', 1);
                collector.increment('test_counter', 2);
                const ts = collector.getTimeSeries('test_counter');
                expect(ts).toBeDefined();
                expect(ts?.data.length).toBe(2);
                expect(ts?.metricType).toBe('counter');
            });
            it('should get all time-series', () => {
                collector.increment('metric1', 1);
                collector.gauge('metric2', 100);
                const allTs = collector.getAllTimeSeries();
                expect(allTs.size).toBe(2);
            });
            it('should respect retention limits', () => {
                const smallCollector = new MetricsCollector({
                    maxBufferSize: 5,
                    retentionDays: 1,
                });
                for (let i = 0; i < 10; i++) {
                    smallCollector.increment('test', i);
                }
                const ts = smallCollector.getTimeSeries('test');
                expect(ts?.data.length).toBeLessThanOrEqual(5);
            });
        });
        describe('aggregation', () => {
            it('should aggregate metrics', () => {
                collector.observe('latency', 100);
                collector.observe('latency', 200);
                collector.observe('latency', 300);
                const aggregated = collector.aggregate('1h', ['latency']);
                expect(aggregated.length).toBe(1);
                expect(aggregated[0].avg).toBe(200);
                expect(aggregated[0].min).toBe(100);
                expect(aggregated[0].max).toBe(300);
            });
            it('should calculate percentiles', () => {
                for (let i = 1; i <= 100; i++) {
                    collector.observe('values', i);
                }
                const aggregated = collector.aggregate('1h', ['values']);
                expect(aggregated[0].p50).toBeDefined();
                expect(aggregated[0].p90).toBeDefined();
                expect(aggregated[0].p95).toBeDefined();
                expect(aggregated[0].p99).toBeDefined();
            });
        });
        describe('reset and cleanup', () => {
            it('should reset all metrics', () => {
                collector.increment('counter', 1);
                collector.gauge('gauge', 100);
                collector.reset();
                const metrics = collector.getMetrics();
                expect(metrics.size).toBe(0);
            });
            it('should prune old data', () => {
                collector.increment('test', 1);
                const pruned = collector.pruneOldData();
                expect(pruned).toBe(0);
            });
        });
        describe('events', () => {
            it('should emit counter incremented event', () => {
                const handler = vi.fn();
                collector.on('counterIncremented', handler);
                collector.increment('test', 1);
                expect(handler).toHaveBeenCalled();
            });
            it('should emit gauge set event', () => {
                const handler = vi.fn();
                collector.on('gaugeSet', handler);
                collector.gauge('test', 100);
                expect(handler).toHaveBeenCalled();
            });
        });
    });
    describe('AnalyticsManager', () => {
        let analytics;
        beforeEach(() => {
            analytics = new AnalyticsManager({ autoStart: false });
        });
        afterEach(() => {
            analytics.stop();
        });
        describe('initialization', () => {
            it('should create manager with default config', () => {
                expect(analytics).toBeDefined();
                expect(analytics.getIsRunning()).toBe(false);
            });
            it('should start and stop', () => {
                analytics.start();
                expect(analytics.getIsRunning()).toBe(true);
                analytics.stop();
                expect(analytics.getIsRunning()).toBe(false);
            });
            it('should get event tracker', () => {
                const tracker = analytics.getEventTracker();
                expect(tracker).toBeDefined();
            });
            it('should get metrics collector', () => {
                const collector = analytics.getMetricsCollector();
                expect(collector).toBeDefined();
            });
        });
        describe('event tracking integration', () => {
            it('should track events through manager', () => {
                const event = analytics.trackEvent('user', 'login', { userId: '123' });
                expect(event).toBeDefined();
            });
            it('should track page views', () => {
                const event = analytics.trackPageView('/home', { title: 'Home' });
                expect(event?.action).toBe('page_view');
            });
            it('should track interactions', () => {
                const event = analytics.trackInteraction('click', 'button');
                expect(event?.action).toBe('interaction_click');
            });
            it('should track errors', () => {
                const error = new Error('Test');
                const event = analytics.trackError(error);
                expect(event?.severity).toBe('error');
            });
            it('should emit event tracked', () => {
                const handler = vi.fn();
                analytics.on('eventTracked', handler);
                analytics.trackEvent('system', 'test');
                expect(handler).toHaveBeenCalled();
            });
        });
        describe('metrics integration', () => {
            it('should increment counter', () => {
                analytics.increment('requests', 1, { endpoint: '/api' });
                const collector = analytics.getMetricsCollector();
                const metrics = collector.getMetricsByName('requests');
                expect(metrics.length).toBe(1);
            });
            it('should set gauge', () => {
                analytics.gauge('active_users', 150);
                const collector = analytics.getMetricsCollector();
                const metrics = collector.getMetricsByName('active_users');
                expect(metrics[0].value).toBe(150);
            });
            it('should observe histogram', () => {
                analytics.observe('latency', 100);
                const collector = analytics.getMetricsCollector();
                const ts = collector.getTimeSeries('latency');
                expect(ts?.data.length).toBe(1);
            });
            it('should record timer', () => {
                analytics.recordTimer('operation', 150);
                const collector = analytics.getMetricsCollector();
                const metrics = collector.getMetricsByName('operation');
                expect(metrics[0].value).toBe(150);
            });
            it('should use timer function', () => {
                const end = analytics.startTimer('test');
                const duration = end();
                expect(duration).toBeGreaterThanOrEqual(0);
            });
        });
        describe('session management', () => {
            it('should start and end session', () => {
                analytics.startSession('session-001', { userId: '123' });
                expect(analytics.getActiveSessionCount()).toBe(1);
                analytics.endSession('session-001');
                expect(analytics.getActiveSessionCount()).toBe(0);
            });
            it('should touch session', () => {
                analytics.startSession('session-001');
                analytics.touchSession('session-001');
                expect(analytics.getActiveSessionCount()).toBe(1);
            });
            it('should handle unknown session', () => {
                analytics.endSession('unknown-session');
                expect(analytics.getActiveSessionCount()).toBe(0);
            });
        });
        describe('alerts', () => {
            it('should create alert', () => {
                const alert = analytics.createAlert('error', 'Test alert', 'metric1', 100, 150);
                expect(alert.message).toBe('Test alert');
                expect(alert.severity).toBe('error');
                expect(alert.threshold).toBe(100);
                expect(alert.currentValue).toBe(150);
            });
            it('should get alerts', () => {
                analytics.createAlert('error', 'Alert 1');
                analytics.createAlert('warning', 'Alert 2');
                const alerts = analytics.getAlerts();
                expect(alerts.length).toBe(2);
            });
            it('should acknowledge alert', () => {
                const alert = analytics.createAlert('error', 'Test');
                const result = analytics.acknowledgeAlert(alert.id);
                expect(result).toBe(true);
                const alerts = analytics.getAlerts(false);
                expect(alerts.length).toBe(0);
            });
            it('should emit alert event', () => {
                const handler = vi.fn();
                analytics.on('alert', handler);
                analytics.createAlert('error', 'Test');
                expect(handler).toHaveBeenCalled();
            });
        });
        describe('agent performance tracking', () => {
            it('should track agent performance', () => {
                analytics.trackAgentPerformance({
                    agentId: 'agent-001',
                    timestamp: Date.now(),
                    tasksCompleted: 10,
                    tasksFailed: 1,
                    averageTaskDuration: 5000,
                    successRate: 0.9,
                    responseTime: 100,
                    throughput: 10,
                });
                const collector = analytics.getMetricsCollector();
                const metrics = collector.getMetricsByName('agent_agent-001_success_rate');
                expect(metrics.length).toBe(1);
            });
        });
        describe('user engagement tracking', () => {
            it('should track user engagement', () => {
                analytics.trackUserEngagement({
                    userId: 'user-001',
                    timestamp: Date.now(),
                    sessionDuration: 300000,
                    interactions: 15,
                    featuresUsed: ['search', 'chat'],
                });
                const collector = analytics.getMetricsCollector();
                const metrics = collector.getMetricsByName('user_user-001_interactions');
                expect(metrics.length).toBe(1);
            });
        });
        describe('revenue tracking', () => {
            it('should track revenue', () => {
                analytics.trackRevenue({
                    timestamp: Date.now(),
                    totalRevenue: 1000,
                    transactionCount: 10,
                    averageTransactionValue: 100,
                    currency: 'USD',
                    byCategory: new Map([['subscriptions', 800]]),
                });
                const collector = analytics.getMetricsCollector();
                const metrics = collector.getMetricsByName('revenue_total');
                expect(metrics.length).toBe(1);
            });
        });
        describe('system health tracking', () => {
            it('should track system health', () => {
                analytics.trackSystemHealth({
                    timestamp: Date.now(),
                    cpuUsage: 45,
                    memoryUsage: 60,
                    diskUsage: 70,
                    networkLatency: 50,
                    errorRate: 0.01,
                    uptime: 86400,
                });
                const collector = analytics.getMetricsCollector();
                const metrics = collector.getMetricsByName('system_cpu_usage');
                expect(metrics.length).toBe(1);
            });
        });
        describe('dashboard', () => {
            it('should generate dashboard snapshot', () => {
                analytics.trackEvent('user', 'login');
                analytics.increment('requests', 1);
                const snapshot = analytics.generateDashboardSnapshot();
                expect(snapshot.timestamp).toBeDefined();
                expect(snapshot.kpis).toBeDefined();
                expect(snapshot.recentEvents.length).toBeGreaterThan(0);
            });
            it('should start and stop dashboard', () => {
                analytics.startDashboard({ updateIntervalMs: 1000 });
                expect(analytics['dashboardTimer']).toBeDefined();
                analytics.stopDashboard();
                expect(analytics['dashboardTimer']).toBeUndefined();
            });
            it('should emit dashboard updates', () => {
                const handler = vi.fn();
                analytics.on('dashboardUpdate', handler);
                analytics.startDashboard({ updateIntervalMs: 100 });
                return new Promise((resolve) => {
                    setTimeout(() => {
                        expect(handler).toHaveBeenCalled();
                        analytics.stopDashboard();
                        resolve();
                    }, 150);
                });
            });
        });
        describe('export', () => {
            it('should export to JSON', () => {
                analytics.trackEvent('user', 'login', { userId: '123' });
                analytics.increment('requests', 1);
                const json = analytics.export({ format: 'json' });
                const data = JSON.parse(json);
                expect(data.events).toBeDefined();
                expect(data.metrics).toBeDefined();
            });
            it('should export to CSV', () => {
                analytics.trackEvent('user', 'login');
                const csv = analytics.export({ format: 'csv' });
                expect(csv).toContain('timestamp,category,action');
                expect(csv).toContain('user');
                expect(csv).toContain('login');
            });
            it('should filter by time range', () => {
                const now = Date.now();
                analytics.trackEvent('user', 'login');
                const json = analytics.export({
                    format: 'json',
                    startTime: now - 1000,
                    endTime: now + 1000,
                });
                const data = JSON.parse(json);
                expect(data.events.length).toBeGreaterThan(0);
            });
            it('should filter by category', () => {
                analytics.trackEvent('user', 'login');
                analytics.trackEvent('system', 'heartbeat');
                const json = analytics.export({
                    format: 'json',
                    categories: ['user'],
                });
                const data = JSON.parse(json);
                expect(data.events.every((e) => e.category === 'user')).toBe(true);
            });
        });
        describe('configuration', () => {
            it('should get config', () => {
                const config = analytics.getConfig();
                expect(config.sampleRate).toBeDefined();
                expect(config.privacyLevel).toBeDefined();
            });
        });
    });
    describe('Factory Functions', () => {
        beforeEach(() => {
            // Clean up any existing instances
            removeAnalyticsManager('test-agent');
        });
        afterEach(() => {
            removeAnalyticsManager('test-agent');
        });
        it('should create and get manager', () => {
            const manager = getOrCreateAnalyticsManager('test-agent');
            expect(manager).toBeDefined();
            const sameManager = getAnalyticsManager('test-agent');
            expect(sameManager).toBe(manager);
        });
        it('should return same instance for same agent', () => {
            const manager1 = getOrCreateAnalyticsManager('test-agent');
            const manager2 = getOrCreateAnalyticsManager('test-agent');
            expect(manager1).toBe(manager2);
        });
        it('should remove manager', () => {
            getOrCreateAnalyticsManager('test-agent');
            const removed = removeAnalyticsManager('test-agent');
            expect(removed).toBe(true);
            const manager = getAnalyticsManager('test-agent');
            expect(manager).toBeUndefined();
        });
        it('should return false when removing non-existent manager', () => {
            const removed = removeAnalyticsManager('non-existent');
            expect(removed).toBe(false);
        });
    });
    describe('Performance Monitor', () => {
        it('should create performance monitor', () => {
            const analytics = new AnalyticsManager({ autoStart: false });
            const monitor = createPerformanceMonitor('test_op', analytics);
            expect(monitor.start).toBeDefined();
            expect(monitor.end).toBeDefined();
            analytics.stop();
        });
        it('should measure performance', () => {
            const analytics = new AnalyticsManager({ autoStart: false });
            const monitor = createPerformanceMonitor('test_op', analytics);
            monitor.start();
            const duration = monitor.end();
            expect(duration).toBeGreaterThanOrEqual(0);
            const collector = analytics.getMetricsCollector();
            const metrics = collector.getMetricsByName('test_op');
            expect(metrics.length).toBe(1);
            analytics.stop();
        });
    });
    describe('Edge Cases', () => {
        it('should handle rapid event tracking', () => {
            const tracker = new EventTracker({ autoStart: false });
            for (let i = 0; i < 100; i++) {
                tracker.trackEvent('system', `event_${i}`);
            }
            const events = tracker.getRecentEvents(50);
            expect(events.length).toBe(50);
            tracker.stop();
        });
        it('should handle empty flush', () => {
            const tracker = new EventTracker({ autoStart: false });
            const flushed = tracker.flush();
            expect(flushed).toEqual([]);
            tracker.stop();
        });
        it('should handle invalid session operations', () => {
            const analytics = new AnalyticsManager({ autoStart: false });
            // Should not throw
            analytics.touchSession('non-existent');
            analytics.endSession('non-existent');
            analytics.stop();
        });
        it('should handle concurrent metric updates', () => {
            const collector = new MetricsCollector();
            collector.increment('counter', 1);
            collector.increment('counter', 2);
            collector.gauge('gauge', 100);
            collector.gauge('gauge', 200);
            const metrics = collector.getMetrics();
            expect(metrics.size).toBe(2);
        });
    });
});
//# sourceMappingURL=analytics.test.js.map