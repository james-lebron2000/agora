import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback } from 'react';

export interface CacheOptions<T> {
  key: string;
  defaultValue?: T;
  ttl?: number; // Time to live in milliseconds
  serializer?: (value: T) => string;
  deserializer?: (value: string) => T;
}

export interface CacheState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  isStale: boolean;
}

export interface CacheActions<T> {
  setCache: (value: T) => Promise<void>;
  invalidate: () => Promise<void>;
  refresh: () => Promise<void>;
  clearAll: () => Promise<void>;
}

/**
 * Hook for managing cached data with AsyncStorage
 * Supports TTL (time to live) and automatic stale detection
 */
export function useCache<T>(options: CacheOptions<T>): CacheState<T> & CacheActions<T> {
  const {
    key,
    defaultValue = null as unknown as T,
    ttl = 5 * 60 * 1000, // 5 minutes default
    serializer = JSON.stringify,
    deserializer = JSON.parse,
  } = options;

  const [state, setState] = useState<CacheState<T>>({
    data: defaultValue,
    isLoading: true,
    error: null,
    isStale: false,
  });

  const loadCache = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const [cachedValue, cachedTimestamp] = await Promise.all([
        AsyncStorage.getItem(`cache:${key}`),
        AsyncStorage.getItem(`cache:${key}:timestamp`),
      ]);

      if (cachedValue === null) {
        setState({
          data: defaultValue,
          isLoading: false,
          error: null,
          isStale: false,
        });
        return;
      }

      const parsedValue = deserializer(cachedValue);
      const timestamp = cachedTimestamp ? parseInt(cachedTimestamp, 10) : 0;
      const isStale = Date.now() - timestamp > ttl;

      setState({
        data: parsedValue,
        isLoading: false,
        error: null,
        isStale,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Failed to load cache'),
      }));
    }
  }, [key, defaultValue, ttl, deserializer]);

  const setCache = useCallback(async (value: T) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(`cache:${key}`, serializer(value)),
        AsyncStorage.setItem(`cache:${key}:timestamp`, Date.now().toString()),
      ]);
      
      setState({
        data: value,
        isLoading: false,
        error: null,
        isStale: false,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Failed to set cache'),
      }));
    }
  }, [key, serializer]);

  const invalidate = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([
        `cache:${key}`,
        `cache:${key}:timestamp`,
      ]);
      
      setState({
        data: defaultValue,
        isLoading: false,
        error: null,
        isStale: false,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Failed to invalidate cache'),
      }));
    }
  }, [key, defaultValue]);

  const refresh = useCallback(async () => {
    await loadCache();
  }, [loadCache]);

  const clearAll = useCallback(async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(k => k.startsWith('cache:'));
      await AsyncStorage.multiRemove(cacheKeys);
      
      setState({
        data: defaultValue,
        isLoading: false,
        error: null,
        isStale: false,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Failed to clear cache'),
      }));
    }
  }, [defaultValue]);

  useEffect(() => {
    loadCache();
  }, [loadCache]);

  return {
    ...state,
    setCache,
    invalidate,
    refresh,
    clearAll,
  };
}

/**
 * Hook for simple cache read/write without TTL
 */
export function useSimpleCache<T>(key: string, defaultValue?: T) {
  const [value, setValue] = useState<T | null>(defaultValue ?? null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    AsyncStorage.getItem(key).then((stored) => {
      if (isMounted) {
        if (stored !== null) {
          try {
            setValue(JSON.parse(stored));
          } catch {
            setValue(stored as unknown as T);
          }
        }
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [key]);

  const save = useCallback(async (newValue: T) => {
    setValue(newValue);
    await AsyncStorage.setItem(key, JSON.stringify(newValue));
  }, [key]);

  const remove = useCallback(async () => {
    setValue(null);
    await AsyncStorage.removeItem(key);
  }, [key]);

  return { value, isLoading, save, remove };
}

export default useCache;
