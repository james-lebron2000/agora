import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type RefObject,
  type DependencyList,
} from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface IntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export interface IntersectionObserverReturn {
  ref: RefObject<HTMLElement | null>;
  isInView: boolean;
  isIntersecting: boolean;
  entry: IntersectionObserverEntry | null;
}

export interface LazyLoadingOptions extends IntersectionObserverOptions {
  /** Distance in pixels to start loading before element enters viewport */
  preloadDistance?: number;
  /** Whether to track visibility changes after initial load */
  trackVisibility?: boolean;
}

export interface LazyLoadingReturn extends IntersectionObserverReturn {
  /** Whether the element should be loaded (triggered by intersection) */
  shouldLoad: boolean;
  /** Whether the element has ever been in view */
  hasBeenInView: boolean;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 's' | 'bytes' | 'fps' | 'count' | 'score';
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface PerformanceMeasurement {
  start: () => void;
  end: () => number;
  reset: () => void;
  duration: number | null;
}

export interface UsePerformanceOptions {
  /** Enable automatic reporting to console in development */
  debug?: boolean;
  /** Enable tracking of long tasks */
  trackLongTasks?: boolean;
  /** Enable tracking of layout shifts */
  trackLayoutShifts?: boolean;
  /** Callback when metrics are collected */
  onMetric?: (metric: PerformanceMetric) => void;
}

export interface FPSData {
  fps: number;
  average: number;
  min: number;
  max: number;
  drops: number;
}

// ============================================================================
// USE INTERSECTION OBSERVER
// ============================================================================

/**
 * Custom hook for Intersection Observer API
 * Tracks when an element enters or leaves the viewport
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { ref, isInView } = useIntersectionObserver({ threshold: 0.5 });
 *   
 *   return (
 *     <div ref={ref}>
 *       {isInView ? 'In viewport!' : 'Not in viewport'}
 *     </div>
 *   );
 * }
 * ```
 */
export function useIntersectionObserver<T extends HTMLElement = HTMLElement>(
  options: IntersectionObserverOptions = {}
): IntersectionObserverReturn & { ref: RefObject<T | null> } {
  const {
    threshold = 0,
    root = null,
    rootMargin = '0px',
    triggerOnce = false,
  } = options;

  const ref = useRef<T>(null);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const hasTriggeredRef = useRef(false);

  const isInView = useMemo(() => {
    if (!entry) return false;
    return entry.isIntersecting;
  }, [entry]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Don't re-observe if triggerOnce and already triggered
    if (triggerOnce && hasTriggeredRef.current) return;

    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      ([newEntry]) => {
        setEntry(newEntry);
        setIsIntersecting(newEntry.isIntersecting);

        if (newEntry.isIntersecting) {
          hasTriggeredRef.current = true;
          
          if (triggerOnce && observerRef.current) {
            observerRef.current.disconnect();
          }
        }
      },
      { threshold, root, rootMargin }
    );

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [threshold, root, rootMargin, triggerOnce]);

  return { ref, isInView, isIntersecting, entry };
}

// ============================================================================
// USE LAZY LOADING
// ============================================================================

/**
 * Custom hook for lazy loading content
 * Combines intersection observer with load state management
 * 
 * @example
 * ```tsx
 * function LazyImage({ src, alt }) {
 *   const { ref, shouldLoad } = useLazyLoading({ preloadDistance: 100 });
 *   
 *   return (
 *     <div ref={ref}>
 *       {shouldLoad ? (
 *         <img src={src} alt={alt} />
 *       ) : (
 *         <div className="skeleton" />
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useLazyLoading<T extends HTMLElement = HTMLElement>(
  options: LazyLoadingOptions = {}
): LazyLoadingReturn & { ref: RefObject<T | null> } {
  const {
    preloadDistance = 0,
    trackVisibility = false,
    triggerOnce = true,
    ...intersectionOptions
  } = options;

  const rootMargin = useMemo(() => {
    if (options.rootMargin) return options.rootMargin;
    if (preloadDistance > 0) {
      return `${preloadDistance}px 0px ${preloadDistance}px 0px`;
    }
    return '0px';
  }, [options.rootMargin, preloadDistance]);

  const {
    ref,
    isInView,
    isIntersecting,
    entry,
  } = useIntersectionObserver<T>({
    ...intersectionOptions,
    rootMargin,
    triggerOnce: triggerOnce ?? true,
  });

  const [hasBeenInView, setHasBeenInView] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (isInView && !hasBeenInView) {
      setHasBeenInView(true);
      setShouldLoad(true);
    }

    if (trackVisibility && !isInView) {
      // Element left viewport - can be used for pausing animations, etc.
    }
  }, [isInView, hasBeenInView, trackVisibility]);

  return {
    ref,
    isInView,
    isIntersecting,
    entry,
    shouldLoad,
    hasBeenInView,
  };
}

/**
 * Hook for lazy loading multiple elements
 * More efficient than creating multiple individual observers
 * 
 * @example
 * ```tsx
 * function ImageGallery({ images }) {
 *   const { observe, isInView } = useLazyLoadingMultiple();
 *   
 *   return (
 *     <div>
 *       {images.map((img, i) => (
 *         <div key={i} ref={(el) => observe(el, i)}>
 *           {isInView(i) && <img src={img.src} />}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useLazyLoadingMultiple(
  options: LazyLoadingOptions = {}
): {
  observe: (element: Element | null, id: string | number) => void;
  unobserve: (id: string | number) => void;
  isInView: (id: string | number) => boolean;
  entries: Map<string | number, IntersectionObserverEntry>;
} {
  const {
    preloadDistance = 0,
    threshold = 0,
    root = null,
  } = options;

  const rootMargin = useMemo(() => {
    if (options.rootMargin) return options.rootMargin;
    if (preloadDistance > 0) {
      return `${preloadDistance}px 0px ${preloadDistance}px 0px`;
    }
    return '0px';
  }, [options.rootMargin, preloadDistance]);

  const elementsRef = useRef<Map<string | number, Element>>(new Map());
  const [entriesMap, setEntriesMap] = useState<Map<string | number, IntersectionObserverEntry>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        setEntriesMap((prev) => {
          const next = new Map(prev);
          entries.forEach((entry) => {
            // Find the ID for this entry
            elementsRef.current.forEach((el, id) => {
              if (el === entry.target) {
                next.set(id, entry);
              }
            });
          });
          return next;
        });
      },
      { threshold, root, rootMargin }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [threshold, root, rootMargin]);

  const observe = useCallback((element: Element | null, id: string | number) => {
    if (!element) {
      unobserve(id);
      return;
    }

    // If already observing this ID, unobserve first
    const existingElement = elementsRef.current.get(id);
    if (existingElement && existingElement !== element) {
      observerRef.current?.unobserve(existingElement);
    }

    elementsRef.current.set(id, element);
    observerRef.current?.observe(element);
  }, []);

  const unobserve = useCallback((id: string | number) => {
    const element = elementsRef.current.get(id);
    if (element) {
      observerRef.current?.unobserve(element);
      elementsRef.current.delete(id);
    }
    setEntriesMap((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const isInView = useCallback((id: string | number): boolean => {
    const entry = entriesMap.get(id);
    return entry?.isIntersecting ?? false;
  }, [entriesMap]);

  return {
    observe,
    unobserve,
    isInView,
    entries: entriesMap,
  };
}

// ============================================================================
// USE PERFORMANCE MEASUREMENT
// ============================================================================

/**
 * Hook for measuring performance of operations
 * 
 * @example
 * ```tsx
 * function ExpensiveComponent() {
 *   const { start, end, duration } = usePerformanceMeasurement();
 *   
 *   useEffect(() => {
 *     start();
 *     expensiveOperation();
 *     end();
 *   }, []);
 *   
 *   return <div>Operation took {duration}ms</div>;
 * }
 * ```
 */
export function usePerformanceMeasurement(): PerformanceMeasurement {
  const startTimeRef = useRef<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  const start = useCallback(() => {
    startTimeRef.current = performance.now();
  }, []);

  const end = useCallback((): number => {
    if (startTimeRef.current === null) {
      return 0;
    }
    const duration = performance.now() - startTimeRef.current;
    setDuration(duration);
    return duration;
  }, []);

  const reset = useCallback(() => {
    startTimeRef.current = null;
    setDuration(null);
  }, []);

  return {
    start,
    end,
    reset,
    duration,
  };
}

/**
 * Hook for measuring component render time
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const renderTime = useRenderTime();
 *   
 *   useEffect(() => {
 *     console.log(`Render took ${renderTime}ms`);
 *   });
 *   
 *   return <div>Content</div>;
 * }
 * ```
 */
export function useRenderTime(deps: DependencyList = []): number | null {
  const startTimeRef = useRef(performance.now());
  const [renderTime, setRenderTime] = useState<number | null>(null);

  useEffect(() => {
    const endTime = performance.now();
    setRenderTime(endTime - startTimeRef.current);
    // Reset start time for next render
    startTimeRef.current = performance.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return renderTime;
}

// ============================================================================
// USE FPS MONITORING
// ============================================================================

/**
 * Hook for monitoring frame rate performance
 * 
 * @example
 * ```tsx
 * function AnimationComponent() {
 *   const { fps, average, drops } = useFPSMonitor();
 *   
 *   if (fps < 30) {
 *     return <SimplifiedAnimation />;
 *   }
 *   
 *   return <ComplexAnimation />;
 * }
 * ```
 */
export function useFPSMonitor(enabled: boolean = true): FPSData {
  const [fps, setFps] = useState(60);
  const fpsHistoryRef = useRef<number[]>([]);
  const dropsRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const rafRef = useRef<number>();

  useEffect(() => {
    if (!enabled) return;

    const updateFPS = () => {
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      // Calculate FPS
      const currentFps = Math.round(1000 / delta);
      
      if (currentFps > 0 && currentFps < 200) {
        setFps(currentFps);
        
        // Track history
        fpsHistoryRef.current.push(currentFps);
        if (fpsHistoryRef.current.length > 60) {
          fpsHistoryRef.current.shift();
        }

        // Count drops below 30fps
        if (currentFps < 30) {
          dropsRef.current++;
        }
      }

      rafRef.current = requestAnimationFrame(updateFPS);
    };

    rafRef.current = requestAnimationFrame(updateFPS);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [enabled]);

  const average = useMemo(() => {
    const history = fpsHistoryRef.current;
    if (history.length === 0) return 60;
    return Math.round(history.reduce((a, b) => a + b, 0) / history.length);
  }, [fps]);

  const min = useMemo(() => {
    const history = fpsHistoryRef.current;
    if (history.length === 0) return 60;
    return Math.min(...history);
  }, [fps]);

  const max = useMemo(() => {
    const history = fpsHistoryRef.current;
    if (history.length === 0) return 60;
    return Math.max(...history);
  }, [fps]);

  return {
    fps,
    average,
    min,
    max,
    drops: dropsRef.current,
  };
}

// ============================================================================
// USE MEMORY MONITOR
// ============================================================================

/**
 * Hook for monitoring memory usage (Chrome only)
 * 
 * @example
 * ```tsx
 * function MemoryTracker() {
 *   const { usedJSHeapSize, totalJSHeapSize } = useMemoryMonitor(5000);
 *   
 *   return (
 *     <div>
 *       Memory: {(usedJSHeapSize / 1024 / 1024).toFixed(2)} MB
 *     </div>
 *   );
 * }
 * ```
 */
export function useMemoryMonitor(
  interval: number = 10000
): {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercent: number;
  isSupported: boolean;
} {
  const [memory, setMemory] = useState({
    usedJSHeapSize: 0,
    totalJSHeapSize: 0,
    jsHeapSizeLimit: 0,
  });

  const isSupported = useMemo(() => {
    return 'memory' in performance;
  }, []);

  useEffect(() => {
    if (!isSupported) return;

    const checkMemory = () => {
      const perf = performance as any;
      if (perf.memory) {
        setMemory({
          usedJSHeapSize: perf.memory.usedJSHeapSize,
          totalJSHeapSize: perf.memory.totalJSHeapSize,
          jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
        });
      }
    };

    checkMemory();
    const intervalId = setInterval(checkMemory, interval);

    return () => clearInterval(intervalId);
  }, [interval, isSupported]);

  const usagePercent = useMemo(() => {
    if (memory.jsHeapSizeLimit === 0) return 0;
    return (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
  }, [memory]);

  return {
    ...memory,
    usagePercent,
    isSupported,
  };
}

// ============================================================================
// USE NETWORK STATUS
// ============================================================================

/**
 * Hook for monitoring network connection status
 * 
 * @example
 * ```tsx
 * function DataComponent() {
 *   const { isOnline, effectiveType, saveData } = useNetworkStatus();
 *   
 *   if (!isOnline) return <OfflineMessage />;
 *   if (effectiveType === '2g') return <LightweightView />;
 *   
 *   return <FullView />;
 * }
 * ```
 */
export function useNetworkStatus(): {
  isOnline: boolean;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
  saveData: boolean;
  isSupported: boolean;
} {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionInfo, setConnectionInfo] = useState({
    effectiveType: null as string | null,
    downlink: null as number | null,
    rtt: null as number | null,
    saveData: false,
  });

  const isSupported = useMemo(() => {
    return 'connection' in navigator;
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const connection = (navigator as any).connection;
    if (!connection) return;

    const updateConnectionInfo = () => {
      setConnectionInfo({
        effectiveType: connection.effectiveType || null,
        downlink: connection.downlink || null,
        rtt: connection.rtt || null,
        saveData: connection.saveData || false,
      });
    };

    updateConnectionInfo();
    connection.addEventListener('change', updateConnectionInfo);

    return () => {
      connection.removeEventListener('change', updateConnectionInfo);
    };
  }, []);

  return {
    isOnline,
    ...connectionInfo,
    isSupported,
  };
}

// ============================================================================
// USE PREFETCH
// ============================================================================

/**
 * Hook for prefetching resources based on user intent
 * 
 * @example
 * ```tsx
 * function NavigationLink({ to, children }) {
 *   const { ref, prefetch } = usePrefetch(() => import('./HeavyComponent'));
 *   
 *   return (
 *     <Link ref={ref} to={to} onMouseEnter={prefetch}>
 *       {children}
 *     </Link>
 *   );
 * }
 * ```
 */
export function usePrefetch<T>(
  loader: () => Promise<T>,
  options: { delay?: number } = {}
): {
  ref: RefObject<HTMLElement | null>;
  prefetch: () => void;
  isPrefetched: boolean;
} {
  const { delay = 0 } = options;
  const ref = useRef<HTMLElement>(null);
  const [isPrefetched, setIsPrefetched] = useState(false);
  const loaderRef = useRef(loader);

  // Update loader ref if it changes
  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  const prefetch = useCallback(() => {
    if (isPrefetched) return;

    const timeoutId = setTimeout(() => {
      loaderRef.current().then(() => {
        setIsPrefetched(true);
      }).catch(() => {
        // Silently fail - prefetch shouldn't break anything
      });
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [isPrefetched, delay]);

  // Prefetch on hover/approach
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseEnter = () => prefetch();
    const handleTouchStart = () => prefetch();

    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('touchstart', handleTouchStart);

    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('touchstart', handleTouchStart);
    };
  }, [prefetch]);

  return { ref, prefetch, isPrefetched };
}

// ============================================================================
// USE VISIBILITY
// ============================================================================

/**
 * Hook for tracking page visibility changes
 * 
 * @example
 * ```tsx
 * function VideoPlayer() {
 *   const isVisible = useVisibility();
 *   
 *   useEffect(() => {
 *     if (!isVisible) {
 *       video.pause();
 *     }
 *   }, [isVisible]);
 *   
 *   return <video src={src} />;
 * }
 * ```
 */
export function useVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
}

// ============================================================================
// USE THROTTLED SCROLL
// ============================================================================

/**
 * Hook for throttled scroll position tracking
 * 
 * @example
 * ```tsx
 * function ScrollProgress() {
 *   const scrollY = useThrottledScroll(100);
 *   const progress = (scrollY / document.body.scrollHeight) * 100;
 *   
 *   return <div style={{ width: `${progress}%` }} />;
 * }
 * ```
 */
export function useThrottledScroll(throttleMs: number = 100): number {
  const [scrollY, setScrollY] = useState(0);
  const tickingRef = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!tickingRef.current) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          tickingRef.current = false;
        });
        tickingRef.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [throttleMs]);

  return scrollY;
}

// ============================================================================
// USE INFINITE SCROLL
// ============================================================================

/**
 * Hook for infinite scroll functionality
 * 
 * @example
 * ```tsx
 * function Feed() {
 *   const [items, setItems] = useState([]);
 *   const [page, setPage] = useState(1);
 *   
 *   const { sentinelRef, isLoading } = useInfiniteScroll({
 *     onLoadMore: () => {
 *       fetchPage(page).then(newItems => {
 *         setItems(prev => [...prev, ...newItems]);
 *         setPage(p => p + 1);
 *       });
 *     },
 *     hasMore: page < 10,
 *   });
 *   
 *   return (
 *     <>
 *       {items.map(item => <Item key={item.id} {...item} />)}
 *       <div ref={sentinelRef} />
 *     </>
 *   );
 * }
 * ```
 */
export function useInfiniteScroll(
  options: {
    onLoadMore: () => void | Promise<void>;
    hasMore: boolean;
    rootMargin?: string;
    threshold?: number;
  }
): {
  sentinelRef: RefObject<HTMLDivElement | null>;
  isLoading: boolean;
} {
  const { onLoadMore, hasMore, rootMargin = '100px', threshold = 0 } = options;
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const onLoadMoreRef = useRef(onLoadMore);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (entry.isIntersecting && !isLoading) {
          setIsLoading(true);
          try {
            await onLoadMoreRef.current();
          } finally {
            setIsLoading(false);
          }
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMore, isLoading, rootMargin, threshold]);

  return { sentinelRef, isLoading };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  useIntersectionObserver,
  useLazyLoading,
  useLazyLoadingMultiple,
  usePerformanceMeasurement,
  useRenderTime,
  useFPSMonitor,
  useMemoryMonitor,
  useNetworkStatus,
  usePrefetch,
  useVisibility,
  useThrottledScroll,
  useInfiniteScroll,
};
