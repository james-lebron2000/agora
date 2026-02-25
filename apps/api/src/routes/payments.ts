import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requirePermission } from '../middleware/auth';
import { redisService } from '../services/redis';
import { logger } from '../utils/logger';
import { ValidationError } from '../middleware/errorHandler';
import { SuccessResponse } from '../types';

const router = Router();

// Payment validation schemas
const createPaymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  description: z.string().min(1).max(500),
  metadata: z.record(z.unknown()).optional(),
  customerId: z.string().optional(),
  paymentMethod: z.enum(['card', 'bank_transfer', 'crypto', 'credit']).default('credit'),
});

const confirmPaymentSchema = z.object({
  paymentMethodId: z.string().optional(),
  confirmationToken: z.string().optional(),
});

// Cache middleware
async function cacheMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.method !== 'GET') {
    return next();
  }

  const cacheKey = `cache:payments:${req.originalUrl}`;
  
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
      redisService.set(cacheKey, body, 60).catch(err => {
        logger.error('Failed to cache response:', err);
      });
    }
    return originalJson(body);
  };
  
  next();
}

// GET /payments - List payments
router.get('/', 
  requirePermission('payments:read'),
  cacheMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, page = '1', limit = '10' } = req.query;
      
      // Mock data - in production, proxy to payments service
      const payments = [
        {
          id: 'pay-1',
          amount: 49.99,
          currency: 'USD',
          status: 'completed',
          description: 'Premium plan subscription',
          customerId: 'cust-1',
          paymentMethod: 'card',
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        },
        {
          id: 'pay-2',
          amount: 10.00,
          currency: 'USD',
          status: 'pending',
          description: 'API usage credits',
          customerId: 'cust-1',
          paymentMethod: 'credit',
          createdAt: new Date().toISOString(),
        },
      ];

      const response: SuccessResponse<typeof payments> = {
        success: true,
        data: payments,
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

// POST /payments - Create payment
router.post('/', 
  requirePermission('payments:read'), // Write permission would be more restrictive
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = createPaymentSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError(result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '));
      }

      // Mock creation - in production, proxy to payments service
      const payment = {
        id: `pay-${Date.now()}`,
        ...result.data,
        status: 'pending',
        createdBy: (req as any).user?.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Invalidate list cache
      await redisService.deletePattern('cache:payments:*');

      // Publish real-time update
      await redisService.publish('payments:created', {
        paymentId: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        timestamp: Date.now(),
      });

      const response: SuccessResponse<typeof payment> = {
        success: true,
        data: payment,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// GET /payments/:id - Get payment
router.get('/:id', 
  requirePermission('payments:read'),
  cacheMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Mock data - in production, proxy to payments service
      const payment = {
        id,
        amount: 49.99,
        currency: 'USD',
        status: 'completed',
        description: 'Premium plan subscription',
        metadata: { plan: 'premium', billingCycle: 'monthly' },
        customerId: 'cust-1',
        paymentMethod: 'card',
        receiptUrl: 'https://api.example.com/receipts/pay-1',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };

      const response: SuccessResponse<typeof payment> = {
        success: true,
        data: payment,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// POST /payments/:id/confirm - Confirm payment
router.post('/:id/confirm', 
  requirePermission('payments:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = confirmPaymentSchema.safeParse(req.body);
      
      if (!result.success) {
        throw new ValidationError(result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '));
      }

      // Mock confirm - in production, proxy to payments service
      const payment = {
        id,
        amount: 49.99,
        currency: 'USD',
        status: 'completed',
        description: 'Premium plan subscription',
        customerId: 'cust-1',
        paymentMethod: 'card',
        completedAt: new Date().toISOString(),
      };

      // Invalidate caches
      await redisService.delete(`cache:payments:/payments/${id}`);
      await redisService.deletePattern('cache:payments:/?*');

      // Publish real-time update
      await redisService.publish('payments:completed', {
        paymentId: id,
        amount: payment.amount,
        currency: payment.currency,
        timestamp: Date.now(),
      });

      const response: SuccessResponse<typeof payment> = {
        success: true,
        data: payment,
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
