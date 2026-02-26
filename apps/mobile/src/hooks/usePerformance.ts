import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { FlatListProps, ListRenderItem, ListRenderItemInfo } from 'react-native';

/**
 * Enhanced memoization hook for expensive computations
 */
export function useMemoizedValue<T>(compute: () => T, deps: React.DependencyList): T {
  return useMemo(compute, deps);
}

/**
 * Hook for optimized FlatList rendering with getItemLayout and keyExtractor
 */
export function useOptimizedFlatList<T>(
  data: T[],
  renderItem: ListRenderItem<T>,
  itemHeight: number,
  keyExtractor?: (item: T, index: number) => string,
  options?: Partial<FlatListProps<T>>
): FlatListProps<T> {
  const itemHeightRef = useRef(itemHeight);
  
  // Memoized getItemLayout for better performance
  const getItemLayout = useCallback((
    _data: ArrayLike<T> | null | undefined,
    index: number
  ) => ({
    length: itemHeightRef.current,
    offset: itemHeightRef.current * index,
    index,
  }), []);
  
  // Default keyExtractor if not provided
  const defaultKeyExtractor = useCallback((item: T, index: number) => {
    return keyExtractor ? keyExtractor(item, index) : `${index}`;
  }, [keyExtractor]);
  
  // Memoized renderItem to prevent unnecessary re-renders
  const memoizedRenderItem = useCallback((info: ListRenderItemInfo<T>) => {
    return renderItem(info);
  }, [renderItem]);
  
  return {
    data,
    renderItem: memoizedRenderItem,
    getItemLayout,
    keyExtractor: defaultKeyExtractor,
    removeClippedSubviews: true,
    maxToRenderPerBatch: 10,
    windowSize: 10,
    initialNumToRender: 10,
    ...options,
  };
}

/**
 * Hook for debounced callbacks
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]) as T;
  
  return debouncedCallback;
}

/**
 * Hook for throttled callbacks
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCallRef = useRef(0);
  
  const throttledCallback = useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastCallRef.current >= delay) {
      lastCallRef.current = now;
      callback(...args);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        lastCallRef.current = Date.now();
        callback(...args);
      }, delay - (now - lastCallRef.current));
    }
  }, [callback, delay]) as T;
  
  return throttledCallback;
}

/**
 * Hook for conditional memoization
 */
export function useConditionalMemo<T>(
  compute: () => T,
  deps: React.DependencyList,
  condition: boolean
): T {
  return useMemo(() => {
    if (condition) {
      return compute();
    }
    return compute();
  }, condition ? deps : []);
}

/**
 * Hook for tracking component render count (for debugging)
 */
export function useRenderCount(componentName: string): number {
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  
  if (__DEV__) {
    console.log(`${componentName} rendered ${renderCountRef.current} times`);
  }
  
  return renderCountRef.current;
}

/**
 * Hook for expensive operations with loading state
 */
export function useExpensiveOperation<T>(
  operation: () => Promise<T>,
  deps: React.DependencyList
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: () => Promise<void>;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await operation();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [operation]);
  
  useEffect(() => {
    execute();
  }, deps);
  
  return { data, loading, error, execute };
}

/**
 * Hook for image preloading
 */
export function useImagePreloader(imageUrls: string[]): {
  loaded: boolean;
  progress: number;
  errors: string[];
} {
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  
  useEffect(() => {
    if (imageUrls.length === 0) {
      setLoaded(true);
      return;
    }
    
    let loadedCount = 0;
    const errorUrls: string[] = [];
    
    const loadImage = (url: string) => {
      return new Promise<void>((resolve) => {
        // Use Image from react-native
        const { Image: RNImage } = require('react-native');
        RNImage.prefetch(url)
          .then(() => {
            loadedCount++;
            setProgress(loadedCount / imageUrls.length);
            resolve();
          })
          .catch(() => {
            errorUrls.push(url);
            setErrors([...errorUrls]);
            loadedCount++;
            setProgress(loadedCount / imageUrls.length);
            resolve();
          });
      });
    };
    
    Promise.all(imageUrls.map(loadImage)).then(() => {
      setLoaded(true);
    });
  }, [imageUrls]);
  
  return { loaded, progress, errors };
}

/**
 * Hook for measuring component performance
 */
export function usePerformanceMeasure(componentName: string): {
  startMeasure: () => void;
  endMeasure: () => void;
} {
  const startTimeRef = useRef<number>(0);
  
  const startMeasure = useCallback(() => {
    startTimeRef.current = performance.now();
  }, []);
  
  const endMeasure = useCallback(() => {
    const endTime = performance.now();
    const duration = endTime - startTimeRef.current;
    
    if (__DEV__) {
      console.log(`${componentName} render time: ${duration.toFixed(2)}ms`);
    }
  }, [componentName]);
  
  return { startMeasure, endMeasure };
}

/**
 * Hook for managing component visibility state
 */
export function useVisibilityState(
  onVisible?: () => void,
  onHidden?: () => void
): {
  isVisible: boolean;
  setVisible: (visible: boolean) => void;
} {
  const [isVisible, setIsVisible] = useState(true);
  
  const setVisible = useCallback((visible: boolean) => {
    setIsVisible(visible);
    
    if (visible && onVisible) {
      onVisible();
    } else if (!visible && onHidden) {
      onHidden();
    }
  }, [onVisible, onHidden]);
  
  return { isVisible, setVisible };
}

/**
 * Hook for batching multiple state updates
 */
export function useBatchedState<T extends Record<string, any>>(
  initialState: T
): [
  T,
  (updates: Partial<T>) => void,
  (newState: T) => void
] {
  const [state, setState] = useState<T>(initialState);
  
  const batchUpdate = useCallback((updates: Partial<T>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);
  
  const setStateDirectly = useCallback((newState: T) => {
    setState(newState);
  }, []);
  
  return [state, batchUpdate, setStateDirectly];
}

// Re-export React hooks for convenience
export {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from 'react';

// Types for Performance Monitoring
export interface PerformanceAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  metric: string;
  value: number;
  threshold: number;
}

export interface OptimizationSuggestion {
  id: string;
  category: 'memory' | 'cpu' | 'network' | 'render';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'easy' | 'medium' | 'hard';
}

export interface PerformanceMetrics {
  fps: number;
  memory: number;
  latency: number;
  timestamp: number;
}

export interface PerformanceThresholds {
  fps: { min: number; target: number };
  memory: { max: number; warning: number };
  latency: { max: number; target: number };
}

export interface UsePerformanceOptions {
  refreshIntervalMs?: number;
  onAlert?: (alert: PerformanceAlert) => void;
  enabled?: boolean;
}

export interface UsePerformanceReturn {
  metrics: PerformanceMetrics | null;
  history: PerformanceMetrics[];
  alerts: PerformanceAlert[];
  healthScore: number;
  reset: () => void;
  clearAlerts: () => void;
  getSuggestions: () => OptimizationSuggestion[];
  runBenchmark: () => Promise<void>;
  thresholds: PerformanceThresholds;
}

/**
 * Hook for comprehensive performance monitoring
 */
export function usePerformance(options: UsePerformanceOptions = {}): UsePerformanceReturn {
  const { refreshIntervalMs = 5000, onAlert, enabled = true } = options;
  
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [history, setHistory] = useState<PerformanceMetrics[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [healthScore, setHealthScore] = useState(100);
  
  const thresholds: PerformanceThresholds = {
    fps: { min: 30, target: 60 },
    memory: { max: 0.9, warning: 0.7 },
    latency: { max: 1000, target: 100 },
  };
  
  const generateAlert = useCallback((metric: string, value: number, threshold: number): PerformanceAlert => {
    const alert: PerformanceAlert = {
      id: `${Date.now()}-${metric}`,
      type: value > threshold * 1.5 ? 'critical' : value > threshold ? 'warning' : 'info',
      title: `${metric.toUpperCase()} Alert`,
      message: `${metric} value ${value.toFixed(2)} exceeds threshold ${threshold}`,
      timestamp: Date.now(),
      metric,
      value,
      threshold,
    };
    return alert;
  }, []);
  
  const collectMetrics = useCallback(() => {
    // Simulate metrics collection
    const newMetrics: PerformanceMetrics = {
      fps: 55 + Math.random() * 10,
      memory: 0.5 + Math.random() * 0.3,
      latency: 50 + Math.random() * 200,
      timestamp: Date.now(),
    };
    
    setMetrics(newMetrics);
    setHistory(prev => [...prev.slice(-99), newMetrics]);
    
    // Check thresholds and generate alerts
    if (newMetrics.fps < thresholds.fps.min) {
      const alert = generateAlert('fps', newMetrics.fps, thresholds.fps.min);
      setAlerts(prev => [...prev, alert]);
      onAlert?.(alert);
    }
    if (newMetrics.memory > thresholds.memory.max) {
      const alert = generateAlert('memory', newMetrics.memory, thresholds.memory.max);
      setAlerts(prev => [...prev, alert]);
      onAlert?.(alert);
    }
    if (newMetrics.latency > thresholds.latency.max) {
      const alert = generateAlert('latency', newMetrics.latency, thresholds.latency.max);
      setAlerts(prev => [...prev, alert]);
      onAlert?.(alert);
    }
    
    // Calculate health score
    const fpsScore = Math.min(100, (newMetrics.fps / thresholds.fps.target) * 100);
    const memoryScore = Math.max(0, 100 - (newMetrics.memory / thresholds.memory.max) * 100);
    const latencyScore = Math.max(0, 100 - (newMetrics.latency / thresholds.latency.max) * 100);
    setHealthScore(Math.round((fpsScore + memoryScore + latencyScore) / 3));
  }, [generateAlert, onAlert]);
  
  useEffect(() => {
    if (!enabled) return;
    
    collectMetrics();
    const interval = setInterval(collectMetrics, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [enabled, refreshIntervalMs, collectMetrics]);
  
  const reset = useCallback(() => {
    setMetrics(null);
    setHistory([]);
    setAlerts([]);
    setHealthScore(100);
  }, []);
  
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);
  
  const getSuggestions = useCallback((): OptimizationSuggestion[] => {
    const suggestions: OptimizationSuggestion[] = [];
    
    if (metrics) {
      if (metrics.fps < 30) {
        suggestions.push({
          id: 'fps-1',
          category: 'render',
          title: 'Optimize Rendering',
          description: 'Consider using React.memo or useMemo for expensive components',
          impact: 'high',
          effort: 'medium',
        });
      }
      if (metrics.memory > 0.8) {
        suggestions.push({
          id: 'memory-1',
          category: 'memory',
          title: 'Reduce Memory Usage',
          description: 'Implement virtualization for long lists and clear unused caches',
          impact: 'high',
          effort: 'medium',
        });
      }
      if (metrics.latency > 500) {
        suggestions.push({
          id: 'latency-1',
          category: 'network',
          title: 'Optimize Network Calls',
          description: 'Batch API requests and implement request deduplication',
          impact: 'medium',
          effort: 'easy',
        });
      }
    }
    
    return suggestions;
  }, [metrics]);
  
  const runBenchmark = useCallback(async () => {
    // Simulate benchmark
    await new Promise(resolve => setTimeout(resolve, 1000));
    collectMetrics();
  }, [collectMetrics]);
  
  return {
    metrics,
    history,
    alerts,
    healthScore,
    reset,
    clearAlerts,
    getSuggestions,
    runBenchmark,
    thresholds,
  };
}