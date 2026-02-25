import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requirePermission } from '../middleware/auth';
import { redisService } from '../services/redis';
import { logger } from '../utils/logger';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import { SuccessResponse } from '../types';

const router = Router();

// Task validation schemas
const createTaskSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  agentId: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
  scheduledAt: z.string().datetime().optional(),
  timeout: z.number().int().min(1000).max(3600000).optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  payload: z.record(z.unknown()).optional(),
  status: z.enum(['pending', 'running', 'paused', 'completed', 'failed', 'cancelled']).optional(),
});

// Cache middleware
async function cacheMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.method !== 'GET') {
    return next();
  }

  const cacheKey = `cache:tasks:${req.originalUrl}`;
  
  try {
    const cached = await redisService.get(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for ${req.originalUrl}`);
      return res.json(cached);
    }
  } catch (error) {
    logger.error('Cache error:', error);
  }
  
  const originalJson = res.json.bind(res);
  res.json = function(body: unknown) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      redisService.set(cacheKey, body, 30).catch(err => {
        logger.error('Failed to cache response:', err);
      });
    }
    return originalJson(body);
  };
  
  next();
}

// GET /tasks - List tasks
router.get('/', 
  requirePermission('tasks:read'),
  cacheMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, agentId, page = '1', limit = '10' } = req.query;
      
      // Mock data - in production, proxy to tasks service
      const tasks = [
        {
          id: 'task-1',
          type: 'code-generation',
          title: 'Generate API endpoint',
          status: 'completed',
          priority: 'high',
          agentId: 'agent-1',
          progress: 100,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        },
        {
          id: 'task-2',
          type: 'data-processing',
          title: 'Process user analytics',
          status: 'running',
          priority: 'medium',
          agentId: 'agent-2',
          progress: 45,
          createdAt: new Date().toISOString(),
          startedAt: new Date().toISOString(),
        },
      ];

      const response: SuccessResponse<typeof tasks> = {
        success: true,
        data: tasks,
        meta: {
          page: parseInt(page as string, 10),
          limit: parseInt(limit as string, 10),
          total: 2,
          hasMore: false,
        },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// POST /tasks - Create task
router.post('/', 
  requirePermission('tasks:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = createTaskSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError(result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '));
      }

      // Mock creation - in production, proxy to tasks service
      const task = {
        id: `task-${Date.now()}`,
        ...result.data,
        status: 'pending',
        progress: 0,
        createdBy: (req as any).user?.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Invalidate list cache
      await redisService.deletePattern('cache:tasks:*');

      // Publish real-time update
      await redisService.publish('tasks:created', {
        taskId: task.id,
        type: task.type,
        status: task.status,
        timestamp: Date.now(),
      });

      const response: SuccessResponse<typeof task> = {
        success: true,
        data: task,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// GET /tasks/:id - Get task
router.get('/:id', 
  requirePermission('tasks:read'),
  cacheMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Mock data - in production, proxy to tasks service
      const task = {
        id,
        type: 'code-generation',
        title: 'Generate API endpoint',
        description: 'Create a new REST API endpoint for user management',
        status: 'running',
        priority: 'high',
        agentId: 'agent-1',
        payload: { endpoint: '/api/users', method: 'POST' },
        progress: 45,
        logs: [
          { level: 'info', message: 'Task started', timestamp: new Date().toISOString() },
          { level: 'info', message: 'Analyzing requirements', timestamp: new Date().toISOString() },
        ],
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const response: SuccessResponse<typeof task> = {
        success: true,
        data: task,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /tasks/:id - Update task
router.put('/:id', 
  requirePermission('tasks:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = updateTaskSchema.safeParse(req.body);
      
      if (!result.success) {
        throw new ValidationError(result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '));
      }

      // Mock update - in production, proxy to tasks service
      const task = {
        id,
        type: 'code-generation',
        title: result.data.title || 'Generate API endpoint',
        description: result.data.description || 'Create a new REST API endpoint',
        status: result.data.status || 'running',
        priority: result.data.priority || 'high',
        agentId: 'agent-1',
        progress: 60,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...result.data,
      };

      // Invalidate caches
      await redisService.delete(`cache:tasks:/tasks/${id}`);
      await redisService.deletePattern('cache:tasks:/?*');

      // Publish real-time update
      await redisService.publish('tasks:updated', {
        taskId: id,
        status: task.status,
        progress: task.progress,
        timestamp: Date.now(),
      });

      const response: SuccessResponse<typeof task> = {
        success: true,
        data: task,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /tasks/:id - Delete task
router.delete('/:id', 
  requirePermission('tasks:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Invalidate caches
      await redisService.delete(`cache:tasks:/tasks/${id}`);
      await redisService.deletePattern('cache:tasks:/?*');

      // Publish real-time update
      await redisService.publish('tasks:deleted', {
        taskId: id,
        timestamp: Date.now(),
      });

      const response: SuccessResponse<{ deleted: boolean; id: string }> = {
        success: true,
        data: { deleted: true, id },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// POST /tasks/:id/cancel - Cancel task
router.post('/:id/cancel', 
  requirePermission('tasks:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Mock cancel - in production, proxy to tasks service
      const task = {
        id,
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
      };

      // Invalidate caches
      await redisService.delete(`cache:tasks:/tasks/${id}`);
      await redisService.deletePattern('cache:tasks:/?*');

      // Publish real-time update
      await redisService.publish('tasks:cancelled', {
        taskId: id,
        timestamp: Date.now(),
      });

      const response: SuccessResponse<typeof task> = {
        success: true,
        data: task,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
