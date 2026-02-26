// ============================================================================
// Performance Hooks - Barrel Export
// ============================================================================

export {
  // Intersection Observer hooks
  useIntersectionObserver,
  useLazyLoading,
  useLazyLoadingMultiple,
  
  // Performance measurement hooks
  usePerformanceMeasurement,
  useRenderTime,
  
  // Monitoring hooks
  useFPSMonitor,
  useMemoryMonitor,
  useNetworkStatus,
  
  // Utility hooks
  usePrefetch,
  useVisibility,
  useThrottledScroll,
  useInfiniteScroll,
  
  // Types
  type IntersectionObserverOptions,
  type IntersectionObserverReturn,
  type LazyLoadingOptions,
  type LazyLoadingReturn,
  type PerformanceMetric,
  type PerformanceMeasurement,
  type UsePerformanceOptions,
  type FPSData,
} from './usePerformance';
