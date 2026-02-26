/**
 * API Request Cache Layer for Agora SDK
 *
 * Provides intelligent caching for API requests with:
 * - TTL-based expiration
 * - Cache invalidation strategies
 * - Memory and persistent storage options
 * - Cache size limits
 */
export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
    etag?: string;
    size: number;
}
export interface CacheStats {
    hits: number;
    misses: number;
    evictions: number;
    size: number;
    entries: number;
    hitRate: number;
}
export interface CacheConfig {
    ttlMs: number;
    maxSize: number;
    maxEntries: number;
    staleWhileRevalidate: boolean;
    persistent: boolean;
    storageKey?: string;
}
export interface CacheOptions {
    ttl?: number;
    skipCache?: boolean;
    forceRefresh?: boolean;
    tags?: string[];
}
export declare class ApiCache {
    private cache;
    private config;
    private stats;
    private currentSize;
    private cleanupInterval;
    constructor(config?: Partial<CacheConfig>);
    /**
     * Generate cache key from request
     */
    private generateKey;
    /**
     * Calculate size of entry in bytes
     */
    private calculateSize;
    /**
     * Get entry from cache
     */
    get<T>(url: string, params?: Record<string, unknown>): CacheEntry<T> | null;
    /**
     * Set entry in cache
     */
    set<T>(url: string, data: T, params?: Record<string, unknown>, options?: CacheOptions): void;
    /**
     * Check if cache has valid entry
     */
    has(url: string, params?: Record<string, unknown>): boolean;
    /**
     * Invalidate cache entry
     */
    invalidate(url: string, params?: Record<string, unknown>): boolean;
    /**
     * Invalidate all entries matching pattern
     */
    invalidatePattern(pattern: RegExp): number;
    /**
     * Invalidate entries by tag
     */
    invalidateByTag(tag: string): number;
    /**
     * Clear all cache entries
     */
    clear(): number;
    /**
     * Get cache statistics
     */
    getStats(): CacheStats;
    /**
     * Get all cache keys
     */
    keys(): string[];
    /**
     * Get cache size in bytes
     */
    getSize(): number;
    /**
     * Cleanup expired entries
     */
    cleanup(): void;
    /**
     * Destroy cache and cleanup
     */
    destroy(): void;
    private evictLRU;
    private updateStats;
    private updateHitRate;
    private loadFromStorage;
    private saveToStorage;
    private clearStorage;
    private isBrowserEnvironment;
}
export declare function getGlobalCache(): ApiCache;
export declare function setGlobalCache(cache: ApiCache): void;
export interface CachedFetchOptions extends RequestInit, CacheOptions {
    cacheKey?: string;
}
/**
 * Fetch with caching support
 */
export declare function cachedFetch<T>(url: string, options?: CachedFetchOptions): Promise<T>;
/**
 * Create a cached version of any async function
 */
export declare function withCache<TArgs extends unknown[], TReturn>(fn: (...args: TArgs) => Promise<TReturn>, keyGenerator: (...args: TArgs) => string, options?: CacheOptions): (...args: TArgs) => Promise<TReturn>;
export interface UseCachedFetchResult<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    invalidate: () => void;
}
/**
 * Hook for using cached fetch (to be used with React)
 * Note: This is a type definition only - actual implementation would need React
 */
export type UseCachedFetch<T> = (url: string, options?: CachedFetchOptions) => UseCachedFetchResult<T>;
declare const _default: {
    ApiCache: typeof ApiCache;
    getGlobalCache: typeof getGlobalCache;
    setGlobalCache: typeof setGlobalCache;
    cachedFetch: typeof cachedFetch;
    withCache: typeof withCache;
};
export default _default;
//# sourceMappingURL=cache.d.ts.map