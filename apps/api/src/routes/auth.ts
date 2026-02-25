import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth';
import { apiKeyAuthMiddleware, jwtAuthMiddleware } from '../middleware/auth';
import { ValidationError } from '../middleware/errorHandler';
import { SuccessResponse } from '../types';

const router = Router();

// Validation schemas
const tokenRequestSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// POST /auth/token - Exchange API key for JWT
router.post('/token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = tokenRequestSchema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError(result.error.errors.map(e => e.message).join(', '));
    }

    const { apiKey } = result.data;
    const keyData = await authService.validateApiKey(apiKey);

    if (!keyData) {
      throw new ValidationError('Invalid API key');
    }

    const token = authService.generateToken(keyData);

    const response: SuccessResponse<{ token: string; expiresIn: string }> = {
      success: true,
      data: {
        token,
        expiresIn: '1h',
      },
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /auth/refresh - Refresh JWT token
router.post('/refresh', jwtAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = (req as any).apiKey;
    const user = (req as any).user;

    if (!user) {
      throw new ValidationError('No user context found');
    }

    // Revoke old token
    const oldJti = (req as any).tokenJti;
    if (oldJti) {
      await authService.revokeToken(oldJti);
    }

    // Generate new token (use stored API key data if available)
    const keyData = apiKey || {
      ownerId: user.id,
      tier: user.tier,
      permissions: user.permissions,
    };

    const token = authService.generateToken(keyData as any);

    const response: SuccessResponse<{ token: string; expiresIn: string }> = {
      success: true,
      data: {
        token,
        expiresIn: '1h',
      },
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// DELETE /auth/token - Revoke token (logout)
router.delete('/token', jwtAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jti = (req as any).tokenJti;

    if (jti) {
      await authService.revokeToken(jti);
    }

    const response: SuccessResponse<{ message: string }> = {
      success: true,
      data: { message: 'Token revoked successfully' },
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /auth/me - Get current user info
router.get('/me', jwtAuthMiddleware, (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;

    const response: SuccessResponse<typeof user> = {
      success: true,
      data: user,
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
