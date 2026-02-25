/**
 * Performance Optimization Module for Agora SDK
 * 
 * Provides comprehensive performance monitoring, benchmarking,
 * memory leak detection, latency tracking, and optimization recommendations.
 */

import { randomUUID } from 'crypto';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

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

interface WindowMetrics {
  latencies: number[];
  errors: number;
  total: number;
  startTime: number;
}

const DEFAULT_THRESHOLDS: AlertThresholds = {
  maxLatencyMs: 1000,
  maxErrorRate: 0.01,
  maxMemoryPercent: 0.9,
  minThroughput: 10,
};

const DEFAULT_CONFIG: PerformanceMonitorConfig = {
  sampleIntervalMs: 5000,
  maxSamples: 1000,
  thresholds: DEFAULT_THRESHOLDS,
  enableLeakDetection: true,
  leakDetectionIntervalMs: 60000,
  windows: {
    short: 1,
    medium: 5,
    long: 15,
  },
};

export class PerformanceMonitor {
  private config: PerformanceMonitorConfig;
  private isRunning: boolean = false;
  private sampleInterval: ReturnType<typeof setInterval> | null = null;
  private leakDetectionInterval: ReturnType<typeof setInterval> | null = null;
  
  private latencySamples: number[] = [];
  private errorCount: number = 0;
  private totalOperations: number = 0;
  private memorySnapshots: MemorySnapshot[] = [];
  
  private windows: {
    '1m': WindowMetrics;
    '5m': WindowMetrics;
    '15m': WindowMetrics;
  };

  private lastAlerts: Map<string, number> = new Map();
  private readonly ALERT_COOLDOWN_MS = 60000;

  constructor(config: Partial<PerformanceMonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.config.thresholds = { ...DEFAULT_THRESHOLDS, ...config.thresholds };
    
    const now = Date.now();
    this.windows = {
      '1m': { latencies: [], errors: 0, total: 0, startTime: now },
      '5m': { latencies: [], errors: 0, total: 0, startTime: now },
      '15m': { latencies: [], errors: 0, total: 0, startTime: now },
    };
  }

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    this.sampleInterval = setInterval(() => {
      this.sampleMetrics();
    }, this.config.sampleIntervalMs);
    
    if (this.config.enableLeakDetection) {
      this.leakDetectionInterval = setInterval(() => {
        this.detectMemoryLeak();
      }, this.config.leakDetectionIntervalMs);
    }
  }

  stop(): void {
    this.isRunning = false;
    
    if (this.sampleInterval) {
      clearInterval(this.sampleInterval);
      this.sampleInterval = null;
    }
    
    if (this.leakDetectionInterval) {
      clearInterval(this.leakDetectionInterval);
      this.leakDetectionInterval = null;
    }
  }

  recordLatency(latencyMs: number, success: boolean = true): void {
    this.latencySamples.push(latencyMs);
    this.totalOperations++;
    
    if (!success) {
      this.errorCount++;
    }
    
    const now = Date.now();
    this.addToWindow('1m', latencyMs, success, now);
    this.addToWindow('5m', latencyMs, success, now);
    this.addToWindow('15m', latencyMs, success, now);
    
    if (this.latencySamples.length > this.config.maxSamples) {
      this.latencySamples = this.latencySamples.slice(-this.config.maxSamples);
    }
    
    this.checkLatencyThreshold(latencyMs);
  }

  recordMemory(): MemorySnapshot {
    const usage = this.getMemoryUsage();
    const snapshot: MemorySnapshot = {
      id: randomUUID(),
      timestamp: Date.now(),
      ...usage,
    };
    
    this.memorySnapshots.push(snapshot);
    
    if (this.memorySnapshots.length > 1000) {
      this.memorySnapshots = this.memorySnapshots.slice(-1000);
    }
    
    if (usage.usagePercent > this.config.thresholds.maxMemoryPercent) {
      this.triggerAlert({
        type: 'memory',
        severity: 'critical',
        message: `Memory usage exceeded threshold: ${(usage.usagePercent * 100).toFixed(1)}%`,
        value: usage.usagePercent,
        threshold: this.config.thresholds.maxMemoryPercent,
      });
    }
    
    return snapshot;
  }

  getMemoryUsage(): Omit<MemorySnapshot, 'id' | 'timestamp'> {
    const mem = process.memoryUsage();
    const usagePercent = mem.heapTotal > 0 ? mem.heapUsed / mem.heapTotal : 0;
    
    return {
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      rss: mem.rss,
      external: mem.external,
      arrayBuffers: mem.arrayBuffers || 0,
      usagePercent,
    };
  }

  getLatencyHistogram(samples: number[] = this.latencySamples): LatencyHistogram {
    if (samples.length === 0) {
      return {
        count: 0,
        p50: 0,
        p75: 0,
        p90: 0,
        p95: 0,
        p99: 0,
        p999: 0,
        min: 0,
        max: 0,
        avg: 0,
      };
    }
    
    const sorted = [...samples].sort((a, b) => a - b);
    const count = sorted.length;
    
    return {
      count,
      p50: this.percentile(sorted, 0.5),
      p75: this.percentile(sorted, 0.75),
      p90: this.percentile(sorted, 0.9),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99),
      p999: this.percentile(sorted, 0.999),
      min: sorted[0],
      max: sorted[count - 1],
      avg: sorted.reduce((a, b) => a + b, 0) / count,
    };
  }

  getMetrics(): PerformanceMetrics {
    const histogram = this.getLatencyHistogram();
    const memory = this.getMemoryUsage();
    
    const now = Date.now();
    const recentOps = this.totalOperations;
    
    return {
      id: randomUUID(),
      timestamp: now,
      latency: {
        avg: histogram.avg,
        min: histogram.min,
        max: histogram.max,
        p50: histogram.p50,
        p95: histogram.p95,
        p99: histogram.p99,
      },
      throughput: {
        rps: recentOps / Math.max((now - this.windows['1m'].startTime) / 1000, 1),
        opm: recentOps / Math.max((now - this.windows['1m'].startTime) / 60000, 1),
        total: this.totalOperations,
      },
      memory,
      errorRate: this.totalOperations > 0 ? this.errorCount / this.totalOperations : 0,
      errorCount: this.errorCount,
    };
  }

  getWindowMetrics(window: '1m' | '5m' | '15m'): PerformanceMetrics {
    const w = this.windows[window];
    const histogram = this.getLatencyHistogram(w.latencies);
    const memory = this.getMemoryUsage();
    const duration = (Date.now() - w.startTime) / 1000;
    
    return {
      id: randomUUID(),
      timestamp: Date.now(),
      latency: {
        avg: histogram.avg,
        min: histogram.min,
        max: histogram.max,
        p50: histogram.p50,
        p95: histogram.p95,
        p99: histogram.p99,
      },
      throughput: {
        rps: w.total / Math.max(duration, 1),
        opm: w.total / Math.max(duration / 60, 1),
        total: w.total,
      },
      memory,
      errorRate: w.total > 0 ? w.errors / w.total : 0,
      errorCount: w.errors,
    };
  }

  detectMemoryLeak(): LeakDetectionResult {
    if (this.memorySnapshots.length < 10) {
      return {
        hasLeak: false,
        confidence: 0,
        growthRate: 0,
        suspectedSources: [],
        recommendation: 'Insufficient data for leak detection. Continue monitoring.',
      };
    }
    
    const recent = this.memorySnapshots.slice(-10);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const timeSpan = (last.timestamp - first.timestamp) / 60000;
    
    if (timeSpan < 1) {
      return {
        hasLeak: false,
        confidence: 0,
        growthRate: 0,
        suspectedSources: [],
        recommendation: 'Insufficient time span for leak detection.',
      };
    }
    
    const growthRate = (last.heapUsed - first.heapUsed) / timeSpan;
    
    const xValues = recent.map((_, i) => i);
    const yValues = recent.map(s => s.heapUsed);
    const correlation = this.correlation(xValues, yValues);
    
    const hasLeak = correlation > 0.8 && growthRate > 1024 * 1024;
    const confidence = Math.min(correlation * 100, 100);
    
    const result: LeakDetectionResult = {
      hasLeak,
      confidence,
      growthRate,
      suspectedSources: hasLeak ? this.identifyLeakSources() : [],
      recommendation: hasLeak
        ? `Potential memory leak detected: \${(growthRate / 1024 / 1024).toFixed(2)} MB/min growth.`
        : 'No significant memory leak patterns detected.',
    };
    
    if (hasLeak) {
      this.triggerAlert({
        type: 'leak_detected',
        severity: 'critical',
        message: result.recommendation,
        value: growthRate,
        threshold: 1024 * 1024,
        context: { growthRate, confidence },
      });
    }
    
    return result;
  }

  reset(): void {
    this.latencySamples = [];
    this.errorCount = 0;
    this.totalOperations = 0;
    this.memorySnapshots = [];
    
    const now = Date.now();
    this.windows = {
      '1m': { latencies: [], errors: 0, total: 0, startTime: now },
      '5m': { latencies: [], errors: 0, total: 0, startTime: now },
      '15m': { latencies: [], errors: 0, total: 0, startTime: now },
    };
  }

  getPrometheusMetrics(): string {
    const metrics = this.getMetrics();
    const lines: string[] = [];
    
    lines.push('# HELP agora_latency_ms Latency in milliseconds');
    lines.push('# TYPE agora_latency_ms summary');
    lines.push(`agora_latency_ms{quantile="0.5"} \${metrics.latency.p50}`);
    lines.push(`agora_latency_ms{quantile="0.95"} \${metrics.latency.p95}`);
    lines.push(`agora_latency_ms{quantile="0.99"} \${metrics.latency.p99}`);
    lines.push(`agora_latency_ms_sum \${metrics.latency.avg * metrics.throughput.total}`);
    lines.push(`agora_latency_ms_count \${metrics.throughput.total}`);
    
    lines.push('# HELP agora_throughput_rps Requests per second');
    lines.push('# TYPE agora_throughput_rps gauge');
    lines.push(`agora_throughput_rps \${metrics.throughput.rps}`);
    
    lines.push('# HELP agora_memory_heap_used_bytes Heap used in bytes');
    lines.push('# TYPE agora_memory_heap_used_bytes gauge');
    lines.push(`agora_memory_heap_used_bytes \${metrics.memory.heapUsed}`);
    
    lines.push('# HELP agora_error_rate Error rate (0-1)');
    lines.push('# TYPE agora_error_rate gauge');
    lines.push(`agora_error_rate \${metrics.errorRate}`);
    
    return lines.join('\\n');
  }

  private addToWindow(
    window: '1m' | '5m' | '15m',
    latency: number,
    success: boolean,
    timestamp: number
  ): void {
    const w = this.windows[window];
    const windowMs = window === '1m' ? 60000 : window === '5m' ? 300000 : 900000;
    
    if (timestamp - w.startTime > windowMs) {
      w.latencies = [];
      w.errors = 0;
      w.total = 0;
      w.startTime = timestamp;
    }
    
    w.latencies.push(latency);
    w.total++;
    if (!success) {
      w.errors++;
    }
  }

  private sampleMetrics(): void {
    this.recordMemory();
  }

  private checkLatencyThreshold(latencyMs: number): void {
    if (latencyMs > this.config.thresholds.maxLatencyMs) {
      this.triggerAlert({
        type: 'latency',
        severity: latencyMs > this.config.thresholds.maxLatencyMs * 2 ? 'critical' : 'warning',
        message: `High latency detected: \${latencyMs.toFixed(2)}ms`,
        value: latencyMs,
        threshold: this.config.thresholds.maxLatencyMs,
      });
    }
  }

  private triggerAlert(alert: Omit<PerformanceAlert, 'id' | 'timestamp'>): void {
    const now = Date.now();
    const alertKey = `\${alert.type}:\${alert.severity}`;
    
    const lastAlert = this.lastAlerts.get(alertKey);
    if (lastAlert && now - lastAlert < this.ALERT_COOLDOWN_MS) {
      return;
    }
    
    this.lastAlerts.set(alertKey, now);
    
    const fullAlert: PerformanceAlert = {
      ...alert,
      id: randomUUID(),
      timestamp: now,
    };
    
    if (this.config.onAlert) {
      this.config.onAlert(fullAlert);
    }
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  private correlation(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private identifyLeakSources(): string[] {
    return [
      'Check for unclosed event listeners',
      'Review large object caches without TTL',
      'Inspect callback closures capturing large scopes',
      'Verify cleanup in component unmount/disconnect',
    ];
  }
}

export function createPerformanceMonitor(
  config?: Partial<PerformanceMonitorConfig>
): PerformanceMonitor {
  return new PerformanceMonitor(config);
}

export async function benchmark<T>(
  name: string,
  fn: () => T | Promise<T>,
  iterations: number = 1000
): Promise<BenchmarkResult> {
  const samples: number[] = [];
  
  for (let i = 0; i < Math.min(10, iterations / 10); i++) {
    await fn();
  }
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    samples.push(end - start);
  }
  
  const totalTime = samples.reduce((a, b) => a + b, 0);
  const avgTime = totalTime / iterations;
  const minTime = Math.min(...samples);
  const maxTime = Math.max(...samples);
  
  const variance = samples.reduce((sum, s) => sum + Math.pow(s - avgTime, 2), 0) / iterations;
  const stdDev = Math.sqrt(variance);
  
  return {
    name,
    iterations,
    totalTime,
    avgTime,
    minTime,
    maxTime,
    stdDev,
    opsPerSecond: 1000 / avgTime,
    samples,
  };
}

export function measureLatency<T>(
  fn: () => T,
  monitor?: PerformanceMonitor
): { result: T; latencyMs: number } {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  const latencyMs = end - start;
  
  if (monitor) {
    monitor.recordLatency(latencyMs);
  }
  
  return { result, latencyMs };
}

export async function measureLatencyAsync<T>(
  fn: () => Promise<T>,
  monitor?: PerformanceMonitor
): Promise<{ result: T; latencyMs: number }> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  const latencyMs = end - start;
  
  if (monitor) {
    monitor.recordLatency(latencyMs);
  }
  
  return { result, latencyMs };
}

export function withLatencyTracking<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  monitor: PerformanceMonitor,
  name?: string
): (...args: TArgs) => TReturn {
  return (...args: TArgs): TReturn => {
    const start = performance.now();
    try {
      const result = fn(...args);
      const end = performance.now();
      monitor.recordLatency(end - start);
      return result;
    } catch (error) {
      const end = performance.now();
      monitor.recordLatency(end - start, false);
      throw error;
    }
  };
}

export function withLatencyTrackingAsync<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  monitor: PerformanceMonitor,
  name?: string
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    const start = performance.now();
    try {
      const result = await fn(...args);
      const end = performance.now();
      monitor.recordLatency(end - start);
      return result;
    } catch (error) {
      const end = performance.now();
      monitor.recordLatency(end - start, false);
      throw error;
    }
  };
}

export function trackMemory(
  monitor: PerformanceMonitor,
  intervalMs: number = 5000
): () => void {
  const interval = setInterval(() => {
    monitor.recordMemory();
  }, intervalMs);
  
  return () => clearInterval(interval);
}

export function generateOptimizationReport(
  monitor: PerformanceMonitor,
  historicalMetrics?: PerformanceMetrics[]
): OptimizationReport {
  const metrics = monitor.getMetrics();
  const recommendations: OptimizationRecommendation[] = [];
  
  let healthScore = 100;
  let criticalCount = 0;
  let warningCount = 0;
  let infoCount = 0;
  
  if (metrics.latency.p99 > 1000) {
    recommendations.push({
      id: randomUUID(),
      severity: 'critical',
      category: 'latency',
      title: 'High P99 Latency',
      description: `P99 latency is \${metrics.latency.p99.toFixed(2)}ms, exceeding 1s threshold`,
      action: 'Implement request caching, optimize database queries, or add connection pooling',
      impact: 'Significant improvement in user experience',
      effort: 'medium',
    });
    healthScore -= 30;
    criticalCount++;
  } else if (metrics.latency.p95 > 500) {
    recommendations.push({
      id: randomUUID(),
      severity: 'warning',
      category: 'latency',
      title: 'Elevated P95 Latency',
      description: `P95 latency is \${metrics.latency.p95.toFixed(2)}ms`,
      action: 'Review slow queries and optimize hot paths',
      impact: 'Moderate improvement in response times',
      effort: 'low',
    });
    healthScore -= 15;
    warningCount++;
  }
  
  if (metrics.errorRate > 0.05) {
    recommendations.push({
      id: randomUUID(),
      severity: 'critical',
      category: 'errors',
      title: 'High Error Rate',
      description: `Error rate is \${(metrics.errorRate * 100).toFixed(2)}%`,
      action: 'Review error logs, implement circuit breakers, add retry logic',
      impact: 'Critical stability improvement',
      effort: 'high',
    });
    healthScore -= 40;
    criticalCount++;
  } else if (metrics.errorRate > 0.01) {
    recommendations.push({
      id: randomUUID(),
      severity: 'warning',
      category: 'errors',
      title: 'Elevated Error Rate',
      description: `Error rate is \${(metrics.errorRate * 100).toFixed(2)}%`,
      action: 'Investigate error patterns and add error handling',
      impact: 'Improved reliability',
      effort: 'medium',
    });
    healthScore -= 10;
    warningCount++;
  }
  
  if (metrics.memory.usagePercent > 0.85) {
    recommendations.push({
      id: randomUUID(),
      severity: 'critical',
      category: 'memory',
      title: 'High Memory Usage',
      description: `Memory usage is \${(metrics.memory.usagePercent * 100).toFixed(1)}%`,
      action: 'Optimize data structures, implement pagination, add memory limits',
      impact: 'Prevent out-of-memory crashes',
      effort: 'high',
    });
    healthScore -= 25;
    criticalCount++;
  } else if (metrics.memory.usagePercent > 0.7) {
    recommendations.push({
      id: randomUUID(),
      severity: 'warning',
      category: 'memory',
      title: 'Elevated Memory Usage',
      description: `Memory usage is \${(metrics.memory.usagePercent * 100).toFixed(1)}%`,
      action: 'Review memory-intensive operations and consider streaming',
      impact: 'Better resource utilization',
      effort: 'medium',
    });
    healthScore -= 10;
    warningCount++;
  }
  
  if (metrics.throughput.rps < 10 && metrics.throughput.total > 100) {
    recommendations.push({
      id: randomUUID(),
      severity: 'warning',
      category: 'throughput',
      title: 'Low Throughput',
      description: `Current throughput is \${metrics.throughput.rps.toFixed(2)} RPS`,
      action: 'Consider load balancing, horizontal scaling, or optimizing bottlenecks',
      impact: 'Handle more concurrent requests',
      effort: 'high',
    });
    healthScore -= 10;
    warningCount++;
  }
  
  // General recommendations
  if (recommendations.length === 0) {
    recommendations.push({
      id: randomUUID(),
      severity: 'info',
      category: 'general',
      title: 'Performance Looking Good',
      description: 'All key metrics are within acceptable ranges',
      action: 'Continue monitoring and consider setting up performance budgets',
      impact: 'Maintain current performance levels',
      effort: 'low',
    });
    infoCount++;
  }
  
  // Calculate trends
  const trends = {
    latency: 'stable',
    throughput: 'stable',
    memory: 'stable',
  };
  
  if (historicalMetrics && historicalMetrics.length >= 2) {
    const sorted = [...historicalMetrics].sort((a, b) => a.timestamp - b.timestamp);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    
    if (last.latency.p95 > first.latency.p95 * 1.2) {
      trends.latency = 'degrading';
    } else if (last.latency.p95 < first.latency.p95 * 0.8) {
      trends.latency = 'improving';
    }
    
    if (last.throughput.rps > first.throughput.rps * 1.2) {
      trends.throughput = 'improving';
    } else if (last.throughput.rps < first.throughput.rps * 0.8) {
      trends.throughput = 'degrading';
    }
    
    if (last.memory.usagePercent > first.memory.usagePercent * 1.1) {
      trends.memory = 'degrading';
    } else if (last.memory.usagePercent < first.memory.usagePercent * 0.9) {
      trends.memory = 'improving';
    }
  }
  
  // Sort recommendations by severity
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  recommendations.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  
  return {
    id: randomUUID(),
    timestamp: Date.now(),
    summary: {
      healthScore: Math.max(0, healthScore),
      totalRecommendations: recommendations.length,
      criticalCount,
      warningCount,
      infoCount,
    },
    metrics,
    recommendations,
    trends,
  };
}

// Export default for convenience
export default {
  PerformanceMonitor,
  createPerformanceMonitor,
  benchmark,
  measureLatency,
  measureLatencyAsync,
  withLatencyTracking,
  withLatencyTrackingAsync,
  trackMemory,
  generateOptimizationReport,
};
