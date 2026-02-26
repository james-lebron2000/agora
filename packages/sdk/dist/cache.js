/**
 * API Request Cache Layer for Agora SDK
 *
 * Provides intelligent caching for API requests with:
 * - TTL-based expiration
 * - Cache invalidation strategies
 * - Memory and persistent storage options
 * - Cache size limits
 */
// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================
const DEFAULT_CONFIG = {
    ttlMs: 5 * 60 * 1000, // 5 minutes
    maxSize: 50 * 1024 * 1024, // 50MB
    maxEntries: 1000,
    staleWhileRevalidate: true,
    persistent: false,
    storageKey: 'agora-api-cache',
};
// ============================================================================
// API CACHE CLASS
// ============================================================================
export class ApiCache {
    cache = new Map();
    config;
    stats;
    currentSize = 0;
    cleanupInterval = null;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            size: 0,
            entries: 0,
            hitRate: 0,
        };
        if (this.config.persistent) {
            this.loadFromStorage();
        }
        // Start cleanup interval
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 60000); // Clean up every minute
    }
    /**
     * Generate cache key from request
     */
    generateKey(url, params) {
        if (!params || Object.keys(params).length === 0) {
            return url;
        }
        const sortedParams = Object.keys(params)
            .sort()
            .map((k) => `${k}=${JSON.stringify(params[k])}`)
            .join('&');
        return `${url}?${sortedParams}`;
    }
    /**
     * Calculate size of entry in bytes
     */
    calculateSize(data) {
        try {
            return new Blob([JSON.stringify(data)]).size;
        }
        catch {
            return 1024; // Default estimate
        }
    }
    /**
     * Get entry from cache
     */
    get(url, params) {
        const key = this.generateKey(url, params);
        const entry = this.cache.get(key);
        if (!entry) {
            this.stats.misses++;
            this.updateHitRate();
            return null;
        }
        // Check if expired
        if (Date.now() > entry.expiresAt) {
            if (this.config.staleWhileRevalidate) {
                // Return stale data but trigger background refresh
                this.stats.hits++;
                this.updateHitRate();
                return entry;
            }
            this.cache.delete(key);
            this.currentSize -= entry.size;
            this.stats.misses++;
            this.updateHitRate();
            return null;
        }
        this.stats.hits++;
        this.updateHitRate();
        return entry;
    }
    /**
     * Set entry in cache
     */
    set(url, data, params, options = {}) {
        const key = this.generateKey(url, params);
        const ttl = options.ttl || this.config.ttlMs;
        const size = this.calculateSize(data);
        // Check if adding this would exceed max size
        if (size > this.config.maxSize * 0.1) {
            // Don't cache entries larger than 10% of max size
            console.warn(`[ApiCache] Entry too large (${size} bytes), skipping cache`);
            return;
        }
        // Evict entries if necessary
        while (this.currentSize + size > this.config.maxSize ||
            this.cache.size >= this.config.maxEntries) {
            this.evictLRU();
        }
        const entry = {
            data,
            timestamp: Date.now(),
            expiresAt: Date.now() + ttl,
            size,
        };
        this.cache.set(key, entry);
        this.currentSize += size;
        this.updateStats();
        if (this.config.persistent) {
            this.saveToStorage();
        }
    }
    /**
     * Check if cache has valid entry
     */
    has(url, params) {
        const key = this.generateKey(url, params);
        const entry = this.cache.get(key);
        return entry !== undefined && Date.now() <= entry.expiresAt;
    }
    /**
     * Invalidate cache entry
     */
    invalidate(url, params) {
        const key = this.generateKey(url, params);
        const entry = this.cache.get(key);
        if (entry) {
            this.currentSize -= entry.size;
            this.cache.delete(key);
            this.updateStats();
            if (this.config.persistent) {
                this.saveToStorage();
            }
            return true;
        }
        return false;
    }
    /**
     * Invalidate all entries matching pattern
     */
    invalidatePattern(pattern) {
        let count = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (pattern.test(key)) {
                this.currentSize -= entry.size;
                this.cache.delete(key);
                count++;
            }
        }
        this.updateStats();
        if (this.config.persistent) {
            this.saveToStorage();
        }
        return count;
    }
    /**
     * Invalidate entries by tag
     */
    invalidateByTag(tag) {
        // This would require storing tags with entries
        // For now, just clear all (simplified implementation)
        return this.clear();
    }
    /**
     * Clear all cache entries
     */
    clear() {
        const count = this.cache.size;
        this.cache.clear();
        this.currentSize = 0;
        this.updateStats();
        if (this.config.persistent) {
            this.clearStorage();
        }
        return count;
    }
    /**
     * Get cache statistics
     */
    getStats() {
        return { ...this.stats };
    }
    /**
     * Get all cache keys
     */
    keys() {
        return Array.from(this.cache.keys());
    }
    /**
     * Get cache size in bytes
     */
    getSize() {
        return this.currentSize;
    }
    /**
     * Cleanup expired entries
     */
    cleanup() {
        const now = Date.now();
        let cleaned = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.currentSize -= entry.size;
                this.cache.delete(key);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            this.updateStats();
            if (this.config.persistent) {
                this.saveToStorage();
            }
        }
    }
    /**
     * Destroy cache and cleanup
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.clear();
    }
    // ============================================================================
    // PRIVATE METHODS
    // ============================================================================
    evictLRU() {
        let oldestKey = null;
        let oldestTime = Infinity;
        for (const [key, entry] of this.cache.entries()) {
            if (entry.timestamp < oldestTime) {
                oldestTime = entry.timestamp;
                oldestKey = key;
            }
        }
        if (oldestKey) {
            const entry = this.cache.get(oldestKey);
            this.currentSize -= entry.size;
            this.cache.delete(oldestKey);
            this.stats.evictions++;
        }
    }
    updateStats() {
        this.stats.size = this.currentSize;
        this.stats.entries = this.cache.size;
    }
    updateHitRate() {
        const total = this.stats.hits + this.stats.misses;
        this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
    }
    loadFromStorage() {
        if (typeof window === 'undefined' || typeof window.localStorage === 'undefined')
            return;
        try {
            const stored = window.localStorage.getItem(this.config.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                this.cache = new Map(parsed.entries);
                this.currentSize = parsed.size || 0;
                this.cleanup(); // Remove expired entries
            }
        }
        catch (e) {
            console.warn('[ApiCache] Failed to load from storage:', e);
        }
    }
    saveToStorage() {
        if (typeof window === 'undefined' || typeof window.localStorage === 'undefined')
            return;
        try {
            const data = {
                entries: Array.from(this.cache.entries()),
                size: this.currentSize,
                timestamp: Date.now(),
            };
            window.localStorage.setItem(this.config.storageKey, JSON.stringify(data));
        }
        catch (e) {
            console.warn('[ApiCache] Failed to save to storage:', e);
        }
    }
    clearStorage() {
        if (typeof window === 'undefined' || typeof window.localStorage === 'undefined')
            return;
        try {
            window.localStorage.removeItem(this.config.storageKey);
        }
        catch (e) {
            console.warn('[ApiCache] Failed to clear storage:', e);
        }
    }
}
// ============================================================================
// CACHED FETCH FUNCTION
// ============================================================================
let globalCache = null;
export function getGlobalCache() {
    if (!globalCache) {
        globalCache = new ApiCache();
    }
    return globalCache;
}
export function setGlobalCache(cache) {
    globalCache = cache;
}
/**
 * Fetch with caching support
 */
export async function cachedFetch(url, options = {}) {
    const { ttl, skipCache, forceRefresh, tags, cacheKey, ...fetchOptions } = options;
    const cache = getGlobalCache();
    const key = cacheKey || url;
    // Check cache first
    if (!skipCache && !forceRefresh) {
        const cached = cache.get(key);
        if (cached && Date.now() <= cached.expiresAt) {
            return cached.data;
        }
        // Return stale data while revalidating in background
        if (cached && cached.timestamp > 0) {
            // Trigger background refresh
            fetch(url, fetchOptions)
                .then((res) => res.json())
                .then((data) => cache.set(key, data, undefined, { ttl, tags }))
                .catch(() => { });
            return cached.data;
        }
    }
    // Fetch from network
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    // Cache the response
    if (!skipCache) {
        cache.set(key, data, undefined, { ttl, tags });
    }
    return data;
}
/**
 * Create a cached version of any async function
 */
export function withCache(fn, keyGenerator, options = {}) {
    const cache = getGlobalCache();
    return async (...args) => {
        const key = keyGenerator(...args);
        if (!options.skipCache && !options.forceRefresh) {
            const cached = cache.get(key);
            if (cached && Date.now() <= cached.expiresAt) {
                return cached.data;
            }
        }
        const result = await fn(...args);
        cache.set(key, result, undefined, options);
        return result;
    };
}
// ============================================================================
// EXPORTS
// ============================================================================
export default {
    ApiCache,
    getGlobalCache,
    setGlobalCache,
    cachedFetch,
    withCache,
};
//# sourceMappingURL=cache.js.map