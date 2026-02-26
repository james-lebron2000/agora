/**
 * Monitoring service for metrics collection and Prometheus export
 * @module services/monitoring
 */

import promClient, { Registry, Counter, Histogram, Gauge } from 'prom-client';
import { logger } from '../utils/logger';

class MonitoringService {
  private register: Registry;
  private httpRequestsTotal: Counter;
  private httpRequestDuration: Histogram;
  private httpRequestsInProgress: Gauge;
  private activeConnections: Gauge;
  private cacheHitRatio: Gauge;
  private rateLimitHits: Counter;

  constructor() {
    // Create a new registry
    this.register = new Registry();
    
    // Add default metrics (memory, CPU, event loop, etc.)
    promClient.collectDefaultMetrics({ 
      register: this.register,
      prefix: 'agora_',
    });

    // HTTP request counter
    this.httpRequestsTotal = new Counter({
      name: 'agora_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'tier'],
      registers: [this.register],
    });

    // HTTP request duration histogram
    this.httpRequestDuration = new Histogram({
      name: 'agora_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [this.register],
    });

    // HTTP requests in progress
    this.httpRequestsInProgress = new Gauge({
      name: 'agora_http_requests_in_progress',
      help: 'Number of HTTP requests currently in progress',
      labelNames: ['method', 'route'],
      registers: [this.register],
    });

    // Active WebSocket connections
    this.activeConnections = new Gauge({
      name: 'agora_websocket_connections_active',
      help: 'Number of active WebSocket connections',
      labelNames: ['authenticated'],
      registers: [this.register],
    });

    // Cache hit ratio
    this.cacheHitRatio = new Gauge({
      name: 'agora_cache_hit_ratio',
      help: 'Cache hit ratio (0-1)',
      labelNames: ['cache_type'],
      registers: [this.register],
    });

    // Rate limit hits
    this.rateLimitHits = new Counter({
      name: 'agora_rate_limit_hits_total',
      help: 'Total number of rate limit hits',
      labelNames: ['tier', 'route'],
      registers: [this.register],
    });

    logger.info('Monitoring service initialized with Prometheus metrics');
  }

  /**
   * Record an HTTP request
   */
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number,
    tier: string = 'default'
  ): void {
    this.httpRequestsTotal.inc({
      method: method.toUpperCase(),
      route,
      status_code: statusCode.toString(),
      tier,
    });

    this.httpRequestDuration.observe(
      {
        method: method.toUpperCase(),
        route,
        status_code: statusCode.toString(),
      },
      durationSeconds
    );
  }

  /**
   * Increment in-progress requests
   */
  incrementInProgress(method: string, route: string): void {
    this.httpRequestsInProgress.inc({
      method: method.toUpperCase(),
      route,
    });
  }

  /**
   * Decrement in-progress requests
   */
  decrementInProgress(method: string, route: string): void {
    this.httpRequestsInProgress.dec({
      method: method.toUpperCase(),
      route,
    });
  }

  /**
   * Set active WebSocket connections
   */
  setActiveConnections(count: number, authenticated: boolean = false): void {
    this.activeConnections.set(
      { authenticated: authenticated.toString() },
      count
    );
  }

  /**
   * Set cache hit ratio
   */
  setCacheHitRatio(ratio: number, cacheType: string = 'redis'): void {
    this.cacheHitRatio.set({ cache_type: cacheType }, ratio);
  }

  /**
   * Record rate limit hit
   */
  recordRateLimitHit(tier: string, route: string): void {
    this.rateLimitHits.inc({ tier, route });
  }

  /**
   * Get all metrics as an object
   */
  getMetrics() {
    return {
      timestamp: new Date().toISOString(),
      upTime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    };
  }

  /**
   * Get Prometheus formatted metrics
   */
  async getPrometheusMetrics(): Promise<string> {
    return this.register.metrics();
  }

  /**
   * Get content type for Prometheus metrics
   */
  getContentType(): string {
    return this.register.contentType;
  }

  /**
   * Reset all metrics (useful for testing)
   */
  resetMetrics(): void {
    this.register.resetMetrics();
    logger.info('Metrics reset');
  }
}

// Export singleton instance
export const monitoringService = new MonitoringService();
export default monitoringService;
