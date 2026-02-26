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

// ============================================================================
// NEW ENHANCED TYPES - Performance Analytics v2.0
// ============================================================================

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

// ============================================================================
// NEW ENHANCED CONFIGURATION
// ============================================================================

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

  // ============================================================================
  // NEW ENHANCED STORAGE
  // ============================================================================

  /** Historical metrics for trend analysis */
  private historicalMetrics: PerformanceMetrics[] = [];
  /** API endpoint metrics storage */
  private apiMetrics: Map<string, ApiEndpointMetrics> = new Map();
  /** Baseline metrics for regression detection */
  private baselineMetrics: PerformanceMetrics | null = null;
  /** Active regressions */
  private activeRegressions: RegressionResult[] = [];
  /** Bundle size metrics */
  private bundleMetrics: BundleSizeMetrics[] = [];

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
    this.historicalMetrics = [];
    this.apiMetrics.clear();
    this.activeRegressions = [];

    const now = Date.now();
    this.windows = {
      '1m': { latencies: [], errors: 0, total: 0, startTime: now },
      '5m': { latencies: [], errors: 0, total: 0, startTime: now },
      '15m': { latencies: [], errors: 0, total: 0, startTime: now },
    };
  }

  // ============================================================================
  // NEW ENHANCED METHODS - Performance Analytics v2.0
  // ============================================================================

  /**
   * Get real-time dashboard data for frontend visualization
   */
  getDashboardData(): DashboardData {
    const current = this.getMetrics();
    const histogram = this.getLatencyHistogram();

    // Calculate health score
    let healthScore = 100;
    if (current.latency.p99 > 1000) healthScore -= 30;
    else if (current.latency.p95 > 500) healthScore -= 15;
    if (current.errorRate > 0.05) healthScore -= 40;
    else if (current.errorRate > 0.01) healthScore -= 10;
    if ((current.memory.usagePercent ?? 0) > 0.85) healthScore -= 25;
    else if ((current.memory.usagePercent ?? 0) > 0.7) healthScore -= 10;

    // Determine status
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (healthScore < 50) status = 'critical';
    else if (healthScore < 75) status = 'degraded';

    return {
      current,
      history: this.historicalMetrics.slice(-100),
      windows: {
        '1m': this.getWindowMetrics('1m'),
        '5m': this.getWindowMetrics('5m'),
        '15m': this.getWindowMetrics('15m'),
      },
      latencyHistogram: histogram,
      memoryTrend: this.memorySnapshots.slice(-50),
      healthScore: Math.max(0, healthScore),
      status,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Record API endpoint metrics
   */
  recordApiMetrics(
    path: string,
    method: string,
    latencyMs: number,
    statusCode: number
  ): void {
    const key = `${method}:${path}`;
    const now = Date.now();

    let metrics = this.apiMetrics.get(key);
    if (!metrics) {
      metrics = {
        path,
        method,
        requestCount: 0,
        latency: { avg: 0, p50: 0, p95: 0, p99: 0, min: latencyMs, max: latencyMs },
        errors: { count: 0, rate: 0, byStatusCode: {} },
        rps: 0,
        lastCalled: now,
      };
    }

    // Update request count
    metrics.requestCount++;

    // Update latency
    const latencies = this.getLatenciesForEndpoint(key);
    latencies.push(latencyMs);
    const sorted = [...latencies].sort((a, b) => a - b);
    metrics.latency = {
      avg: sorted.reduce((a, b) => a + b, 0) / sorted.length,
      p50: this.percentile(sorted, 0.5),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99),
      min: Math.min(metrics.latency.min, latencyMs),
      max: Math.max(metrics.latency.max, latencyMs),
    };

    // Update errors
    if (statusCode >= 400) {
      metrics.errors.count++;
      metrics.errors.byStatusCode[statusCode] = (metrics.errors.byStatusCode[statusCode] || 0) + 1;
    }
    metrics.errors.rate = metrics.errors.count / metrics.requestCount;

    // Update RPS (requests in last minute)
    const timeWindow = (now - metrics.lastCalled) / 1000;
    metrics.rps = timeWindow > 0 ? 1 / timeWindow : 0;
    metrics.lastCalled = now;

    this.apiMetrics.set(key, metrics);
  }

  /** Storage for endpoint latencies */
  private endpointLatencies: Map<string, number[]> = new Map();

  private getLatenciesForEndpoint(key: string): number[] {
    if (!this.endpointLatencies.has(key)) {
      this.endpointLatencies.set(key, []);
    }
    const latencies = this.endpointLatencies.get(key)!;
    // Keep only last 1000 samples
    if (latencies.length > 1000) {
      latencies.shift();
    }
    return latencies;
  }

  /**
   * Get all API endpoint metrics
   */
  getApiMetrics(): ApiEndpointMetrics[] {
    return Array.from(this.apiMetrics.values()).sort((a, b) => b.requestCount - a.requestCount);
  }

  /**
   * Get top slowest API endpoints
   */
  getSlowestEndpoints(limit: number = 5): ApiEndpointMetrics[] {
    return this.getApiMetrics()
      .sort((a, b) => b.latency.p95 - a.latency.p95)
      .slice(0, limit);
  }

  /**
   * Get top error-prone API endpoints
   */
  getErrorProneEndpoints(limit: number = 5): ApiEndpointMetrics[] {
    return this.getApiMetrics()
      .filter(m => m.errors.rate > 0)
      .sort((a, b) => b.errors.rate - a.errors.rate)
      .slice(0, limit);
  }

  /**
   * Set baseline metrics for regression detection
   */
  setBaseline(): void {
    this.baselineMetrics = this.getMetrics();
  }

  /**
   * Detect performance regressions
   */
  detectRegression(): RegressionResult[] {
    if (!this.baselineMetrics) {
      return [];
    }

    const current = this.getMetrics();
    const regressions: RegressionResult[] = [];
    const now = Date.now();

    // Check latency regression
    const latencyChange = (current.latency.p95 - this.baselineMetrics.latency.p95) / this.baselineMetrics.latency.p95;
    if (latencyChange > 0.2) {
      regressions.push({
        hasRegression: true,
        type: 'latency',
        severity: latencyChange > 0.5 ? 'critical' : 'warning',
        changePercent: latencyChange * 100,
        baselineValue: this.baselineMetrics.latency.p95,
        currentValue: current.latency.p95,
        detectedAt: now,
        confidence: Math.min(latencyChange * 2, 0.95),
      });
    }

    // Check error rate regression
    const errorChange = current.errorRate - this.baselineMetrics.errorRate;
    if (errorChange > 0.01) {
      regressions.push({
        hasRegression: true,
        type: 'error_rate',
        severity: errorChange > 0.05 ? 'critical' : 'warning',
        changePercent: errorChange * 100,
        baselineValue: this.baselineMetrics.errorRate,
        currentValue: current.errorRate,
        detectedAt: now,
        confidence: Math.min(errorChange * 20, 0.95),
      });
    }

    // Check memory regression
    const currentMemory = current.memory.usagePercent ?? 0;
    const baselineMemory = this.baselineMetrics.memory.usagePercent ?? 0;
    const memoryChange = currentMemory - baselineMemory;
    if (memoryChange > 0.1) {
      regressions.push({
        hasRegression: true,
        type: 'memory',
        severity: memoryChange > 0.2 ? 'critical' : 'warning',
        changePercent: memoryChange * 100,
        baselineValue: baselineMemory,
        currentValue: currentMemory,
        detectedAt: now,
        confidence: Math.min(memoryChange * 5, 0.95),
      });
    }

    // Check throughput regression
    const throughputChange = (this.baselineMetrics.throughput.rps - current.throughput.rps) / this.baselineMetrics.throughput.rps;
    if (throughputChange > 0.2) {
      regressions.push({
        hasRegression: true,
        type: 'throughput',
        severity: throughputChange > 0.5 ? 'critical' : 'warning',
        changePercent: throughputChange * 100,
        baselineValue: this.baselineMetrics.throughput.rps,
        currentValue: current.throughput.rps,
        detectedAt: now,
        confidence: Math.min(throughputChange * 2, 0.95),
      });
    }

    this.activeRegressions = regressions;

    // Trigger alerts for new regressions
    regressions.forEach(regression => {
      this.triggerAlert({
        type: 'regression',
        severity: regression.severity,
        message: `Performance regression detected: ${regression.type} increased by ${regression.changePercent.toFixed(1)}%`,
        value: regression.currentValue,
        threshold: regression.baselineValue,
        context: { regression },
      });
    });

    return regressions;
  }

  /**
   * Calculate adaptive thresholds based on historical performance
   */
  calculateAdaptiveThresholds(): AdaptiveThresholds {
    if (this.historicalMetrics.length < 10) {
      return {
        enabled: true,
        baselineWindow: 60,
        sensitivity: 0.8,
        minSamples: 10,
        calculated: { ...DEFAULT_THRESHOLDS },
      };
    }

    // Use last hour of data
    const recent = this.historicalMetrics.slice(-60);

    // Calculate p95 of latencies as threshold
    const latencies = recent.flatMap(m => [m.latency.p50, m.latency.p95]);
    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    const p95Latency = this.percentile(sortedLatencies, 0.95);

    // Calculate average error rate + 2 std dev
    const errorRates = recent.map(m => m.errorRate);
    const avgError = errorRates.reduce((a, b) => a + b, 0) / errorRates.length;
    const variance = errorRates.reduce((sum, r) => sum + Math.pow(r - avgError, 2), 0) / errorRates.length;
    const stdDev = Math.sqrt(variance);
    const errorThreshold = Math.min(avgError + 2 * stdDev, 0.1);

    // Calculate average memory + 10%
    const memoryUsages = recent.map(m => m.memory.usagePercent ?? 0);
    const avgMemory = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length;

    return {
      enabled: true,
      baselineWindow: 60,
      sensitivity: 0.8,
      minSamples: 10,
      calculated: {
        maxLatencyMs: Math.max(1000, p95Latency * 1.5),
        maxErrorRate: Math.max(0.01, errorThreshold),
        maxMemoryPercent: Math.min(0.95, avgMemory * 1.2),
        minThroughput: 1,
      },
    };
  }

  /**
   * Check performance budgets
   */
  checkPerformanceBudgets(budgets: PerformanceBudget[]): PerformanceBudgetReport {
    const current = this.getMetrics();
    const results: PerformanceBudget[] = [];
    let passCount = 0;

    budgets.forEach(budget => {
      let currentValue = 0;

      switch (budget.metric) {
        case 'latency':
          currentValue = current.latency.p95;
          break;
        case 'error_rate':
          currentValue = current.errorRate;
          break;
        case 'memory':
          currentValue = current.memory.usagePercent ?? 0;
          break;
        default:
          currentValue = 0;
      }

      let status: 'pass' | 'warning' | 'fail' = 'pass';
      if (currentValue > budget.max) status = 'fail';
      else if (currentValue > budget.warning) status = 'warning';
      else passCount++;

      results.push({
        ...budget,
        current: currentValue,
        status,
      });
    });

    // Check for budget failures and trigger alerts
    results.filter(r => r.status === 'fail').forEach(budget => {
      this.triggerAlert({
        type: 'budget_exceeded',
        severity: 'critical',
        message: `Performance budget exceeded: ${budget.name} (${budget.current?.toFixed(2)} > ${budget.max})`,
        value: budget.current ?? 0,
        threshold: budget.max,
      });
    });

    return {
      overallStatus: passCount === budgets.length ? 'pass' : (passCount / budgets.length > 0.5 ? 'warning' : 'fail'),
      passRate: passCount / budgets.length,
      budgets: results,
      timestamp: Date.now(),
    };
  }

  /**
   * Record bundle size metrics
   */
  recordBundleSize(metrics: BundleSizeMetrics): void {
    const existingIndex = this.bundleMetrics.findIndex(b => b.name === metrics.name);
    if (existingIndex >= 0) {
      this.bundleMetrics[existingIndex] = metrics;
    } else {
      this.bundleMetrics.push(metrics);
    }
  }

  /**
   * Get bundle size metrics
   */
  getBundleMetrics(): BundleSizeMetrics[] {
    return this.bundleMetrics;
  }

  /**
   * Analyze performance trends
   */
  analyzeTrends(metric: keyof PerformanceMetrics, windowMinutes: number = 60): TrendAnalysis {
    const samples = this.historicalMetrics.slice(-windowMinutes);
    if (samples.length < 2) {
      return {
        metric,
        window: `${windowMinutes}m`,
        direction: 'stable',
        changeRate: 0,
        significance: 1,
        forecast: 0,
      };
    }

    const values = samples.map(s => {
      const val = s[metric];
      if (typeof val === 'number') return val;
      if (typeof val === 'object' && 'p95' in val) return (val as any).p95;
      return 0;
    });

    const first = values[0];
    const last = values[values.length - 1];
    const changeRate = (last - first) / windowMinutes;

    let direction: 'improving' | 'stable' | 'degrading' = 'stable';
    const changePercent = Math.abs((last - first) / first);
    if (changePercent > 0.1) {
      // For latency, lower is better. For throughput, higher is better
      const isBetter = metric === 'throughput' ? last > first : last < first;
      direction = isBetter ? 'improving' : 'degrading';
    }

    return {
      metric,
      window: `${windowMinutes}m`,
      direction,
      changeRate,
      significance: 0.05, // Simplified
      forecast: last + changeRate * 60, // Forecast next hour
    };
  }

  /**
   * Store historical metric
   */
  private storeHistoricalMetric(): void {
    const metrics = this.getMetrics();
    this.historicalMetrics.push(metrics);

    // Keep only last 24 hours of data (assuming 1 sample per minute)
    if (this.historicalMetrics.length > 1440) {
      this.historicalMetrics.shift();
    }
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
    this.storeHistoricalMetric();
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
  
  const usagePercent = metrics.memory.usagePercent ?? 0;
  if (usagePercent > 0.85) {
    recommendations.push({
      id: randomUUID(),
      severity: 'critical',
      category: 'memory',
      title: 'High Memory Usage',
      description: `Memory usage is \${(usagePercent * 100).toFixed(1)}%`,
      action: 'Optimize data structures, implement pagination, add memory limits',
      impact: 'Prevent out-of-memory crashes',
      effort: 'high',
    });
    healthScore -= 25;
    criticalCount++;
  } else if (usagePercent > 0.7) {
    recommendations.push({
      id: randomUUID(),
      severity: 'warning',
      category: 'memory',
      title: 'Elevated Memory Usage',
      description: `Memory usage is \${(usagePercent * 100).toFixed(1)}%`,
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
    
    const lastUsagePercent = last.memory.usagePercent ?? 0;
    const firstUsagePercent = first.memory.usagePercent ?? 0;
    if (lastUsagePercent > firstUsagePercent * 1.1) {
      trends.memory = 'degrading';
    } else if (lastUsagePercent < firstUsagePercent * 0.9) {
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

// ============================================================================
// NEW ENHANCED EXPORTS
// ============================================================================

/**
 * Create an enhanced performance monitor with advanced analytics
 */
export function createEnhancedPerformanceMonitor(
  config?: Partial<EnhancedPerformanceConfig>
): PerformanceMonitor {
  return new PerformanceMonitor(config);
}
