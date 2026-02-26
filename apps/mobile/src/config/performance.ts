/**
 * Performance Configuration
 * Centralized performance settings and optimization flags
 */

// Performance feature flags
export const PERFORMANCE_CONFIG = {
  // Monitoring
  ENABLE_PERFORMANCE_MONITOR: __DEV__ || false,
  FPS_MONITOR_INTERVAL: 1000, // ms
  MEMORY_MONITOR_INTERVAL: 5000, // ms
  
  // Optimization
  ENABLE_FLATLIST_OPTIMIZATION: true,
  ENABLE_IMAGE_LAZY_LOAD: true,
  ENABLE_COMPONENT_MEMO: true,
  ENABLE_OFFLINE_CACHE: true,
  
  // Lazy loading
  LAZY_LOAD_DELAY: 0, // ms, 0 for immediate
  PRELOAD_ON_HOVER: true,
  PRELOAD_DELAY: 100, // ms
  
  // Animation
  ENABLE_ANIMATION_REDUCTION: false, // Reduce animations for low-end devices
  ANIMATION_FRAME_BUDGET: 16, // ms per frame
  
  // Memory
  MAX_CACHE_SIZE: 50 * 1024 * 1024, // 50MB
  CACHE_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  
  // Network
  ENABLE_REQUEST_DEDUPLICATION: true,
  ENABLE_REQUEST_CACHING: true,
  REQUEST_TIMEOUT: 30000, // ms
  
  // Logging
  LOG_PERFORMANCE_METRICS: __DEV__,
  LOG_SLOW_RENDER: __DEV__,
  SLOW_RENDER_THRESHOLD: 100, // ms
};

// Performance budgets (in ms)
export const PERFORMANCE_BUDGETS = {
  APP_STARTUP: 2000,
  SCREEN_TRANSITION: 300,
  LIST_RENDER: 100,
  API_RESPONSE: 500,
  IMAGE_LOAD: 1000,
  ANIMATION: 16,
};

// Device tier detection
export function getDeviceTier(): 'low' | 'medium' | 'high' {
  // Simple heuristic based on platform and approximate capabilities
  const memory = (global as any).performance?.memory?.jsHeapSizeLimit || 0;
  
  if (memory < 512 * 1024 * 1024) {
    return 'low';
  } else if (memory < 2 * 1024 * 1024 * 1024) {
    return 'medium';
  }
  return 'high';
}

// Get optimized config based on device tier
export function getOptimizedConfig() {
  const tier = getDeviceTier();
  
  switch (tier) {
    case 'low':
      return {
        ...PERFORMANCE_CONFIG,
        ENABLE_ANIMATION_REDUCTION: true,
        ENABLE_IMAGE_LAZY_LOAD: true,
        MAX_CACHE_SIZE: 20 * 1024 * 1024, // 20MB
        LAZY_LOAD_DELAY: 100,
      };
    case 'medium':
      return {
        ...PERFORMANCE_CONFIG,
        ENABLE_ANIMATION_REDUCTION: false,
        MAX_CACHE_SIZE: 50 * 1024 * 1024, // 50MB
      };
    case 'high':
      return {
        ...PERFORMANCE_CONFIG,
        ENABLE_ANIMATION_REDUCTION: false,
        ENABLE_IMAGE_LAZY_LOAD: false,
        MAX_CACHE_SIZE: 100 * 1024 * 1024, // 100MB
      };
    default:
      return PERFORMANCE_CONFIG;
  }
}

// Performance optimization helpers
export const PerformanceHelpers = {
  /**
   * Measure function execution time
   */
  measure<T>(fn: () => T, label: string): T {
    if (!PERFORMANCE_CONFIG.LOG_PERFORMANCE_METRICS) {
      return fn();
    }
    
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    if (duration > PERFORMANCE_BUDGETS.ANIMATION) {
      console.warn(`[Performance] ${label} took ${duration.toFixed(2)}ms`);
    } else {
      console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
    }
    
    return result;
  },
  
  /**
   * Debounce function for performance
   */
  debounce<T extends (...args: any[]) => any>(
    fn: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), wait);
    };
  },
  
  /**
   * Throttle function for performance
   */
  throttle<T extends (...args: any[]) => any>(
    fn: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle = false;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },
};

export default {
  PERFORMANCE_CONFIG,
  PERFORMANCE_BUDGETS,
  getDeviceTier,
  getOptimizedConfig,
  PerformanceHelpers,
};
