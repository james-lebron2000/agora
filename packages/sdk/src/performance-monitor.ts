/**
 * Performance Monitor Module
 * 
 * Provides simple performance tracking, memory monitoring, and metric collection.
 */

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// PerformanceTracker - Track function execution time
// ============================================================================

export class PerformanceTracker {
  private timers = new Map<string, SimplePerformanceMetrics>();
  private history: SimplePerformanceMetrics[] = [];
  private maxHistory: number;

  constructor(options: { maxHistory?: number } = {}) {
    this.maxHistory = options.maxHistory ?? 100;
  }

  /**
   * Start tracking a named operation
   */
  start(name: string): void {
    const startTime = performance.now();
    const memBefore = this.getMemoryUsage();

    this.timers.set(name, {
      name,
      startTime,
      memoryDelta: memBefore as SimpleMemoryInfo,
    });

    console.log(`[PerfTrack] ⏱️  Started: ${name}`);
  }

  /**
   * End tracking and return metrics
   */
  end(name: string): SimplePerformanceMetrics | undefined {
    const timer = this.timers.get(name);
    if (!timer) {
      console.warn(`[PerfTrack] ⚠️  No timer found for: ${name}`);
      return undefined;
    }

    const endTime = performance.now();
    const duration = endTime - timer.startTime;
    const memAfter = this.getMemoryUsage();
    const memoryDelta = timer.memoryDelta ? {
      ...memAfter,
      delta: memAfter.used - timer.memoryDelta.used,
    } : undefined;

    const metrics: SimplePerformanceMetrics = {
      name,
      startTime: timer.startTime,
      endTime,
      duration,
      memoryDelta,
    };

    this.timers.delete(name);
    this.addToHistory(metrics);

    console.log(`[PerfTrack] ✅ Completed: ${name} - ${duration.toFixed(2)}ms`);
    if (memoryDelta?.delta) {
      console.log(`[PerfTrack]    Memory delta: ${this.formatBytes(memoryDelta.delta)}`);
    }

    return metrics;
  }

  /**
   * Check if a timer is currently running
   */
  isRunning(name: string): boolean {
    return this.timers.has(name);
  }

  /**
   * Get all currently running timers
   */
  getRunning(): string[] {
    return Array.from(this.timers.keys());
  }

  /**
   * Get execution history
   */
  getHistory(): SimplePerformanceMetrics[] {
    return [...this.history];
  }

  /**
   * Clear all history and running timers
   */
  clear(): void {
    this.timers.clear();
    this.history = [];
    console.log('[PerfTrack] 🧹 Cleared all timers and history');
  }

  /**
   * Get statistics for a named operation from history
   */
  getStats(name: string): { count: number; avg: number; min: number; max: number } | undefined {
    const records = this.history.filter(h => h.name === name);
    if (records.length === 0) return undefined;

    const durations = records.map(r => r.duration!).filter(d => d !== undefined);
    if (durations.length === 0) return undefined;

    return {
      count: durations.length,
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
    };
  }

  private addToHistory(metrics: SimplePerformanceMetrics): void {
    this.history.push(metrics);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  private getMemoryUsage(): SimpleMemoryInfo {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return {
        used: usage.heapUsed,
        total: usage.heapTotal,
        external: usage.external,
      };
    }
    // Fallback for browser environments
    return {
      used: 0,
      total: 0,
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// ============================================================================
// MemoryMonitor - Monitor memory usage
// ============================================================================

export class MemoryMonitor {
  private snapshots: Array<{ timestamp: number; memory: SimpleMemoryInfo }> = [];
  private maxSnapshots: number;
  private checkInterval?: ReturnType<typeof setInterval>;

  constructor(options: { maxSnapshots?: number } = {}) {
    this.maxSnapshots = options.maxSnapshots ?? 50;
  }

  /**
   * Check current memory usage
   */
  check(): SimpleMemoryInfo {
    const memory = this.getMemoryUsage();
    const snapshot = {
      timestamp: Date.now(),
      memory,
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    console.log(`[MemoryMonitor] 🧠 Heap: ${this.formatBytes(memory.used)} / ${this.formatBytes(memory.total)}`);
    if (memory.external) {
      console.log(`[MemoryMonitor]    External: ${this.formatBytes(memory.external)}`);
    }

    return memory;
  }

  /**
   * Start periodic memory monitoring
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.checkInterval) {
      console.warn('[MemoryMonitor] ⚠️  Monitoring already running');
      return;
    }

    this.checkInterval = setInterval(() => {
      this.check();
    }, intervalMs);

    console.log(`[MemoryMonitor] ▶️  Started monitoring every ${intervalMs}ms`);
  }

  /**
   * Stop periodic memory monitoring
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
      console.log('[MemoryMonitor] ⏹️  Stopped monitoring');
    }
  }

  /**
   * Get memory trend analysis
   */
  getTrend(): { increasing: boolean; delta: number; avgGrowth: number } | undefined {
    if (this.snapshots.length < 2) return undefined;

    const first = this.snapshots[0].memory.used;
    const last = this.snapshots[this.snapshots.length - 1].memory.used;
    const delta = last - first;

    // Calculate average growth rate
    let totalGrowth = 0;
    for (let i = 1; i < this.snapshots.length; i++) {
      totalGrowth += this.snapshots[i].memory.used - this.snapshots[i - 1].memory.used;
    }
    const avgGrowth = totalGrowth / (this.snapshots.length - 1);

    return {
      increasing: delta > 0,
      delta,
      avgGrowth,
    };
  }

  /**
   * Get peak memory usage
   */
  getPeak(): { used: number; timestamp: number } | undefined {
    if (this.snapshots.length === 0) return undefined;

    let peak = this.snapshots[0];
    for (const snapshot of this.snapshots) {
      if (snapshot.memory.used > peak.memory.used) {
        peak = snapshot;
      }
    }

    return {
      used: peak.memory.used,
      timestamp: peak.timestamp,
    };
  }

  /**
   * Get all snapshots
   */
  getSnapshots(): Array<{ timestamp: number; memory: SimpleMemoryInfo }> {
    return [...this.snapshots];
  }

  /**
   * Clear all snapshots
   */
  clear(): void {
    this.snapshots = [];
    console.log('[MemoryMonitor] 🧹 Cleared all snapshots');
  }

  /**
   * Force garbage collection (if available)
   */
  forceGC(): void {
    if (typeof global !== 'undefined' && global.gc) {
      const before = this.check();
      global.gc();
      const after = this.check();
      const freed = before.used - after.used;
      console.log(`[MemoryMonitor] 🗑️  Garbage collected: ${this.formatBytes(freed)} freed`);
    } else {
      console.log('[MemoryMonitor] ⚠️  Garbage collection not available (run with --expose-gc flag)');
    }
  }

  private getMemoryUsage(): SimpleMemoryInfo {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return {
        used: usage.heapUsed,
        total: usage.heapTotal,
        external: usage.external,
      };
    }
    return {
      used: 0,
      total: 0,
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// ============================================================================
// MetricCollector - Collect and report performance metrics
// ============================================================================

export class MetricCollector {
  private metrics = new Map<string, MetricRecord[]>();
  private maxRecords: number;

  constructor(options: { maxRecords?: number } = {}) {
    this.maxRecords = options.maxRecords ?? 1000;
  }

  /**
   * Record a metric value
   */
  record(name: string, value: number): void {
    const record: MetricRecord = {
      name,
      value,
      timestamp: Date.now(),
    };

    let records = this.metrics.get(name);
    if (!records) {
      records = [];
      this.metrics.set(name, records);
    }

    records.push(record);

    // Keep only the most recent records
    if (records.length > this.maxRecords) {
      records.shift();
    }

    console.log(`[MetricCollector] 📊 ${name}: ${value}`);
  }

  /**
   * Record multiple metrics at once
   */
  recordMany(metrics: { name: string; value: number }[]): void {
    for (const { name, value } of metrics) {
      this.record(name, value);
    }
  }

  /**
   * Get all records for a metric
   */
  getRecords(name: string): MetricRecord[] {
    return [...(this.metrics.get(name) ?? [])];
  }

  /**
   * Get statistics for a metric
   */
  getStats(name: string): MetricStats | undefined {
    const records = this.metrics.get(name);
    if (!records || records.length === 0) return undefined;

    const values = records.map(r => r.value);
    const total = values.reduce((a, b) => a + b, 0);

    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: total / values.length,
      total,
    };
  }

  /**
   * Get a comprehensive report
   */
  getReport(): MetricReport {
    const report: MetricReport = {};

    for (const [name, records] of this.metrics.entries()) {
      const values = records.map(r => r.value);
      const total = values.reduce((a, b) => a + b, 0);

      report[name] = {
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: total / values.length,
        total,
        records: [...records],
      };
    }

    return report;
  }

  /**
   * Get all metric names
   */
  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Get recent records within a time window
   */
  getRecent(name: string, windowMs: number): MetricRecord[] {
    const records = this.metrics.get(name);
    if (!records) return [];

    const cutoff = Date.now() - windowMs;
    return records.filter(r => r.timestamp >= cutoff);
  }

  /**
   * Clear all metrics or a specific metric
   */
  clear(name?: string): void {
    if (name) {
      this.metrics.delete(name);
      console.log(`[MetricCollector] 🧹 Cleared metric: ${name}`);
    } else {
      this.metrics.clear();
      console.log('[MetricCollector] 🧹 Cleared all metrics');
    }
  }

  /**
   * Export metrics as JSON
   */
  export(): string {
    return JSON.stringify(this.getReport(), null, 2);
  }

  /**
   * Print a formatted report to console
   */
  printReport(): void {
    const report = this.getReport();
    console.log('\n========== METRIC REPORT ==========');
    
    for (const [name, stats] of Object.entries(report)) {
      console.log(`\n📊 ${name}:`);
      console.log(`   Count: ${stats.count}`);
      console.log(`   Min:   ${stats.min.toFixed(2)}`);
      console.log(`   Max:   ${stats.max.toFixed(2)}`);
      console.log(`   Avg:   ${stats.avg.toFixed(2)}`);
      console.log(`   Total: ${stats.total.toFixed(2)}`);
    }
    
    console.log('\n===================================\n');
  }

  /**
   * Time a function execution and record it
   */
  async timeAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.record(`${name}-duration`, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.record(`${name}-duration`, duration);
      this.record(`${name}-error`, 1);
      throw error;
    }
  }

  /**
   * Time a synchronous function execution and record it
   */
  time<T>(name: string, fn: () => T): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.record(`${name}-duration`, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.record(`${name}-duration`, duration);
      this.record(`${name}-error`, 1);
      throw error;
    }
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create a performance tracker with default settings
 */
export function createPerformanceTracker(options?: { maxHistory?: number }): PerformanceTracker {
  return new PerformanceTracker(options);
}

/**
 * Create a memory monitor with default settings
 */
export function createMemoryMonitor(options?: { maxSnapshots?: number }): MemoryMonitor {
  return new MemoryMonitor(options);
}

/**
 * Create a metric collector with default settings
 */
export function createMetricCollector(options?: { maxRecords?: number }): MetricCollector {
  return new MetricCollector(options);
}
