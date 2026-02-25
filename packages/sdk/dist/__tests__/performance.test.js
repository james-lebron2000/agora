/**
 * Performance Module Unit Tests
 * Tests for PerformanceMonitor, benchmarking utilities, and optimization features
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PerformanceMonitor, createPerformanceMonitor, benchmark, measureLatency, measureLatencyAsync, withLatencyTracking, withLatencyTrackingAsync, trackMemory, generateOptimizationReport, } from '../performance.js';
describe('PerformanceMonitor', () => {
    let monitor;
    beforeEach(() => {
        monitor = createPerformanceMonitor({
            sampleIntervalMs: 100,
            maxSamples: 100,
            leakDetectionIntervalMs: 200,
            thresholds: {
                maxLatencyMs: 100,
                maxErrorRate: 0.1,
                maxMemoryPercent: 0.9,
                minThroughput: 5,
            },
        });
    });
    afterEach(() => {
        monitor.stop();
        vi.restoreAllMocks();
    });
    describe('initialization', () => {
        it('should create a monitor with default config', () => {
            const defaultMonitor = createPerformanceMonitor();
            expect(defaultMonitor).toBeInstanceOf(PerformanceMonitor);
            defaultMonitor.stop();
        });
        it('should create a monitor with custom config', () => {
            const customMonitor = createPerformanceMonitor({
                sampleIntervalMs: 1000,
                maxSamples: 500,
                enableLeakDetection: false,
            });
            expect(customMonitor).toBeInstanceOf(PerformanceMonitor);
            customMonitor.stop();
        });
        it('should apply custom thresholds', () => {
            const customMonitor = createPerformanceMonitor({
                thresholds: {
                    maxLatencyMs: 500,
                    maxErrorRate: 0.05,
                    maxMemoryPercent: 0.8,
                    minThroughput: 100,
                },
            });
            expect(customMonitor).toBeInstanceOf(PerformanceMonitor);
            customMonitor.stop();
        });
    });
    describe('start/stop', () => {
        it('should start monitoring', () => {
            monitor.start();
            expect(monitor['isRunning']).toBe(true);
        });
        it('should stop monitoring', () => {
            monitor.start();
            monitor.stop();
            expect(monitor['isRunning']).toBe(false);
        });
        it('should not start if already running', () => {
            monitor.start();
            const initialInterval = monitor['sampleInterval'];
            monitor.start();
            expect(monitor['sampleInterval']).toBe(initialInterval);
        });
        it('should handle multiple stop calls gracefully', () => {
            monitor.start();
            monitor.stop();
            monitor.stop();
            expect(monitor['isRunning']).toBe(false);
        });
    });
    describe('latency recording', () => {
        it('should record latency samples', () => {
            monitor.recordLatency(50);
            monitor.recordLatency(100);
            monitor.recordLatency(75);
            const histogram = monitor.getLatencyHistogram();
            expect(histogram.count).toBe(3);
            expect(histogram.min).toBe(50);
            expect(histogram.max).toBe(100);
        });
        it('should record failed operations', () => {
            monitor.recordLatency(50, true);
            monitor.recordLatency(100, false);
            const metrics = monitor.getMetrics();
            expect(metrics.errorCount).toBe(1);
            expect(metrics.errorRate).toBe(0.5);
        });
        it('should limit samples to maxSamples', () => {
            const smallMonitor = createPerformanceMonitor({ maxSamples: 5 });
            for (let i = 0; i < 10; i++) {
                smallMonitor.recordLatency(i * 10);
            }
            const histogram = smallMonitor.getLatencyHistogram();
            expect(histogram.count).toBe(5);
            smallMonitor.stop();
        });
        it('should track window metrics', () => {
            monitor.recordLatency(50);
            monitor.recordLatency(100);
            const window1m = monitor.getWindowMetrics('1m');
            expect(window1m.throughput.total).toBe(2);
            expect(window1m.latency.avg).toBe(75);
        });
    });
    describe('latency histogram', () => {
        it('should return empty histogram when no samples', () => {
            const histogram = monitor.getLatencyHistogram();
            expect(histogram.count).toBe(0);
            expect(histogram.avg).toBe(0);
            expect(histogram.p50).toBe(0);
        });
        it('should calculate percentiles correctly', () => {
            const samples = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
            samples.forEach(s => monitor.recordLatency(s));
            const histogram = monitor.getLatencyHistogram();
            expect(histogram.count).toBe(10);
            expect(histogram.p50).toBe(50);
            expect(histogram.p95).toBeGreaterThanOrEqual(90);
            expect(histogram.p99).toBeGreaterThanOrEqual(90);
            expect(histogram.min).toBe(10);
            expect(histogram.max).toBe(100);
            expect(histogram.avg).toBe(55);
        });
        it('should handle custom samples', () => {
            const customSamples = [5, 15, 25, 35, 45];
            const histogram = monitor.getLatencyHistogram(customSamples);
            expect(histogram.count).toBe(5);
            expect(histogram.avg).toBe(25);
        });
    });
    describe('memory tracking', () => {
        it('should record memory snapshot', () => {
            const snapshot = monitor.recordMemory();
            expect(snapshot.id).toBeDefined();
            expect(snapshot.timestamp).toBeGreaterThan(0);
            expect(snapshot.heapUsed).toBeGreaterThanOrEqual(0);
            expect(snapshot.heapTotal).toBeGreaterThanOrEqual(0);
            expect(snapshot.usagePercent).toBeGreaterThanOrEqual(0);
        });
        it('should get memory usage', () => {
            const usage = monitor.getMemoryUsage();
            expect(usage.heapUsed).toBeGreaterThanOrEqual(0);
            expect(usage.heapTotal).toBeGreaterThanOrEqual(0);
            expect(usage.rss).toBeGreaterThanOrEqual(0);
            expect(usage.usagePercent).toBeGreaterThanOrEqual(0);
        });
        it('should limit memory snapshots', () => {
            for (let i = 0; i < 1100; i++) {
                monitor.recordMemory();
            }
            expect(monitor['memorySnapshots'].length).toBeLessThanOrEqual(1000);
        });
    });
    describe('metrics collection', () => {
        it('should get current metrics', () => {
            monitor.recordLatency(50);
            monitor.recordLatency(100);
            monitor.recordMemory();
            const metrics = monitor.getMetrics();
            expect(metrics.id).toBeDefined();
            expect(metrics.timestamp).toBeGreaterThan(0);
            expect(metrics.latency.avg).toBe(75);
            expect(metrics.throughput.total).toBe(2);
            expect(metrics.memory.heapUsed).toBeGreaterThanOrEqual(0);
            expect(metrics.errorRate).toBe(0);
        });
        it('should calculate throughput correctly', () => {
            monitor.recordLatency(50);
            monitor.recordLatency(50);
            monitor.recordLatency(50);
            const metrics = monitor.getMetrics();
            expect(metrics.throughput.total).toBe(3);
            expect(metrics.throughput.rps).toBeGreaterThanOrEqual(0);
        });
    });
    describe('memory leak detection', () => {
        it('should return insufficient data with few snapshots', () => {
            const result = monitor.detectMemoryLeak();
            expect(result.hasLeak).toBe(false);
            expect(result.confidence).toBe(0);
            expect(result.recommendation).toContain('Insufficient data');
        });
        it('should analyze snapshots for leaks', () => {
            for (let i = 0; i < 15; i++) {
                const snapshot = {
                    id: `test-${i}`,
                    timestamp: Date.now() + i * 60000,
                    heapUsed: 1000000 + i * 1000000,
                    heapTotal: 5000000,
                    rss: 10000000,
                    external: 0,
                    arrayBuffers: 0,
                    usagePercent: 0.2 + i * 0.1,
                };
                monitor['memorySnapshots'].push(snapshot);
            }
            const result = monitor.detectMemoryLeak();
            expect(result.growthRate).toBeGreaterThan(0);
            expect(result.confidence).toBeGreaterThan(0);
        });
        it('should identify potential leaks', () => {
            for (let i = 0; i < 15; i++) {
                const snapshot = {
                    id: `test-${i}`,
                    timestamp: Date.now() + i * 60000,
                    heapUsed: 10000000 + i * 5000000,
                    heapTotal: 50000000,
                    rss: 100000000,
                    external: 0,
                    arrayBuffers: 0,
                    usagePercent: 0.3,
                };
                monitor['memorySnapshots'].push(snapshot);
            }
            const result = monitor.detectMemoryLeak();
            expect(result.suspectedSources.length).toBeGreaterThan(0);
        });
    });
    describe('reset', () => {
        it('should reset all metrics', () => {
            monitor.recordLatency(50);
            monitor.recordLatency(100);
            monitor.recordMemory();
            monitor.reset();
            const histogram = monitor.getLatencyHistogram();
            expect(histogram.count).toBe(0);
            expect(monitor['memorySnapshots'].length).toBe(0);
            expect(monitor['totalOperations']).toBe(0);
        });
    });
    describe('prometheus metrics', () => {
        it('should export prometheus format', () => {
            monitor.recordLatency(50);
            monitor.recordLatency(100);
            const prometheus = monitor.getPrometheusMetrics();
            expect(prometheus).toContain('# HELP agora_latency_ms');
            expect(prometheus).toContain('# TYPE agora_latency_ms summary');
            expect(prometheus).toContain('agora_latency_ms{quantile="0.5"}');
            expect(prometheus).toContain('# HELP agora_throughput_rps');
            expect(prometheus).toContain('# HELP agora_memory_heap_used_bytes');
            expect(prometheus).toContain('# HELP agora_error_rate');
        });
    });
    describe('alerts', () => {
        it('should trigger alert callback on high latency', () => {
            const alertHandler = vi.fn();
            const alertMonitor = createPerformanceMonitor({
                thresholds: { maxLatencyMs: 50, maxErrorRate: 0.1, maxMemoryPercent: 0.9, minThroughput: 5 },
                onAlert: alertHandler,
            });
            alertMonitor.recordLatency(100);
            expect(alertHandler).toHaveBeenCalled();
            const alert = alertHandler.mock.calls[0][0];
            expect(alert.type).toBe('latency');
            expect(alert.severity).toBe('warning');
            expect(alert.value).toBe(100);
            alertMonitor.stop();
        });
        it('should trigger critical alert on very high latency', () => {
            const alertHandler = vi.fn();
            const alertMonitor = createPerformanceMonitor({
                thresholds: { maxLatencyMs: 50, maxErrorRate: 0.1, maxMemoryPercent: 0.9, minThroughput: 5 },
                onAlert: alertHandler,
            });
            alertMonitor.recordLatency(150);
            const alert = alertHandler.mock.calls[0][0];
            expect(alert.severity).toBe('critical');
            alertMonitor.stop();
        });
        it('should enforce alert cooldown', () => {
            const alertHandler = vi.fn();
            const alertMonitor = createPerformanceMonitor({
                thresholds: { maxLatencyMs: 50, maxErrorRate: 0.1, maxMemoryPercent: 0.9, minThroughput: 5 },
                onAlert: alertHandler,
            });
            alertMonitor.recordLatency(100);
            alertMonitor.recordLatency(100);
            alertMonitor.recordLatency(100);
            expect(alertHandler).toHaveBeenCalledTimes(1);
            alertMonitor.stop();
        });
    });
});
describe('benchmark', () => {
    it('should benchmark synchronous functions', async () => {
        const result = await benchmark('sync-test', () => {
            let sum = 0;
            for (let i = 0; i < 1000; i++) {
                sum += i;
            }
            return sum;
        }, 100);
        expect(result.name).toBe('sync-test');
        expect(result.iterations).toBe(100);
        expect(result.totalTime).toBeGreaterThan(0);
        expect(result.avgTime).toBeGreaterThan(0);
        expect(result.minTime).toBeGreaterThanOrEqual(0);
        expect(result.maxTime).toBeGreaterThanOrEqual(result.minTime);
        expect(result.opsPerSecond).toBeGreaterThan(0);
        expect(result.samples.length).toBe(100);
    });
    it('should benchmark asynchronous functions', async () => {
        const result = await benchmark('async-test', async () => {
            await new Promise(resolve => setTimeout(resolve, 1));
            return 'done';
        }, 50);
        expect(result.name).toBe('async-test');
        expect(result.iterations).toBe(50);
        expect(result.avgTime).toBeGreaterThan(0);
    });
    it('should calculate standard deviation', async () => {
        const result = await benchmark('stddev-test', () => {
            return Math.random();
        }, 100);
        expect(result.stdDev).toBeGreaterThanOrEqual(0);
    });
});
describe('measureLatency', () => {
    it('should measure synchronous function latency', () => {
        const { result, latencyMs } = measureLatency(() => {
            let sum = 0;
            for (let i = 0; i < 10000; i++) {
                sum += i;
            }
            return sum;
        });
        expect(result).toBeGreaterThan(0);
        expect(latencyMs).toBeGreaterThan(0);
    });
    it('should record latency to monitor', () => {
        const testMonitor = createPerformanceMonitor();
        measureLatency(() => 'test', testMonitor);
        const histogram = testMonitor.getLatencyHistogram();
        expect(histogram.count).toBe(1);
        testMonitor.stop();
    });
    it('should handle function errors', () => {
        expect(() => {
            measureLatency(() => {
                throw new Error('Test error');
            });
        }).toThrow('Test error');
    });
});
describe('measureLatencyAsync', () => {
    it('should measure async function latency', async () => {
        const { result, latencyMs } = await measureLatencyAsync(async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
            return 'async-result';
        });
        expect(result).toBe('async-result');
        expect(latencyMs).toBeGreaterThan(0);
    });
    it('should record async latency to monitor', async () => {
        const testMonitor = createPerformanceMonitor();
        await measureLatencyAsync(async () => {
            await new Promise(resolve => setTimeout(resolve, 1));
            return 'test';
        }, testMonitor);
        const histogram = testMonitor.getLatencyHistogram();
        expect(histogram.count).toBe(1);
        testMonitor.stop();
    });
    it('should handle async errors', async () => {
        await expect(measureLatencyAsync(async () => {
            throw new Error('Async error');
        })).rejects.toThrow('Async error');
    });
});
describe('withLatencyTracking', () => {
    it('should wrap function with latency tracking', () => {
        const testMonitor = createPerformanceMonitor();
        const trackedFn = withLatencyTracking((a, b) => a + b, testMonitor);
        const result = trackedFn(2, 3);
        expect(result).toBe(5);
        const histogram = testMonitor.getLatencyHistogram();
        expect(histogram.count).toBe(1);
        testMonitor.stop();
    });
    it('should track failed operations', () => {
        const testMonitor = createPerformanceMonitor();
        const trackedFn = withLatencyTracking(() => {
            throw new Error('Tracked error');
        }, testMonitor);
        expect(() => trackedFn()).toThrow('Tracked error');
        const metrics = testMonitor.getMetrics();
        expect(metrics.errorCount).toBe(1);
        testMonitor.stop();
    });
});
describe('withLatencyTrackingAsync', () => {
    it('should wrap async function with latency tracking', async () => {
        const testMonitor = createPerformanceMonitor();
        const trackedFn = withLatencyTrackingAsync(async (x) => {
            await new Promise(resolve => setTimeout(resolve, 1));
            return x * 2;
        }, testMonitor);
        const result = await trackedFn(5);
        expect(result).toBe(10);
        const histogram = testMonitor.getLatencyHistogram();
        expect(histogram.count).toBe(1);
        testMonitor.stop();
    });
    it('should track async errors', async () => {
        const testMonitor = createPerformanceMonitor();
        const trackedFn = withLatencyTrackingAsync(async () => {
            throw new Error('Async tracked error');
        }, testMonitor);
        await expect(trackedFn()).rejects.toThrow('Async tracked error');
        const metrics = testMonitor.getMetrics();
        expect(metrics.errorCount).toBe(1);
        testMonitor.stop();
    });
});
describe('trackMemory', () => {
    it('should start memory tracking interval', () => {
        const testMonitor = createPerformanceMonitor();
        const stopTracking = trackMemory(testMonitor, 100);
        expect(testMonitor['memorySnapshots'].length).toBe(0);
        stopTracking();
        testMonitor.stop();
    });
});
describe('generateOptimizationReport', () => {
    it('should generate report with no issues', () => {
        const testMonitor = createPerformanceMonitor();
        testMonitor.recordLatency(10);
        testMonitor.recordLatency(20);
        testMonitor.recordMemory();
        const report = generateOptimizationReport(testMonitor);
        expect(report.id).toBeDefined();
        expect(report.timestamp).toBeGreaterThan(0);
        expect(report.summary.healthScore).toBeGreaterThan(0);
        expect(report.recommendations.length).toBeGreaterThan(0);
        expect(report.trends).toBeDefined();
    });
    it('should detect high latency issues', () => {
        const testMonitor = createPerformanceMonitor({
            thresholds: { maxLatencyMs: 50, maxErrorRate: 0.1, maxMemoryPercent: 0.9, minThroughput: 5 },
        });
        for (let i = 0; i < 100; i++) {
            testMonitor.recordLatency(2000);
        }
        const report = generateOptimizationReport(testMonitor);
        const criticalRec = report.recommendations.find(r => r.severity === 'critical');
        expect(criticalRec).toBeDefined();
        expect(criticalRec?.category).toBe('latency');
        expect(report.summary.criticalCount).toBeGreaterThan(0);
        expect(report.summary.healthScore).toBeLessThan(100);
        testMonitor.stop();
    });
    it('should detect high error rate', () => {
        const testMonitor = createPerformanceMonitor({
            thresholds: { maxLatencyMs: 1000, maxErrorRate: 0.01, maxMemoryPercent: 0.9, minThroughput: 5 },
        });
        for (let i = 0; i < 20; i++) {
            testMonitor.recordLatency(50, false);
        }
        const report = generateOptimizationReport(testMonitor);
        const errorRec = report.recommendations.find(r => r.category === 'errors');
        expect(errorRec).toBeDefined();
        expect(report.summary.healthScore).toBeLessThan(100);
        testMonitor.stop();
    });
    it('should sort recommendations by severity', () => {
        const testMonitor = createPerformanceMonitor({
            thresholds: { maxLatencyMs: 50, maxErrorRate: 0.01, maxMemoryPercent: 0.9, minThroughput: 5 },
        });
        for (let i = 0; i < 100; i++) {
            testMonitor.recordLatency(10, true);
        }
        for (let i = 0; i < 20; i++) {
            testMonitor.recordLatency(2000, false);
        }
        const report = generateOptimizationReport(testMonitor);
        const severities = report.recommendations.map(r => r.severity);
        const criticalIndex = severities.indexOf('critical');
        const warningIndex = severities.indexOf('warning');
        const infoIndex = severities.indexOf('info');
        if (criticalIndex >= 0 && warningIndex >= 0) {
            expect(criticalIndex).toBeLessThan(warningIndex);
        }
        testMonitor.stop();
    });
    it('should calculate trends with historical data', () => {
        const testMonitor = createPerformanceMonitor();
        const historicalMetrics = [
            {
                id: '1',
                timestamp: Date.now() - 60000,
                latency: { avg: 50, min: 10, max: 100, p50: 50, p95: 90, p99: 99 },
                throughput: { rps: 100, opm: 6000, total: 1000 },
                memory: { heapUsed: 1000000, heapTotal: 10000000, rss: 5000000, external: 0, arrayBuffers: 0, usagePercent: 0.1 },
                errorRate: 0.01,
                errorCount: 10,
            },
            {
                id: '2',
                timestamp: Date.now(),
                latency: { avg: 70, min: 15, max: 120, p50: 65, p95: 110, p99: 119 },
                throughput: { rps: 70, opm: 4200, total: 1100 },
                memory: { heapUsed: 2000000, heapTotal: 10000000, rss: 6000000, external: 0, arrayBuffers: 0, usagePercent: 0.2 },
                errorRate: 0.02,
                errorCount: 22,
            },
        ];
        testMonitor.recordLatency(70);
        const report = generateOptimizationReport(testMonitor, historicalMetrics);
        expect(report.trends.latency).toBe('degrading');
        expect(report.trends.throughput).toBe('degrading');
        expect(report.trends.memory).toBe('degrading');
    });
    it('should report improving trends', () => {
        const testMonitor = createPerformanceMonitor();
        const historicalMetrics = [
            {
                id: '1',
                timestamp: Date.now() - 60000,
                latency: { avg: 100, min: 50, max: 200, p50: 100, p95: 180, p99: 199 },
                throughput: { rps: 50, opm: 3000, total: 1000 },
                memory: { heapUsed: 5000000, heapTotal: 10000000, rss: 8000000, external: 0, arrayBuffers: 0, usagePercent: 0.5 },
                errorRate: 0.05,
                errorCount: 50,
            },
            {
                id: '2',
                timestamp: Date.now(),
                latency: { avg: 50, min: 20, max: 100, p50: 50, p95: 90, p99: 99 },
                throughput: { rps: 100, opm: 6000, total: 2000 },
                memory: { heapUsed: 2000000, heapTotal: 10000000, rss: 5000000, external: 0, arrayBuffers: 0, usagePercent: 0.2 },
                errorRate: 0.01,
                errorCount: 20,
            },
        ];
        const report = generateOptimizationReport(testMonitor, historicalMetrics);
        expect(report.trends.latency).toBe('improving');
        expect(report.trends.throughput).toBe('improving');
        expect(report.trends.memory).toBe('improving');
    });
});
describe('Type Exports', () => {
    it('should have all required type definitions', () => {
        const metrics = {
            id: 'test',
            timestamp: Date.now(),
            latency: { avg: 10, min: 5, max: 20, p50: 10, p95: 18, p99: 19 },
            throughput: { rps: 100, opm: 6000, total: 1000 },
            memory: { heapUsed: 1000000, heapTotal: 10000000, rss: 5000000, external: 0, arrayBuffers: 0, usagePercent: 0.1 },
            errorRate: 0.01,
            errorCount: 10,
        };
        const benchmarkResult = {
            name: 'test',
            iterations: 100,
            totalTime: 1000,
            avgTime: 10,
            minTime: 5,
            maxTime: 20,
            stdDev: 3,
            opsPerSecond: 100,
            samples: [10, 20, 30],
        };
        const histogram = {
            count: 100,
            p50: 50,
            p75: 75,
            p90: 90,
            p95: 95,
            p99: 99,
            p999: 99.9,
            min: 10,
            max: 100,
            avg: 55,
        };
        const snapshot = {
            id: 'test',
            timestamp: Date.now(),
            heapUsed: 1000000,
            heapTotal: 10000000,
            rss: 5000000,
            external: 0,
            arrayBuffers: 0,
            usagePercent: 0.1,
        };
        const leakResult = {
            hasLeak: false,
            confidence: 0,
            growthRate: 0,
            suspectedSources: [],
            recommendation: 'Test',
        };
        const thresholds = {
            maxLatencyMs: 1000,
            maxErrorRate: 0.01,
            maxMemoryPercent: 0.9,
            minThroughput: 10,
        };
        const config = {
            sampleIntervalMs: 5000,
            maxSamples: 1000,
            thresholds,
            enableLeakDetection: true,
            leakDetectionIntervalMs: 60000,
            windows: { short: 1, medium: 5, long: 15 },
        };
        expect(metrics).toBeDefined();
        expect(benchmarkResult).toBeDefined();
        expect(histogram).toBeDefined();
        expect(snapshot).toBeDefined();
        expect(leakResult).toBeDefined();
        expect(config).toBeDefined();
    });
});
console.log('[Unit Tests] Performance module test suite loaded');
//# sourceMappingURL=performance.test.js.map