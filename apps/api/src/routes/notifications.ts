/**
 * Notification Routes
 * 
 * Endpoints for managing push notifications:
 * - POST /notifications/register - Register a push token
 * - POST /notifications/unregister - Unregister a push token
 * - GET /notifications/tokens/:walletAddress - Get tokens for a wallet (admin/internal)
 * - POST /notifications/send - Send notification (admin)
 * - POST /notifications/batch - Send batch notifications (admin)
 * - GET /notifications/stats - Get notification statistics (admin)
 * 
 * @module routes/notifications
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { notificationService } from '../services/notifications';
import { requirePermission } from '../middleware/auth';
import { ValidationError } from '../middleware/errorHandler';
import { SuccessResponse } from '../types';
import { logger } from '../utils/logger';
import { PushToken, NotificationStats } from '../types/notifications';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  platform: z.enum(['ios', 'android', 'web']).optional().default('ios'),
});

const unregisterSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

const sendSchema = z.object({
  walletAddresses: z.union([
    z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
    z.array(z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')),
  ]),
  notification: z.object({
    title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
    body: z.string().min(1, 'Body is required').max(200, 'Body too long'),
    subtitle: z.string().max(100).optional(),
    sound: z.string().optional(),
    badge: z.number().int().min(0).optional(),
    priority: z.enum(['high', 'normal', 'low']).optional().default('normal'),
    data: z.object({
      type: z.enum([
        'task_update',
        'agent_message',
        'system_alert',
        'task_accepted',
        'task_completed',
        'task_cancelled',
        'payment_received',
        'bridge_complete',
        'agent_created',
      ] as const),
      screen: z.string().optional(),
      taskId: z.string().optional(),
      agentId: z.string().optional(),
    }).optional(),
  }),
  immediate: z.boolean().optional().default(true),
});

const batchSchema = z.object({
  notifications: z.array(z.object({
    walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
    notification: z.object({
      title: z.string().min(1).max(100),
      body: z.string().min(1).max(200),
      subtitle: z.string().max(100).optional(),
      sound: z.string().optional(),
      badge: z.number().int().min(0).optional(),
      priority: z.enum(['high', 'normal', 'low']).optional(),
      data: z.object({
        type: z.enum([
          'task_update',
          'agent_message',
          'system_alert',
          'task_accepted',
          'task_completed',
          'task_cancelled',
          'payment_received',
          'bridge_complete',
          'agent_created',
        ] as const),
        screen: z.string().optional(),
        taskId: z.string().optional(),
        agentId: z.string().optional(),
      }).optional(),
    }),
  })).min(1).max(500, 'Max 500 notifications per batch'),
});

const walletAddressSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
});

/**
 * POST /notifications/register
 * Register a push token for a wallet address
 * 
 * Mobile apps call this when they receive an Expo push token
 */
router.post(
  '/register',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = registerSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError(
          result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
        );
      }

      const { token, walletAddress, platform } = result.data;

      const pushToken = await notificationService.registerToken(
        token,
        walletAddress,
        platform
      );

      logger.info(`Push token registered for ${walletAddress}`, {
        token: token.substring(0, 20) + '...',
        platform,
      });

      const response: SuccessResponse<PushToken> = {
        success: true,
        data: pushToken,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /notifications/unregister
 * Unregister a push token
 * 
 * Mobile apps call this when the user logs out or token becomes invalid
 */
router.post(
  '/unregister',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = unregisterSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError(
          result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
        );
      }

      const { token } = result.data;

      const removed = await notificationService.unregisterToken(token);

      const response: SuccessResponse<{ removed: boolean }> = {
        success: true,
        data: { removed },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /notifications/tokens/:walletAddress
 * Get all push tokens for a wallet address
 * 
 * Internal use - requires admin permission
 */
router.get(
  '/tokens/:walletAddress',
  requirePermission('notifications:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = walletAddressSchema.safeParse(req.params);
      if (!result.success) {
        throw new ValidationError('Invalid wallet address');
      }

      const { walletAddress } = result.data;

      const tokens = await notificationService.getTokensForWallet(walletAddress);

      // Remove sensitive token data in response
      const sanitizedTokens = tokens.map((t) => ({
        ...t,
        token: t.token.substring(0, 20) + '...',
      }));

      const response: SuccessResponse<typeof sanitizedTokens> = {
        success: true,
        data: sanitizedTokens,
        meta: {
          total: tokens.length,
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

/**
 * POST /notifications/send
 * Send a notification to one or more wallet addresses
 * 
 * Admin endpoint for sending custom notifications
 */
router.post(
  '/send',
  requirePermission('notifications:send'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = sendSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError(
          result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
        );
      }

      const { walletAddresses, notification, immediate } = result.data;

      // Normalize to array
      const addresses = Array.isArray(walletAddresses)
        ? walletAddresses
        : [walletAddresses];

      // Use immediate flag - if false, queue instead of sending immediately
      let results: Map<string, Array<{ status: string; message?: string }>>;
      if (immediate) {
        results = await notificationService.sendToWallets(
          addresses,
          notification
        );
      } else {
        // Queue notifications for later processing
        for (const address of addresses) {
          const tokens = await notificationService.getTokensForWallet(address);
          if (tokens.length > 0) {
            await notificationService.queueNotification(
              tokens.map(t => t.token),
              notification
            );
          }
        }
        results = new Map();
      }

      // Aggregate results
      let totalSent = 0;
      let totalFailed = 0;
      const failures: Array<{ wallet: string; error: string }> = [];

      results.forEach((tickets, wallet) => {
        tickets.forEach((ticket) => {
          if (ticket.status === 'ok') {
            totalSent++;
          } else {
            totalFailed++;
            failures.push({
              wallet,
              error: ticket.message || 'Unknown error',
            });
          }
        });
      });

      logger.info(`Sent notifications to ${addresses.length} wallets`, {
        totalSent,
        totalFailed,
      });

      const response: SuccessResponse<{
        totalWallets: number;
        totalSent: number;
        totalFailed: number;
        failures: typeof failures;
      }> = {
        success: true,
        data: {
          totalWallets: addresses.length,
          totalSent,
          totalFailed,
          failures: failures.slice(0, 10), // Limit failures in response
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

/**
 * POST /notifications/batch
 * Send batch notifications
 * 
 * Admin endpoint for sending different notifications to multiple users
 */
router.post(
  '/batch',
  requirePermission('notifications:send'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = batchSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError(
          result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
        );
      }

      const { notifications } = result.data;

      const results: Array<{
        wallet: string;
        status: 'queued' | 'error';
        error?: string;
      }> = [];

      // Process each notification
      for (const item of notifications) {
        try {
          const tokens = await notificationService.getTokensForWallet(
            item.walletAddress
          );

          if (tokens.length === 0) {
            results.push({
              wallet: item.walletAddress,
              status: 'error',
              error: 'No tokens found for wallet',
            });
            continue;
          }

          // Queue notification
          await notificationService.queueNotification(
            tokens.map((t) => t.token),
            item.notification
          );

          results.push({
            wallet: item.walletAddress,
            status: 'queued',
          });
        } catch (error) {
          results.push({
            wallet: item.walletAddress,
            status: 'error',
            error: (error as Error).message,
          });
        }
      }

      const queued = results.filter((r) => r.status === 'queued').length;
      const errors = results.filter((r) => r.status === 'error').length;

      logger.info(`Batch notifications queued: ${queued}, errors: ${errors}`);

      const response: SuccessResponse<{
        total: number;
        queued: number;
        errors: number;
        results: typeof results;
      }> = {
        success: true,
        data: {
          total: notifications.length,
          queued,
          errors,
          results,
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

/**
 * GET /notifications/stats
 * Get notification statistics
 * 
 * Admin endpoint for viewing notification metrics
 */
router.get(
  '/stats',
  requirePermission('notifications:admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await notificationService.getStats();

      const response: SuccessResponse<NotificationStats> = {
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /notifications/test
 * Test notification sending (development only)
 */
router.post(
  '/test',
  requirePermission('notifications:send'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Only allow in development
      if (process.env.NODE_ENV === 'production') {
        throw new ValidationError('Test endpoint not available in production');
      }

      const result = walletAddressSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError('Invalid wallet address');
      }

      const { walletAddress } = result.data;

      // Create test notification
      const testNotification = notificationService.createPayload(
        'system_alert',
        'Test Notification',
        'This is a test notification from Agora API',
        { 
          type: 'system_alert',
          screen: 'Home'
        },
        'high'
      );

      const tickets = await notificationService.sendToWallet(
        walletAddress,
        testNotification,
        true
      );

      const response: SuccessResponse<{
        message: string;
        tickets: typeof tickets;
      }> = {
        success: true,
        data: {
          message: 'Test notification sent',
          tickets,
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

export default router;
