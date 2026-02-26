import {
  getPendingChanges,
  removePendingChange,
  incrementRetryCount,
  saveToCache,
  loadFromCache,
  type PendingChange,
} from '../services/offlineStorage';

// Maximum retry attempts before marking as conflict
export const MAX_RETRY_ATTEMPTS = 3;

// Retry delays in milliseconds (exponential backoff)
const RETRY_DELAYS = [1000, 5000, 15000];

// Sync task status
export type SyncTaskStatus = 'pending' | 'syncing' | 'completed' | 'failed' | 'conflict';

export interface SyncTask {
  id: string;
  change: PendingChange;
  status: SyncTaskStatus;
  attempts: number;
  lastAttempt?: number;
  error?: string;
}

export interface ConflictResolution<T = any> {
  strategy: 'local' | 'remote' | 'merge' | 'manual';
  localData: T;
  remoteData: T;
  mergedData?: T;
}

// Sync handler type
type SyncHandler<T = any> = (
  change: PendingChange,
  context: SyncContext
) => Promise<SyncResult<T>>;

export interface SyncResult<T = any> {
  success: boolean;
  data?: T;
  conflict?: boolean;
  error?: string;
  shouldRetry?: boolean;
}

export interface SyncContext {
  isOnline: boolean;
  signal: AbortSignal;
  attempt: number;
}

// Registry of sync handlers
const syncHandlers: Map<string, SyncHandler> = new Map();

/**
 * Register a sync handler for an entity type
 */
export function registerSyncHandler(entity: string, handler: SyncHandler): void {
  syncHandlers.set(entity, handler);
  console.log(`[SyncManager] Registered sync handler for ${entity}`);
}

/**
 * Unregister a sync handler
 */
export function unregisterSyncHandler(entity: string): void {
  syncHandlers.delete(entity);
}

/**
 * Get registered sync handler
 */
export function getSyncHandler(entity: string): SyncHandler | undefined {
  return syncHandlers.get(entity);
}

/**
 * Execute a sync task with retry logic
 */
export async function executeSyncTask(
  task: SyncTask,
  options: {
    timeout?: number;
    onProgress?: (task: SyncTask) => void;
  } = {}
): Promise<SyncResult> {
  const { timeout = 30000, onProgress } = options;
  const handler = syncHandlers.get(task.change.entity);

  if (!handler) {
    return {
      success: false,
      error: `No sync handler registered for entity: ${task.change.entity}`,
      shouldRetry: false,
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  task.status = 'syncing';
  task.lastAttempt = Date.now();
  onProgress?.(task);

  try {
    const context: SyncContext = {
      isOnline: true, // Assume online since we're attempting sync
      signal: controller.signal,
      attempt: task.attempts,
    };

    const result = await handler(task.change, context);

    clearTimeout(timeoutId);

    if (result.success) {
      task.status = 'completed';
      onProgress?.(task);
      return result;
    }

    if (result.conflict) {
      task.status = 'conflict';
      onProgress?.(task);
      return result;
    }

    // Failed but might be retryable
    task.attempts++;
    task.error = result.error;

    if (task.attempts >= MAX_RETRY_ATTEMPTS || result.shouldRetry === false) {
      task.status = 'failed';
    } else {
      task.status = 'pending';
    }

    onProgress?.(task);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);

    task.attempts++;
    task.error = error instanceof Error ? error.message : 'Unknown error';

    if (task.attempts >= MAX_RETRY_ATTEMPTS) {
      task.status = 'failed';
    } else {
      task.status = 'pending';
    }

    onProgress?.(task);

    return {
      success: false,
      error: task.error,
      shouldRetry: task.attempts < MAX_RETRY_ATTEMPTS,
    };
  }
}

/**
 * Get delay before next retry
 */
export function getRetryDelay(attempt: number): number {
  return RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)];
}

/**
 * Process all pending changes
 */
export async function processPendingChanges(
  options: {
    batchSize?: number;
    onProgress?: (task: SyncTask) => void;
    onComplete?: (results: SyncResult[]) => void;
  } = {}
): Promise<SyncResult[]> {
  const { batchSize = 10, onProgress, onComplete } = options;

  const pending = await getPendingChanges();
  const results: SyncResult[] = [];

  // Create tasks from pending changes
  const tasks: SyncTask[] = pending.map(change => ({
    id: change.id,
    change,
    status: 'pending',
    attempts: change.retryCount,
  }));

  // Process in batches
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);

    // Process batch concurrently
    const batchResults = await Promise.all(
      batch.map(task => executeSyncTask(task, { onProgress }))
    );

    results.push(...batchResults);

    // Update pending changes based on results
    for (let j = 0; j < batch.length; j++) {
      const task = batch[j];
      const result = batchResults[j];

      if (result.success) {
        await removePendingChange(task.id);
      } else if (task.status === 'failed' || task.status === 'conflict') {
        await incrementRetryCount(task.id);
      }
    }
  }

  onComplete?.(results);
  return results;
}

/**
 * Conflict resolution strategies
 */
export const ConflictResolver = {
  /**
   * Use local data (client wins)
   */
  local<T>(localData: T): ConflictResolution<T> {
    return {
      strategy: 'local',
      localData,
      remoteData: localData,
      mergedData: localData,
    };
  },

  /**
   * Use remote data (server wins)
   */
  remote<T>(localData: T, remoteData: T): ConflictResolution<T> {
    return {
      strategy: 'remote',
      localData,
      remoteData,
      mergedData: remoteData,
    };
  },

  /**
   * Merge local and remote data
   */
  merge<T extends Record<string, any>>(
    localData: T,
    remoteData: T,
    mergeFn?: (local: T, remote: T) => T
  ): ConflictResolution<T> {
    const merged = mergeFn
      ? mergeFn(localData, remoteData)
      : { ...remoteData, ...localData, lastModified: Date.now() };

    return {
      strategy: 'merge',
      localData,
      remoteData,
      mergedData: merged,
    };
  },

  /**
   * Manual resolution required
   */
  manual<T>(localData: T, remoteData: T): ConflictResolution<T> {
    return {
      strategy: 'manual',
      localData,
      remoteData,
    };
  },
};

/**
 * Resolve a conflict using the specified strategy
 */
export async function resolveConflict<T>(
  key: string,
  resolution: ConflictResolution<T>
): Promise<void> {
  const { strategy, mergedData } = resolution;

  if (strategy === 'manual' || !mergedData) {
    throw new Error('Manual conflict resolution not implemented');
  }

  await saveToCache(key, mergedData, { syncStatus: 'synced' });
}

/**
 * Background sync scheduler
 */
export class BackgroundSyncScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private readonly interval: number;
  private readonly onError?: (error: Error) => void;

  constructor(
    interval: number = 5 * 60 * 1000, // 5 minutes
    onError?: (error: Error) => void
  ) {
    this.interval = interval;
    this.onError = onError;
  }

  /**
   * Start the background sync scheduler
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;

    // Immediate first run
    this.runSync();

    // Schedule recurring sync
    this.intervalId = setInterval(() => {
      this.runSync();
    }, this.interval);

    console.log('[SyncManager] Background sync scheduler started');
  }

  /**
   * Stop the background sync scheduler
   */
  stop(): void {
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('[SyncManager] Background sync scheduler stopped');
  }

  /**
   * Check if scheduler is running
   */
  get running(): boolean {
    return this.isRunning;
  }

  private async runSync(): Promise<void> {
    try {
      const pending = await getPendingChanges();

      if (pending.length === 0) return;

      console.log(`[SyncManager] Running background sync for ${pending.length} pending changes`);

      await processPendingChanges({
        onProgress: (task) => {
          console.log(`[SyncManager] Sync progress: ${task.change.entity} - ${task.status}`);
        },
      });
    } catch (error) {
      console.error('[SyncManager] Background sync error:', error);
      this.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

// Global scheduler instance
let globalScheduler: BackgroundSyncScheduler | null = null;

/**
 * Get or create the global background sync scheduler
 */
export function getGlobalScheduler(
  interval?: number,
  onError?: (error: Error) => void
): BackgroundSyncScheduler {
  if (!globalScheduler) {
    globalScheduler = new BackgroundSyncScheduler(interval, onError);
  }
  return globalScheduler;
}

/**
 * Start global background sync
 */
export function startGlobalSync(
  interval?: number,
  onError?: (error: Error) => void
): void {
  const scheduler = getGlobalScheduler(interval, onError);
  scheduler.start();
}

/**
 * Stop global background sync
 */
export function stopGlobalSync(): void {
  globalScheduler?.stop();
}

/**
 * Check if global sync is running
 */
export function isGlobalSyncRunning(): boolean {
  return globalScheduler?.running ?? false;
}

/**
 * Create a sync handler wrapper for API calls
 */
export function createApiSyncHandler<T>(
  apiCall: (data: T) => Promise<any>,
  options: {
    transformRequest?: (change: PendingChange) => T;
    transformResponse?: (response: any) => T;
    onConflict?: (local: T, remote: any) => Promise<ConflictResolution<T>>;
  } = {}
): SyncHandler<T> {
  return async (change, context) => {
    try {
      const data = options.transformRequest
        ? options.transformRequest(change)
        : (change.data as T);

      const response = await apiCall(data);

      return {
        success: true,
        data: options.transformResponse
          ? options.transformResponse(response)
          : response,
      };
    } catch (error) {
      if (error instanceof Response && error.status === 409) {
        // Conflict detected
        if (options.onConflict) {
          const resolution = await options.onConflict(change.data, error);
          await resolveConflict(change.id, resolution);

          return {
            success: false,
            conflict: true,
            error: 'Conflict resolved',
          };
        }

        return {
          success: false,
          conflict: true,
          error: 'Conflict detected',
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'API call failed',
        shouldRetry: true,
      };
    }
  };
}

/**
 * Sync statistics
 */
export interface SyncStats {
  totalPending: number;
  syncing: number;
  completed: number;
  failed: number;
  conflicts: number;
  lastSyncTime: number | null;
}

/**
 * Get current sync statistics
 */
export async function getSyncStats(): Promise<SyncStats> {
  const pending = await getPendingChanges();

  return {
    totalPending: pending.length,
    syncing: 0, // Would need to track in-progress
    completed: 0, // Would need to track completed
    failed: pending.filter(p => p.retryCount >= MAX_RETRY_ATTEMPTS).length,
    conflicts: 0, // Would need to track conflicts
    lastSyncTime: null, // Would need to persist last sync time
  };
}

export default {
  registerSyncHandler,
  unregisterSyncHandler,
  getSyncHandler,
  executeSyncTask,
  processPendingChanges,
  getRetryDelay,
  ConflictResolver,
  resolveConflict,
  BackgroundSyncScheduler,
  getGlobalScheduler,
  startGlobalSync,
  stopGlobalSync,
  isGlobalSyncRunning,
  createApiSyncHandler,
  getSyncStats,
};
