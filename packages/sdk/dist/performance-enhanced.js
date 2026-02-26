/**
 * Performance Enhancement Utilities for Agora SDK
 *
 * Advanced performance optimization tools including lazy loading,
 * memoization, virtual scrolling, and Web Worker utilities.
 *
 * @module performance-enhanced
 * @version 1.0.0
 */
// ============================================================================
// Lazy Loading Utilities
// ============================================================================
/**
 * Dynamic import loader with caching
 */
export class LazyLoader {
    cache = new Map();
    loading = new Map();
    /**
     * Load a module dynamically
     */
    async load(path) {
        // Check cache first
        if (this.cache.has(path)) {
            return this.cache.get(path);
        }
        // Check if already loading
        if (this.loading.has(path)) {
            return this.loading.get(path);
        }
        // Start loading
        const loadPromise = this.doLoad(path);
        this.loading.set(path, loadPromise);
        try {
            const result = await loadPromise;
            this.cache.set(path, result);
            return result;
        }
        finally {
            this.loading.delete(path);
        }
    }
    /**
     * Preload multiple modules
     */
    preload(paths) {
        paths.forEach(path => {
            if (!this.cache.has(path) && !this.loading.has(path)) {
                this.load(path).catch(() => { });
            }
        });
    }
    /**
     * Clear the cache
     */
    clearCache() {
        this.cache.clear();
        this.loading.clear();
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            cached: this.cache.size,
            loading: this.loading.size,
        };
    }
    async doLoad(path) {
        const module = await import(path);
        return module.default || module;
    }
}
// Global lazy loader instance
export const globalLazyLoader = new LazyLoader();
/**
 * Memoization cache with TTL support
 */
export class MemoizeCache {
    defaultTtl;
    cache = new Map();
    constructor(defaultTtl = 60000) {
        this.defaultTtl = defaultTtl;
    }
    /**
     * Get value from cache
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return undefined;
        if (Date.now() > entry.expires) {
            this.cache.delete(key);
            return undefined;
        }
        return entry.value;
    }
    /**
     * Set value in cache
     */
    set(key, value, ttl) {
        const expires = Date.now() + (ttl ?? this.defaultTtl);
        this.cache.set(key, { value, expires });
    }
    /**
     * Check if key exists and not expired
     */
    has(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return false;
        if (Date.now() > entry.expires) {
            this.cache.delete(key);
            return false;
        }
        return true;
    }
    /**
     * Delete key from cache
     */
    delete(key) {
        return this.cache.delete(key);
    }
    /**
     * Clear all entries
     */
    clear() {
        this.cache.clear();
    }
    /**
     * Clean up expired entries
     */
    cleanup() {
        const now = Date.now();
        let cleaned = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expires) {
                this.cache.delete(key);
                cleaned++;
            }
        }
        return cleaned;
    }
    /**
     * Get cache size
     */
    get size() {
        return this.cache.size;
    }
}
/**
 * Create a memoized function
 */
export function memoize(fn, options = {}) {
    const cache = new MemoizeCache(options.ttl);
    return function (...args) {
        const key = options.keyGenerator
            ? options.keyGenerator(...args)
            : JSON.stringify(args);
        const cached = cache.get(key);
        if (cached !== undefined) {
            return cached;
        }
        const result = fn(...args);
        cache.set(key, result);
        return result;
    };
}
// ============================================================================
// Debounce & Throttle
// ============================================================================
/**
 * Debounce function
 */
export function debounce(fn, delay, options = {}) {
    let timeoutId = null;
    let lastArgs = null;
    let lastCallTime = null;
    const debounced = function (...args) {
        lastArgs = args;
        lastCallTime = Date.now();
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        if (options.leading && !timeoutId) {
            fn(...args);
        }
        timeoutId = setTimeout(() => {
            if (options.trailing !== false && lastArgs) {
                fn(...lastArgs);
            }
            timeoutId = null;
            lastArgs = null;
        }, delay);
    };
    debounced.cancel = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        lastArgs = null;
    };
    debounced.flush = () => {
        if (timeoutId && lastArgs) {
            clearTimeout(timeoutId);
            fn(...lastArgs);
            timeoutId = null;
            lastArgs = null;
        }
    };
    return debounced;
}
/**
 * Throttle function
 */
export function throttle(fn, limit, options = {}) {
    let inThrottle = false;
    let lastArgs = null;
    let timeoutId = null;
    const throttled = function (...args) {
        if (!inThrottle) {
            if (options.leading !== false) {
                fn(...args);
            }
            inThrottle = true;
            timeoutId = setTimeout(() => {
                inThrottle = false;
                if (options.trailing !== false && lastArgs) {
                    fn(...lastArgs);
                    lastArgs = null;
                }
            }, limit);
        }
        else {
            lastArgs = args;
        }
    };
    throttled.cancel = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        inThrottle = false;
        lastArgs = null;
    };
    return throttled;
}
/**
 * Virtual list calculator for large datasets
 */
export class VirtualList {
    items;
    options;
    constructor(items, options) {
        this.items = items;
        this.options = {
            overscan: 5,
            ...options,
        };
    }
    /**
     * Calculate visible range based on scroll position
     */
    calculateRange(scrollTop) {
        const { itemHeight, overscan, containerHeight } = this.options;
        const totalHeight = this.items.length * itemHeight;
        const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
        const visibleCount = Math.ceil(containerHeight / itemHeight);
        const endIndex = Math.min(this.items.length - 1, startIndex + visibleCount + overscan * 2);
        return {
            startIndex,
            endIndex,
            offsetY: startIndex * itemHeight,
            totalHeight,
        };
    }
    /**
     * Get visible items
     */
    getVisibleItems(scrollTop) {
        const state = this.calculateRange(scrollTop);
        const items = this.items.slice(state.startIndex, state.endIndex + 1);
        return { items, state };
    }
    /**
     * Update items
     */
    updateItems(items) {
        this.items = items;
    }
    /**
     * Scroll to specific index
     */
    scrollToIndex(index) {
        return index * this.options.itemHeight;
    }
    /**
     * Get total height
     */
    getTotalHeight() {
        return this.items.length * this.options.itemHeight;
    }
}
/**
 * Simple Web Worker pool for offloading heavy computations
 */
export class WorkerPool {
    size;
    workerScript;
    workers = [];
    queue = [];
    busy = new Set();
    taskId = 0;
    constructor(size = navigator.hardwareConcurrency || 4, workerScript) {
        this.size = size;
        this.workerScript = workerScript;
        this.initialize();
    }
    /**
     * Execute a task in a worker
     */
    execute(task) {
        return new Promise((resolve, reject) => {
            const id = `task-${++this.taskId}`;
            this.queue.push({
                id,
                task: task,
                resolve: resolve,
                reject,
            });
            this.processQueue();
        });
    }
    /**
     * Terminate all workers
     */
    terminate() {
        this.workers.forEach(worker => worker.terminate());
        this.workers = [];
        this.busy.clear();
        this.queue = [];
    }
    /**
     * Get pool status
     */
    getStatus() {
        return {
            size: this.size,
            busy: this.busy.size,
            queue: this.queue.length,
        };
    }
    initialize() {
        // In browser environment, create workers
        if (typeof Worker !== 'undefined') {
            for (let i = 0; i < this.size; i++) {
                try {
                    const worker = this.workerScript
                        ? new Worker(this.workerScript)
                        : this.createInlineWorker();
                    worker.onmessage = (e) => {
                        this.handleMessage(worker, e.data);
                    };
                    this.workers.push(worker);
                }
                catch (e) {
                    console.warn('Failed to create worker:', e);
                }
            }
        }
    }
    createInlineWorker() {
        const script = `
      self.onmessage = function(e) {
        const { id, task, data } = e.data;
        try {
          const fn = new Function('data', task);
          const result = fn(data);
          self.postMessage({ id, result });
        } catch (error) {
          self.postMessage({ id, error: error.message });
        }
      };
    `;
        const blob = new Blob([script], { type: 'application/javascript' });
        return new Worker(URL.createObjectURL(blob));
    }
    processQueue() {
        if (this.queue.length === 0)
            return;
        const availableWorker = this.workers.find(w => !this.busy.has(w));
        if (!availableWorker)
            return;
        const taskItem = this.queue.shift();
        this.busy.add(availableWorker);
        try {
            const taskString = taskItem.task.toString();
            availableWorker.postMessage({
                id: taskItem.id,
                task: `return (${taskString})(data)`,
            });
        }
        catch (error) {
            this.busy.delete(availableWorker);
            taskItem.reject(error);
            this.processQueue();
        }
    }
    handleMessage(worker, response) {
        this.busy.delete(worker);
        if (response.error) {
            // Find and reject the task
            // In real implementation, track task -> promise mapping
        }
        this.processQueue();
    }
}
/**
 * Image optimization utilities
 */
export class ImageOptimizer {
    /**
     * Optimize an image file
     */
    static async optimize(file, options = {}) {
        const { maxWidth = 1920, maxHeight = 1080, quality = 0.8, format = 'webp' } = options;
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(url);
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                // Calculate new dimensions
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(blob => {
                    if (blob)
                        resolve(blob);
                    else
                        reject(new Error('Failed to create blob'));
                }, `image/${format}`, quality);
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load image'));
            };
            img.src = url;
        });
    }
    /**
     * Generate a blur placeholder
     */
    static async generatePlaceholder(file, size = 10) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(url);
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }
                ctx.drawImage(img, 0, 0, size, size);
                resolve(canvas.toDataURL('image/jpeg', 0.1));
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load image'));
            };
            img.src = url;
        });
    }
}
/**
 * Analyze bundle size (Node.js only)
 */
export async function analyzeBundle(entryPath) {
    // This is a stub for server-side bundle analysis
    // In a real implementation, this would use webpack-bundle-analyzer or similar
    throw new Error('Bundle analysis requires Node.js environment');
}
/**
 * Check performance against budget
 */
export function checkPerformanceBudget(metrics, budget) {
    const violations = [];
    const checks = [
        { key: 'maxBundleSize', metric: 'bundleSize' },
        { key: 'maxInitialLoad', metric: 'initialLoad' },
        { key: 'maxTTFB', metric: 'ttfb' },
        { key: 'maxFCP', metric: 'fcp' },
        { key: 'maxLCP', metric: 'lcp' },
    ];
    for (const { key, metric } of checks) {
        const budgetValue = budget[key];
        const actualValue = metrics[metric];
        if (budgetValue !== undefined && actualValue !== undefined) {
            const severity = actualValue > budgetValue * 1.2 ? 'error' : 'warning';
            violations.push({
                metric,
                budget: budgetValue,
                actual: actualValue,
                severity,
            });
        }
    }
    return violations;
}
// ============================================================================
// Export default
// ============================================================================
export default {
    LazyLoader,
    globalLazyLoader,
    MemoizeCache,
    memoize,
    debounce,
    throttle,
    VirtualList,
    WorkerPool,
    ImageOptimizer,
    checkPerformanceBudget,
};
//# sourceMappingURL=performance-enhanced.js.map