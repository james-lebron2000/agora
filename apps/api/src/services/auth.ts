import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { redisService } from './redis';
import { ApiKey, AuthenticatedRequest } from '../types';
import { logger } from '../utils/logger';

// In-memory store for demo (replace with database in production)
const apiKeyStore = new Map<string, ApiKey>();

// Seed a demo API key
const demoApiKey: ApiKey = {
  id: uuidv4(),
  key: 'agora_demo_api_key_12345',
  name: 'Demo Key',
  tier: 'premium',
  ownerId: 'demo-user',
  permissions: ['agents:read', 'agents:write', 'tasks:read', 'tasks:write', 'payments:read'],
  createdAt: new Date(),
  isActive: true,
};
apiKeyStore.set(demoApiKey.key, demoApiKey);

export interface TokenPayload {
  sub: string;
  tier: string;
  permissions: string[];
  jti: string;
  iat: number;
  exp: number;
}

class AuthService {
  async validateApiKey(key: string): Promise<ApiKey | null> {
    // Check cache first
    const cached = await redisService.getApiKey(key);
    if (cached) {
      return cached as ApiKey;
    }

    // Check store
    const apiKey = apiKeyStore.get(key);
    if (!apiKey || !apiKey.isActive) {
      return null;
    }

    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null;
    }

    // Cache the result
    await redisService.setApiKey(key, apiKey, 300); // 5 minutes cache

    // Update last used
    apiKey.lastUsedAt = new Date();

    return apiKey;
  }

  generateToken(apiKey: ApiKey): string {
    const jti = uuidv4();
    const payload = {
      sub: apiKey.ownerId,
      tier: apiKey.tier,
      permissions: apiKey.permissions,
      jti,
    };

    const token = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    // Store session in Redis
    const ttl = this.parseExpiryToSeconds(config.jwt.expiresIn);
    redisService.setSession(jti, {
      ownerId: apiKey.ownerId,
      tier: apiKey.tier,
      permissions: apiKey.permissions,
      createdAt: new Date(),
    }, ttl);

    return token;
  }

  async validateToken(token: string): Promise<TokenPayload | null> {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;
      
      // Check if session exists in Redis (not revoked)
      const session = await redisService.getSession(decoded.jti);
      if (!session) {
        return null;
      }

      return decoded;
    } catch (error) {
      logger.debug('Token validation failed:', error);
      return null;
    }
  }

  async revokeToken(jti: string): Promise<void> {
    await redisService.deleteSession(jti);
  }

  hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    // Support wildcards like "agents:*"
    return userPermissions.some(perm => {
      if (perm === requiredPermission) return true;
      if (perm === '*') return true;
      
      const permParts = perm.split(':');
      const requiredParts = requiredPermission.split(':');
      
      if (permParts[0] === requiredParts[0] && permParts[1] === '*') {
        return true;
      }
      
      return false;
    });
  }

  hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.some(req => this.hasPermission(userPermissions, req));
  }

  private parseExpiryToSeconds(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 3600; // Default 1 hour

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return value * (multipliers[unit] || 3600);
  }

  // Admin methods for API key management
  async createApiKey(
    name: string,
    tier: 'default' | 'premium' | 'internal',
    ownerId: string,
    permissions: string[],
    expiresAt?: Date
  ): Promise<ApiKey> {
    const apiKey: ApiKey = {
      id: uuidv4(),
      key: `agora_${uuidv4().replace(/-/g, '')}`,
      name,
      tier,
      ownerId,
      permissions,
      createdAt: new Date(),
      expiresAt,
      isActive: true,
    };

    apiKeyStore.set(apiKey.key, apiKey);
    return apiKey;
  }

  async revokeApiKey(key: string): Promise<boolean> {
    const apiKey = apiKeyStore.get(key);
    if (!apiKey) return false;

    apiKey.isActive = false;
    await redisService.revokeApiKey(key);
    return true;
  }
}

export const authService = new AuthService();
export default authService;
