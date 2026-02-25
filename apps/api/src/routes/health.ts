import { Router, Request, Response, NextFunction } from 'express';
import { redisService } from '../services/redis';
import { webSocketService } from '../services/websocket';
import { config } from '../config';
import { logger } from '../utils/logger';
import { SuccessResponse, HealthStatus } from '../types';

const router = Router();
const packageJson = require('../../package.json');

// Basic health check
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

// Detailed health check
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

    const health: HealthStatus = {
      status,
      timestamp: new Date().toISOString(),
      version: packageJson.version,
      uptime: process.uptime(),
      dependencies,
    };

    const response: SuccessResponse<HealthStatus> = {
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

// Readiness check
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

// Liveness check
router.get('/live', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: { alive: true },
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  });
});

// WebSocket stats
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
