/**
 * usePerformanceMonitor Hook
 * 
 * Enhanced performance monitoring for React Native apps.
 * Tracks FPS, memory usage, render times, and JS thread卡顿 (stuttering).
 * 
 * @example
 * ```tsx
 * const { metrics, isMonitoring, startMonitoring, stopMonitoring } = usePerformanceMonitor({
 *   enableFps: true,
 *   enableMemory: true,
 *   enableRenderTime: true,
 *   enableJSThread: true,
 * });
 * ```
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Platform, InteractionManager } from 'react-native';
import { PERFORMANCE_CONFIG, PERFORMANCE_BUDGETS } from '../config/performance';

// ============================================================================
// TYPES
// ============================================================================

export interface PerformanceMetrics {
  /** Frames per second */
  fps: number;
  /** Average FPS over time */
  avgFps: number;
  /** Minimum FPS recorded */
  minFps: number;
  /** Memory usage in MB (if available) */
  memoryUsage?: number;
  /** Memory limit in MB (if available) */
  memoryLimit?: number;
  /** Memory usage percentage (0-1) */
  memoryPercent?: number;
  /** Last render time in ms */
  lastRenderTime: number;
  /** Average render time in ms */
  avgRenderTime: number;
  /** JS thread FPS (estimated) */
  jsThreadFps: number;
  /** Whether JS thread is experiencing卡顿 */
  jsThreadStuttering: boolean;
  /** Number of卡顿 incidents */
  stutterCount: number;
  /** Timestamp of last update */
  timestamp: number;
}

export interface PerformanceAlert {
  id: string;
  type: 'fps_drop' | 'memory_high' | 'render_slow' | 'js_thread_stutter';
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
}

export interface UsePerformanceMonitorOptions {
  /** Enable FPS monitoring */
  enableFps?: boolean;
  /** Enable memory monitoring */
  enableMemory?: boolean;
  /** Enable render time tracking */
  enableRenderTime?: boolean;
  /** Enable JS thread monitoring */
  enableJSThread?: boolean;
  /** Sample interval in ms */
  sampleInterval?: number;
  /** FPS warning threshold */
  fpsWarningThreshold?: number;
  /** FPS critical threshold */
  fpsCriticalThreshold?: number;
  /** Memory warning threshold (0-1) */
  memoryWarningThreshold?: number;
  /** Render time warning threshold (ms) */
  renderTimeWarningThreshold?: number;
  /** JS thread FPS warning threshold */
  jsThreadWarningThreshold?: number;
  /** Callback when alert is triggered */
  onAlert?: (alert: PerformanceAlert) => void;
  /** Callback when metrics update */
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

export interface UsePerformanceMonitorReturn {
  /** Current performance metrics */
  metrics: PerformanceMetrics;
  /** Whether monitoring is active */
  isMonitoring: boolean;
  /** Recent alerts */
  alerts: PerformanceAlert[];
  /** Start monitoring */
  startMonitoring: () => void;
  /** Stop monitoring */
  stopMonitoring: () => void;
  /** Record a render time */
  recordRenderTime: (duration: number) => void;
  /** Clear all alerts */
  clearAlerts: () => void;
  /** Get performance report */
  getReport: () => PerformanceReport;
}

export interface PerformanceReport {
  duration: number;
  avgFps: number;
  minFps: number;
  maxFps: number;
  avgRenderTime: number;
  stutterCount: number;
  alerts: PerformanceAlert[];
  summary: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_OPTIONS: Required<UsePerformanceMonitorOptions> = {
  enableFps: true,
  enableMemory: true,
  enableRenderTime: true,
  enableJSThread: true,
  sampleInterval: 1000,
  fpsWarningThreshold: 30,
  fpsCriticalThreshold: 15,
  memoryWarningThreshold: 0.7,
  renderTimeWarningThreshold: 16,
  jsThreadWarningThreshold: 30,
  onAlert: () => {},
  onMetricsUpdate: () => {},
};

// ============================================================================
// MEMORY MONITORING
// ============================================================================

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

declare global {
  interface Performance {
    memory?: MemoryInfo;
  }
}

function getMemoryInfo(): { usage: number; limit: number; percent: number } | null {
  if (typeof performance === 'undefined' || !performance.memory) {
    return null;
  }

  const { usedJSHeapSize, jsHeapSizeLimit } = performance.memory;
  return {
    usage: usedJSHeapSize / (1024 * 1024), // Convert to MB
    limit: jsHeapSizeLimit / (1024 * 1024),
    percent: usedJSHeapSize / jsHeapSizeLimit,
  };
}

// ============================================================================
// FPS MONITORING
// ============================================================================

class FpsMonitor {
  private frameCount = 0;
  private lastTime = 0;
  private fpsHistory: number[] = [];
  private rafId: number | null = null;
  private isRunning = false;

  start(callback: (fps: number, avgFps: number, minFps: number) => void): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.frameCount = 0;

    const tick = () => {
      if (!this.isRunning) return;

      this.frameCount++;
      const now = performance.now();
      const delta = now - this.lastTime;

      if (delta >= 1000) {
        const fps = Math.round((this.frameCount * 1000) / delta);
        this.fpsHistory.push(fps);
        if (this.fpsHistory.length > 60) this.fpsHistory.shift();

        const avgFps = Math.round(
          this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
        );
        const minFps = Math.min(...this.fpsHistory);

        callback(fps, avgFps, minFps);

        this.frameCount = 0;
        this.lastTime = now;
      }

      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  stop(): void {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  reset(): void {
    this.fpsHistory = [];
    this.frameCount = 0;
  }
}

// ============================================================================
// JS THREAD MONITORING
// ============================================================================

class JSThreadMonitor {
  private lastTime = 0;
  private frameDeltas: number[] = [];
  private rafId: number | null = null;
  private isRunning = false;
  private stutterCount = 0;

  start(
    callback: (fps: number, isStuttering: boolean, stutterCount: number) => void,
    threshold: number = 30
  ): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();

    const tick = () => {
      if (!this.isRunning) return;

      const now = performance.now();
      const delta = now - this.lastTime;
      this.lastTime = now;

      // Expected frame time at 60fps = 16.67ms
      // If delta > 33ms (2 frames), consider it a stutter
      this.frameDeltas.push(delta);
      if (this.frameDeltas.length > 30) this.frameDeltas.shift();

      // Calculate JS thread FPS based on frame deltas
      const avgDelta = this.frameDeltas.reduce((a, b) => a + b, 0) / this.frameDeltas.length;
      const jsFps = Math.round(1000 / avgDelta);

      // Detect stutter: if a frame took significantly longer than average
      const isStuttering = delta > avgDelta * 2 && delta > 33;
      if (isStuttering) this.stutterCount++;

      callback(jsFps, isStuttering, this.stutterCount);

      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  stop(): void {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  reset(): void {
    this.frameDeltas = [];
    this.stutterCount = 0;
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function usePerformanceMonitor(
  options: UsePerformanceMonitorOptions = {}
): UsePerformanceMonitorReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // State
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    avgFps: 60,
    minFps: 60,
    lastRenderTime: 0,
    avgRenderTime: 0,
    jsThreadFps: 60,
    jsThreadStuttering: false,
    stutterCount: 0,
    timestamp: Date.now(),
  });

  // Refs
  const fpsMonitorRef = useRef(new FpsMonitor());
  const jsThreadMonitorRef = useRef(new JSThreadMonitor());
  const renderTimeHistoryRef = useRef<number[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const alertCooldownsRef = useRef<Record<string, number>>({});
  const startTimeRef = useRef<number>(0);

  // Alert helper
  const addAlert = useCallback((alert: Omit<PerformanceAlert, 'id' | 'timestamp'>): void => {
    const alertKey = `${alert.type}_${alert.severity}`;
    const now = Date.now();

    // Check cooldown
    if (alertCooldownsRef.current[alertKey] && 
        now - alertCooldownsRef.current[alertKey] < PERFORMANCE_CONFIG.FPS_MONITOR_INTERVAL * 5) {
      return;
    }

    alertCooldownsRef.current[alertKey] = now;

    const newAlert: PerformanceAlert = {
      ...alert,
      id: `${alertKey}_${now}`,
      timestamp: now,
    };

    setAlerts(prev => [...prev.slice(-49), newAlert]);
    opts.onAlert(newAlert);
  }, [opts]);

  // Start monitoring
  const startMonitoring = useCallback((): void => {
    if (isMonitoring) return;
    setIsMonitoring(true);
    startTimeRef.current = Date.now();

    // FPS Monitoring
    if (opts.enableFps) {
      fpsMonitorRef.current.start((fps, avgFps, minFps) => {
        setMetrics(prev => {
          const newMetrics = { ...prev, fps, avgFps, minFps, timestamp: Date.now() };
          opts.onMetricsUpdate(newMetrics);
          return newMetrics;
        });

        if (fps < opts.fpsCriticalThreshold) {
          addAlert({
            type: 'fps_drop',
            severity: 'critical',
            message: `Critical FPS drop detected: ${fps} FPS`,
            value: fps,
            threshold: opts.fpsCriticalThreshold,
          });
        } else if (fps < opts.fpsWarningThreshold) {
          addAlert({
            type: 'fps_drop',
            severity: 'warning',
            message: `Low FPS detected: ${fps} FPS`,
            value: fps,
            threshold: opts.fpsWarningThreshold,
          });
        }
      });
    }

    // Memory Monitoring
    if (opts.enableMemory) {
      intervalRef.current = setInterval(() => {
        const memory = getMemoryInfo();
        if (memory) {
          setMetrics(prev => {
            const newMetrics = {
              ...prev,
              memoryUsage: memory.usage,
              memoryLimit: memory.limit,
              memoryPercent: memory.percent,
            };
            opts.onMetricsUpdate(newMetrics);
            return newMetrics;
          });

          if (memory.percent > opts.memoryWarningThreshold) {
            addAlert({
              type: 'memory_high',
              severity: memory.percent > 0.85 ? 'critical' : 'warning',
              message: `High memory usage: ${(memory.percent * 100).toFixed(1)}%`,
              value: memory.percent,
              threshold: opts.memoryWarningThreshold,
            });
          }
        }
      }, PERFORMANCE_CONFIG.MEMORY_MONITOR_INTERVAL);
    }

    // JS Thread Monitoring
    if (opts.enableJSThread) {
      jsThreadMonitorRef.current.start((jsFps, isStuttering, stutterCount) => {
        setMetrics(prev => {
          const newMetrics = {
            ...prev,
            jsThreadFps: jsFps,
            jsThreadStuttering: isStuttering,
            stutterCount,
          };
          opts.onMetricsUpdate(newMetrics);
          return newMetrics;
        });

        if (jsFps < opts.jsThreadWarningThreshold) {
          addAlert({
            type: 'js_thread_stutter',
            severity: jsFps < 15 ? 'critical' : 'warning',
            message: `JS thread卡顿 detected: ${jsFps} FPS`,
            value: jsFps,
            threshold: opts.jsThreadWarningThreshold,
          });
        }
      });
    }
  }, [isMonitoring, opts, addAlert]);

  // Stop monitoring
  const stopMonitoring = useCallback((): void => {
    setIsMonitoring(false);
    fpsMonitorRef.current.stop();
    jsThreadMonitorRef.current.stop();
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Record render time
  const recordRenderTime = useCallback((duration: number): void => {
    if (!opts.enableRenderTime) return;

    renderTimeHistoryRef.current.push(duration);
    if (renderTimeHistoryRef.current.length > 100) {
      renderTimeHistoryRef.current.shift();
    }

    const avgRenderTime = Math.round(
      renderTimeHistoryRef.current.reduce((a, b) => a + b, 0) / 
      renderTimeHistoryRef.current.length
    );

    setMetrics(prev => {
      const newMetrics = {
        ...prev,
        lastRenderTime: duration,
        avgRenderTime,
      };
      opts.onMetricsUpdate(newMetrics);
      return newMetrics;
    });

    if (duration > opts.renderTimeWarningThreshold) {
      addAlert({
        type: 'render_slow',
        severity: duration > 100 ? 'critical' : 'warning',
        message: `Slow render detected: ${duration.toFixed(2)}ms`,
        value: duration,
        threshold: opts.renderTimeWarningThreshold,
      });
    }
  }, [opts, addAlert]);

  // Clear alerts
  const clearAlerts = useCallback((): void => {
    setAlerts([]);
  }, []);

  // Get performance report
  const getReport = useCallback((): PerformanceReport => {
    const duration = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
    const fpsHistory = fpsMonitorRef.current['fpsHistory'] || [];
    
    return {
      duration,
      avgFps: metrics.avgFps,
      minFps: metrics.minFps,
      maxFps: Math.max(...(fpsHistory.length > 0 ? fpsHistory : [60])),
      avgRenderTime: metrics.avgRenderTime,
      stutterCount: metrics.stutterCount,
      alerts: [...alerts],
      summary: `Performance Report: Avg ${metrics.avgFps} FPS, ${metrics.stutterCount} stutters, ${alerts.length} alerts`,
    };
  }, [metrics, alerts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    metrics,
    isMonitoring,
    alerts,
    startMonitoring,
    stopMonitoring,
    recordRenderTime,
    clearAlerts,
    getReport,
  };
}

export default usePerformanceMonitor;
