/**
 * Lazy Loading Utilities
 * 
 * Component lazy loading with React.lazy, Suspense fallback, and preloading.
 * Optimizes initial bundle size and improves app startup performance.
 * 
 * @example
 * ```tsx
 * // Basic lazy loading
 * const HeavyComponent = lazy(() => import('./HeavyComponent'));
 * 
 * // With preloading
 * const HeavyComponent = lazy(() => import('./HeavyComponent'), {
 *   preload: true,
 * });
 * 
 * // With custom fallback
 * <LazyBoundary fallback={<CustomLoader />}>
 *   <HeavyComponent />
 * </LazyBoundary>
 * ```
 */

import React, { 
  lazy as reactLazy, 
  Suspense, 
  ComponentType,
  ReactNode,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { PERFORMANCE_CONFIG } from '../config/performance';

// ============================================================================
// TYPES
// ============================================================================

export interface LazyOptions {
  /** Enable preloading on component mount */
  preload?: boolean;
  /** Delay before preloading (ms) */
  preloadDelay?: number;
  /** Retry count on load failure */
  retryCount?: number;
  /** Retry delay in ms */
  retryDelay?: number;
  /** Custom display name for debugging */
  displayName?: string;
}

export interface LazyBoundaryProps {
  /** Content to render */
  children: ReactNode;
  /** Custom fallback component */
  fallback?: ReactNode;
  /** Error handler */
  onError?: (error: Error) => void;
  /** Retry callback */
  onRetry?: () => void;
}

export interface PreloadableComponent<T = any> extends React.FC<T> {
  /** Preload the component */
  preload: () => Promise<void>;
  /** Check if component is loaded */
  isLoaded: () => boolean;
}

export interface LazyLoadReturn {
  /** Whether component is currently loading */
  isLoading: boolean;
  /** Whether component has loaded */
  isLoaded: boolean;
  /** Error if loading failed */
  error: Error | null;
  /** Manually trigger preload */
  preload: () => Promise<void>;
  /** Retry loading after error */
  retry: () => void;
}

// ============================================================================
// DEFAULT FALLBACK COMPONENT
// ============================================================================

const DefaultFallback: React.FC = () => (
  <View style={styles.fallback}>
    <ActivityIndicator size="large" color="#4f46e5" />
  </View>
);

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  error: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});

// ============================================================================
// LAZY LOADING CACHE
// ============================================================================

const componentCache = new Map<string, ComponentType<any>>();
const preloadPromises = new Map<string, Promise<void>>();

// ============================================================================
// ENHANCED LAZY FUNCTION
// ============================================================================

/**
 * Enhanced lazy loading with preloading support
 * 
 * @param factory - Import factory function
 * @param options - Lazy loading options
 * @returns Preloadable lazy component
 */
export function lazy<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  options: LazyOptions = {}
): PreloadableComponent<React.ComponentProps<T>> {
  const {
    preload: enablePreload = false,
    preloadDelay = PERFORMANCE_CONFIG.PRELOAD_DELAY,
    retryCount = 3,
    retryDelay = 1000,
    displayName,
  } = options;

  const cacheKey = displayName || factory.toString();
  let loadError: Error | null = null;
  let retryAttempts = 0;

  // Create the lazy component
  const LazyComponent = reactLazy(async () => {
    // Check cache first
    if (componentCache.has(cacheKey)) {
      return { default: componentCache.get(cacheKey) as T };
    }

    // Attempt to load with retry logic
    while (retryAttempts <= retryCount) {
      try {
        const module = await factory();
        componentCache.set(cacheKey, module.default);
        loadError = null;
        retryAttempts = 0;
        return module;
      } catch (error) {
        loadError = error as Error;
        retryAttempts++;

        if (retryAttempts <= retryCount) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * retryAttempts));
        } else {
          throw error;
        }
      }
    }

    throw loadError || new Error('Failed to load component');
  });

  // Wrapper component with preloading support
  const LazyWrapper: PreloadableComponent<React.ComponentProps<T>> = (props) => {
    const [isPreloaded, setIsPreloaded] = useState(componentCache.has(cacheKey));

    useEffect(() => {
      if (enablePreload && !isPreloaded) {
        const timer = setTimeout(() => {
          LazyWrapper.preload().then(() => setIsPreloaded(true));
        }, preloadDelay);

        return () => clearTimeout(timer);
      }
    }, [isPreloaded]);

    return <LazyComponent {...props} />;
  };

  // Preload function
  LazyWrapper.preload = async (): Promise<void> => {
    if (componentCache.has(cacheKey)) return;
    if (preloadPromises.has(cacheKey)) {
      await preloadPromises.get(cacheKey);
      return;
    }

    const preloadPromise = factory()
      .then(module => {
        componentCache.set(cacheKey, module.default);
        preloadPromises.delete(cacheKey);
      })
      .catch(error => {
        preloadPromises.delete(cacheKey);
        throw error;
      });

    preloadPromises.set(cacheKey, preloadPromise);
    await preloadPromise;
  };

  // Check if loaded
  LazyWrapper.isLoaded = (): boolean => {
    return componentCache.has(cacheKey);
  };

  // Set display name for debugging
  LazyWrapper.displayName = displayName || `Lazy(${cacheKey.slice(0, 50)})`;

  return LazyWrapper;
}

// ============================================================================
// LAZY BOUNDARY (SUSPENSE WRAPPER)
// ============================================================================

/**
 * Suspense boundary with error handling
 * 
 * Wraps lazy-loaded components with a fallback and error boundary
 */
export const LazyBoundary: React.FC<LazyBoundaryProps> = ({
  children,
  fallback = <DefaultFallback />,
  onError,
}) => {
  return (
    <Suspense fallback={fallback}>
      <LazyErrorBoundary onError={onError}>
        {children}
      </LazyErrorBoundary>
    </Suspense>
  );
};

// ============================================================================
// ERROR BOUNDARY
// ============================================================================

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error) => void;
}

class LazyErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error): void {
    this.props.onError?.(error);
    if (PERFORMANCE_CONFIG.LOG_PERFORMANCE_METRICS) {
      console.error('[LazyLoad] Component failed to load:', error);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.error}>
          <ActivityIndicator size="small" color="#ef4444" />
        </View>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// PRELOADING HOOK
// ============================================================================

/**
 * Hook for preloading components on hover/focus
 * 
 * @param components - Components to preload
 * @returns Preload trigger functions
 */
export function usePreload<T extends Record<string, PreloadableComponent<any>>>(
  components: T
): {
  preload: (key: keyof T) => Promise<void>;
  preloadAll: () => Promise<void>;
  createPreloadHandler: (key: keyof T) => () => void;
} {
  const preload = useCallback(async (key: keyof T): Promise<void> => {
    const component = components[key];
    if (component?.preload) {
      await component.preload();
    }
  }, [components]);

  const preloadAll = useCallback(async (): Promise<void> => {
    await Promise.all(
      Object.keys(components).map(key => preload(key))
    );
  }, [components, preload]);

  const createPreloadHandler = useCallback((key: keyof T) => {
    return () => {
      if (PERFORMANCE_CONFIG.PRELOAD_ON_HOVER) {
        setTimeout(() => preload(key), PERFORMANCE_CONFIG.PRELOAD_DELAY);
      }
    };
  }, [preload]);

  return {
    preload,
    preloadAll,
    createPreloadHandler,
  };
}

// ============================================================================
// DYNAMIC IMPORT HELPER
// ============================================================================

/**
 * Dynamic import with retry and timeout
 * 
 * @param importFn - Import function
 * @param options - Import options
 */
export async function dynamicImport<T>(
  importFn: () => Promise<T>,
  options: {
    timeout?: number;
    retries?: number;
    retryDelay?: number;
  } = {}
): Promise<T> {
  const {
    timeout = PERFORMANCE_CONFIG.REQUEST_TIMEOUT,
    retries = 3,
    retryDelay = 1000,
  } = options;

  const attempt = async (remainingRetries: number): Promise<T> => {
    try {
      const result = await Promise.race([
        importFn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Import timeout')), timeout)
        ),
      ]);
      return result;
    } catch (error) {
      if (remainingRetries > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return attempt(remainingRetries - 1);
      }
      throw error;
    }
  };

  return attempt(retries);
}

// ============================================================================
// LAZY LOADING GROUP
// ============================================================================

/**
 * Create a group of lazy-loaded components that can be preloaded together
 * 
 * @param imports - Import factories
 * @returns Object with components and preload function
 */
export function createLazyGroup<T extends Record<string, () => Promise<{ default: ComponentType<any> }>>>(
  imports: T,
  options: LazyOptions = {}
): {
  components: { [K in keyof T]: PreloadableComponent<any> };
  preloadAll: () => Promise<void>;
  preload: (key: keyof T) => Promise<void>;
} {
  const components = {} as { [K in keyof T]: PreloadableComponent<any> };

  for (const [key, factory] of Object.entries(imports)) {
    components[key as keyof T] = lazy(factory, {
      ...options,
      displayName: String(key),
    });
  }

  const preload = async (key: keyof T): Promise<void> => {
    const component = components[key];
    if (component?.preload) {
      await component.preload();
    }
  };

  const preloadAll = async (): Promise<void> => {
    await Promise.all(
      Object.keys(components).map(key => preload(key))
    );
  };

  return {
    components,
    preloadAll,
    preload,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  lazy,
  LazyBoundary,
  usePreload,
  dynamicImport,
  createLazyGroup,
};
