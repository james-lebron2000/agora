import { authService, TokenPayload } from '../src/services/auth';
import { redisService } from '../src/services/redis';
import jwt from 'jsonwebtoken';

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateApiKey', () => {
    it('should validate a known demo API key', async () => {
      const apiKey = await authService.validateApiKey('agora_demo_api_key_12345');
      
      expect(apiKey).not.toBeNull();
      expect(apiKey?.tier).toBe('premium');
      expect(apiKey?.isActive).toBe(true);
    });

    it('should reject unknown API keys', async () => {
      const apiKey = await authService.validateApiKey('unknown_key');
      
      expect(apiKey).toBeNull();
    });
  });

  describe('generateToken and validateToken', () => {
    it('should generate and validate a token', async () => {
      const mockApiKey = {
        id: 'test-id',
        key: 'test-key',
        name: 'Test Key',
        tier: 'premium' as const,
        ownerId: 'user-123',
        permissions: ['agents:read', 'tasks:read'],
        isActive: true,
        createdAt: new Date(),
      };

      const token = authService.generateToken(mockApiKey);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      (redisService.getSession as jest.Mock).mockResolvedValue({
        ownerId: mockApiKey.ownerId,
        tier: mockApiKey.tier,
        permissions: mockApiKey.permissions,
      });

      const payload = await authService.validateToken(token);
      expect(payload).not.toBeNull();
      expect(payload?.sub).toBe(mockApiKey.ownerId);
      expect(payload?.tier).toBe(mockApiKey.tier);
    });

    it('should reject invalid tokens', async () => {
      const payload = await authService.validateToken('invalid-token');
      expect(payload).toBeNull();
    });
  });

  describe('hasPermission', () => {
    it('should return true for exact permission match', () => {
      const hasPerm = authService.hasPermission(['agents:read'], 'agents:read');
      expect(hasPerm).toBe(true);
    });

    it('should return true for wildcard permission', () => {
      const hasPerm = authService.hasPermission(['agents:*'], 'agents:write');
      expect(hasPerm).toBe(true);
    });

    it('should return false for missing permission', () => {
      const hasPerm = authService.hasPermission(['tasks:read'], 'agents:read');
      expect(hasPerm).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if any permission matches', () => {
      const hasPerm = authService.hasAnyPermission(['agents:read', 'tasks:read'], ['agents:write', 'agents:read']);
      expect(hasPerm).toBe(true);
    });

    it('should return false if no permissions match', () => {
      const hasPerm = authService.hasAnyPermission(['tasks:read'], ['agents:read', 'agents:write']);
      expect(hasPerm).toBe(false);
    });
  });
});
