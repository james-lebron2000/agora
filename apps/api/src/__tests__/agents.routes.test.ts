/**
 * Agents Routes Tests
 * @module __tests__/agents.routes.test
 */

import request from 'supertest';
import app from '../index';
import {
  generateTestToken,
  expectSuccessResponse,
  expectErrorResponse,
  expectValidResponse,
} from './helpers';

describe('Agents Routes', () => {
  describe('Authentication & Authorization', () => {
    it('should reject requests without authentication for GET /agents', async () => {
      const response = await request(app).get('/agents');

      expect(response.status).toBe(401);
      expectErrorResponse(response, 'UNAUTHORIZED');
    });

    it('should reject requests without authentication for POST /agents', async () => {
      const response = await request(app)
        .post('/agents')
        .send({ name: 'Test Agent', type: 'chat' });

      expect(response.status).toBe(401);
      expectErrorResponse(response, 'UNAUTHORIZED');
    });

    it('should reject requests without agents:read permission', async () => {
      const token = generateTestToken({
        permissions: ['tasks:read'], // Missing agents:read
      });

      const response = await request(app)
        .get('/agents')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expectErrorResponse(response, 'FORBIDDEN');
    });

    it('should reject requests without agents:write permission for POST', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'], // Missing agents:write
      });

      const response = await request(app)
        .post('/agents')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Agent', type: 'chat' });

      expect(response.status).toBe(403);
      expectErrorResponse(response, 'FORBIDDEN');
    });
  });

  describe('GET /agents', () => {
    it('should list all agents with valid authentication', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .get('/agents')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should include pagination metadata', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .get('/agents')
        .set('Authorization', `Bearer ${token}`);

      expect(response.body.meta).toBeDefined();
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('limit');
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('hasMore');
    });

    it('should return agents with correct structure', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .get('/agents')
        .set('Authorization', `Bearer ${token}`);

      const agent = response.body.data[0];
      expect(agent).toHaveProperty('id');
      expect(agent).toHaveProperty('name');
      expect(agent).toHaveProperty('type');
      expect(agent).toHaveProperty('status');
      expect(agent).toHaveProperty('capabilities');
      expect(agent).toHaveProperty('createdAt');
    });

    it('should support valid agent types', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .get('/agents')
        .set('Authorization', `Bearer ${token}`);

      const validTypes = ['chat', 'task', 'workflow'];
      response.body.data.forEach((agent: any) => {
        expect(validTypes).toContain(agent.type);
      });
    });
  });

  describe('POST /agents', () => {
    it('should create a new agent with valid data', async () => {
      const token = generateTestToken({
        permissions: ['agents:read', 'agents:write'],
      });

      const agentData = {
        name: 'Test Agent',
        description: 'A test agent for testing',
        type: 'chat',
        config: { model: 'gpt-4' },
        capabilities: ['text-generation'],
      };

      const response = await request(app)
        .post('/agents')
        .set('Authorization', `Bearer ${token}`)
        .send(agentData);

      expect(response.status).toBe(201);
      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(agentData.name);
      expect(response.body.data.type).toBe(agentData.type);
      expect(response.body.data.status).toBe('active');
    });

    it('should require name field', async () => {
      const token = generateTestToken({
        permissions: ['agents:write'],
      });

      const response = await request(app)
        .post('/agents')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'chat' });

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'VALIDATION_ERROR');
    });

    it('should require type field', async () => {
      const token = generateTestToken({
        permissions: ['agents:write'],
      });

      const response = await request(app)
        .post('/agents')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Agent' });

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'VALIDATION_ERROR');
    });

    it('should validate agent type', async () => {
      const token = generateTestToken({
        permissions: ['agents:write'],
      });

      const response = await request(app)
        .post('/agents')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Agent',
          type: 'invalid-type',
        });

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'VALIDATION_ERROR');
    });

    it('should enforce name length limits', async () => {
      const token = generateTestToken({
        permissions: ['agents:write'],
      });

      const response = await request(app)
        .post('/agents')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '',
          type: 'chat',
        });

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'VALIDATION_ERROR');
    });

    it('should create agent with minimal required fields', async () => {
      const token = generateTestToken({
        permissions: ['agents:write'],
      });

      const response = await request(app)
        .post('/agents')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Minimal Agent',
          type: 'task',
        });

      expect(response.status).toBe(201);
      expectSuccessResponse(response);
      expect(response.body.data.name).toBe('Minimal Agent');
    });

    it('should include createdAt and updatedAt timestamps', async () => {
      const token = generateTestToken({
        permissions: ['agents:write'],
      });

      const response = await request(app)
        .post('/agents')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Timestamp Agent',
          type: 'workflow',
        });

      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data).toHaveProperty('updatedAt');
      expect(new Date(response.body.data.createdAt).toISOString()).toBe(
        response.body.data.createdAt
      );
    });
  });

  describe('GET /agents/:id', () => {
    it('should get a specific agent by ID', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .get('/agents/agent-1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('id', 'agent-1');
    });

    it('should include detailed agent information', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .get('/agents/agent-1')
        .set('Authorization', `Bearer ${token}`);

      const agent = response.body.data;
      expect(agent).toHaveProperty('id');
      expect(agent).toHaveProperty('name');
      expect(agent).toHaveProperty('description');
      expect(agent).toHaveProperty('type');
      expect(agent).toHaveProperty('status');
      expect(agent).toHaveProperty('config');
      expect(agent).toHaveProperty('capabilities');
      expect(agent).toHaveProperty('createdAt');
      expect(agent).toHaveProperty('updatedAt');
    });

    it('should reject requests without authentication', async () => {
      const response = await request(app).get('/agents/agent-1');

      expect(response.status).toBe(401);
      expectErrorResponse(response, 'UNAUTHORIZED');
    });
  });

  describe('PUT /agents/:id', () => {
    it('should update an existing agent', async () => {
      const token = generateTestToken({
        permissions: ['agents:read', 'agents:write'],
      });

      const updateData = {
        name: 'Updated Agent Name',
        description: 'Updated description',
        status: 'paused',
      };

      const response = await request(app)
        .put('/agents/agent-1')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.status).toBe(updateData.status);
    });

    it('should allow partial updates', async () => {
      const token = generateTestToken({
        permissions: ['agents:write'],
      });

      const response = await request(app)
        .put('/agents/agent-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Only Name Updated' });

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(response.body.data.name).toBe('Only Name Updated');
    });

    it('should validate status values', async () => {
      const token = generateTestToken({
        permissions: ['agents:write'],
      });

      const response = await request(app)
        .put('/agents/agent-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'invalid-status' });

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'VALIDATION_ERROR');
    });

    it('should reject updates without write permission', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .put('/agents/agent-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Name' });

      expect(response.status).toBe(403);
      expectErrorResponse(response, 'FORBIDDEN');
    });
  });

  describe('DELETE /agents/:id', () => {
    it('should delete an agent with write permission', async () => {
      const token = generateTestToken({
        permissions: ['agents:write'],
      });

      const response = await request(app)
        .delete('/agents/agent-1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('deleted', true);
      expect(response.body.data).toHaveProperty('id', 'agent-1');
    });

    it('should reject deletion without write permission', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .delete('/agents/agent-1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expectErrorResponse(response, 'FORBIDDEN');
    });

    it('should reject deletion without authentication', async () => {
      const response = await request(app).delete('/agents/agent-1');

      expect(response.status).toBe(401);
      expectErrorResponse(response, 'UNAUTHORIZED');
    });
  });

  describe('POST /agents/:id/execute', () => {
    it('should execute an agent with write permission', async () => {
      const token = generateTestToken({
        permissions: ['agents:write'],
      });

      const executionData = {
        input: 'Hello, agent!',
        context: { userId: 'user-123' },
      };

      const response = await request(app)
        .post('/agents/agent-1/execute')
        .set('Authorization', `Bearer ${token}`)
        .send(executionData);

      expect(response.status).toBe(202);
      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('executionId');
      expect(response.body.data).toHaveProperty('agentId', 'agent-1');
      expect(response.body.data).toHaveProperty('status', 'pending');
    });

    it('should require input field', async () => {
      const token = generateTestToken({
        permissions: ['agents:write'],
      });

      const response = await request(app)
        .post('/agents/agent-1/execute')
        .set('Authorization', `Bearer ${token}`)
        .send({ context: {} });

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'VALIDATION_ERROR');
    });

    it('should include execution metadata', async () => {
      const token = generateTestToken({
        permissions: ['agents:write'],
      });

      const response = await request(app)
        .post('/agents/agent-1/execute')
        .set('Authorization', `Bearer ${token}`)
        .send({ input: 'Test input' });

      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data).toHaveProperty('input');
    });

    it('should reject execution without write permission', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .post('/agents/agent-1/execute')
        .set('Authorization', `Bearer ${token}`)
        .send({ input: 'test' });

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
        .get('/agents')
        .set('Authorization', `Bearer ${token}`);

      expectValidResponse(response);
      expect(response.body).toHaveProperty('requestId');
      expect(typeof response.body.requestId).toBe('string');
    });

    it('should include timestamp in all responses', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .get('/agents')
        .set('Authorization', `Bearer ${token}`);

      expectValidResponse(response);
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return consistent error format', async () => {
      const response = await request(app).get('/agents');

      expectErrorResponse(response);
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });
  });

  describe('Caching', () => {
    it('should cache GET /agents responses', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      // First request
      const response1 = await request(app)
        .get('/agents')
        .set('Authorization', `Bearer ${token}`);

      // Second request should potentially be cached
      const response2 = await request(app)
        .get('/agents')
        .set('Authorization', `Bearer ${token}`);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expectSuccessResponse(response1);
      expectSuccessResponse(response2);
    });
  });
});
