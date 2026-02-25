import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

class RedisService {
  private client: Redis;
  private pubClient: Redis;
  private subClient: Redis;
  private isConnected: boolean = false;

  constructor() {
    const redisOptions: Redis.RedisOptions = {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    };

    if (config.redis.password) {
      redisOptions.password = config.redis.password;
    }
    if (config.redis.db !== undefined) {
      redisOptions.db = config.redis.db;
    }

    this.client = new Redis(config.redis.url, redisOptions);
    this.pubClient = new Redis(config.redis.url, redisOptions);
    this.subClient = new Redis(config.redis.url, redisOptions);

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.info('Redis client connected');
      this.isConnected = true;
    });

    this.client.on('error', (err) => {
      logger.error('Redis client error:', err);
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      logger.warn('Redis client reconnecting...');
    });

    this.pubClient.on('error', (err) => {
      logger.error('Redis pub client error:', err);
    });

    this.subClient.on('error', (err) => {
      logger.error('Redis sub client error:', err);
    });
  }

  // Rate limiting methods
  async incrementRateLimit(key: string, windowMs: number): Promise<{ count: number; ttl: number }> {
    const multi = this.client.multi();
    multi.incr(key);
    multi.pexpire(key, windowMs);
    
    const results = await multi.exec();
    if (!results) {
      throw new Error('Failed to execute rate limit increment');
    }
    
    const count = results[0][1] as number;
    const ttl = await this.client.pttl(key);
    
    return { count, ttl };
  }

  async getRateLimitCount(key: string): Promise<number> {
    const count = await this.client.get(key);
    return count ? parseInt(count, 10) : 0;
  }

  async resetRateLimit(key: string): Promise<void> {
    await this.client.del(key);
  }

  // Caching methods
  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  // Pub/Sub methods
  async publish(channel: string, message: unknown): Promise<void> {
    await this.pubClient.publish(channel, JSON.stringify(message));
  }

  subscribe(channel: string, callback: (message: string) => void): void {
    this.subClient.subscribe(channel);
    this.subClient.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        callback(message);
      }
    });
  }

  unsubscribe(channel: string): void {
    this.subClient.unsubscribe(channel);
  }

  // API Key management
  async getApiKey(key: string): Promise<unknown | null> {
    return this.get(`apikey:${key}`);
  }

  async setApiKey(key: string, data: unknown, ttlSeconds?: number): Promise<void> {
    await this.set(`apikey:${key}`, data, ttlSeconds);
  }

  async revokeApiKey(key: string): Promise<void> {
    await this.delete(`apikey:${key}`);
  }

  // Session/Token management
  async getSession(token: string): Promise<unknown | null> {
    return this.get(`session:${token}`);
  }

  async setSession(token: string, data: unknown, ttlSeconds: number): Promise<void> {
    await this.set(`session:${token}`, data, ttlSeconds);
  }

  async deleteSession(token: string): Promise<void> {
    await this.delete(`session:${token}`);
  }

  // Health check
  async healthCheck(): Promise<{ healthy: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      await this.client.ping();
      return { healthy: true, latencyMs: Date.now() - start };
    } catch (error) {
      return { healthy: false, latencyMs: Date.now() - start };
    }
  }

  // Connection status
  isHealthy(): boolean {
    return this.isConnected;
  }

  // Get underlying client for advanced operations
  getClient(): Redis {
    return this.client;
  }

  // Graceful shutdown
  async disconnect(): Promise<void> {
    await this.client.quit();
    await this.pubClient.quit();
    await this.subClient.quit();
    logger.info('Redis connections closed');
  }
}

export const redisService = new RedisService();
export default redisService;
