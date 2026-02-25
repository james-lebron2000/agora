import request from 'supertest';
import express from 'express';
import { createTieredRateLimitMiddleware } from '../src/middleware/rateLimiter';
import { redisService } from '../src/services/redis';

describe('Rate Limiter Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.requestId = 'test-request-id';
      next();
    });
    app.use(createTieredRateLimitMiddleware());
    app.get('/test', (req, res) => {
      res.json({ success: true });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should allow requests under the limit', async () => {
    (redisService.incrementRateLimit as jest.Mock).mockResolvedValue({
      count: 1,
      ttl: 900000,
    });

    const response = await request(app).get('/test');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.headers['x-ratelimit-remaining']).toBeDefined();
  });

  it('should block requests over the limit', async () => {
    (redisService.incrementRateLimit as jest.Mock).mockResolvedValue({
      count: 101,
      ttl: 900000,
    });

    const response = await request(app).get('/test');

    expect(response.status).toBe(429);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('should set rate limit headers', async () => {
    (redisService.incrementRateLimit as jest.Mock).mockResolvedValue({
      count: 5,
      ttl: 900000,
    });

    const response = await request(app).get('/test');

    expect(response.headers['x-ratelimit-limit']).toBeDefined();
    expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    expect(response.headers['x-ratelimit-reset']).toBeDefined();
  });
});
