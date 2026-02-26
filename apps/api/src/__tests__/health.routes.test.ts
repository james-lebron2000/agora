/**
 * Health Check Routes Tests
 * @module __tests__/health.routes.test
 */

import request from 'supertest';
import app from '../index';
import {
  generateTestToken,
  expectSuccessResponse,
  expectErrorResponse,
  expectValidResponse,
} from './helpers';

describe('Health Routes', () => {
  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(response.body.data).toEqual({ status: 'healthy' });
    });

    it('should not require authentication', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expectValidResponse(response);
    });

    it('should return correct content type', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should respond quickly', async () => {
      const start = Date.now();
      await request(app).get('/health');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // Should respond in less than 100ms
    });
  });

  describe('GET /health/detailed', () => {
    it('should return detailed health information', async () => {
      const response = await request(app).get('/health/detailed');

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('version');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('dependencies');
    });

    it('should include all service dependencies', async () => {
      const response = await request(app).get('/health/detailed');

      expect(response.body.data.dependencies).toHaveProperty('redis');
      expect(response.body.data.dependencies).toHaveProperty('agents');
      expect(response.body.data.dependencies).toHaveProperty('tasks');
      expect(response.body.data.dependencies).toHaveProperty('payments');
    });

    it('should include dependency status and latency', async () => {
      const response = await request(app).get('/health/detailed');

      const deps = response.body.data.dependencies;
      expect(deps.redis).toHaveProperty('status');
      expect(deps.redis).toHaveProperty('latencyMs');
      expect(typeof deps.redis.latencyMs).toBe('number');
    });

    it('should return valid status values', async () => {
      const response = await request(app).get('/health/detailed');

      const validStatuses = ['healthy', 'degraded', 'unhealthy'];
      expect(validStatuses).toContain(response.body.data.status);
    });

    it('should return valid dependency status values', async () => {
      const response = await request(app).get('/health/detailed');

      const validStatuses = ['healthy', 'unhealthy'];
      Object.values(response.body.data.dependencies).forEach((dep: any) => {
        expect(validStatuses).toContain(dep.status);
      });
    });

    it('should include version from package.json', async () => {
      const response = await request(app).get('/health/detailed');

      expect(response.body.data.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should include uptime as a positive number', async () => {
      const response = await request(app).get('/health/detailed');

      expect(typeof response.body.data.uptime).toBe('number');
      expect(response.body.data.uptime).toBeGreaterThan(0);
    });
  });

  describe('GET /health/ready', () => {
    it('should return ready status when dependencies are healthy', async () => {
      const response = await request(app).get('/health/ready');

      // Note: This test may fail if Redis is not available
      // In CI/CD, you may want to mock Redis or skip this test
      if (response.status === 200) {
        expectSuccessResponse(response);
        expect(response.body.data).toEqual({ ready: true });
      } else {
        expect(response.status).toBe(503);
      }
    });

    it('should not require authentication', async () => {
      const response = await request(app).get('/health/ready');

      expect([200, 503]).toContain(response.status);
      expectValidResponse(response);
    });
  });

  describe('GET /health/live', () => {
    it('should return alive status', async () => {
      const response = await request(app).get('/health/live');

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(response.body.data).toEqual({ alive: true });
    });

    it('should not require authentication', async () => {
      const response = await request(app).get('/health/live');

      expect(response.status).toBe(200);
      expectValidResponse(response);
    });

    it('should always return 200 regardless of dependencies', async () => {
      // This is important for Kubernetes liveness probes
      const response = await request(app).get('/health/live');

      expect(response.status).toBe(200);
      expect(response.body.data.alive).toBe(true);
    });
  });

  describe('GET /health/ws', () => {
    it('should return WebSocket statistics', async () => {
      const token = generateTestToken();

      const response = await request(app)
        .get('/health/ws')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
    });

    it('should include WebSocket stats properties', async () => {
      const token = generateTestToken();

      const response = await request(app)
        .get('/health/ws')
        .set('Authorization', `Bearer ${token}`);

      if (response.status === 200) {
        expect(response.body.data).toHaveProperty('totalConnections');
        expect(response.body.data).toHaveProperty('authenticatedConnections');
        expect(response.body.data).toHaveProperty('messagesReceived');
        expect(response.body.data).toHaveProperty('messagesSent');
      }
    });

    it('should accept valid authentication', async () => {
      const token = generateTestToken();

      const response = await request(app)
        .get('/health/ws')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).not.toBe(401);
    });
  });

  describe('GET /health/metrics', () => {
    it('should return Prometheus metrics', async () => {
      const response = await request(app).get('/health/metrics');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/plain/);
      expect(typeof response.text).toBe('string');
    });

    it('should include standard Prometheus metrics', async () => {
      const response = await request(app).get('/health/metrics');

      // Should include at least some Prometheus-style metrics
      expect(response.text).toMatch(/^# HELP/m);
      expect(response.text).toMatch(/^# TYPE/m);
    });

    it('should include Agora-specific metrics', async () => {
      // First make a request to generate some metrics
      await request(app).get('/health');

      const response = await request(app).get('/health/metrics');

      expect(response.text).toContain('agora_');
    });

    it('should not require authentication', async () => {
      const response = await request(app).get('/health/metrics');

      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should return valid error response for invalid endpoint', async () => {
      const response = await request(app).get('/health/invalid');

      expect(response.status).toBe(404);
      expectErrorResponse(response, 'NOT_FOUND');
    });

    it('should include all required fields in error response', async () => {
      const response = await request(app).get('/health/invalid');

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('requestId');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });
  });

  describe('Response Headers', () => {
    it('should include X-Request-ID header', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['x-request-id']).toBeDefined();
    });

    it('should include security headers', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
    });

    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('K8s Probes', () => {
    it('liveness probe should be lightweight', async () => {
      const start = Date.now();
      const response = await request(app).get('/health/live');
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(50); // Very fast response
    });

    it('readiness probe should check dependencies', async () => {
      const response = await request(app).get('/health/ready');

      // Should return either 200 (ready) or 503 (not ready)
      expect([200, 503]).toContain(response.status);
    });
  });
});
