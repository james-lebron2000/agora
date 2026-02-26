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
        usagePercent?: number;
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
    type: 'latency' | 'error_rate' | 'memory' | 'throughput' | 'leak_detected' | 'regression' | 'budget_exceeded';
    severity: SeverityLevel;
    message: string;
    value: number;
    threshold: number;
    context?: Record<string, unknown>;
}
/**
 * Real-time dashboard data for frontend visualization
 */
export interface DashboardData {
    /** Current metrics snapshot */
    current: PerformanceMetrics;
    /** Historical data for charts */
    history: PerformanceMetrics[];
    /** Window-based metrics */
    windows: {
        '1m': PerformanceMetrics;
        '5m': PerformanceMetrics;
        '15m': PerformanceMetrics;
    };
    /** Latency histogram for distribution chart */
    latencyHistogram: LatencyHistogram;
    /** Memory trend data */
    memoryTrend: MemorySnapshot[];
    /** Health score (0-100) */
    healthScore: number;
    /** Current status */
    status: 'healthy' | 'degraded' | 'critical';
    /** Last update timestamp */
    lastUpdated: number;
}
/**
 * Performance regression detection result
 */
export interface RegressionResult {
    /** Whether a regression was detected */
    hasRegression: boolean;
    /** Type of regression */
    type: 'latency' | 'error_rate' | 'memory' | 'throughput';
    /** Severity of regression */
    severity: SeverityLevel;
    /** Percentage change from baseline */
    changePercent: number;
    /** Baseline value */
    baselineValue: number;
    /** Current value */
    currentValue: number;
    /** Time when regression started */
    detectedAt: number;
    /** Confidence level (0-1) */
    confidence: number;
}
/**
 * Performance budget configuration
 */
export interface PerformanceBudget {
    /** Budget name */
    name: string;
    /** Metric type */
    metric: 'latency' | 'error_rate' | 'memory' | 'bundle_size' | 'tti' | 'fcp' | 'lcp';
    /** Maximum allowed value */
    max: number;
    /** Warning threshold (typically 80% of max) */
    warning: number;
    /** Current value */
    current?: number;
    /** Budget status */
    status?: 'pass' | 'warning' | 'fail';
}
/**
 * Performance budget report
 */
export interface PerformanceBudgetReport {
    /** Overall budget status */
    overallStatus: 'pass' | 'warning' | 'fail';
    /** Percentage of budgets passing */
    passRate: number;
    /** Individual budget results */
    budgets: PerformanceBudget[];
    /** Timestamp */
    timestamp: number;
}
/**
 * API endpoint performance tracking
 */
export interface ApiEndpointMetrics {
    /** Endpoint path */
    path: string;
    /** HTTP method */
    method: string;
    /** Request count */
    requestCount: number;
    /** Latency metrics */
    latency: {
        avg: number;
        p50: number;
        p95: number;
        p99: number;
        min: number;
        max: number;
    };
    /** Error metrics */
    errors: {
        count: number;
        rate: number;
        byStatusCode: Record<number, number>;
    };
    /** Throughput */
    rps: number;
    /** Last called timestamp */
    lastCalled: number;
}
/**
 * Bundle size tracking for frontend optimization
 */
export interface BundleSizeMetrics {
    /** Bundle name */
    name: string;
    /** Size in bytes */
    size: number;
    /** Gzipped size */
    gzipSize: number;
    /** Budget limit */
    budget?: number;
    /** Status */
    status: 'pass' | 'warning' | 'fail';
    /** Chunks */
    chunks: Array<{
        name: string;
        size: number;
    }>;
}
/**
 * Adaptive threshold configuration
 */
export interface AdaptiveThresholds {
    /** Whether adaptive thresholds are enabled */
    enabled: boolean;
    /** Baseline window in minutes */
    baselineWindow: number;
    /** Sensitivity (0-1, higher = more sensitive) */
    sensitivity: number;
    /** Minimum sample size for adaptation */
    minSamples: number;
    /** Current calculated thresholds */
    calculated: {
        maxLatencyMs: number;
        maxErrorRate: number;
        maxMemoryPercent: number;
        minThroughput: number;
    };
}
/**
 * Performance trend analysis
 */
export interface TrendAnalysis {
    /** Metric being analyzed */
    metric: string;
    /** Time window */
    window: string;
    /** Current trend direction */
    direction: 'improving' | 'stable' | 'degrading';
    /** Rate of change per hour */
    changeRate: number;
    /** Statistical significance (p-value) */
    significance: number;
    /** Forecast for next hour */
    forecast: number;
}
/**
 * Extended configuration for enhanced performance monitoring
 */
export interface EnhancedPerformanceConfig extends PerformanceMonitorConfig {
    /** Enable adaptive thresholds */
    enableAdaptiveThresholds: boolean;
    /** Adaptive threshold settings */
    adaptiveThresholds: AdaptiveThresholds;
    /** Enable regression detection */
    enableRegressionDetection: boolean;
    /** Regression detection sensitivity */
    regressionSensitivity: number;
    /** Performance budgets */
    budgets: PerformanceBudget[];
    /** API tracking configuration */
    apiTracking: {
        enabled: boolean;
        /** Patterns to track (e.g., ['/api/*']) */
        patterns: string[];
        /** Maximum endpoints to track */
        maxEndpoints: number;
    };
    /** Bundle size tracking */
    bundleTracking: {
        enabled: boolean;
        /** Bundle size budget in KB */
        budget: number;
        /** Entry points to track */
        entryPoints: string[];
    };
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
    /** Historical metrics for trend analysis */
    private historicalMetrics;
    /** API endpoint metrics storage */
    private apiMetrics;
    /** Baseline metrics for regression detection */
    private baselineMetrics;
    /** Active regressions */
    private activeRegressions;
    /** Bundle size metrics */
    private bundleMetrics;
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
    /**
     * Get real-time dashboard data for frontend visualization
     */
    getDashboardData(): DashboardData;
    /**
     * Record API endpoint metrics
     */
    recordApiMetrics(path: string, method: string, latencyMs: number, statusCode: number): void;
    /** Storage for endpoint latencies */
    private endpointLatencies;
    private getLatenciesForEndpoint;
    /**
     * Get all API endpoint metrics
     */
    getApiMetrics(): ApiEndpointMetrics[];
    /**
     * Get top slowest API endpoints
     */
    getSlowestEndpoints(limit?: number): ApiEndpointMetrics[];
    /**
     * Get top error-prone API endpoints
     */
    getErrorProneEndpoints(limit?: number): ApiEndpointMetrics[];
    /**
     * Set baseline metrics for regression detection
     */
    setBaseline(): void;
    /**
     * Detect performance regressions
     */
    detectRegression(): RegressionResult[];
    /**
     * Calculate adaptive thresholds based on historical performance
     */
    calculateAdaptiveThresholds(): AdaptiveThresholds;
    /**
     * Check performance budgets
     */
    checkPerformanceBudgets(budgets: PerformanceBudget[]): PerformanceBudgetReport;
    /**
     * Record bundle size metrics
     */
    recordBundleSize(metrics: BundleSizeMetrics): void;
    /**
     * Get bundle size metrics
     */
    getBundleMetrics(): BundleSizeMetrics[];
    /**
     * Analyze performance trends
     */
    analyzeTrends(metric: keyof PerformanceMetrics, windowMinutes?: number): TrendAnalysis;
    /**
     * Store historical metric
     */
    private storeHistoricalMetric;
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
/**
 * Create an enhanced performance monitor with advanced analytics
 */
export declare function createEnhancedPerformanceMonitor(config?: Partial<EnhancedPerformanceConfig>): PerformanceMonitor;
//# sourceMappingURL=performance.d.ts.map