import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { config } from '../config';
import { requirePermission } from '../middleware/auth';
import { redisService } from '../services/redis';
import { logger } from '../utils/logger';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import { SuccessResponse } from '../types';

const router = Router();

// Agent validation schema
const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  type: z.enum(['chat', 'task', 'workflow']),
  config: z.record(z.unknown()).optional(),
  capabilities: z.array(z.string()).optional(),
});

const updateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  config: z.record(z.unknown()).optional(),
  capabilities: z.array(z.string()).optional(),
  status: z.enum(['active', 'inactive', 'paused']).optional(),
});

// Cache middleware
async function cacheMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.method !== 'GET') {
    return next();
  }

  const cacheKey = `cache:agents:${req.originalUrl}`;
  
  try {
    const cached = await redisService.get(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for ${req.originalUrl}`);
      return res.json(cached);
    }
  } catch (error) {
    logger.error('Cache error:', error);
  }
  
  // Store original json method
  const originalJson = res.json.bind(res);
  res.json = function(body: unknown) {
    // Cache successful GET responses
    if (res.statusCode >= 200 && res.statusCode < 300) {
      redisService.set(cacheKey, body, 60).catch(err => {
        logger.error('Failed to cache response:', err);
      });
    }
    return originalJson(body);
  };
  
  next();
}

// GET /agents - List agents
router.get('/', 
  requirePermission('agents:read'),
  cacheMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Mock data - in production, proxy to agents service
      const agents = [
        {
          id: 'agent-1',
          name: 'Assistant Alpha',
          type: 'chat',
          status: 'active',
          capabilities: ['text-generation', 'summarization'],
          createdAt: new Date().toISOString(),
        },
        {
          id: 'agent-2',
          name: 'Task Runner Beta',
          type: 'task',
          status: 'active',
          capabilities: ['code-execution', 'file-processing'],
          createdAt: new Date().toISOString(),
        },
      ];

      const response: SuccessResponse<typeof agents> = {
        success: true,
        data: agents,
        meta: {
          page: 1,
          limit: 10,
          total: agents.length,
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

// POST /agents - Create agent
router.post('/', 
  requirePermission('agents:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = createAgentSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError(result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '));
      }

      // Mock creation - in production, proxy to agents service
      const agent = {
        id: `agent-${Date.now()}`,
        ...result.data,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Invalidate list cache
      await redisService.deletePattern('cache:agents:*');

      const response: SuccessResponse<typeof agent> = {
        success: true,
        data: agent,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// GET /agents/:id - Get agent
router.get('/:id', 
  requirePermission('agents:read'),
  cacheMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Mock data - in production, proxy to agents service
      const agent = {
        id,
        name: 'Assistant Alpha',
        description: 'A helpful AI assistant',
        type: 'chat',
        status: 'active',
        config: { model: 'gpt-4' },
        capabilities: ['text-generation', 'summarization'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const response: SuccessResponse<typeof agent> = {
        success: true,
        data: agent,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /agents/:id - Update agent
router.put('/:id', 
  requirePermission('agents:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = updateAgentSchema.safeParse(req.body);
      
      if (!result.success) {
        throw new ValidationError(result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '));
      }

      // Mock update - in production, proxy to agents service
      const agent = {
        id,
        name: 'Assistant Alpha',
        description: 'A helpful AI assistant',
        type: 'chat',
        status: result.data.status || 'active',
        config: result.data.config || { model: 'gpt-4' },
        capabilities: result.data.capabilities || ['text-generation'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...result.data,
      };

      // Invalidate caches
      await redisService.delete(`cache:agents:/agents/${id}`);
      await redisService.deletePattern('cache:agents:/?*');

      const response: SuccessResponse<typeof agent> = {
        success: true,
        data: agent,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /agents/:id - Delete agent
router.delete('/:id', 
  requirePermission('agents:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Mock deletion - in production, proxy to agents service
      
      // Invalidate caches
      await redisService.delete(`cache:agents:/agents/${id}`);
      await redisService.deletePattern('cache:agents:/?*');

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

// POST /agents/:id/execute - Execute agent
router.post('/:id/execute', 
  requirePermission('agents:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { input, context } = req.body;

      if (!input) {
        throw new ValidationError('Input is required');
      }

      // Mock execution - in production, proxy to agents service
      const execution = {
        executionId: `exec-${Date.now()}`,
        agentId: id,
        status: 'pending',
        input,
        context: context || {},
        createdAt: new Date().toISOString(),
      };

      const response: SuccessResponse<typeof execution> = {
        success: true,
        data: execution,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      };

      res.status(202).json(response);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
