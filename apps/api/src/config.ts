import { GatewayConfig } from './types';

function parseIntEnv(value: string | undefined, defaultValue: number): number {
  const parsed = parseInt(value || '', 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export const config: GatewayConfig = {
  port: parseIntEnv(process.env.PORT, 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD,
    db: parseIntEnv(process.env.REDIS_DB, 0),
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  
  rateLimit: {
    default: {
      windowMs: parseIntEnv(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000), // 15 minutes
      maxRequests: parseIntEnv(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
      keyPrefix: 'ratelimit:default',
    },
    premium: {
      windowMs: parseIntEnv(process.env.PREMIUM_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
      maxRequests: parseIntEnv(process.env.PREMIUM_RATE_LIMIT_MAX_REQUESTS, 1000),
      keyPrefix: 'ratelimit:premium',
    },
    internal: {
      windowMs: 60000,
      maxRequests: 0, // Unlimited
      keyPrefix: 'ratelimit:internal',
    },
  },
  
  services: {
    agents: {
      name: 'agents',
      url: process.env.AGENTS_SERVICE_URL || 'http://localhost:3001',
      timeout: parseIntEnv(process.env.AGENTS_TIMEOUT, 30000),
      retries: parseIntEnv(process.env.AGENTS_RETRIES, 3),
      healthCheckPath: '/health',
    },
    tasks: {
      name: 'tasks',
      url: process.env.TASKS_SERVICE_URL || 'http://localhost:3002',
      timeout: parseIntEnv(process.env.TASKS_TIMEOUT, 30000),
      retries: parseIntEnv(process.env.TASKS_RETRIES, 3),
      healthCheckPath: '/health',
    },
    payments: {
      name: 'payments',
      url: process.env.PAYMENTS_SERVICE_URL || 'http://localhost:3003',
      timeout: parseIntEnv(process.env.PAYMENTS_TIMEOUT, 30000),
      retries: parseIntEnv(process.env.PAYMENTS_RETRIES, 3),
      healthCheckPath: '/health',
    },
  },
  
  notifications: {
    expoAccessToken: process.env.EXPO_ACCESS_TOKEN || '',
    queuePrefix: process.env.NOTIFICATION_QUEUE_PREFIX || 'notification:queue',
    batchSize: parseIntEnv(process.env.NOTIFICATION_BATCH_SIZE, 100),
    maxRetries: parseIntEnv(process.env.NOTIFICATION_MAX_RETRIES, 3),
    retryDelayMs: parseIntEnv(process.env.NOTIFICATION_RETRY_DELAY_MS, 5000),
  },
};

export default config;
