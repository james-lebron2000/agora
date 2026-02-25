/**
 * Performance Optimization Module for Agora SDK
 *
 * Provides comprehensive performance monitoring, benchmarking,
 * memory leak detection, latency tracking, and optimization recommendations.
 */
import { randomUUID } from 'crypto';
const DEFAULT_THRESHOLDS = {
    maxLatencyMs: 1000,
    maxErrorRate: 0.01,
    maxMemoryPercent: 0.9,
    minThroughput: 10,
};
const DEFAULT_CONFIG = {
    sampleIntervalMs: 5000,
    maxSamples: 1000,
    thresholds: DEFAULT_THRESHOLDS,
    enableLeakDetection: true,
    leakDetectionIntervalMs: 60000,
    windows: {
        short: 1,
        medium: 5,
        long: 15,
    },
};
export class PerformanceMonitor {
    config;
    isRunning = false;
    sampleInterval = null;
    leakDetectionInterval = null;
    latencySamples = [];
    errorCount = 0;
    totalOperations = 0;
    memorySnapshots = [];
    windows;
    lastAlerts = new Map();
    ALERT_COOLDOWN_MS = 60000;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.config.thresholds = { ...DEFAULT_THRESHOLDS, ...config.thresholds };
        const now = Date.now();
        this.windows = {
            '1m': { latencies: [], errors: 0, total: 0, startTime: now },
            '5m': { latencies: [], errors: 0, total: 0, startTime: now },
            '15m': { latencies: [], errors: 0, total: 0, startTime: now },
        };
    }
    start() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        this.sampleInterval = setInterval(() => {
            this.sampleMetrics();
        }, this.config.sampleIntervalMs);
        if (this.config.enableLeakDetection) {
            this.leakDetectionInterval = setInterval(() => {
                this.detectMemoryLeak();
            }, this.config.leakDetectionIntervalMs);
        }
    }
    stop() {
        this.isRunning = false;
        if (this.sampleInterval) {
            clearInterval(this.sampleInterval);
            this.sampleInterval = null;
        }
        if (this.leakDetectionInterval) {
            clearInterval(this.leakDetectionInterval);
            this.leakDetectionInterval = null;
        }
    }
    recordLatency(latencyMs, success = true) {
        this.latencySamples.push(latencyMs);
        this.totalOperations++;
        if (!success) {
            this.errorCount++;
        }
        const now = Date.now();
        this.addToWindow('1m', latencyMs, success, now);
        this.addToWindow('5m', latencyMs, success, now);
        this.addToWindow('15m', latencyMs, success, now);
        if (this.latencySamples.length > this.config.maxSamples) {
            this.latencySamples = this.latencySamples.slice(-this.config.maxSamples);
        }
        this.checkLatencyThreshold(latencyMs);
    }
    recordMemory() {
        const usage = this.getMemoryUsage();
        const snapshot = {
            id: randomUUID(),
            timestamp: Date.now(),
            ...usage,
        };
        this.memorySnapshots.push(snapshot);
        if (this.memorySnapshots.length > 1000) {
            this.memorySnapshots = this.memorySnapshots.slice(-1000);
        }
        if (usage.usagePercent > this.config.thresholds.maxMemoryPercent) {
            this.triggerAlert({
                type: 'memory',
                severity: 'critical',
                message: `Memory usage exceeded threshold: ${(usage.usagePercent * 100).toFixed(1)}%`,
                value: usage.usagePercent,
                threshold: this.config.thresholds.maxMemoryPercent,
            });
        }
        return snapshot;
    }
    getMemoryUsage() {
        const mem = process.memoryUsage();
        const usagePercent = mem.heapTotal > 0 ? mem.heapUsed / mem.heapTotal : 0;
        return {
            heapUsed: mem.heapUsed,
            heapTotal: mem.heapTotal,
            rss: mem.rss,
            external: mem.external,
            arrayBuffers: mem.arrayBuffers || 0,
            usagePercent,
        };
    }
    getLatencyHistogram(samples = this.latencySamples) {
        if (samples.length === 0) {
            return {
                count: 0,
                p50: 0,
                p75: 0,
                p90: 0,
                p95: 0,
                p99: 0,
                p999: 0,
                min: 0,
                max: 0,
                avg: 0,
            };
        }
        const sorted = [...samples].sort((a, b) => a - b);
        const count = sorted.length;
        return {
            count,
            p50: this.percentile(sorted, 0.5),
            p75: this.percentile(sorted, 0.75),
            p90: this.percentile(sorted, 0.9),
            p95: this.percentile(sorted, 0.95),
            p99: this.percentile(sorted, 0.99),
            p999: this.percentile(sorted, 0.999),
            min: sorted[0],
            max: sorted[count - 1],
            avg: sorted.reduce((a, b) => a + b, 0) / count,
        };
    }
    getMetrics() {
        const histogram = this.getLatencyHistogram();
        const memory = this.getMemoryUsage();
        const now = Date.now();
        const recentOps = this.totalOperations;
        return {
            id: randomUUID(),
            timestamp: now,
            latency: {
                avg: histogram.avg,
                min: histogram.min,
                max: histogram.max,
                p50: histogram.p50,
                p95: histogram.p95,
                p99: histogram.p99,
            },
            throughput: {
                rps: recentOps / Math.max((now - this.windows['1m'].startTime) / 1000, 1),
                opm: recentOps / Math.max((now - this.windows['1m'].startTime) / 60000, 1),
                total: this.totalOperations,
            },
            memory,
            errorRate: this.totalOperations > 0 ? this.errorCount / this.totalOperations : 0,
            errorCount: this.errorCount,
        };
    }
    getWindowMetrics(window) {
        const w = this.windows[window];
        const histogram = this.getLatencyHistogram(w.latencies);
        const memory = this.getMemoryUsage();
        const duration = (Date.now() - w.startTime) / 1000;
        return {
            id: randomUUID(),
            timestamp: Date.now(),
            latency: {
                avg: histogram.avg,
                min: histogram.min,
                max: histogram.max,
                p50: histogram.p50,
                p95: histogram.p95,
                p99: histogram.p99,
            },
            throughput: {
                rps: w.total / Math.max(duration, 1),
                opm: w.total / Math.max(duration / 60, 1),
                total: w.total,
            },
            memory,
            errorRate: w.total > 0 ? w.errors / w.total : 0,
            errorCount: w.errors,
        };
    }
    detectMemoryLeak() {
        if (this.memorySnapshots.length < 10) {
            return {
                hasLeak: false,
                confidence: 0,
                growthRate: 0,
                suspectedSources: [],
                recommendation: 'Insufficient data for leak detection. Continue monitoring.',
            };
        }
        const recent = this.memorySnapshots.slice(-10);
        const first = recent[0];
        const last = recent[recent.length - 1];
        const timeSpan = (last.timestamp - first.timestamp) / 60000;
        if (timeSpan < 1) {
            return {
                hasLeak: false,
                confidence: 0,
                growthRate: 0,
                suspectedSources: [],
                recommendation: 'Insufficient time span for leak detection.',
            };
        }
        const growthRate = (last.heapUsed - first.heapUsed) / timeSpan;
        const xValues = recent.map((_, i) => i);
        const yValues = recent.map(s => s.heapUsed);
        const correlation = this.correlation(xValues, yValues);
        const hasLeak = correlation > 0.8 && growthRate > 1024 * 1024;
        const confidence = Math.min(correlation * 100, 100);
        const result = {
            hasLeak,
            confidence,
            growthRate,
            suspectedSources: hasLeak ? this.identifyLeakSources() : [],
            recommendation: hasLeak
                ? `Potential memory leak detected: \${(growthRate / 1024 / 1024).toFixed(2)} MB/min growth.`
                : 'No significant memory leak patterns detected.',
        };
        if (hasLeak) {
            this.triggerAlert({
                type: 'leak_detected',
                severity: 'critical',
                message: result.recommendation,
                value: growthRate,
                threshold: 1024 * 1024,
                context: { growthRate, confidence },
            });
        }
        return result;
    }
    reset() {
        this.latencySamples = [];
        this.errorCount = 0;
        this.totalOperations = 0;
        this.memorySnapshots = [];
        const now = Date.now();
        this.windows = {
            '1m': { latencies: [], errors: 0, total: 0, startTime: now },
            '5m': { latencies: [], errors: 0, total: 0, startTime: now },
            '15m': { latencies: [], errors: 0, total: 0, startTime: now },
        };
    }
    getPrometheusMetrics() {
        const metrics = this.getMetrics();
        const lines = [];
        lines.push('# HELP agora_latency_ms Latency in milliseconds');
        lines.push('# TYPE agora_latency_ms summary');
        lines.push(`agora_latency_ms{quantile="0.5"} \${metrics.latency.p50}`);
        lines.push(`agora_latency_ms{quantile="0.95"} \${metrics.latency.p95}`);
        lines.push(`agora_latency_ms{quantile="0.99"} \${metrics.latency.p99}`);
        lines.push(`agora_latency_ms_sum \${metrics.latency.avg * metrics.throughput.total}`);
        lines.push(`agora_latency_ms_count \${metrics.throughput.total}`);
        lines.push('# HELP agora_throughput_rps Requests per second');
        lines.push('# TYPE agora_throughput_rps gauge');
        lines.push(`agora_throughput_rps \${metrics.throughput.rps}`);
        lines.push('# HELP agora_memory_heap_used_bytes Heap used in bytes');
        lines.push('# TYPE agora_memory_heap_used_bytes gauge');
        lines.push(`agora_memory_heap_used_bytes \${metrics.memory.heapUsed}`);
        lines.push('# HELP agora_error_rate Error rate (0-1)');
        lines.push('# TYPE agora_error_rate gauge');
        lines.push(`agora_error_rate \${metrics.errorRate}`);
        return lines.join('\\n');
    }
    addToWindow(window, latency, success, timestamp) {
        const w = this.windows[window];
        const windowMs = window === '1m' ? 60000 : window === '5m' ? 300000 : 900000;
        if (timestamp - w.startTime > windowMs) {
            w.latencies = [];
            w.errors = 0;
            w.total = 0;
            w.startTime = timestamp;
        }
        w.latencies.push(latency);
        w.total++;
        if (!success) {
            w.errors++;
        }
    }
    sampleMetrics() {
        this.recordMemory();
    }
    checkLatencyThreshold(latencyMs) {
        if (latencyMs > this.config.thresholds.maxLatencyMs) {
            this.triggerAlert({
                type: 'latency',
                severity: latencyMs > this.config.thresholds.maxLatencyMs * 2 ? 'critical' : 'warning',
                message: `High latency detected: \${latencyMs.toFixed(2)}ms`,
                value: latencyMs,
                threshold: this.config.thresholds.maxLatencyMs,
            });
        }
    }
    triggerAlert(alert) {
        const now = Date.now();
        const alertKey = `\${alert.type}:\${alert.severity}`;
        const lastAlert = this.lastAlerts.get(alertKey);
        if (lastAlert && now - lastAlert < this.ALERT_COOLDOWN_MS) {
            return;
        }
        this.lastAlerts.set(alertKey, now);
        const fullAlert = {
            ...alert,
            id: randomUUID(),
            timestamp: now,
        };
        if (this.config.onAlert) {
            this.config.onAlert(fullAlert);
        }
    }
    percentile(sorted, p) {
        if (sorted.length === 0)
            return 0;
        const index = Math.ceil(sorted.length * p) - 1;
        return sorted[Math.max(0, index)];
    }
    correlation(x, y) {
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
        const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        return denominator === 0 ? 0 : numerator / denominator;
    }
    identifyLeakSources() {
        return [
            'Check for unclosed event listeners',
            'Review large object caches without TTL',
            'Inspect callback closures capturing large scopes',
            'Verify cleanup in component unmount/disconnect',
        ];
    }
}
export function createPerformanceMonitor(config) {
    return new PerformanceMonitor(config);
}
export async function benchmark(name, fn, iterations = 1000) {
    const samples = [];
    for (let i = 0; i < Math.min(10, iterations / 10); i++) {
        await fn();
    }
    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await fn();
        const end = performance.now();
        samples.push(end - start);
    }
    const totalTime = samples.reduce((a, b) => a + b, 0);
    const avgTime = totalTime / iterations;
    const minTime = Math.min(...samples);
    const maxTime = Math.max(...samples);
    const variance = samples.reduce((sum, s) => sum + Math.pow(s - avgTime, 2), 0) / iterations;
    const stdDev = Math.sqrt(variance);
    return {
        name,
        iterations,
        totalTime,
        avgTime,
        minTime,
        maxTime,
        stdDev,
        opsPerSecond: 1000 / avgTime,
        samples,
    };
}
export function measureLatency(fn, monitor) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    const latencyMs = end - start;
    if (monitor) {
        monitor.recordLatency(latencyMs);
    }
    return { result, latencyMs };
}
export async function measureLatencyAsync(fn, monitor) {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    const latencyMs = end - start;
    if (monitor) {
        monitor.recordLatency(latencyMs);
    }
    return { result, latencyMs };
}
export function withLatencyTracking(fn, monitor, name) {
    return (...args) => {
        const start = performance.now();
        try {
            const result = fn(...args);
            const end = performance.now();
            monitor.recordLatency(end - start);
            return result;
        }
        catch (error) {
            const end = performance.now();
            monitor.recordLatency(end - start, false);
            throw error;
        }
    };
}
export function withLatencyTrackingAsync(fn, monitor, name) {
    return async (...args) => {
        const start = performance.now();
        try {
            const result = await fn(...args);
            const end = performance.now();
            monitor.recordLatency(end - start);
            return result;
        }
        catch (error) {
            const end = performance.now();
            monitor.recordLatency(end - start, false);
            throw error;
        }
    };
}
export function trackMemory(monitor, intervalMs = 5000) {
    const interval = setInterval(() => {
        monitor.recordMemory();
    }, intervalMs);
    return () => clearInterval(interval);
}
export function generateOptimizationReport(monitor, historicalMetrics) {
    const metrics = monitor.getMetrics();
    const recommendations = [];
    let healthScore = 100;
    let criticalCount = 0;
    let warningCount = 0;
    let infoCount = 0;
    if (metrics.latency.p99 > 1000) {
        recommendations.push({
            id: randomUUID(),
            severity: 'critical',
            category: 'latency',
            title: 'High P99 Latency',
            description: `P99 latency is \${metrics.latency.p99.toFixed(2)}ms, exceeding 1s threshold`,
            action: 'Implement request caching, optimize database queries, or add connection pooling',
            impact: 'Significant improvement in user experience',
            effort: 'medium',
        });
        healthScore -= 30;
        criticalCount++;
    }
    else if (metrics.latency.p95 > 500) {
        recommendations.push({
            id: randomUUID(),
            severity: 'warning',
            category: 'latency',
            title: 'Elevated P95 Latency',
            description: `P95 latency is \${metrics.latency.p95.toFixed(2)}ms`,
            action: 'Review slow queries and optimize hot paths',
            impact: 'Moderate improvement in response times',
            effort: 'low',
        });
        healthScore -= 15;
        warningCount++;
    }
    if (metrics.errorRate > 0.05) {
        recommendations.push({
            id: randomUUID(),
            severity: 'critical',
            category: 'errors',
            title: 'High Error Rate',
            description: `Error rate is \${(metrics.errorRate * 100).toFixed(2)}%`,
            action: 'Review error logs, implement circuit breakers, add retry logic',
            impact: 'Critical stability improvement',
            effort: 'high',
        });
        healthScore -= 40;
        criticalCount++;
    }
    else if (metrics.errorRate > 0.01) {
        recommendations.push({
            id: randomUUID(),
            severity: 'warning',
            category: 'errors',
            title: 'Elevated Error Rate',
            description: `Error rate is \${(metrics.errorRate * 100).toFixed(2)}%`,
            action: 'Investigate error patterns and add error handling',
            impact: 'Improved reliability',
            effort: 'medium',
        });
        healthScore -= 10;
        warningCount++;
    }
    if (metrics.memory.usagePercent > 0.85) {
        recommendations.push({
            id: randomUUID(),
            severity: 'critical',
            category: 'memory',
            title: 'High Memory Usage',
            description: `Memory usage is \${(metrics.memory.usagePercent * 100).toFixed(1)}%`,
            action: 'Optimize data structures, implement pagination, add memory limits',
            impact: 'Prevent out-of-memory crashes',
            effort: 'high',
        });
        healthScore -= 25;
        criticalCount++;
    }
    else if (metrics.memory.usagePercent > 0.7) {
        recommendations.push({
            id: randomUUID(),
            severity: 'warning',
            category: 'memory',
            title: 'Elevated Memory Usage',
            description: `Memory usage is \${(metrics.memory.usagePercent * 100).toFixed(1)}%`,
            action: 'Review memory-intensive operations and consider streaming',
            impact: 'Better resource utilization',
            effort: 'medium',
        });
        healthScore -= 10;
        warningCount++;
    }
    if (metrics.throughput.rps < 10 && metrics.throughput.total > 100) {
        recommendations.push({
            id: randomUUID(),
            severity: 'warning',
            category: 'throughput',
            title: 'Low Throughput',
            description: `Current throughput is \${metrics.throughput.rps.toFixed(2)} RPS`,
            action: 'Consider load balancing, horizontal scaling, or optimizing bottlenecks',
            impact: 'Handle more concurrent requests',
            effort: 'high',
        });
        healthScore -= 10;
        warningCount++;
    }
    // General recommendations
    if (recommendations.length === 0) {
        recommendations.push({
            id: randomUUID(),
            severity: 'info',
            category: 'general',
            title: 'Performance Looking Good',
            description: 'All key metrics are within acceptable ranges',
            action: 'Continue monitoring and consider setting up performance budgets',
            impact: 'Maintain current performance levels',
            effort: 'low',
        });
        infoCount++;
    }
    // Calculate trends
    const trends = {
        latency: 'stable',
        throughput: 'stable',
        memory: 'stable',
    };
    if (historicalMetrics && historicalMetrics.length >= 2) {
        const sorted = [...historicalMetrics].sort((a, b) => a.timestamp - b.timestamp);
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        if (last.latency.p95 > first.latency.p95 * 1.2) {
            trends.latency = 'degrading';
        }
        else if (last.latency.p95 < first.latency.p95 * 0.8) {
            trends.latency = 'improving';
        }
        if (last.throughput.rps > first.throughput.rps * 1.2) {
            trends.throughput = 'improving';
        }
        else if (last.throughput.rps < first.throughput.rps * 0.8) {
            trends.throughput = 'degrading';
        }
        if (last.memory.usagePercent > first.memory.usagePercent * 1.1) {
            trends.memory = 'degrading';
        }
        else if (last.memory.usagePercent < first.memory.usagePercent * 0.9) {
            trends.memory = 'improving';
        }
    }
    // Sort recommendations by severity
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    recommendations.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    return {
        id: randomUUID(),
        timestamp: Date.now(),
        summary: {
            healthScore: Math.max(0, healthScore),
            totalRecommendations: recommendations.length,
            criticalCount,
            warningCount,
            infoCount,
        },
        metrics,
        recommendations,
        trends,
    };
}
// Export default for convenience
export default {
    PerformanceMonitor,
    createPerformanceMonitor,
    benchmark,
    measureLatency,
    measureLatencyAsync,
    withLatencyTracking,
    withLatencyTrackingAsync,
    trackMemory,
    generateOptimizationReport,
};
//# sourceMappingURL=performance.js.map