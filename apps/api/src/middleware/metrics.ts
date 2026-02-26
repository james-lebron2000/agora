/**
 * Express middleware for collecting Prometheus metrics
 * @module middleware/metrics
 */

import { Request, Response, NextFunction } from 'express';
import { monitoringService } from '../services/monitoring';
import { logger } from '../utils/logger';

/**
 * Get route pattern for metrics labeling
 * This normalizes URLs like /agents/123 to /agents/:id
 */
function getRoutePattern(req: Request): string {
  // If route exists (Express populated it), use the route path
  if (req.route && req.route.path) {
    const basePath = req.baseUrl || '';
    return `${basePath}${req.route.path}`;
  }
  
  // Fallback: normalize the URL path
  let path = req.path;
  
  // Replace UUID-like strings
  path = path.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id');
  
  // Replace numeric IDs (but not version numbers like v1)
  path = path.replace(/\/\d+(?=$|\/)/g, '/:id');
  
  return path;
}

/**
 * Get user tier from request
 */
function getUserTier(req: Request): string {
  const user = (req as any).user;
  return user?.tier || 'default';
}

/**
 * Express middleware to collect HTTP metrics
 * Should be mounted before route handlers
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const route = getRoutePattern(req);
  const method = req.method;
  
  // Increment in-progress gauge
  monitoringService.incrementInProgress(method, route);
  
  // Store original end function
  const originalEnd = res.end.bind(res);
  
  // Override end function to capture response metrics
  res.end = function(chunk?: any, encoding?: any, cb?: any): Response {
    // Restore original end function
    res.end = originalEnd;
    
    // Calculate duration
    const durationMs = Date.now() - startTime;
    const durationSeconds = durationMs / 1000;
    
    // Get status code
    const statusCode = res.statusCode;
    
    // Get user tier
    const tier = getUserTier(req);
    
    // Decrement in-progress gauge
    monitoringService.decrementInProgress(method, route);
    
    // Record request metrics
    monitoringService.recordHttpRequest(
      method,
      route,
      statusCode,
      durationSeconds,
      tier
    );
    
    // Log slow requests
    if (durationMs > 1000) {
      logger.warn({
        method,
        route,
        durationMs,
        statusCode,
        requestId: req.requestId,
      }, 'Slow request detected');
    }
    
    // Call original end
    return res.end(chunk, encoding, cb);
  };
  
  next();
}

/**
 * Middleware to track rate limit hits
 */
export function rateLimitMetricsMiddleware(
  tier: string,
  route: string
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if response will be rate limited (429 status)
    const originalWriteHead = res.writeHead.bind(res);
    
    res.writeHead = function(statusCode: number, ...args: any[]) {
      if (statusCode === 429) {
        monitoringService.recordRateLimitHit(tier, route);
      }
      return originalWriteHead(statusCode, ...args);
    };
    
    next();
  };
}

/**
 * WebSocket connection metrics tracker
 */
export class WebSocketMetricsTracker {
  private totalConnections = 0;
  private authenticatedConnections = 0;
  private messagesReceived = 0;
  private messagesSent = 0;

  /**
   * Record a new connection
   */
  connectionOpened(authenticated: boolean): void {
    this.totalConnections++;
    if (authenticated) {
      this.authenticatedConnections++;
    }
    this.updateMetrics();
  }

  /**
   * Record a closed connection
   */
  connectionClosed(authenticated: boolean): void {
    this.totalConnections = Math.max(0, this.totalConnections - 1);
    if (authenticated) {
      this.authenticatedConnections = Math.max(0, this.authenticatedConnections - 1);
    }
    this.updateMetrics();
  }

  /**
   * Record a received message
   */
  messageReceived(): void {
    this.messagesReceived++;
  }

  /**
   * Record a sent message
   */
  messageSent(): void {
    this.messagesSent++;
  }

  /**
   * Get current stats
   */
  getStats() {
    return {
      totalConnections: this.totalConnections,
      authenticatedConnections: this.authenticatedConnections,
      messagesReceived: this.messagesReceived,
      messagesSent: this.messagesSent,
    };
  }

  /**
   * Update Prometheus metrics
   */
  private updateMetrics(): void {
    monitoringService.setActiveConnections(
      this.totalConnections - this.authenticatedConnections,
      false
    );
    monitoringService.setActiveConnections(
      this.authenticatedConnections,
      true
    );
  }

  /**
   * Reset counters (for testing)
   */
  reset(): void {
    this.totalConnections = 0;
    this.authenticatedConnections = 0;
    this.messagesReceived = 0;
    this.messagesSent = 0;
    this.updateMetrics();
  }
}

// Export singleton tracker
export const wsMetricsTracker = new WebSocketMetricsTracker();
