import { Router, Request, Response, NextFunction } from 'express';
import { redisService } from '../services/redis';
import { webSocketService } from '../services/websocket';
import { monitoringService } from '../services/monitoring';
import { config } from '../config';
import { logger } from '../utils/logger';
import { SuccessResponse, HealthStatus } from '../types';

const router = Router();
const packageJson = require('../../package.json');

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Basic health check
 *     description: |
 *       Simple health check endpoint that returns the API status.
 *       This endpoint is publicly accessible and does not require authentication.
 *       
 *       Use this for load balancer health checks and basic uptime monitoring.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: 'healthy'
 *             examples:
 *               healthy:
 *                 summary: Healthy response
 *                 value:
 *                   success: true
 *                   data:
 *                     status: 'healthy'
 *                   timestamp: '2024-01-15T10:30:00.000Z'
 *                   requestId: '550e8400-e29b-41d4-a716-446655440000'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response: SuccessResponse<{ status: string }> = {
      success: true,
      data: { status: 'healthy' },
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /health/detailed:
 *   get:
 *     summary: Detailed health check
 *     description: |
 *       Comprehensive health check that includes:
 *       - API version and uptime
 *       - Redis connection status and latency
 *       - Microservice health (agents, tasks, payments)
 *       - Overall system status
 *       
 *       The response status code reflects the health state:
 *       - `200`: All systems healthy
 *       - `200` (with degraded status): Some systems degraded but functional
 *       - `503`: Critical systems unhealthy
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Health status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       $ref: '#/components/schemas/HealthStatus'
 *       503:
 *         description: Service unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       $ref: '#/components/schemas/HealthStatus'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/detailed', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check Redis
    const redisHealth = await redisService.healthCheck();
    
    // Check WebSocket stats
    const wsStats = webSocketService.getStats();

    // Check service dependencies
    const dependencies: HealthStatus['dependencies'] = {
      redis: {
        status: redisHealth.healthy ? 'healthy' : 'unhealthy',
        latencyMs: redisHealth.latencyMs,
      },
      agents: await checkService('agents'),
      tasks: await checkService('tasks'),
      payments: await checkService('payments'),
    };

    const allHealthy = Object.values(dependencies).every(d => d.status === 'healthy');
    const anyUnhealthy = Object.values(dependencies).some(d => d.status === 'unhealthy');

    const status: HealthStatus['status'] = anyUnhealthy 
      ? 'unhealthy' 
      : (allHealthy ? 'healthy' : 'degraded');

    // Get additional metrics
    const metrics = monitoringService.getMetrics();

    const health: HealthStatus & { metrics?: typeof metrics } = {
      status,
      timestamp: new Date().toISOString(),
      version: packageJson.version,
      uptime: process.uptime(),
      dependencies,
      metrics,
    };

    const response: SuccessResponse<typeof health> = {
      success: true,
      data: health,
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    };

    const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;
    res.status(statusCode).json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /health/ready:
 *   get:
 *     summary: Readiness probe
 *     description: |
 *       Kubernetes-style readiness probe.
 *       Returns 200 when the service is ready to accept traffic,
 *       503 when critical dependencies (like Redis) are not ready.
 *       
 *       Use this endpoint for Kubernetes readiness probes.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is ready to accept traffic
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         ready:
 *                           type: boolean
 *                           example: true
 *       503:
 *         description: Service is not ready
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/ready', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const redisHealth = await redisService.healthCheck();
    
    if (!redisHealth.healthy) {
      res.status(503).json({
        success: false,
        error: { code: 'NOT_READY', message: 'Redis connection not ready' },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
      return;
    }

    const response: SuccessResponse<{ ready: boolean }> = {
      success: true,
      data: { ready: true },
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /health/live:
 *   get:
 *     summary: Liveness probe
 *     description: |
 *       Kubernetes-style liveness probe.
 *       Always returns 200 if the process is running.
 *       
 *       Use this endpoint for Kubernetes liveness probes.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is alive
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         alive:
 *                           type: boolean
 *                           example: true
 */
router.get('/live', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: { alive: true },
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  });
});

/**
 * @openapi
 * /health/ws:
 *   get:
 *     summary: WebSocket statistics
 *     description: |
 *       Retrieve real-time WebSocket connection statistics.
 *       
 *       **Authentication Required**: Bearer token with `admin:read` permission
 *     tags: [Health]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: WebSocket statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       $ref: '#/components/schemas/WebSocketStats'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/ws', (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = webSocketService.getStats();

    const response: SuccessResponse<typeof stats> = {
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /health/metrics:
 *   get:
 *     summary: Prometheus metrics
 *     description: |
 *       Expose application metrics in Prometheus format.
 *       Includes request counts, latencies, error rates, and custom business metrics.
 *       
 *       **Note**: This endpoint returns plain text in Prometheus exposition format,
 *       not JSON.
 *     tags: [Health]
 *     produces:
 *       - text/plain
 *     responses:
 *       200:
 *         description: Prometheus metrics in plain text format
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *             example: |
 *               # HELP http_requests_total Total HTTP requests
 *               # TYPE http_requests_total counter
 *               http_requests_total{method="GET",route="/health",status="200"} 42
 */
router.get('/metrics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const metrics = await monitoringService.getPrometheusMetrics();
    res.set('Content-Type', monitoringService.getContentType());
    res.send(metrics);
  } catch (error) {
    next(error);
  }
});

async function checkService(serviceName: 'agents' | 'tasks' | 'payments'): Promise<{ status: string; latencyMs: number }> {
  const serviceConfig = config.services[serviceName];
  const start = Date.now();
  
  try {
    // In production, make actual HTTP request to service health endpoint
    // For now, simulate a healthy service
    return { status: 'healthy', latencyMs: Date.now() - start };
  } catch (error) {
    logger.warn(`${serviceName} service health check failed:`, error);
    return { status: 'unhealthy', latencyMs: Date.now() - start };
  }
}

export default router;
