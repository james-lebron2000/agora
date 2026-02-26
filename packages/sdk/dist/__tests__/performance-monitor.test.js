import { PerformanceTracker, MemoryMonitor, MetricCollector, createPerformanceTracker, createMemoryMonitor, createMetricCollector, } from './performance-monitor';
describe('PerformanceTracker', () => {
    let tracker;
    beforeEach(() => {
        tracker = new PerformanceTracker();
    });
    afterEach(() => {
        tracker.clear();
    });
    test('should track basic timing', () => {
        tracker.start('test-op');
        expect(tracker.isRunning('test-op')).toBe(true);
        const metrics = tracker.end('test-op');
        expect(metrics).toBeDefined();
        expect(metrics.name).toBe('test-op');
        expect(metrics.duration).toBeGreaterThanOrEqual(0);
        expect(tracker.isRunning('test-op')).toBe(false);
    });
    test('should track multiple operations', () => {
        tracker.start('op1');
        tracker.start('op2');
        expect(tracker.getRunning()).toHaveLength(2);
        expect(tracker.getRunning()).toContain('op1');
        expect(tracker.getRunning()).toContain('op2');
        tracker.end('op1');
        tracker.end('op2');
        expect(tracker.getRunning()).toHaveLength(0);
    });
    test('should maintain history', () => {
        tracker.start('test');
        tracker.end('test');
        const history = tracker.getHistory();
        expect(history).toHaveLength(1);
        expect(history[0].name).toBe('test');
    });
    test('should calculate statistics', () => {
        // Run multiple times
        for (let i = 0; i < 5; i++) {
            tracker.start('repeated');
            tracker.end('repeated');
        }
        const stats = tracker.getStats('repeated');
        expect(stats).toBeDefined();
        expect(stats.count).toBe(5);
        expect(stats.min).toBeGreaterThanOrEqual(0);
        expect(stats.max).toBeGreaterThanOrEqual(stats.min);
        expect(stats.avg).toBeGreaterThanOrEqual(stats.min);
        expect(stats.avg).toBeLessThanOrEqual(stats.max);
    });
    test('should return undefined for non-existent timer', () => {
        const metrics = tracker.end('non-existent');
        expect(metrics).toBeUndefined();
    });
    test('should clear all state', () => {
        tracker.start('test');
        tracker.end('test');
        tracker.clear();
        expect(tracker.getHistory()).toHaveLength(0);
        expect(tracker.getRunning()).toHaveLength(0);
    });
    test('factory function should create tracker', () => {
        const t = createPerformanceTracker({ maxHistory: 50 });
        expect(t).toBeInstanceOf(PerformanceTracker);
    });
});
describe('MemoryMonitor', () => {
    let monitor;
    beforeEach(() => {
        monitor = new MemoryMonitor();
    });
    afterEach(() => {
        monitor.stopMonitoring();
        monitor.clear();
    });
    test('should check memory usage', () => {
        const mem = monitor.check();
        expect(mem).toBeDefined();
        expect(typeof mem.used).toBe('number');
        expect(typeof mem.total).toBe('number');
        expect(mem.used).toBeGreaterThanOrEqual(0);
        expect(mem.total).toBeGreaterThanOrEqual(mem.used);
    });
    test('should store snapshots', () => {
        monitor.check();
        monitor.check();
        const snapshots = monitor.getSnapshots();
        expect(snapshots.length).toBe(2);
    });
    test('should start and stop monitoring', (done) => {
        monitor.startMonitoring(100);
        setTimeout(() => {
            monitor.stopMonitoring();
            const snapshots = monitor.getSnapshots();
            expect(snapshots.length).toBeGreaterThan(0);
            done();
        }, 250);
    });
    test('should calculate trend', () => {
        // Need at least 2 snapshots for trend
        monitor.check();
        // Create some memory pressure
        const arr = [];
        for (let i = 0; i < 10000; i++) {
            arr.push(i);
        }
        monitor.check();
        monitor.check();
        const trend = monitor.getTrend();
        expect(trend).toBeDefined();
        expect(typeof trend.increasing).toBe('boolean');
        expect(typeof trend.delta).toBe('number');
        expect(typeof trend.avgGrowth).toBe('number');
    });
    test('should find peak usage', () => {
        monitor.check();
        monitor.check();
        const peak = monitor.getPeak();
        expect(peak).toBeDefined();
        expect(typeof peak.used).toBe('number');
        expect(typeof peak.timestamp).toBe('number');
    });
    test('should clear snapshots', () => {
        monitor.check();
        monitor.check();
        monitor.clear();
        expect(monitor.getSnapshots()).toHaveLength(0);
    });
    test('factory function should create monitor', () => {
        const m = createMemoryMonitor({ maxSnapshots: 20 });
        expect(m).toBeInstanceOf(MemoryMonitor);
    });
});
describe('MetricCollector', () => {
    let collector;
    beforeEach(() => {
        collector = new MetricCollector();
    });
    afterEach(() => {
        collector.clear();
    });
    test('should record metrics', () => {
        collector.record('api-call', 100);
        collector.record('api-call', 150);
        collector.record('api-call', 200);
        const records = collector.getRecords('api-call');
        expect(records).toHaveLength(3);
        expect(records[0].value).toBe(100);
        expect(records[1].value).toBe(150);
        expect(records[2].value).toBe(200);
    });
    test('should calculate statistics', () => {
        collector.record('test', 10);
        collector.record('test', 20);
        collector.record('test', 30);
        const stats = collector.getStats('test');
        expect(stats).toBeDefined();
        expect(stats.count).toBe(3);
        expect(stats.min).toBe(10);
        expect(stats.max).toBe(30);
        expect(stats.avg).toBe(20);
        expect(stats.total).toBe(60);
    });
    test('should generate report', () => {
        collector.record('metric1', 100);
        collector.record('metric2', 200);
        const report = collector.getReport();
        expect(Object.keys(report)).toHaveLength(2);
        expect(report['metric1']).toBeDefined();
        expect(report['metric2']).toBeDefined();
        expect(report['metric1'].count).toBe(1);
        expect(report['metric2'].count).toBe(1);
    });
    test('should record multiple metrics', () => {
        collector.recordMany([
            { name: 'a', value: 1 },
            { name: 'b', value: 2 },
            { name: 'a', value: 3 },
        ]);
        expect(collector.getRecords('a')).toHaveLength(2);
        expect(collector.getRecords('b')).toHaveLength(1);
    });
    test('should get recent records by time window', (done) => {
        collector.record('test', 100);
        setTimeout(() => {
            collector.record('test', 200);
            const recent = collector.getRecent('test', 100);
            expect(recent).toHaveLength(1);
            expect(recent[0].value).toBe(200);
            done();
        }, 150);
    });
    test('should get metric names', () => {
        collector.record('a', 1);
        collector.record('b', 2);
        const names = collector.getMetricNames();
        expect(names).toContain('a');
        expect(names).toContain('b');
    });
    test('should clear specific metric', () => {
        collector.record('keep', 1);
        collector.record('remove', 2);
        collector.clear('remove');
        expect(collector.getRecords('keep')).toHaveLength(1);
        expect(collector.getRecords('remove')).toHaveLength(0);
    });
    test('should time synchronous function', () => {
        const result = collector.time('sync-op', () => {
            let sum = 0;
            for (let i = 0; i < 1000; i++) {
                sum += i;
            }
            return sum;
        });
        expect(result).toBe(499500);
        const records = collector.getRecords('sync-op-duration');
        expect(records.length).toBeGreaterThan(0);
    });
    test('should time async function', async () => {
        const result = await collector.timeAsync('async-op', async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            return 'done';
        });
        expect(result).toBe('done');
        const records = collector.getRecords('async-op-duration');
        expect(records.length).toBeGreaterThan(0);
        expect(records[0].value).toBeGreaterThanOrEqual(50);
    });
    test('should track function errors', () => {
        expect(() => {
            collector.time('failing-op', () => {
                throw new Error('test error');
            });
        }).toThrow('test error');
        const errorRecords = collector.getRecords('failing-op-error');
        expect(errorRecords.length).toBeGreaterThan(0);
        expect(errorRecords[0].value).toBe(1);
    });
    test('should export to JSON', () => {
        collector.record('test', 123);
        const json = collector.export();
        const parsed = JSON.parse(json);
        expect(parsed.test).toBeDefined();
        expect(parsed.test.count).toBe(1);
    });
    test('factory function should create collector', () => {
        const c = createMetricCollector({ maxRecords: 500 });
        expect(c).toBeInstanceOf(MetricCollector);
    });
});
describe('Integration', () => {
    test('should work together', () => {
        const tracker = createPerformanceTracker();
        const monitor = createMemoryMonitor();
        const collector = createMetricCollector();
        // Track an operation
        tracker.start('complex-op');
        monitor.check();
        // Simulate some work
        const arr = [];
        for (let i = 0; i < 1000; i++) {
            arr.push(i);
        }
        const mem = monitor.check();
        const metrics = tracker.end('complex-op');
        if (metrics) {
            collector.record('operation-time', metrics.duration || 0);
        }
        // Verify results
        expect(tracker.getHistory()).toHaveLength(1);
        expect(monitor.getSnapshots().length).toBeGreaterThanOrEqual(1);
        expect(collector.getStats('operation-time')).toBeDefined();
    });
});
//# sourceMappingURL=performance-monitor.test.js.map