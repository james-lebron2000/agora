import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth';
import { jwtAuthMiddleware } from '../middleware/auth';
import { ValidationError } from '../middleware/errorHandler';
import { SuccessResponse } from '../types';

const router = Router();

// Validation schemas
const tokenRequestSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
});

/**
 * @openapi
 * /auth/token:
 *   post:
 *     summary: Exchange API key for JWT token
 *     description: |
 *       Exchange your API key for a JWT access token.
 *       The JWT token is used for authenticated requests to protected endpoints.
 *       
 *       **Rate Limit**: 10 requests per minute
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TokenRequest'
 *           examples:
 *             default:
 *               summary: Default example
 *               value:
 *                 apiKey: 'agora_demo_api_key_12345'
 *     responses:
 *       200:
 *         description: Successfully generated JWT token
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       $ref: '#/components/schemas/TokenResponse'
 *             examples:
 *               success:
 *                 summary: Successful token generation
 *                 value:
 *                   success: true
 *                   data:
 *                     token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
 *                     expiresIn: '1h'
 *                   timestamp: '2024-01-15T10:30:00.000Z'
 *                   requestId: '550e8400-e29b-41d4-a716-446655440000'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
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

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Refresh JWT token
 *     description: |
 *       Refresh your JWT access token before it expires.
 *       The old token will be revoked and a new token will be issued.
 *       
 *       **Authentication Required**: Bearer token
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully refreshed token
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       $ref: '#/components/schemas/TokenResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
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

/**
 * @openapi
 * /auth/token:
 *   delete:
 *     summary: Revoke token (logout)
 *     description: |
 *       Revoke your current JWT token, effectively logging you out.
 *       After revocation, the token can no longer be used for authentication.
 *       
 *       **Authentication Required**: Bearer token
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully revoked token
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: 'Token revoked successfully'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
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

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get current user info
 *     description: |
 *       Retrieve information about the currently authenticated user,
 *       including their tier and permissions.
 *       
 *       **Authentication Required**: Bearer token
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved user info
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - properties:
 *                     data:
 *                       $ref: '#/components/schemas/UserInfo'
 *             examples:
 *               premiumUser:
 *                 summary: Premium user example
 *                 value:
 *                   success: true
 *                   data:
 *                     id: 'demo-user'
 *                     tier: 'premium'
 *                     permissions:
 *                       - 'agents:read'
 *                       - 'agents:write'
 *                       - 'tasks:read'
 *                       - 'tasks:write'
 *                       - 'payments:read'
 *                   timestamp: '2024-01-15T10:30:00.000Z'
 *                   requestId: '550e8400-e29b-41d4-a716-446655440000'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
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
