import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppState, AppStateStatus, NativeModules, Platform } from 'react-native';

// ============================================================================
// Types
// ============================================================================

export interface PerformanceMetrics {
  fps: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  latency: {
    avg: number;
    min: number;
    max: number;
    p95: number;
  };
  throughput: {
    rps: number;
    total: number;
  };
  errorRate: number;
  timestamp: number;
}

export interface MetricHistory {
  fps: number[];
  memory: number[];
  latency: number[];
  timestamps: number[];
}

export type SeverityLevel = 'info' | 'warning' | 'critical';

export interface PerformanceAlert {
  id: string;
  type: 'fps' | 'memory' | 'latency' | 'error_rate';
  severity: SeverityLevel;
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
}

export interface AlertThresholds {
  minFps: number;
  maxLatencyMs: number;
  maxMemoryPercent: number;
  maxErrorRate: number;
}

export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  opsPerSecond: number;
}

export interface OptimizationSuggestion {
  id: string;
  metric: string;
  severity: 'high' | 'medium' | 'low';
  suggestion: string;
  action: string;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_THRESHOLDS: AlertThresholds = {
  minFps: 30,
  maxLatencyMs: 1000,
  maxMemoryPercent: 0.85,
  maxErrorRate: 0.05,
};

const MAX_HISTORY_POINTS = 60; // Keep last 60 data points (5 minutes at 5s intervals)

// ============================================================================
// Helper Functions
// ============================================================================

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Calculate percentile from sorted array
const calculatePercentile = (sortedArray: number[], percentile: number): number => {
  if (sortedArray.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, index)];
};

// ============================================================================
// Performance Hook
// ============================================================================

interface UsePerformanceOptions {
  refreshIntervalMs?: number;
  thresholds?: Partial<AlertThresholds>;
  maxHistoryPoints?: number;
  onAlert?: (alert: PerformanceAlert) => void;
  enabled?: boolean;
}

export function usePerformance(options: UsePerformanceOptions = {}) {
  const {
    refreshIntervalMs = 5000,
    thresholds: userThresholds = {},
    maxHistoryPoints = MAX_HISTORY_POINTS,
    onAlert,
    enabled = true,
  } = options;

  const thresholds = useMemo(
    () => ({ ...DEFAULT_THRESHOLDS, ...userThresholds }),
    [userThresholds]
  );

  // Current metrics state
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memory: { used: 0, total: 0, percentage: 0 },
    latency: { avg: 0, min: 0, max: 0, p95: 0 },
    throughput: { rps: 0, total: 0 },
    errorRate: 0,
    timestamp: Date.now(),
  });

  // History for charts
  const [history, setHistory] = useState<MetricHistory>({
    fps: [],
    memory: [],
    latency: [],
    timestamps: [],
  });

  // Alerts
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);

  // Internal refs for tracking
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(Date.now());
  const latencySamplesRef = useRef<number[]>([]);
  const errorCountRef = useRef(0);
  const totalOperationsRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const frameIdRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const lastAlertTimeRef = useRef<Record<string, number>>({});

  // Calculate FPS using requestAnimationFrame
  const measureFps = useCallback(() => {
    const now = Date.now();
    const elapsed = now - lastFrameTimeRef.current;

    if (elapsed >= 1000) {
      const fps = Math.round((frameCountRef.current * 1000) / elapsed);
      frameCountRef.current = 0;
      lastFrameTimeRef.current = now;
      return Math.min(fps, 120); // Cap at 120fps
    }

    frameCountRef.current++;
    return null;
  }, []);

  // Get memory info (if available)
  const getMemoryInfo = useCallback(() => {
    // React Native doesn't provide direct memory access
    // Return mock values for now, can be enhanced with native modules
    const used = 50 + Math.random() * 100; // Mock MB
    const total = 256; // Mock total MB
    return {
      used,
      total,
      percentage: used / total,
    };
  }, []);

  // Calculate latency statistics
  const calculateLatencyStats = useCallback(() => {
    const samples = latencySamplesRef.current;
    if (samples.length === 0) {
      return { avg: 0, min: 0, max: 0, p95: 0 };
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      avg: sum / sorted.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: calculatePercentile(sorted, 95),
    };
  }, []);

  // Record a latency measurement
  const recordLatency = useCallback((latencyMs: number, success: boolean = true) => {
    latencySamplesRef.current.push(latencyMs);
    totalOperationsRef.current++;

    if (!success) {
      errorCountRef.current++;
    }

    // Keep only recent samples
    if (latencySamplesRef.current.length > 1000) {
      latencySamplesRef.current = latencySamplesRef.current.slice(-1000);
    }
  }, []);

  // Record an error
  const recordError = useCallback(() => {
    errorCountRef.current++;
    totalOperationsRef.current++;
  }, []);

  // Check thresholds and generate alerts
  const checkThresholds = useCallback(
    (currentMetrics: PerformanceMetrics) => {
      const now = Date.now();
      const newAlerts: PerformanceAlert[] = [];
      const cooldownMs = 60000; // 1 minute cooldown between same alert type

      // Check FPS
      if (currentMetrics.fps < thresholds.minFps) {
        const lastAlert = lastAlertTimeRef.current['fps'] || 0;
        if (now - lastAlert > cooldownMs) {
          const alert: PerformanceAlert = {
            id: generateId(),
            type: 'fps',
            severity: currentMetrics.fps < 20 ? 'critical' : 'warning',
            message: `Low FPS detected: ${currentMetrics.fps.toFixed(1)}`,
            value: currentMetrics.fps,
            threshold: thresholds.minFps,
            timestamp: now,
          };
          newAlerts.push(alert);
          lastAlertTimeRef.current['fps'] = now;
          onAlert?.(alert);
        }
      }

      // Check Memory
      if (currentMetrics.memory.percentage > thresholds.maxMemoryPercent) {
        const lastAlert = lastAlertTimeRef.current['memory'] || 0;
        if (now - lastAlert > cooldownMs) {
          const alert: PerformanceAlert = {
            id: generateId(),
            type: 'memory',
            severity: currentMetrics.memory.percentage > 0.95 ? 'critical' : 'warning',
            message: `High memory usage: ${(currentMetrics.memory.percentage * 100).toFixed(1)}%`,
            value: currentMetrics.memory.percentage,
            threshold: thresholds.maxMemoryPercent,
            timestamp: now,
          };
          newAlerts.push(alert);
          lastAlertTimeRef.current['memory'] = now;
          onAlert?.(alert);
        }
      }

      // Check Latency
      if (currentMetrics.latency.p95 > thresholds.maxLatencyMs) {
        const lastAlert = lastAlertTimeRef.current['latency'] || 0;
        if (now - lastAlert > cooldownMs) {
          const alert: PerformanceAlert = {
            id: generateId(),
            type: 'latency',
            severity: currentMetrics.latency.p95 > thresholds.maxLatencyMs * 2 ? 'critical' : 'warning',
            message: `High latency detected: P95=${currentMetrics.latency.p95.toFixed(0)}ms`,
            value: currentMetrics.latency.p95,
            threshold: thresholds.maxLatencyMs,
            timestamp: now,
          };
          newAlerts.push(alert);
          lastAlertTimeRef.current['latency'] = now;
          onAlert?.(alert);
        }
      }

      // Check Error Rate
      if (currentMetrics.errorRate > thresholds.maxErrorRate) {
        const lastAlert = lastAlertTimeRef.current['error_rate'] || 0;
        if (now - lastAlert > cooldownMs) {
          const alert: PerformanceAlert = {
            id: generateId(),
            type: 'error_rate',
            severity: currentMetrics.errorRate > 0.1 ? 'critical' : 'warning',
            message: `High error rate: ${(currentMetrics.errorRate * 100).toFixed(1)}%`,
            value: currentMetrics.errorRate,
            threshold: thresholds.maxErrorRate,
            timestamp: now,
          };
          newAlerts.push(alert);
          lastAlertTimeRef.current['error_rate'] = now;
          onAlert?.(alert);
        }
      }

      if (newAlerts.length > 0) {
        setAlerts((prev) => [...prev, ...newAlerts].slice(-50)); // Keep last 50 alerts
      }
    },
    [thresholds, onAlert]
  );

  // Update metrics
  const updateMetrics = useCallback(() => {
    if (!isRunningRef.current) return;

    const fps = measureFps();
    const memory = getMemoryInfo();
    const latency = calculateLatencyStats();

    const now = Date.now();
    const errorRate = totalOperationsRef.current > 0
      ? errorCountRef.current / totalOperationsRef.current
      : 0;

    const newMetrics: PerformanceMetrics = {
      fps: fps ?? metrics.fps,
      memory,
      latency,
      throughput: {
        rps: totalOperationsRef.current / Math.max((now % 60000) / 1000, 1),
        total: totalOperationsRef.current,
      },
      errorRate,
      timestamp: now,
    };

    setMetrics(newMetrics);
    checkThresholds(newMetrics);

    // Update history
    setHistory((prev) => ({
      fps: [...prev.fps.slice(-maxHistoryPoints + 1), newMetrics.fps],
      memory: [...prev.memory.slice(-maxHistoryPoints + 1), newMetrics.memory.percentage * 100],
      latency: [...prev.latency.slice(-maxHistoryPoints + 1), newMetrics.latency.avg],
      timestamps: [...prev.timestamps.slice(-maxHistoryPoints + 1), now],
    }));
  }, [measureFps, getMemoryInfo, calculateLatencyStats, checkThresholds, maxHistoryPoints, metrics.fps]);

  // Animation frame loop for FPS
  const frameLoop = useCallback(() => {
    if (!isRunningRef.current) return;
    measureFps();
    frameIdRef.current = requestAnimationFrame(frameLoop);
  }, [measureFps]);

  // Start monitoring
  const start = useCallback(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    frameCountRef.current = 0;
    lastFrameTimeRef.current = Date.now();
    frameIdRef.current = requestAnimationFrame(frameLoop);

    intervalRef.current = setInterval(updateMetrics, refreshIntervalMs);
  }, [frameLoop, updateMetrics, refreshIntervalMs]);

  // Stop monitoring
  const stop = useCallback(() => {
    isRunningRef.current = false;

    if (frameIdRef.current) {
      cancelAnimationFrame(frameIdRef.current);
      frameIdRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Reset metrics
  const reset = useCallback(() => {
    latencySamplesRef.current = [];
    errorCountRef.current = 0;
    totalOperationsRef.current = 0;
    lastAlertTimeRef.current = {};

    setMetrics({
      fps: 60,
      memory: { used: 0, total: 0, percentage: 0 },
      latency: { avg: 0, min: 0, max: 0, p95: 0 },
      throughput: { rps: 0, total: 0 },
      errorRate: 0,
      timestamp: Date.now(),
    });

    setHistory({
      fps: [],
      memory: [],
      latency: [],
      timestamps: [],
    });

    setAlerts([]);
  }, []);

  // Clear alerts
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Generate optimization suggestions
  const getSuggestions = useCallback((): OptimizationSuggestion[] => {
    const suggestions: OptimizationSuggestion[] = [];

    if (metrics.fps < thresholds.minFps) {
      suggestions.push({
        id: generateId(),
        metric: 'FPS',
        severity: metrics.fps < 20 ? 'high' : 'medium',
        suggestion: 'Low frame rate detected. Consider reducing re-renders and optimizing list views.',
        action: 'Optimize Rendering',
      });
    }

    if (metrics.memory.percentage > thresholds.maxMemoryPercent) {
      suggestions.push({
        id: generateId(),
        metric: 'Memory',
        severity: metrics.memory.percentage > 0.9 ? 'high' : 'medium',
        suggestion: 'High memory usage. Check for memory leaks and large image assets.',
        action: 'Review Memory',
      });
    }

    if (metrics.latency.p95 > thresholds.maxLatencyMs) {
      suggestions.push({
        id: generateId(),
        metric: 'Latency',
        severity: metrics.latency.p95 > 2000 ? 'high' : 'medium',
        suggestion: 'High latency detected. Optimize API calls and consider caching.',
        action: 'Optimize API',
      });
    }

    if (metrics.errorRate > thresholds.maxErrorRate) {
      suggestions.push({
        id: generateId(),
        metric: 'Error Rate',
        severity: metrics.errorRate > 0.1 ? 'high' : 'medium',
        suggestion: 'Elevated error rate. Review error logs and add error handling.',
        action: 'Review Errors',
      });
    }

    if (suggestions.length === 0) {
      suggestions.push({
        id: generateId(),
        metric: 'Overall',
        severity: 'low',
        suggestion: 'All metrics are within acceptable ranges. Performance looks good!',
        action: 'Continue Monitoring',
      });
    }

    return suggestions;
  }, [metrics, thresholds]);

  // Run benchmark
  const runBenchmark = useCallback(async (
    name: string,
    fn: () => void | Promise<void>,
    iterations: number = 100
  ): Promise<BenchmarkResult> => {
    const samples: number[] = [];

    // Warmup
    for (let i = 0; i < Math.min(10, iterations / 10); i++) {
      await fn();
    }

    // Benchmark
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      samples.push(end - start);
    }

    const total = samples.reduce((a, b) => a + b, 0);
    const avg = total / iterations;

    return {
      name,
      iterations,
      totalTime: total,
      avgTime: avg,
      minTime: Math.min(...samples),
      maxTime: Math.max(...samples),
      opsPerSecond: 1000 / avg,
    };
  }, []);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        if (enabled) start();
      } else {
        stop();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    if (enabled) {
      start();
    }

    return () => {
      subscription.remove();
      stop();
    };
  }, [enabled, start, stop]);

  // Get health score
  const healthScore = useMemo(() => {
    let score = 100;

    if (metrics.fps < thresholds.minFps) {
      score -= (thresholds.minFps - metrics.fps) * 2;
    }

    if (metrics.memory.percentage > thresholds.maxMemoryPercent) {
      score -= (metrics.memory.percentage - thresholds.maxMemoryPercent) * 100;
    }

    if (metrics.latency.p95 > thresholds.maxLatencyMs) {
      score -= (metrics.latency.p95 / thresholds.maxLatencyMs) * 10;
    }

    if (metrics.errorRate > thresholds.maxErrorRate) {
      score -= metrics.errorRate * 500;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }, [metrics, thresholds]);

  return {
    // Current metrics
    metrics,
    history,
    alerts,
    healthScore,

    // Actions
    recordLatency,
    recordError,
    start,
    stop,
    reset,
    clearAlerts,
    getSuggestions,
    runBenchmark,

    // Thresholds
    thresholds,
  };
}

export default usePerformance;
