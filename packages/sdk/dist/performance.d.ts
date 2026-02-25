/**
 * Performance Optimization Module for Agora SDK
 *
 * Provides comprehensive performance monitoring, benchmarking,
 * memory leak detection, latency tracking, and optimization recommendations.
 */
export interface PerformanceMetrics {
    id: string;
    timestamp: number;
    latency: {
        avg: number;
        min: number;
        max: number;
        p50: number;
        p95: number;
        p99: number;
    };
    throughput: {
        rps: number;
        opm: number;
        total: number;
    };
    memory: {
        heapUsed: number;
        heapTotal: number;
        external: number;
        rss: number;
        arrayBuffers: number;
    };
    errorRate: number;
    errorCount: number;
}
export interface BenchmarkResult {
    name: string;
    iterations: number;
    totalTime: number;
    avgTime: number;
    minTime: number;
    maxTime: number;
    stdDev: number;
    opsPerSecond: number;
    samples: number[];
}
export interface LatencyHistogram {
    count: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
    p999: number;
    min: number;
    max: number;
    avg: number;
}
export interface MemorySnapshot {
    id: string;
    timestamp: number;
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
    arrayBuffers: number;
    usagePercent: number;
}
export interface LeakDetectionResult {
    hasLeak: boolean;
    confidence: number;
    growthRate: number;
    suspectedSources: string[];
    recommendation: string;
}
export type SeverityLevel = 'info' | 'warning' | 'critical';
export interface OptimizationRecommendation {
    id: string;
    severity: SeverityLevel;
    category: 'latency' | 'throughput' | 'memory' | 'errors' | 'general';
    title: string;
    description: string;
    action: string;
    impact: string;
    effort: 'low' | 'medium' | 'high';
}
export interface OptimizationReport {
    id: string;
    timestamp: number;
    summary: {
        healthScore: number;
        totalRecommendations: number;
        criticalCount: number;
        warningCount: number;
        infoCount: number;
    };
    metrics: PerformanceMetrics;
    recommendations: OptimizationRecommendation[];
    trends: {
        latency: string;
        throughput: string;
        memory: string;
    };
}
export interface AlertThresholds {
    maxLatencyMs: number;
    maxErrorRate: number;
    maxMemoryPercent: number;
    minThroughput: number;
}
export interface PerformanceMonitorConfig {
    sampleIntervalMs: number;
    maxSamples: number;
    thresholds: AlertThresholds;
    enableLeakDetection: boolean;
    leakDetectionIntervalMs: number;
    onAlert?: (alert: PerformanceAlert) => void;
    windows: {
        short: number;
        medium: number;
        long: number;
    };
}
export interface PerformanceAlert {
    id: string;
    timestamp: number;
    type: 'latency' | 'error_rate' | 'memory' | 'throughput' | 'leak_detected';
    severity: SeverityLevel;
    message: string;
    value: number;
    threshold: number;
    context?: Record<string, unknown>;
}
export declare class PerformanceMonitor {
    private config;
    private isRunning;
    private sampleInterval;
    private leakDetectionInterval;
    private latencySamples;
    private errorCount;
    private totalOperations;
    private memorySnapshots;
    private windows;
    private lastAlerts;
    private readonly ALERT_COOLDOWN_MS;
    constructor(config?: Partial<PerformanceMonitorConfig>);
    start(): void;
    stop(): void;
    recordLatency(latencyMs: number, success?: boolean): void;
    recordMemory(): MemorySnapshot;
    getMemoryUsage(): Omit<MemorySnapshot, 'id' | 'timestamp'>;
    getLatencyHistogram(samples?: number[]): LatencyHistogram;
    getMetrics(): PerformanceMetrics;
    getWindowMetrics(window: '1m' | '5m' | '15m'): PerformanceMetrics;
    detectMemoryLeak(): LeakDetectionResult;
    reset(): void;
    getPrometheusMetrics(): string;
    private addToWindow;
    private sampleMetrics;
    private checkLatencyThreshold;
    private triggerAlert;
    private percentile;
    private correlation;
    private identifyLeakSources;
}
export declare function createPerformanceMonitor(config?: Partial<PerformanceMonitorConfig>): PerformanceMonitor;
export declare function benchmark<T>(name: string, fn: () => T | Promise<T>, iterations?: number): Promise<BenchmarkResult>;
export declare function measureLatency<T>(fn: () => T, monitor?: PerformanceMonitor): {
    result: T;
    latencyMs: number;
};
export declare function measureLatencyAsync<T>(fn: () => Promise<T>, monitor?: PerformanceMonitor): Promise<{
    result: T;
    latencyMs: number;
}>;
export declare function withLatencyTracking<TArgs extends unknown[], TReturn>(fn: (...args: TArgs) => TReturn, monitor: PerformanceMonitor, name?: string): (...args: TArgs) => TReturn;
export declare function withLatencyTrackingAsync<TArgs extends unknown[], TReturn>(fn: (...args: TArgs) => Promise<TReturn>, monitor: PerformanceMonitor, name?: string): (...args: TArgs) => Promise<TReturn>;
export declare function trackMemory(monitor: PerformanceMonitor, intervalMs?: number): () => void;
export declare function generateOptimizationReport(monitor: PerformanceMonitor, historicalMetrics?: PerformanceMetrics[]): OptimizationReport;
declare const _default: {
    PerformanceMonitor: typeof PerformanceMonitor;
    createPerformanceMonitor: typeof createPerformanceMonitor;
    benchmark: typeof benchmark;
    measureLatency: typeof measureLatency;
    measureLatencyAsync: typeof measureLatencyAsync;
    withLatencyTracking: typeof withLatencyTracking;
    withLatencyTrackingAsync: typeof withLatencyTrackingAsync;
    trackMemory: typeof trackMemory;
    generateOptimizationReport: typeof generateOptimizationReport;
};
export default _default;
//# sourceMappingURL=performance.d.ts.map