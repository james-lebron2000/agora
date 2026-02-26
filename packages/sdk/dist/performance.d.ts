/**
 * Performance Optimization Module for Agora SDK
 *
 * Provides comprehensive performance monitoring, benchmarking,
 * memory leak detection, latency tracking, and optimization recommendations.
 */
interface WebSocketLike {
    readyState: number;
    OPEN: number;
    send(data: string): void;
    close(): void;
    onopen: (() => void) | null;
    onclose: (() => void) | null;
    onerror: ((error: unknown) => void) | null;
    onmessage: ((event: {
        data: unknown;
    }) => void) | null;
}
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
export interface OperationCacheEntry<T> {
    value: T;
    expiresAt: number;
    accessCount: number;
    createdAt: number;
}
/** @deprecated Use OperationCacheEntry */
export type CacheEntry<T> = OperationCacheEntry<T>;
export interface OperationCacheOptions {
    ttlMs: number;
    maxSize?: number;
    updateOnAccess?: boolean;
}
/** @deprecated Use OperationCacheOptions */
export type CacheOptions = OperationCacheOptions;
export declare class OperationCache<T = unknown> {
    private cache;
    private options;
    private hits;
    private misses;
    private evictions;
    constructor(options: OperationCacheOptions);
    /**
     * Get a value from the cache
     */
    get(key: string): T | undefined;
    /**
     * Set a value in the cache
     */
    set(key: string, value: T): void;
    /**
     * Delete a value from the cache
     */
    delete(key: string): boolean;
    /**
     * Check if a key exists and is not expired
     */
    has(key: string): boolean;
    /**
     * Clear all entries
     */
    clear(): void;
    /**
     * Get cache statistics
     */
    getStats(): {
        size: number;
        hits: number;
        misses: number;
        hitRate: number;
        evictions: number;
    };
    /**
     * Get all valid keys
     */
    keys(): string[];
    /**
     * Clean up expired entries
     */
    cleanup(): number;
    private evictLRU;
}
/**
 * Create a TTL cache
 */
export declare function createCache<T>(options: CacheOptions): OperationCache<T>;
/**
 * Wrap a function with caching
 */
export declare function withCache<TArgs extends unknown[], TReturn>(fn: (...args: TArgs) => Promise<TReturn>, keyFn: (...args: TArgs) => string, cache: OperationCache<TReturn>): (...args: TArgs) => Promise<TReturn>;
/**
 * Alias for withCache - wraps a function with caching
 * @deprecated Use withCache instead
 */
export declare function withPerformanceCache<TArgs extends unknown[], TReturn>(fn: (...args: TArgs) => Promise<TReturn>, keyFn: (...args: TArgs) => string, cache: OperationCache<TReturn>): (...args: TArgs) => Promise<TReturn>;
export interface BatchConfig {
    maxBatchSize: number;
    maxWaitMs: number;
    retryAttempts?: number;
    retryDelayMs?: number;
}
export interface BatchItem<T, R> {
    id: string;
    request: T;
    resolve: (result: R) => void;
    reject: (error: Error) => void;
    timestamp: number;
    attempts: number;
}
export declare class BatchProcessor<T, R> {
    private queue;
    private config;
    private processor;
    private timeout;
    private isProcessing;
    private totalBatches;
    private totalItems;
    private failedBatches;
    constructor(processor: (items: T[]) => Promise<R[]>, config: BatchConfig);
    /**
     * Add an item to the batch queue
     */
    add(request: T): Promise<R>;
    /**
     * Process the current batch
     */
    private processBatch;
    /**
     * Flush all pending items
     */
    flush(): Promise<void>;
    /**
     * Get queue statistics
     */
    getStats(): {
        queueSize: number;
        totalBatches: number;
        totalItems: number;
        failedBatches: number;
        successRate: number;
    };
    /**
     * Clear the queue and reject all pending items
     */
    clear(reason?: string): void;
}
/**
 * Create a batch processor
 */
export declare function createBatchProcessor<T, R>(processor: (items: T[]) => Promise<R[]>, config: BatchConfig): BatchProcessor<T, R>;
export interface WebSocketPoolConfig {
    minConnections: number;
    maxConnections: number;
    idleTimeoutMs: number;
    connectionTimeoutMs: number;
    heartbeatIntervalMs: number;
}
export interface PooledConnection {
    id: string;
    ws: WebSocketLike;
    isActive: boolean;
    lastUsed: number;
    createdAt: number;
    messageCount: number;
}
export declare class WebSocketPool {
    private connections;
    private config;
    private url;
    private connectionFactory;
    private heartbeatInterval;
    private cleanupInterval;
    private waitQueue;
    constructor(url: string, config: Partial<WebSocketPoolConfig>, connectionFactory?: () => WebSocketLike);
    /**
     * Initialize the pool with minimum connections
     */
    initialize(): Promise<void>;
    /**
     * Acquire a connection from the pool
     */
    acquire(): Promise<PooledConnection>;
    /**
     * Release a connection back to the pool
     */
    release(connection: PooledConnection): void;
    /**
     * Create a new connection
     */
    private createConnection;
    /**
     * Send heartbeat to all connections
     */
    private sendHeartbeats;
    /**
     * Clean up idle connections
     */
    private cleanupIdleConnections;
    /**
     * Ensure minimum connections
     */
    private ensureMinimumConnections;
    /**
     * Get pool statistics
     */
    getStats(): {
        totalConnections: number;
        activeConnections: number;
        idleConnections: number;
        waitQueueLength: number;
    };
    /**
     * Broadcast a message to all connections
     */
    broadcast(message: unknown): void;
    /**
     * Close all connections and cleanup
     */
    destroy(): void;
}
/**
 * Create a WebSocket connection pool
 */
export declare function createWebSocketPool(url: string, config?: Partial<WebSocketPoolConfig>, connectionFactory?: () => WebSocketLike): WebSocketPool;
export interface LazyLoaderConfig {
    preload?: boolean;
    preloadDelayMs?: number;
    retryAttempts?: number;
    retryDelayMs?: number;
    timeoutMs?: number;
}
export declare class LazyLoader<T> {
    private loader;
    private config;
    private instance;
    private loadingPromise;
    private isLoaded;
    private loadAttempts;
    private unloadCallbacks;
    constructor(loader: () => Promise<T>, config?: LazyLoaderConfig);
    /**
     * Load the component
     */
    load(): Promise<T>;
    private doLoad;
    /**
     * Get the loaded instance (throws if not loaded)
     */
    get(): T;
    /**
     * Check if component is loaded
     */
    loaded(): boolean;
    /**
     * Unload the component
     */
    unload(): void;
    /**
     * Register a callback to be called when unloading
     */
    onUnload(callback: () => void): () => void;
    private delay;
}
/**
 * Create a lazy loader
 */
export declare function createLazyLoader<T>(loader: () => Promise<T>, config?: LazyLoaderConfig): LazyLoader<T>;
export interface RateLimiterConfig {
    requestsPerSecond: number;
    burstSize?: number;
    enableAdaptiveBackoff?: boolean;
    backoffMultiplier?: number;
    maxBackoffMs?: number;
    recoveryRate?: number;
}
export interface RateLimitState {
    tokens: number;
    lastUpdate: number;
    currentBackoffMs: number;
    consecutiveErrors: number;
    successCount: number;
}
export declare class AdaptiveRateLimiter {
    private config;
    private state;
    private waiting;
    constructor(config: RateLimiterConfig);
    /**
     * Acquire permission to make a request
     */
    acquire(): Promise<void>;
    /**
     * Report a successful request
     */
    reportSuccess(): void;
    /**
     * Report a failed request (triggers backoff)
     */
    reportError(error?: Error): void;
    /**
     * Get current state
     */
    getState(): RateLimitState;
    private refillTokens;
    private delay;
}
/**
 * Create an adaptive rate limiter
 */
export declare function createRateLimiter(config: RateLimiterConfig): AdaptiveRateLimiter;
export interface DedupeConfig {
    ttlMs: number;
    maxPending?: number;
}
export interface PendingRequest<T> {
    id: string;
    promise: Promise<T>;
    resolvers: Array<(result: T) => void>;
    rejecters: Array<(error: Error) => void>;
    timestamp: number;
}
export declare class RequestDeduplicator<TArgs extends unknown[], TReturn> {
    private fn;
    private config;
    private pending;
    private completed;
    private dedupeCount;
    constructor(fn: (...args: TArgs) => Promise<TReturn>, config: DedupeConfig);
    /**
     * Execute with deduplication
     */
    execute(...args: TArgs): Promise<TReturn>;
    /**
     * Get deduplication statistics
     */
    getStats(): {
        pendingCount: number;
        completedCount: number;
        dedupeCount: number;
    };
    /**
     * Clear all caches
     */
    clear(): void;
    private getKey;
    private cleanup;
}
/**
 * Create a request deduplicator
 */
export declare function createDeduplicator<TArgs extends unknown[], TReturn>(fn: (...args: TArgs) => Promise<TReturn>, config: DedupeConfig): RequestDeduplicator<TArgs, TReturn>;
/**
 * Wrap a function with deduplication
 */
export declare function withDeduplication<TArgs extends unknown[], TReturn>(fn: (...args: TArgs) => Promise<TReturn>, config: DedupeConfig): (...args: TArgs) => Promise<TReturn>;
export interface ChunkConfig {
    name: string;
    files: string[];
    async?: boolean;
    preload?: boolean;
}
export interface BundleAnalyzer {
    chunks: ChunkConfig[];
    maxChunkSize: number;
    totalSize: number;
}
export declare class BundleOptimizer {
    private chunks;
    private loadedChunks;
    private preloadQueue;
    /**
     * Register a chunk
     */
    registerChunk(config: ChunkConfig): void;
    /**
     * Load a chunk on demand
     */
    loadChunk(name: string): Promise<void>;
    /**
     * Preload chunks in the background
     */
    preload(): Promise<void>;
    /**
     * Get bundle analysis
     */
    analyze(): BundleAnalyzer;
    /**
     * Check if a chunk is loaded
     */
    isLoaded(name: string): boolean;
    /**
     * Get loaded chunk names
     */
    getLoadedChunks(): string[];
    /**
     * Estimate file size (simplified)
     */
    private estimateSize;
    private loadAsync;
    private loadSync;
}
/**
 * Create a bundle optimizer
 */
export declare function createBundleOptimizer(): BundleOptimizer;
/**
 * Dynamic import helper with retry
 */
export declare function dynamicImport<T>(importer: () => Promise<T>, options?: {
    retries?: number;
    retryDelayMs?: number;
    timeoutMs?: number;
}): Promise<T>;
/**
 * Prefetch a module for faster subsequent loads
 */
export declare function prefetchModule(specifier: string): void;
/**
 * Create an enhanced performance monitor with advanced analytics
 */
export declare function createEnhancedPerformanceMonitor(config?: Partial<EnhancedPerformanceConfig>): PerformanceMonitor;
//# sourceMappingURL=performance.d.ts.map