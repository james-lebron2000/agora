import { OfflineStorage, QueuedOperation } from '../services/offlineStorage';

export interface SyncResult {
  success: number;
  failed: number;
  errors: Array<{ operation: QueuedOperation; error: string }>;
}

export interface ConflictResolution {
  strategy: 'local' | 'remote' | 'merge' | 'timestamp';
  resolvedData?: any;
}

class SyncManager {
  private maxRetries = 3;
  private batchSize = 10;

  /**
   * Process all queued operations
   */
  async processQueue(): Promise<SyncResult> {
    const queue = await OfflineStorage.getOperationQueue();
    const result: SyncResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    if (queue.length === 0) return result;

    // Sort by timestamp (oldest first)
    const sortedQueue = queue.sort((a, b) => a.timestamp - b.timestamp);
    
    // Process in batches
    for (let i = 0; i < sortedQueue.length; i += this.batchSize) {
      const batch = sortedQueue.slice(i, i + this.batchSize);
      
      for (const operation of batch) {
        try {
          await this.executeOperation(operation);
          await OfflineStorage.removeFromQueue(operation.id);
          result.success++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          if (operation.retryCount < this.maxRetries) {
            await OfflineStorage.incrementRetryCount(operation.id);
          } else {
            // Max retries reached - remove from queue and record error
            await OfflineStorage.removeFromQueue(operation.id);
            result.failed++;
            result.errors.push({ operation, error: errorMessage });
          }
        }
      }
    }

    return result;
  }

  /**
   * Execute a single operation
   */
  private async executeOperation(operation: QueuedOperation): Promise<void> {
    const { endpoint, payload, type } = operation;

    const response = await fetch(endpoint, {
      method: this.getHttpMethod(type),
      headers: {
        'Content-Type': 'application/json',
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  /**
   * Get HTTP method for operation type
   */
  private getHttpMethod(type: QueuedOperation['type']): string {
    switch (type) {
      case 'create':
        return 'POST';
      case 'update':
        return 'PUT';
      case 'delete':
        return 'DELETE';
      default:
        return 'POST';
    }
  }

  /**
   * Resolve conflict between local and remote data
   */
  resolveConflict(
    localData: any,
    remoteData: any,
    localTimestamp: number,
    remoteTimestamp: number,
    strategy: ConflictResolution['strategy'] = 'timestamp'
  ): ConflictResolution {
    switch (strategy) {
      case 'local':
        return { strategy: 'local', resolvedData: localData };
      case 'remote':
        return { strategy: 'remote', resolvedData: remoteData };
      case 'timestamp':
        return {
          strategy: 'timestamp',
          resolvedData: localTimestamp > remoteTimestamp ? localData : remoteData,
        };
      case 'merge':
        return {
          strategy: 'merge',
          resolvedData: this.mergeData(localData, remoteData),
        };
      default:
        return { strategy: 'timestamp', resolvedData: remoteData };
    }
  }

  /**
   * Merge local and remote data (shallow merge)
   */
  private mergeData(local: any, remote: any): any {
    if (typeof local !== 'object' || typeof remote !== 'object') {
      return remote;
    }
    return { ...remote, ...local };
  }

  /**
   * Incremental sync - fetch only changed data since last sync
   */
  async incrementalSync<T>(
    endpoint: string,
    lastSyncTime: number,
    cacheKey: string
  ): Promise<T | null> {
    try {
      const response = await fetch(`${endpoint}?since=${lastSyncTime}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: T = await response.json();
      
      // Update cache with new data
      await OfflineStorage.setCache(cacheKey, data);
      
      return data;
    } catch (error) {
      // Return cached data if available
      return await OfflineStorage.getCache<T>(cacheKey);
    }
  }

  /**
   * Full sync - fetch all data and replace cache
   */
  async fullSync<T>(endpoint: string, cacheKey: string): Promise<T | null> {
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: T = await response.json();
      
      // Replace cache with new data
      await OfflineStorage.setCache(cacheKey, data);
      
      return data;
    } catch (error) {
      // Return cached data if available
      return await OfflineStorage.getCache<T>(cacheKey);
    }
  }

  /**
   * Schedule background sync (placeholder for background tasks)
   */
  scheduleBackgroundSync(intervalMinutes: number = 15): void {
    // This would integrate with react-native-background-fetch in production
    console.log(`Background sync scheduled every ${intervalMinutes} minutes`);
  }
}

export const syncManager = new SyncManager();
export default syncManager;
