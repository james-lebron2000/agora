export interface ApiKey {
  id: string;
  key: string;
  name: string;
  tier: 'default' | 'premium' | 'internal';
  ownerId: string;
  permissions: string[];
  createdAt: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;
  isActive: boolean;
}

export interface AuthenticatedRequest extends Express.Request {
  apiKey?: ApiKey;
  user?: {
    id: string;
    tier: string;
    permissions: string[];
  };
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
  keyPrefix?: string;
}

export interface CacheConfig {
  ttl: number;
  keyPrefix?: string;
  tags?: string[];
}

export interface WebSocketMessage {
  type: string;
  payload: unknown;
  timestamp: number;
  correlationId?: string;
}

export interface ServiceConfig {
  name: string;
  url: string;
  timeout: number;
  retries: number;
  healthCheckPath: string;
}

export interface GatewayConfig {
  port: number;
  nodeEnv: string;
  redis: {
    url: string;
    password?: string;
    db?: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  rateLimit: {
    default: RateLimitConfig;
    premium: RateLimitConfig;
    internal: RateLimitConfig;
  };
  services: {
    agents: ServiceConfig;
    tasks: ServiceConfig;
    payments: ServiceConfig;
  };
  notifications: {
    expoAccessToken: string;
    queuePrefix: string;
    batchSize: number;
    maxRetries: number;
    retryDelayMs: number;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  dependencies: {
    redis: { status: string; latencyMs: number };
    agents: { status: string; latencyMs: number };
    tasks: { status: string; latencyMs: number };
    payments: { status: string; latencyMs: number };
  };
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    stack?: string;
  };
  timestamp: string;
  requestId: string;
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
  timestamp: string;
  requestId: string;
}

// Re-export notification types
export * from './notifications';
