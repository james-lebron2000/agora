import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth';
import { logger } from '../utils/logger';
import { UnauthorizedError, ForbiddenError } from './errorHandler';

export async function apiKeyAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return next(new UnauthorizedError('API key required'));
  }
  
  try {
    const keyData = await authService.validateApiKey(apiKey);
    
    if (!keyData) {
      return next(new UnauthorizedError('Invalid or expired API key'));
    }
    
    // Attach user info to request
    (req as any).user = {
      id: keyData.ownerId,
      tier: keyData.tier,
      permissions: keyData.permissions,
    };
    (req as any).apiKey = keyData;
    
    next();
  } catch (error) {
    logger.error('API key validation error:', error);
    next(new UnauthorizedError('Failed to validate API key'));
  }
}

export async function jwtAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Bearer token required'));
  }
  
  const token = authHeader.substring(7);
  
  try {
    const payload = await authService.validateToken(token);
    
    if (!payload) {
      return next(new UnauthorizedError('Invalid or expired token'));
    }
    
    // Attach user info to request
    (req as any).user = {
      id: payload.sub,
      tier: payload.tier,
      permissions: payload.permissions,
    };
    (req as any).tokenJti = payload.jti;
    
    next();
  } catch (error) {
    logger.error('Token validation error:', error);
    next(new UnauthorizedError('Failed to validate token'));
  }
}

export function requirePermission(...permissions: string[]) {
  return function permissionMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction
  ): void {
    const user = (req as any).user;
    
    if (!user) {
      return next(new UnauthorizedError('Authentication required'));
    }
    
    const hasPermission = authService.hasAnyPermission(user.permissions, permissions);
    
    if (!hasPermission) {
      return next(new ForbiddenError(`Required permission(s): ${permissions.join(', ')}`));
    }
    
    next();
  };
}

export function requireAllPermissions(...permissions: string[]) {
  return function allPermissionsMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction
  ): void {
    const user = (req as any).user;
    
    if (!user) {
      return next(new UnauthorizedError('Authentication required'));
    }
    
    const hasAllPermissions = permissions.every(perm => 
      authService.hasPermission(user.permissions, perm)
    );
    
    if (!hasAllPermissions) {
      return next(new ForbiddenError(`Required all permissions: ${permissions.join(', ')}`));
    }
    
    next();
  };
}

// Optional auth - doesn't fail if no auth, but attaches user if available
export async function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const apiKey = req.headers['x-api-key'] as string;
  const authHeader = req.headers.authorization;
  
  try {
    if (apiKey) {
      const keyData = await authService.validateApiKey(apiKey);
      if (keyData) {
        (req as any).user = {
          id: keyData.ownerId,
          tier: keyData.tier,
          permissions: keyData.permissions,
        };
      }
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = await authService.validateToken(token);
      if (payload) {
        (req as any).user = {
          id: payload.sub,
          tier: payload.tier,
          permissions: payload.permissions,
        };
      }
    }
  } catch (error) {
    // Silently ignore auth errors for optional auth
    logger.debug('Optional auth failed:', error);
  }
  
  next();
}
