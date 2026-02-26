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
export class LazyLoader<T = unknown> {
  private cache = new Map<string, T>();
  private loading = new Map<string, Promise<T>>();

  /**
   * Load a module dynamically
   */
  async load(path: string): Promise<T> {
    // Check cache first
    if (this.cache.has(path)) {
      return this.cache.get(path)!;
    }

    // Check if already loading
    if (this.loading.has(path)) {
      return this.loading.get(path)!;
    }

    // Start loading
    const loadPromise = this.doLoad(path);
    this.loading.set(path, loadPromise);

    try {
      const result = await loadPromise;
      this.cache.set(path, result);
      return result;
    } finally {
      this.loading.delete(path);
    }
  }

  /**
   * Preload multiple modules
   */
  preload(paths: string[]): void {
    paths.forEach(path => {
      if (!this.cache.has(path) && !this.loading.has(path)) {
        this.load(path).catch(() => {/* ignore preload errors */});
      }
    });
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    this.loading.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { cached: number; loading: number } {
    return {
      cached: this.cache.size,
      loading: this.loading.size,
    };
  }

  private async doLoad(path: string): Promise<T> {
    const module = await import(path);
    return module.default || module;
  }
}

// Global lazy loader instance
export const globalLazyLoader = new LazyLoader();

// ============================================================================
// Memoization with TTL
// ============================================================================

interface CacheEntry<V> {
  value: V;
  expires: number;
}

/**
 * Memoization cache with TTL support
 */
export class MemoizeCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>();

  constructor(private defaultTtl: number = 60000) {}

  /**
   * Get value from cache
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: K, value: V, ttl?: number): void {
    const expires = Date.now() + (ttl ?? this.defaultTtl);
    this.cache.set(key, { value, expires });
  }

  /**
   * Check if key exists and not expired
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Delete key from cache
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
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
  get size(): number {
    return this.cache.size;
  }
}

/**
 * Create a memoized function
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  options: {
    ttl?: number;
    keyGenerator?: (...args: Parameters<T>) => string;
  } = {}
): T {
  const cache = new MemoizeCache<string, ReturnType<T>>(options.ttl);

  return function (...args: Parameters<T>): ReturnType<T> {
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
  } as T;
}

// ============================================================================
// Debounce & Throttle
// ============================================================================

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): T & { cancel(): void; flush(): void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastCallTime: number | null = null;

  const debounced = function (...args: Parameters<T>): void {
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
  } as T & { cancel(): void; flush(): void };

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
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): T & { cancel(): void } {
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const throttled = function (...args: Parameters<T>): void {
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
    } else {
      lastArgs = args;
    }
  } as T & { cancel(): void };

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

// ============================================================================
// Virtual List
// ============================================================================

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
export class VirtualList<T> {
  private options: Required<VirtualListOptions>;

  constructor(
    private items: T[],
    options: VirtualListOptions
  ) {
    this.options = {
      overscan: 5,
      ...options,
    };
  }

  /**
   * Calculate visible range based on scroll position
   */
  calculateRange(scrollTop: number): VirtualListState {
    const { itemHeight, overscan, containerHeight } = this.options;
    const totalHeight = this.items.length * itemHeight;

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const endIndex = Math.min(
      this.items.length - 1,
      startIndex + visibleCount + overscan * 2
    );

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
  getVisibleItems(scrollTop: number): { items: T[]; state: VirtualListState } {
    const state = this.calculateRange(scrollTop);
    const items = this.items.slice(state.startIndex, state.endIndex + 1);
    return { items, state };
  }

  /**
   * Update items
   */
  updateItems(items: T[]): void {
    this.items = items;
  }

  /**
   * Scroll to specific index
   */
  scrollToIndex(index: number): number {
    return index * this.options.itemHeight;
  }

  /**
   * Get total height
   */
  getTotalHeight(): number {
    return this.items.length * this.options.itemHeight;
  }
}

// ============================================================================
// Web Worker Utilities
// ============================================================================

export type WorkerTask<T = unknown> = () => T | Promise<T>;

interface WorkerMessage {
  id: string;
  task: string;
  data?: unknown;
}

interface WorkerResponse {
  id: string;
  result?: unknown;
  error?: string;
}

/**
 * Simple Web Worker pool for offloading heavy computations
 */
export class WorkerPool {
  private workers: Worker[] = [];
  private queue: Array<{
    id: string;
    task: WorkerTask;
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }> = [];
  private busy = new Set<Worker>();
  private taskId = 0;

  constructor(
    private size: number = navigator.hardwareConcurrency || 4,
    private workerScript?: string
  ) {
    this.initialize();
  }

  /**
   * Execute a task in a worker
   */
  execute<T>(task: WorkerTask<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = `task-${++this.taskId}`;
      this.queue.push({
        id,
        task: task as WorkerTask,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.processQueue();
    });
  }

  /**
   * Terminate all workers
   */
  terminate(): void {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.busy.clear();
    this.queue = [];
  }

  /**
   * Get pool status
   */
  getStatus(): { size: number; busy: number; queue: number } {
    return {
      size: this.size,
      busy: this.busy.size,
      queue: this.queue.length,
    };
  }

  private initialize(): void {
    // In browser environment, create workers
    if (typeof Worker !== 'undefined') {
      for (let i = 0; i < this.size; i++) {
        try {
          const worker = this.workerScript
            ? new Worker(this.workerScript)
            : this.createInlineWorker();
          
          worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
            this.handleMessage(worker, e.data);
          };
          
          this.workers.push(worker);
        } catch (e) {
          console.warn('Failed to create worker:', e);
        }
      }
    }
  }

  private createInlineWorker(): Worker {
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

  private processQueue(): void {
    if (this.queue.length === 0) return;

    const availableWorker = this.workers.find(w => !this.busy.has(w));
    if (!availableWorker) return;

    const taskItem = this.queue.shift()!;
    this.busy.add(availableWorker);

    try {
      const taskString = taskItem.task.toString();
      availableWorker.postMessage({
        id: taskItem.id,
        task: `return (${taskString})(data)`,
      } as WorkerMessage);
    } catch (error) {
      this.busy.delete(availableWorker);
      taskItem.reject(error as Error);
      this.processQueue();
    }
  }

  private handleMessage(worker: Worker, response: WorkerResponse): void {
    this.busy.delete(worker);

    if (response.error) {
      // Find and reject the task
      // In real implementation, track task -> promise mapping
    }

    this.processQueue();
  }
}

// ============================================================================
// Image Optimization
// ============================================================================

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

/**
 * Image optimization utilities
 */
export class ImageOptimizer {
  /**
   * Optimize an image file
   */
  static async optimize(
    file: File,
    options: ImageOptimizationOptions = {}
  ): Promise<Blob> {
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

        canvas.toBlob(
          blob => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create blob'));
          },
          `image/${format}`,
          quality
        );
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
  static async generatePlaceholder(file: File, size: number = 10): Promise<string> {
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

// ============================================================================
// Bundle Analysis (Server-side)
// ============================================================================

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
export async function analyzeBundle(entryPath: string): Promise<BundleAnalysis> {
  // This is a stub for server-side bundle analysis
  // In a real implementation, this would use webpack-bundle-analyzer or similar
  throw new Error('Bundle analysis requires Node.js environment');
}

// ============================================================================
// Performance Budget
// ============================================================================

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
export function checkPerformanceBudget(
  metrics: Record<string, number>,
  budget: PerformanceBudget
): BudgetViolation[] {
  const violations: BudgetViolation[] = [];

  const checks: Array<{ key: keyof PerformanceBudget; metric: string }> = [
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
