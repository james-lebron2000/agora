import { useState, useEffect, useRef, useCallback } from 'react';

export interface ThrottleOptions {
  leading?: boolean; // Trigger on the leading edge (default true)
  trailing?: boolean; // Trigger on the trailing edge (default true)
}

/**
 * Hook to throttle a value
 * Returns a throttled value that updates at most once per interval
 * 
 * @example
 * const [scrollY, setScrollY] = useState(0);
 * const throttledScrollY = useThrottle(scrollY, 100);
 * // Use throttledScrollY for expensive calculations
 */
export function useThrottle<T>(value: T, interval: number = 100): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdated = useRef<number>(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdated.current;

    if (timeSinceLastUpdate >= interval) {
      // Enough time has passed, update immediately
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      // Schedule update for when interval passes
      const timeToNextUpdate = interval - timeSinceLastUpdate;
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      }, timeToNextUpdate);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, interval]);

  return throttledValue;
}

/**
 * Hook to create a throttled callback function
 * 
 * @example
 * const throttledScrollHandler = useThrottledCallback(
 *   (event) => handleScroll(event),
 *   100
 * );
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  interval: number = 100,
  options: ThrottleOptions = {}
): T & { cancel: () => void; flush: () => void; pending: () => boolean } {
  const { leading = true, trailing = true } = options;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);
  const lastArgsRef = useRef<Parameters<T> | null>(null);
  const lastCallTimeRef = useRef<number>(0);
  const leadingCalledRef = useRef(false);

  // Keep callback reference up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const flush = useCallback(() => {
    clear();
    if (trailing && lastArgsRef.current) {
      callbackRef.current(...lastArgsRef.current);
      lastArgsRef.current = null;
    }
  }, [clear, trailing]);

  const pending = useCallback(() => {
    return timeoutRef.current !== null;
  }, []);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallTimeRef.current;
      lastArgsRef.current = args;

      const invoke = () => {
        lastCallTimeRef.current = now;
        leadingCalledRef.current = true;
        callbackRef.current(...args);
      };

      if (timeSinceLastCall >= interval) {
        // Enough time has passed
        clear();
        if (leading) {
          invoke();
        } else {
          // Schedule trailing call
          timeoutRef.current = setTimeout(() => {
            if (trailing && lastArgsRef.current) {
              lastCallTimeRef.current = Date.now();
              callbackRef.current(...lastArgsRef.current);
              lastArgsRef.current = null;
            }
            timeoutRef.current = null;
          }, interval);
        }
      } else if (!timeoutRef.current && trailing) {
        // Within interval, schedule trailing call
        const remainingTime = interval - timeSinceLastCall;
        timeoutRef.current = setTimeout(() => {
          if (trailing && lastArgsRef.current) {
            lastCallTimeRef.current = Date.now();
            callbackRef.current(...lastArgsRef.current);
            lastArgsRef.current = null;
          }
          timeoutRef.current = null;
        }, remainingTime);
      }
    },
    [interval, leading, trailing, clear]
  ) as T & { cancel: () => void; flush: () => void; pending: () => boolean };

  throttledCallback.cancel = clear;
  throttledCallback.flush = flush;
  throttledCallback.pending = pending;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clear();
    };
  }, [clear]);

  return throttledCallback;
}

/**
 * Hook to throttle a state setter
 * Useful for high-frequency updates like scroll or resize
 * 
 * @example
 * const [value, setValue] = useThrottledState(0, 100);
 * // setValue can be called frequently, but value only updates every 100ms
 */
export function useThrottledState<T>(
  initialValue: T,
  interval: number = 100
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(initialValue);
  const pendingValueRef = useRef<T>(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());

  const setThrottledValue = useCallback((newValue: T) => {
    pendingValueRef.current = newValue;
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;

    if (timeSinceLastUpdate >= interval) {
      lastUpdateRef.current = now;
      setValue(newValue);
    } else if (!timeoutRef.current) {
      timeoutRef.current = setTimeout(() => {
        lastUpdateRef.current = Date.now();
        setValue(pendingValueRef.current);
        timeoutRef.current = null;
      }, interval - timeSinceLastUpdate);
    }
  }, [interval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [value, setThrottledValue];
}

/**
 * Hook for throttled scroll position tracking
 * 
 * @example
 * const scrollY = useThrottledScroll(100);
 */
export function useThrottledScroll(interval: number = 100): number {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let rafId: number | null = null;
    let pendingScrollY = 0;

    const handleScroll = () => {
      pendingScrollY = window.scrollY;
      
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          setScrollY(pendingScrollY);
          rafId = null;
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [interval]);

  return useThrottle(scrollY, interval);
}

export default useThrottle;
