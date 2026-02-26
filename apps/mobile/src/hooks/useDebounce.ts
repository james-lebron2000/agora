import { useState, useEffect, useRef, useCallback } from 'react';

export interface DebounceOptions {
  delay?: number;
  leading?: boolean; // Trigger on the leading edge
  trailing?: boolean; // Trigger on the trailing edge (default true)
}

/**
 * Hook to debounce a value
 * Returns a debounced value that only updates after the specified delay
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 500);
 * // Use debouncedSearchTerm for API calls
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook to create a debounced callback function
 * 
 * @example
 * const debouncedSearch = useDebouncedCallback(
 *   (query: string) => fetchResults(query),
 *   500
 * );
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300,
  options: DebounceOptions = {}
): T & { cancel: () => void; flush: () => void; pending: () => boolean } {
  const { leading = false, trailing = true } = options;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);
  const lastArgsRef = useRef<Parameters<T> | null>(null);
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
    if (lastArgsRef.current) {
      callbackRef.current(...lastArgsRef.current);
      lastArgsRef.current = null;
      leadingCalledRef.current = false;
    }
  }, [clear]);

  const pending = useCallback(() => {
    return timeoutRef.current !== null;
  }, []);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      lastArgsRef.current = args;
      clear();

      if (leading && !leadingCalledRef.current) {
        leadingCalledRef.current = true;
        callbackRef.current(...args);
        return;
      }

      timeoutRef.current = setTimeout(() => {
        leadingCalledRef.current = false;
        if (trailing && lastArgsRef.current) {
          callbackRef.current(...lastArgsRef.current);
          lastArgsRef.current = null;
        }
      }, delay);
    },
    [delay, leading, trailing, clear]
  ) as T & { cancel: () => void; flush: () => void; pending: () => boolean };

  debouncedCallback.cancel = clear;
  debouncedCallback.flush = flush;
  debouncedCallback.pending = pending;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clear();
    };
  }, [clear]);

  return debouncedCallback;
}

/**
 * Hook to debounce a state setter
 * Useful for form inputs that need debounced updates
 * 
 * @example
 * const [value, setValue, debouncedValue] = useDebouncedState('', 500);
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 300
): [T, (value: T) => void, T] {
  const [value, setValue] = useState<T>(initialValue);
  const debouncedValue = useDebounce(value, delay);

  return [value, setValue, debouncedValue];
}

/**
 * Hook for debounced search functionality
 * Combines state management with debouncing for search inputs
 * 
 * @example
 * const { query, setQuery, debouncedQuery, isSearching } = useDebouncedSearch(500);
 */
export function useDebouncedSearch(delay: number = 300) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const debouncedQuery = useDebounce(query, delay);

  useEffect(() => {
    setIsSearching(query !== debouncedQuery);
  }, [query, debouncedQuery]);

  return {
    query,
    setQuery,
    debouncedQuery,
    isSearching,
  };
}

export default useDebounce;
