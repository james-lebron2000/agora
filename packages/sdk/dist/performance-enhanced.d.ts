/**
 * Performance Enhancement Utilities for Agora SDK
 *
 * Advanced performance optimization tools including lazy loading,
 * memoization, virtual scrolling, and Web Worker utilities.
 *
 * @module performance-enhanced
 * @version 1.0.0
 */
/**
 * Dynamic import loader with caching
 */
export declare class LazyLoader<T = unknown> {
    private cache;
    private loading;
    /**
     * Load a module dynamically
     */
    load(path: string): Promise<T>;
    /**
     * Preload multiple modules
     */
    preload(paths: string[]): void;
    /**
     * Clear the cache
     */
    clearCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        cached: number;
        loading: number;
    };
    private doLoad;
}
export declare const globalLazyLoader: LazyLoader<unknown>;
/**
 * Memoization cache with TTL support
 */
export declare class MemoizeCache<K, V> {
    private defaultTtl;
    private cache;
    constructor(defaultTtl?: number);
    /**
     * Get value from cache
     */
    get(key: K): V | undefined;
    /**
     * Set value in cache
     */
    set(key: K, value: V, ttl?: number): void;
    /**
     * Check if key exists and not expired
     */
    has(key: K): boolean;
    /**
     * Delete key from cache
     */
    delete(key: K): boolean;
    /**
     * Clear all entries
     */
    clear(): void;
    /**
     * Clean up expired entries
     */
    cleanup(): number;
    /**
     * Get cache size
     */
    get size(): number;
}
/**
 * Create a memoized function
 */
export declare function memoize<T extends (...args: any[]) => any>(fn: T, options?: {
    ttl?: number;
    keyGenerator?: (...args: Parameters<T>) => string;
}): T;
/**
 * Debounce function
 */
export declare function debounce<T extends (...args: any[]) => any>(fn: T, delay: number, options?: {
    leading?: boolean;
    trailing?: boolean;
}): T & {
    cancel(): void;
    flush(): void;
};
/**
 * Throttle function
 */
export declare function throttle<T extends (...args: any[]) => any>(fn: T, limit: number, options?: {
    leading?: boolean;
    trailing?: boolean;
}): T & {
    cancel(): void;
};
export interface VirtualListOptions {
    itemHeight: number;
    overscan?: number;
    containerHeight: number;
}
export interface VirtualListState {
    startIndex: number;
    endIndex: number;
    offsetY: number;
    totalHeight: number;
}
/**
 * Virtual list calculator for large datasets
 */
export declare class VirtualList<T> {
    private items;
    private options;
    constructor(items: T[], options: VirtualListOptions);
    /**
     * Calculate visible range based on scroll position
     */
    calculateRange(scrollTop: number): VirtualListState;
    /**
     * Get visible items
     */
    getVisibleItems(scrollTop: number): {
        items: T[];
        state: VirtualListState;
    };
    /**
     * Update items
     */
    updateItems(items: T[]): void;
    /**
     * Scroll to specific index
     */
    scrollToIndex(index: number): number;
    /**
     * Get total height
     */
    getTotalHeight(): number;
}
export type WorkerTask<T = unknown> = () => T | Promise<T>;
/**
 * Simple Web Worker pool for offloading heavy computations
 */
export declare class WorkerPool {
    private size;
    private workerScript?;
    private workers;
    private queue;
    private busy;
    private taskId;
    constructor(size?: number, workerScript?: string | undefined);
    /**
     * Execute a task in a worker
     */
    execute<T>(task: WorkerTask<T>): Promise<T>;
    /**
     * Terminate all workers
     */
    terminate(): void;
    /**
     * Get pool status
     */
    getStatus(): {
        size: number;
        busy: number;
        queue: number;
    };
    private initialize;
    private createInlineWorker;
    private processQueue;
    private handleMessage;
}
export interface ImageOptimizationOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png';
}
/**
 * Image optimization utilities
 */
export declare class ImageOptimizer {
    /**
     * Optimize an image file
     */
    static optimize(file: File, options?: ImageOptimizationOptions): Promise<Blob>;
    /**
     * Generate a blur placeholder
     */
    static generatePlaceholder(file: File, size?: number): Promise<string>;
}
export interface ModuleInfo {
    name: string;
    size: number;
    gzipSize: number;
    dependencies: string[];
}
export interface DuplicateModule {
    name: string;
    instances: string[];
    totalSize: number;
}
export interface BundleAnalysis {
    totalSize: number;
    gzippedSize: number;
    moduleCount: number;
    modules: ModuleInfo[];
    duplicates: DuplicateModule[];
    largestModules: ModuleInfo[];
}
/**
 * Analyze bundle size (Node.js only)
 */
export declare function analyzeBundle(entryPath: string): Promise<BundleAnalysis>;
export interface PerformanceBudget {
    maxBundleSize?: number;
    maxInitialLoad?: number;
    maxTTFB?: number;
    maxFCP?: number;
    maxLCP?: number;
}
export interface BudgetViolation {
    metric: string;
    budget: number;
    actual: number;
    severity: 'warning' | 'error';
}
/**
 * Check performance against budget
 */
export declare function checkPerformanceBudget(metrics: Record<string, number>, budget: PerformanceBudget): BudgetViolation[];
declare const _default: {
    LazyLoader: typeof LazyLoader;
    globalLazyLoader: LazyLoader<unknown>;
    MemoizeCache: typeof MemoizeCache;
    memoize: typeof memoize;
    debounce: typeof debounce;
    throttle: typeof throttle;
    VirtualList: typeof VirtualList;
    WorkerPool: typeof WorkerPool;
    ImageOptimizer: typeof ImageOptimizer;
    checkPerformanceBudget: typeof checkPerformanceBudget;
};
export default _default;
//# sourceMappingURL=performance-enhanced.d.ts.map