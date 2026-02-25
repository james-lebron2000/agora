// Test setup file
import { config } from '../src/config';

// Mock Redis
jest.mock('../src/services/redis', () => ({
  redisService: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    incrementRateLimit: jest.fn(),
    getRateLimitCount: jest.fn(),
    healthCheck: jest.fn().mockResolvedValue({ healthy: true, latencyMs: 10 }),
    disconnect: jest.fn(),
    subscribe: jest.fn(),
    publish: jest.fn(),
    getClient: jest.fn().mockReturnValue({
      pttl: jest.fn().mockResolvedValue(900000),
    }),
  },
}));

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
