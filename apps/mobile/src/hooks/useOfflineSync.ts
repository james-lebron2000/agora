import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useNetworkState, useIsOnline } from './useNetwork';
import {
  getPendingChanges,
  removePendingChange,
  incrementRetryCount,
  saveToCache,
  loadFromCache,
  addPendingChange,
  clearPendingChanges,
  type PendingChange,
} from '../services/offlineStorage';

// Sync interval in milliseconds (5 minutes)
const SYNC_INTERVAL = 5 * 60 * 1000;

// Maximum retry attempts
const MAX_RETRY_COUNT = 3;

export interface SyncState {
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingCount: number;
  error: string | null;
  hasConflicts: boolean;
}

export interface SyncResult {
  success: boolean;
  synced: string[];
  failed: string[];
  conflicts: string[];
}

// Sync function type
// Use endpoint as the key for sync functions
type SyncFunction = (change: PendingChange) => Promise<{ success: boolean; conflict?: boolean }>;

/**
 * Hook for managing offline sync
 */
export function useOfflineSync(
  options: {
    autoSync?: boolean;
    syncInterval?: number;
    onSyncComplete?: (result: SyncResult) => void;
    onSyncError?: (error: Error) => void;
    syncFunctions?: Record<string, SyncFunction>;
  } = {}
) {
  const {
    autoSync = true,
    syncInterval = SYNC_INTERVAL,
    onSyncComplete,
    onSyncError,
    syncFunctions = {},
  } = options;

  const isOnline = useIsOnline();
  const networkState = useNetworkState();

  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    lastSyncTime: null,
    pendingCount: 0,
    error: null,
    hasConflicts: false,
  });

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    try {
      const pending = await getPendingChanges();
      if (isMountedRef.current) {
        setSyncState(prev => ({
          ...prev,
          pendingCount: pending.length,
          hasConflicts: pending.some((p: PendingChange) => p.retryCount >= MAX_RETRY_COUNT),
        }));
      }
    } catch (error) {
      console.error('[useOfflineSync] Failed to update pending count:', error);
    }
  }, []);

  // Perform sync
  const performSync = useCallback(async (): Promise<SyncResult> => {
    if (!isOnline) {
      return { success: false, synced: [], failed: [], conflicts: [] };
    }

    setSyncState(prev => ({ ...prev, isSyncing: true, error: null }));

    const result: SyncResult = {
      success: true,
      synced: [],
      failed: [],
      conflicts: [],
    };

    try {
      const pending = await getPendingChanges();

      if (pending.length === 0) {
        setSyncState(prev => ({
          ...prev,
          isSyncing: false,
          lastSyncTime: Date.now(),
          pendingCount: 0,
        }));
        return result;
      }

      // Sort by timestamp (oldest first)
      const sortedPending = pending.sort((a: PendingChange, b: PendingChange) => a.timestamp - b.timestamp);

      for (const change of sortedPending) {
        // Use endpoint as the key for sync functions
        const syncFn = syncFunctions[change.endpoint];

        if (!syncFn) {
          console.warn(`[useOfflineSync] No sync function for endpoint: ${change.endpoint}`);
          result.failed.push(change.id);
          continue;
        }

        try {
          const response = await syncFn(change);

          if (response.success) {
            await removePendingChange(change.id);
            result.synced.push(change.id);
          } else if (response.conflict) {
            result.conflicts.push(change.id);
          } else {
            await incrementRetryCount(change.id);
            result.failed.push(change.id);
          }
        } catch (error) {
          console.error(`[useOfflineSync] Failed to sync change ${change.id}:`, error);
          await incrementRetryCount(change.id);
          result.failed.push(change.id);
        }
      }

      result.success = result.failed.length === 0 && result.conflicts.length === 0;

      if (isMountedRef.current) {
        setSyncState(prev => ({
          ...prev,
          isSyncing: false,
          lastSyncTime: Date.now(),
          pendingCount: result.failed.length + result.conflicts.length,
          hasConflicts: result.conflicts.length > 0,
          error: result.failed.length > 0 ? `${result.failed.length} items failed to sync` : null,
        }));
      }

      onSyncComplete?.(result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      console.error('[useOfflineSync] Sync error:', error);

      if (isMountedRef.current) {
        setSyncState(prev => ({
          ...prev,
          isSyncing: false,
          error: errorMessage,
        }));
      }

      onSyncError?.(error instanceof Error ? error : new Error(errorMessage));

      return { success: false, synced: [], failed: [], conflicts: [] };
    }
  }, [isOnline, syncFunctions, onSyncComplete, onSyncError]);

  // Manual sync trigger
  const sync = useCallback(async () => {
    return performSync();
  }, [performSync]);

  // Queue a change for sync
  const queueChange = useCallback(async (
    type: PendingChange['type'],
    endpoint: string,
    payload: any
  ): Promise<PendingChange> => {
    const change: PendingChange = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      endpoint,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
    };
    await addPendingChange(change);
    await updatePendingCount();
    return change;
  }, [updatePendingCount]);

  // Clear all pending changes
  const clearPending = useCallback(async () => {
    await clearPendingChanges();
    await updatePendingCount();
  }, [updatePendingCount]);

  // Retry failed changes
  const retryFailed = useCallback(async () => {
    const pending = await getPendingChanges();
    const failed = pending.filter((p: PendingChange) => p.retryCount > 0);

    for (const change of failed) {
      change.retryCount = 0;
    }

    await saveToCache('pending_changes', pending);
    await updatePendingCount();

    // Trigger sync immediately
    return performSync();
  }, [performSync, updatePendingCount]);

  // Setup auto-sync
  useEffect(() => {
    if (!autoSync) return;

    // Sync when coming back online
    if (isOnline && syncState.lastSyncTime === null) {
      performSync();
    }

    // Setup interval
    syncIntervalRef.current = setInterval(() => {
      if (isOnline) {
        performSync();
      }
    }, syncInterval);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [autoSync, isOnline, syncInterval, performSync, syncState.lastSyncTime]);

  // Listen for app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && autoSync && isOnline) {
        // Sync when app comes to foreground
        performSync();
        updatePendingCount();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [autoSync, isOnline, performSync, updatePendingCount]);

  // Initial load
  useEffect(() => {
    updatePendingCount();
  }, [updatePendingCount]);

  // Cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  return {
    ...syncState,
    isOnline,
    networkType: networkState.type,
    sync,
    queueChange,
    clearPending,
    retryFailed,
    updatePendingCount,
  };
}

/**
 * Hook for cached data with auto-refresh
 */
export function useCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: {
    maxAge?: number;
    enabled?: boolean;
    onError?: (error: Error) => void;
  } = {}
) {
  const { maxAge = 5 * 60 * 1000, enabled = true, onError } = options;
  const isOnline = useIsOnline();

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);

  const loadData = useCallback(async (refresh = false) => {
    if (!enabled) return;

    try {
      setIsLoading(!refresh);
      setIsRefreshing(refresh);
      setError(null);

      // Try to load from cache first
      if (!refresh) {
        const cached = await loadFromCache<CacheEntryWithMetadata<T>>(key);
        if (cached && cached.data) {
          const entryAge = Date.now() - cached.timestamp;
          if (entryAge < maxAge) {
            setData(cached.data);
            setIsLoading(false);

            // Check if stale (older than half maxAge)
            if (entryAge > maxAge / 2) {
              setIsStale(true);
            }
          }
        }
      }

      // Fetch fresh data if online
      if (isOnline) {
        try {
          const fresh = await fetchFn();
          setData(fresh);
          setIsStale(false);

          // Save to cache
          await saveToCache(key, fresh);
        } catch (fetchError) {
          // If we have cached data, use it even if fetch fails
          if (!data) {
            throw fetchError;
          }
          console.warn('[useCachedData] Fetch failed, using cached data:', fetchError);
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load data');
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [key, fetchFn, maxAge, enabled, isOnline, data, onError]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh when coming online
  useEffect(() => {
    if (isOnline && isStale) {
      loadData(true);
    }
  }, [isOnline, isStale, loadData]);

  const refresh = useCallback(() => {
    return loadData(true);
  }, [loadData]);

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    isStale,
    isOffline: !isOnline,
    refresh,
  };
}

// Helper type for cached data with metadata
interface CacheEntryWithMetadata<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Extended PendingChange with sync status
interface PendingChangeWithSync extends PendingChange {
  syncStatus?: 'pending' | 'synced';
}

/**
 * Hook for optimistic updates
 */
export function useOptimisticUpdate<T>(
  key: string,
  updateFn: (data: T) => Promise<T>,
  options: {
    onError?: (error: Error, rollback: () => void) => void;
    onSuccess?: (data: T) => void;
  } = {}
) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const originalDataRef = useRef<T | null>(null);

  const update = useCallback(async (
    currentData: T,
    optimisticData: T,
    onOptimisticUpdate?: (data: T) => void
  ): Promise<T | null> => {
    setIsUpdating(true);
    setError(null);

    // Store original for rollback
    originalDataRef.current = currentData;

    // Apply optimistic update
    onOptimisticUpdate?.(optimisticData);

    try {
      const result = await updateFn(optimisticData);

      options.onSuccess?.(result);

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Update failed');
      setError(error);

      // Rollback
      const rollback = () => {
        if (originalDataRef.current) {
          onOptimisticUpdate?.(originalDataRef.current);
        }
      };

      rollback();
      options.onError?.(error, rollback);

      return null;
    } finally {
      setIsUpdating(false);
    }
  }, [updateFn, options]);

  return {
    update,
    isUpdating,
    error,
  };
}

export default useOfflineSync;
