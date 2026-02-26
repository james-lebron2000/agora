/**
 * Survival Routes Tests
 * @module __tests__/survival.routes.test
 */

import request from 'supertest';
import app from '../index';
import {
  generateTestToken,
  expectSuccessResponse,
  expectErrorResponse,
  expectValidResponse,
} from './helpers';

describe('Survival Routes', () => {
  describe('Authentication & Authorization', () => {
    it('should reject requests without authentication for GET /survival/:agentId', async () => {
      const response = await request(app).get('/survival/agent-1');

      expect(response.status).toBe(401);
      expectErrorResponse(response, 'UNAUTHORIZED');
    });

    it('should reject requests without authentication for POST /survival/:agentId/heartbeat', async () => {
      const response = await request(app)
        .post('/survival/agent-1/heartbeat')
        .send({ address: '0x1234567890123456789012345678901234567890' });

      expect(response.status).toBe(401);
      expectErrorResponse(response, 'UNAUTHORIZED');
    });

    it('should reject requests without agents:read permission', async () => {
      const token = generateTestToken({
        permissions: ['tasks:read'],
      });

      const response = await request(app)
        .get('/survival/agent-1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expectErrorResponse(response, 'FORBIDDEN');
    });

    it('should reject requests without agents:write permission for heartbeat', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .post('/survival/agent-1/heartbeat')
        .set('Authorization', `Bearer ${token}`)
        .send({ address: '0x1234567890123456789012345678901234567890' });

      expect(response.status).toBe(403);
      expectErrorResponse(response, 'FORBIDDEN');
    });
  });

  describe('GET /survival/:agentId', () => {
    it('should return survival data for an agent', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .get('/survival/agent-1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('health');
      expect(response.body.data).toHaveProperty('economics');
      expect(response.body.data).toHaveProperty('trend');
      expect(response.body.data).toHaveProperty('pendingActions');
      expect(response.body.data).toHaveProperty('survivalMode');
    });

    it('should include detailed health metrics', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .get('/survival/agent-1')
        .set('Authorization', `Bearer ${token}`);

      const health = response.body.data.health;
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('overall');
      expect(health).toHaveProperty('compute');
      expect(health).toHaveProperty('storage');
      expect(health).toHaveProperty('network');
      expect(health).toHaveProperty('economic');
      expect(health).toHaveProperty('lastCheck');
    });

    it('should include economic metrics', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .get('/survival/agent-1')
        .set('Authorization', `Bearer ${token}`);

      const economics = response.body.data.economics;
      expect(economics).toHaveProperty('totalUSDC');
      expect(economics).toHaveProperty('netWorthUSD');
      expect(economics).toHaveProperty('runwayDays');
      expect(economics).toHaveProperty('dailyBurnRateUSD');
      expect(economics).toHaveProperty('efficiencyScore');
    });

    it('should include trend information', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .get('/survival/agent-1')
        .set('Authorization', `Bearer ${token}`);

      const trend = response.body.data.trend;
      expect(trend).toHaveProperty('direction');
      expect(trend).toHaveProperty('rateOfChange');
      expect(trend).toHaveProperty('predictedHealth');
      expect(trend).toHaveProperty('predictedRunway');
    });

    it('should include pending actions', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .get('/survival/agent-1')
        .set('Authorization', `Bearer ${token}`);

      const pendingActions = response.body.data.pendingActions;
      expect(Array.isArray(pendingActions)).toBe(true);

      if (pendingActions.length > 0) {
        const action = pendingActions[0];
        expect(action).toHaveProperty('type');
        expect(action).toHaveProperty('priority');
        expect(action).toHaveProperty('description');
        expect(action).toHaveProperty('estimatedImpact');
      }
    });

    it('should return valid health status values', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .get('/survival/agent-1')
        .set('Authorization', `Bearer ${token}`);

      const validStatuses = ['healthy', 'stable', 'degraded', 'critical', 'dying'];
      expect(validStatuses).toContain(response.body.data.health.status);
    });

    it('should return valid trend directions', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .get('/survival/agent-1')
        .set('Authorization', `Bearer ${token}`);

      const validDirections = ['improving', 'stable', 'declining'];
      expect(validDirections).toContain(response.body.data.trend.direction);
    });

    it('should support address query parameter', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .get('/survival/agent-1?address=0x1234567890123456789012345678901234567890')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
    });

    it('should require address when agentId is not provided', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .get('/survival/?address=')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'BAD_REQUEST');
    });

    it('should reject requests without authentication', async () => {
      const response = await request(app).get('/survival/agent-1');

      expect(response.status).toBe(401);
      expectErrorResponse(response, 'UNAUTHORIZED');
    });
  });

  describe('POST /survival/:agentId/heartbeat', () => {
    it('should send a heartbeat for an agent', async () => {
      const token = generateTestToken({
        permissions: ['agents:write'],
      });

      const heartbeatData = {
        address: '0x1234567890123456789012345678901234567890',
        metadata: { uptime: 3600, tasksProcessed: 42 },
      };

      const response = await request(app)
        .post('/survival/agent-1/heartbeat')
        .set('Authorization', `Bearer ${token}`)
        .send(heartbeatData);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
    });

    it('should accept heartbeat without metadata', async () => {
      const token = generateTestToken({
        permissions: ['agents:write'],
      });

      const response = await request(app)
        .post('/survival/agent-1/heartbeat')
        .set('Authorization', `Bearer ${token}`)
        .send({
          address: '0x1234567890123456789012345678901234567890',
        });

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
    });

    it('should accept heartbeat without address in body', async () => {
      const token = generateTestToken({
        permissions: ['agents:write'],
      });

      const response = await request(app)
        .post('/survival/agent-1/heartbeat')
        .set('Authorization', `Bearer ${token}`)
        .send({
          metadata: { uptime: 3600 },
        });

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
    });

    it('should reject heartbeat without write permission', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .post('/survival/agent-1/heartbeat')
        .set('Authorization', `Bearer ${token}`)
        .send({
          address: '0x1234567890123456789012345678901234567890',
        });

      expect(response.status).toBe(403);
      expectErrorResponse(response, 'FORBIDDEN');
    });

    it('should reject heartbeat without authentication', async () => {
      const response = await request(app)
        .post('/survival/agent-1/heartbeat')
        .send({
          address: '0x1234567890123456789012345678901234567890',
        });

      expect(response.status).toBe(401);
      expectErrorResponse(response, 'UNAUTHORIZED');
    });
  });

  describe('GET /survival/:agentId/check', () => {
    it('should perform a full survival check', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .get('/survival/agent-1/check')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(response.body.data).toBeDefined();
    });

    it('should support address query parameter', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .get('/survival/agent-1/check?address=0x1234567890123456789012345678901234567890')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
    });

    it('should reject requests without read permission', async () => {
      const token = generateTestToken({
        permissions: ['tasks:read'],
      });

      const response = await request(app)
        .get('/survival/agent-1/check')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expectErrorResponse(response, 'FORBIDDEN');
    });
  });

  describe('GET /survival/:agentId/recommendations', () => {
    it('should return survival recommendations', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .get('/survival/agent-1/recommendations')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support address query parameter', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .get('/survival/agent-1/recommendations?address=0x1234567890123456789012345678901234567890')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
    });

    it('should reject requests without read permission', async () => {
      const token = generateTestToken({
        permissions: ['tasks:read'],
      });

      const response = await request(app)
        .get('/survival/agent-1/recommendations')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expectErrorResponse(response, 'FORBIDDEN');
    });
  });

  describe('Response Format', () => {
    it('should include requestId in all responses', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .get('/survival/agent-1')
        .set('Authorization', `Bearer ${token}`);

      expectValidResponse(response);
      expect(response.body).toHaveProperty('requestId');
    });

    it('should include timestamp in all responses', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .get('/survival/agent-1')
        .set('Authorization', `Bearer ${token}`);

      expectValidResponse(response);
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return consistent error format', async () => {
      const response = await request(app).get('/survival/agent-1');

      expectErrorResponse(response);
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });
  });

  describe('Survival Mode Logic', () => {
    it('should indicate survival mode based on runway', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .get('/survival/agent-1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.body.data).toHaveProperty('survivalMode');
      expect(typeof response.body.data.survivalMode).toBe('boolean');
    });

    it('should generate appropriate pending actions', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .get('/survival/agent-1')
        .set('Authorization', `Bearer ${token}`);

      const pendingActions = response.body.data.pendingActions;
      const validPriorities = ['low', 'medium', 'high', 'critical'];
      const validTypes = ['bridge', 'earn', 'reduce_cost', 'optimize_chain'];

      pendingActions.forEach((action: any) => {
        expect(validPriorities).toContain(action.priority);
        expect(validTypes).toContain(action.type);
        expect(action).toHaveProperty('description');
        expect(action).toHaveProperty('estimatedImpact');
      });
    });
  });

  describe('Health Metrics Calculation', () => {
    it('should return health scores within valid range', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .get('/survival/agent-1')
        .set('Authorization', `Bearer ${token}`);

      const health = response.body.data.health;
      expect(health.overall).toBeGreaterThanOrEqual(0);
      expect(health.overall).toBeLessThanOrEqual(100);
      expect(health.compute).toBeGreaterThanOrEqual(0);
      expect(health.compute).toBeLessThanOrEqual(100);
      expect(health.storage).toBeGreaterThanOrEqual(0);
      expect(health.storage).toBeLessThanOrEqual(100);
      expect(health.network).toBeGreaterThanOrEqual(0);
      expect(health.network).toBeLessThanOrEqual(100);
      expect(health.economic).toBeGreaterThanOrEqual(0);
      expect(health.economic).toBeLessThanOrEqual(100);
    });

    it('should calculate daily burn rate from runway', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .get('/survival/agent-1')
        .set('Authorization', `Bearer ${token}`);

      const economics = response.body.data.economics;
      if (economics.runwayDays > 0) {
        expect(economics.dailyBurnRateUSD).toBeGreaterThan(0);
        expect(economics.dailyBurnRateUSD).toBeCloseTo(
          economics.totalUSDC / economics.runwayDays,
          1
        );
      }
    });
  });
});
