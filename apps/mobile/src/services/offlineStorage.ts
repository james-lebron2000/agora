import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@agora_cache_';
const QUEUE_PREFIX = '@agora_queue_';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface QueuedOperation {
  id: string;
  type: 'update' | 'create' | 'delete';
  endpoint: string;
  payload: any;
  timestamp: number;
  retryCount: number;
}

// Legacy export for compatibility - use QueuedOperation instead
export type PendingChange = QueuedOperation;

// ============================================================================
// Individual function exports for useOfflineSync hook
// ============================================================================

/**
 * Get all pending changes from the queue
 */
export async function getPendingChanges(): Promise<QueuedOperation[]> {
  return OfflineStorage.getOperationQueue();
}

/**
 * Remove a pending change from the queue
 */
export async function removePendingChange(operationId: string): Promise<void> {
  return OfflineStorage.removeFromQueue(operationId);
}

/**
 * Increment retry count for a pending change
 */
export async function incrementRetryCount(operationId: string): Promise<void> {
  return OfflineStorage.incrementRetryCount(operationId);
}

/**
 * Save data to cache
 */
export async function saveToCache<T>(key: string, data: T, ttl?: number): Promise<void> {
  return OfflineStorage.setCache(key, data, ttl);
}

/**
 * Load data from cache
 */
export async function loadFromCache<T>(key: string): Promise<T | null> {
  return OfflineStorage.getCache<T>(key);
}

/**
 * Add a pending change to the queue
 */
export async function addPendingChange(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
  return OfflineStorage.queueOperation(operation);
}

/**
 * Clear all pending changes
 */
export async function clearPendingChanges(): Promise<void> {
  return OfflineStorage.clearQueue();
}

export class OfflineStorage {
  /**
   * Cache data with TTL
   */
  static async setCache<T>(key: string, data: T, ttl: number = DEFAULT_TTL): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
  }

  /**
   * Get cached data if not expired
   */
  static async getCache<T>(key: string): Promise<T | null> {
    const stored = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!stored) return null;

    const entry: CacheEntry<T> = JSON.parse(stored);
    const isExpired = Date.now() - entry.timestamp > entry.ttl;

    if (isExpired) {
      await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }

    return entry.data;
  }

  /**
   * Remove cached data
   */
  static async removeCache(key: string): Promise<void> {
    await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
  }

  /**
   * Clear all cache
   */
  static async clearCache(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
  }

  /**
   * Add operation to offline queue
   */
  static async queueOperation(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const queue = await this.getOperationQueue();
    const newOperation: QueuedOperation = {
      ...operation,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };
    queue.push(newOperation);
    await AsyncStorage.setItem(`${QUEUE_PREFIX}operations`, JSON.stringify(queue));
  }

  /**
   * Get all queued operations
   */
  static async getOperationQueue(): Promise<QueuedOperation[]> {
    const stored = await AsyncStorage.getItem(`${QUEUE_PREFIX}operations`);
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Remove operation from queue
   */
  static async removeFromQueue(operationId: string): Promise<void> {
    const queue = await this.getOperationQueue();
    const filtered = queue.filter(op => op.id !== operationId);
    await AsyncStorage.setItem(`${QUEUE_PREFIX}operations`, JSON.stringify(filtered));
  }

  /**
   * Update operation retry count
   */
  static async incrementRetryCount(operationId: string): Promise<void> {
    const queue = await this.getOperationQueue();
    const operation = queue.find(op => op.id === operationId);
    if (operation) {
      operation.retryCount++;
      await AsyncStorage.setItem(`${QUEUE_PREFIX}operations`, JSON.stringify(queue));
    }
  }

  /**
   * Clear operation queue
   */
  static async clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(`${QUEUE_PREFIX}operations`);
  }

  /**
   * Get cache stats
   */
  static async getCacheStats(): Promise<{ totalEntries: number; totalSize: number }> {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
    let totalSize = 0;

    for (const key of cacheKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value) totalSize += value.length;
    }

    return {
      totalEntries: cacheKeys.length,
      totalSize,
    };
  }
}

export default OfflineStorage;
