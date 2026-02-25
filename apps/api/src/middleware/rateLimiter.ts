import { Request, Response, NextFunction } from 'express';
import { redisService } from '../services/redis';
import { config } from '../config';
import { logger } from '../utils/logger';
import { RateLimitError } from './errorHandler';

interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  window: number;
}

export function createRateLimitMiddleware(tier: 'default' | 'premium' | 'internal' = 'default') {
  const rateLimitConfig = config.rateLimit[tier];
  
  return async function rateLimitMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Skip rate limiting for internal tier
    if (tier === 'internal') {
      return next();
    }
    
    // Get identifier for rate limiting
    const identifier = getIdentifier(req);
    const key = `${rateLimitConfig.keyPrefix}:${identifier}`;
    
    try {
      const { count, ttl } = await redisService.incrementRateLimit(key, rateLimitConfig.windowMs);
      
      const limit = rateLimitConfig.maxRequests;
      const remaining = Math.max(0, limit - count);
      const resetTime = new Date(Date.now() + ttl);
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', limit.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', Math.floor(resetTime.getTime() / 1000).toString());
      
      if (count > limit) {
        res.setHeader('Retry-After', Math.ceil(ttl / 1000).toString());
        throw new RateLimitError(`Rate limit exceeded. Limit: ${limit} requests per ${rateLimitConfig.windowMs}ms`);
      }
      
      next();
    } catch (error) {
      if (error instanceof RateLimitError) {
        return next(error);
      }
      
      logger.error('Rate limiting error:', error);
      // Fail open - allow request if Redis is down
      next();
    }
  };
}

export function createTieredRateLimitMiddleware() {
  return async function tieredRateLimitMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Get user tier from request (set by auth middleware)
    const userTier = (req as any).user?.tier || 'default';
    const tier = ['default', 'premium', 'internal'].includes(userTier) 
      ? userTier as 'default' | 'premium' | 'internal'
      : 'default';
    
    const rateLimitConfig = config.rateLimit[tier];
    const identifier = getIdentifier(req);
    const key = `${rateLimitConfig.keyPrefix}:${identifier}`;
    
    try {
      // Skip for internal
      if (tier === 'internal') {
        return next();
      }
      
      const { count, ttl } = await redisService.incrementRateLimit(key, rateLimitConfig.windowMs);
      
      const limit = rateLimitConfig.maxRequests;
      const remaining = Math.max(0, limit - count);
      const resetTime = new Date(Date.now() + ttl);
      
      res.setHeader('X-RateLimit-Limit', limit.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', Math.floor(resetTime.getTime() / 1000).toString());
      res.setHeader('X-RateLimit-Tier', tier);
      
      if (count > limit) {
        res.setHeader('Retry-After', Math.ceil(ttl / 1000).toString());
        throw new RateLimitError(`Rate limit exceeded. Tier: ${tier}, Limit: ${limit}`);
      }
      
      next();
    } catch (error) {
      if (error instanceof RateLimitError) {
        return next(error);
      }
      
      logger.error('Rate limiting error:', error);
      next();
    }
  };
}

function getIdentifier(req: Request): string {
  // Use API key if available
  const apiKey = req.headers['x-api-key'] as string;
  if (apiKey) {
    return `api:${apiKey}`;
  }
  
  // Use user ID if authenticated
  const userId = (req as any).user?.id;
  if (userId) {
    return `user:${userId}`;
  }
  
  // Fall back to IP address
  return `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`;
}

// Middleware to get rate limit status without consuming quota
export async function getRateLimitStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userTier = (req as any).user?.tier || 'default';
  const tier = ['default', 'premium', 'internal'].includes(userTier) 
    ? userTier as 'default' | 'premium' | 'internal'
    : 'default';
  
  const rateLimitConfig = config.rateLimit[tier];
  const identifier = getIdentifier(req);
  const key = `${rateLimitConfig.keyPrefix}:${identifier}`;
  
  try {
    const count = await redisService.getRateLimitCount(key);
    const ttl = await redisService.getClient().pttl(key);
    
    const limit = rateLimitConfig.maxRequests;
    const remaining = Math.max(0, limit - count);
    const resetTime = ttl > 0 ? new Date(Date.now() + ttl) : new Date();
    
    res.json({
      success: true,
      data: {
        tier,
        limit,
        used: count,
        remaining,
        resetAt: resetTime.toISOString(),
        windowMs: rateLimitConfig.windowMs,
      },
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    });
  } catch (error) {
    next(error);
  }
}
