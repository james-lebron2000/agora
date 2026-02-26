/**
 * Performance Monitor Module
 *
 * Provides simple performance tracking, memory monitoring, and metric collection.
 */
export interface SimplePerformanceMetrics {
    name: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    memoryDelta?: SimpleMemoryInfo;
}
export interface SimpleMemoryInfo {
    used: number;
    total: number;
    external?: number;
    delta?: number;
}
export interface MetricRecord {
    name: string;
    value: number;
    timestamp: number;
}
export interface MetricStats {
    count: number;
    min: number;
    max: number;
    avg: number;
    total: number;
}
export interface MetricReport {
    [key: string]: MetricStats & {
        records: MetricRecord[];
    };
}
export declare class PerformanceTracker {
    private timers;
    private history;
    private maxHistory;
    constructor(options?: {
        maxHistory?: number;
    });
    /**
     * Start tracking a named operation
     */
    start(name: string): void;
    /**
     * End tracking and return metrics
     */
    end(name: string): SimplePerformanceMetrics | undefined;
    /**
     * Check if a timer is currently running
     */
    isRunning(name: string): boolean;
    /**
     * Get all currently running timers
     */
    getRunning(): string[];
    /**
     * Get execution history
     */
    getHistory(): SimplePerformanceMetrics[];
    /**
     * Clear all history and running timers
     */
    clear(): void;
    /**
     * Get statistics for a named operation from history
     */
    getStats(name: string): {
        count: number;
        avg: number;
        min: number;
        max: number;
    } | undefined;
    private addToHistory;
    private getMemoryUsage;
    private formatBytes;
}
export declare class MemoryMonitor {
    private snapshots;
    private maxSnapshots;
    private checkInterval?;
    constructor(options?: {
        maxSnapshots?: number;
    });
    /**
     * Check current memory usage
     */
    check(): SimpleMemoryInfo;
    /**
     * Start periodic memory monitoring
     */
    startMonitoring(intervalMs?: number): void;
    /**
     * Stop periodic memory monitoring
     */
    stopMonitoring(): void;
    /**
     * Get memory trend analysis
     */
    getTrend(): {
        increasing: boolean;
        delta: number;
        avgGrowth: number;
    } | undefined;
    /**
     * Get peak memory usage
     */
    getPeak(): {
        used: number;
        timestamp: number;
    } | undefined;
    /**
     * Get all snapshots
     */
    getSnapshots(): Array<{
        timestamp: number;
        memory: SimpleMemoryInfo;
    }>;
    /**
     * Clear all snapshots
     */
    clear(): void;
    /**
     * Force garbage collection (if available)
     */
    forceGC(): void;
    private getMemoryUsage;
    private formatBytes;
}
export declare class MetricCollector {
    private metrics;
    private maxRecords;
    constructor(options?: {
        maxRecords?: number;
    });
    /**
     * Record a metric value
     */
    record(name: string, value: number): void;
    /**
     * Record multiple metrics at once
     */
    recordMany(metrics: {
        name: string;
        value: number;
    }[]): void;
    /**
     * Get all records for a metric
     */
    getRecords(name: string): MetricRecord[];
    /**
     * Get statistics for a metric
     */
    getStats(name: string): MetricStats | undefined;
    /**
     * Get a comprehensive report
     */
    getReport(): MetricReport;
    /**
     * Get all metric names
     */
    getMetricNames(): string[];
    /**
     * Get recent records within a time window
     */
    getRecent(name: string, windowMs: number): MetricRecord[];
    /**
     * Clear all metrics or a specific metric
     */
    clear(name?: string): void;
    /**
     * Export metrics as JSON
     */
    export(): string;
    /**
     * Print a formatted report to console
     */
    printReport(): void;
    /**
     * Time a function execution and record it
     */
    timeAsync<T>(name: string, fn: () => Promise<T>): Promise<T>;
    /**
     * Time a synchronous function execution and record it
     */
    time<T>(name: string, fn: () => T): T;
}
/**
 * Create a performance tracker with default settings
 */
export declare function createPerformanceTracker(options?: {
    maxHistory?: number;
}): PerformanceTracker;
/**
 * Create a memory monitor with default settings
 */
export declare function createMemoryMonitor(options?: {
    maxSnapshots?: number;
}): MemoryMonitor;
/**
 * Create a metric collector with default settings
 */
export declare function createMetricCollector(options?: {
    maxRecords?: number;
}): MetricCollector;
//# sourceMappingURL=performance-monitor.d.ts.map