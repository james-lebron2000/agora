/**
 * Tasks Routes Tests
 * @module __tests__/tasks.routes.test
 */

import request from 'supertest';
import app from '../index';
import {
  generateTestToken,
  expectSuccessResponse,
  expectErrorResponse,
  expectValidResponse,
} from './helpers';

describe('Tasks Routes', () => {
  describe('Authentication & Authorization', () => {
    it('should reject requests without authentication for GET /tasks', async () => {
      const response = await request(app).get('/tasks');

      expect(response.status).toBe(401);
      expectErrorResponse(response, 'UNAUTHORIZED');
    });

    it('should reject requests without authentication for POST /tasks', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: 'Test Task', type: 'code-generation' });

      expect(response.status).toBe(401);
      expectErrorResponse(response, 'UNAUTHORIZED');
    });

    it('should reject requests without tasks:read permission', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .get('/tasks')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expectErrorResponse(response, 'FORBIDDEN');
    });

    it('should reject requests without tasks:write permission for POST', async () => {
      const token = generateTestToken({
        permissions: ['tasks:read'],
      });

      const response = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Test Task', type: 'code-generation' });

      expect(response.status).toBe(403);
      expectErrorResponse(response, 'FORBIDDEN');
    });
  });

  describe('GET /tasks', () => {
    it('should list all tasks with valid authentication', async () => {
      const token = generateTestToken({
        permissions: ['tasks:read'],
      });

      const response = await request(app)
        .get('/tasks')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support pagination via query params', async () => {
      const token = generateTestToken({
        permissions: ['tasks:read'],
      });

      const response = await request(app)
        .get('/tasks?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(10);
    });

    it('should filter by status', async () => {
      const token = generateTestToken({
        permissions: ['tasks:read'],
      });

      const response = await request(app)
        .get('/tasks?status=running')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
    });

    it('should filter by agentId', async () => {
      const token = generateTestToken({
        permissions: ['tasks:read'],
      });

      const response = await request(app)
        .get('/tasks?agentId=agent-1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
    });

    it('should return tasks with correct structure', async () => {
      const token = generateTestToken({
        permissions: ['tasks:read'],
      });

      const response = await request(app)
        .get('/tasks')
        .set('Authorization', `Bearer ${token}`);

      const task = response.body.data[0];
      expect(task).toHaveProperty('id');
      expect(task).toHaveProperty('type');
      expect(task).toHaveProperty('title');
      expect(task).toHaveProperty('status');
      expect(task).toHaveProperty('priority');
      expect(task).toHaveProperty('progress');
      expect(task).toHaveProperty('createdAt');
    });

    it('should include task metadata', async () => {
      const token = generateTestToken({
        permissions: ['tasks:read'],
      });

      const response = await request(app)
        .get('/tasks')
        .set('Authorization', `Bearer ${token}`);

      const task = response.body.data[0];
      if (task.status === 'running' || task.status === 'completed') {
        expect(task).toHaveProperty('startedAt');
      }
      if (task.status === 'completed') {
        expect(task).toHaveProperty('completedAt');
      }
    });
  });

  describe('POST /tasks', () => {
    it('should create a new task with valid data', async () => {
      const token = generateTestToken({
        permissions: ['tasks:read', 'tasks:write'],
      });

      const taskData = {
        type: 'code-generation',
        title: 'Generate API endpoint',
        description: 'Create a REST API endpoint',
        priority: 'high',
        agentId: 'agent-1',
        payload: { endpoint: '/api/users' },
      };

      const response = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send(taskData);

      expect(response.status).toBe(201);
      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe(taskData.title);
      expect(response.body.data.type).toBe(taskData.type);
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.progress).toBe(0);
    });

    it('should require title field', async () => {
      const token = generateTestToken({
        permissions: ['tasks:write'],
      });

      const response = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'code-generation' });

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'VALIDATION_ERROR');
    });

    it('should require type field', async () => {
      const token = generateTestToken({
        permissions: ['tasks:write'],
      });

      const response = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Test Task' });

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'VALIDATION_ERROR');
    });

    it('should validate priority values', async () => {
      const token = generateTestToken({
        permissions: ['tasks:write'],
      });

      const response = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Test Task',
          type: 'code-generation',
          priority: 'invalid-priority',
        });

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'VALIDATION_ERROR');
    });

    it('should accept valid priority values', async () => {
      const token = generateTestToken({
        permissions: ['tasks:write'],
      });

      const priorities = ['low', 'medium', 'high', 'critical'];

      for (const priority of priorities) {
        const response = await request(app)
          .post('/tasks')
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: `Task with ${priority} priority`,
            type: 'code-generation',
            priority,
          });

        expect(response.status).toBe(201);
        expect(response.body.data.priority).toBe(priority);
      }
    });

    it('should default priority to medium', async () => {
      const token = generateTestToken({
        permissions: ['tasks:write'],
      });

      const response = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Default Priority Task',
          type: 'code-generation',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.priority).toBe('medium');
    });

    it('should validate scheduledAt as ISO datetime', async () => {
      const token = generateTestToken({
        permissions: ['tasks:write'],
      });

      const response = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Scheduled Task',
          type: 'code-generation',
          scheduledAt: 'invalid-datetime',
        });

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'VALIDATION_ERROR');
    });

    it('should validate timeout range', async () => {
      const token = generateTestToken({
        permissions: ['tasks:write'],
      });

      const response = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Task with timeout',
          type: 'code-generation',
          timeout: 9999999, // Exceeds max
        });

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'VALIDATION_ERROR');
    });

    it('should include createdBy field', async () => {
      const token = generateTestToken({
        permissions: ['tasks:write'],
        sub: 'test-user-123',
      });

      const response = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Task with creator',
          type: 'code-generation',
        });

      expect(response.body.data.createdBy).toBe('test-user-123');
    });
  });

  describe('GET /tasks/:id', () => {
    it('should get a specific task by ID', async () => {
      const token = generateTestToken({
        permissions: ['tasks:read'],
      });

      const response = await request(app)
        .get('/tasks/task-1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('id', 'task-1');
    });

    it('should include detailed task information', async () => {
      const token = generateTestToken({
        permissions: ['tasks:read'],
      });

      const response = await request(app)
        .get('/tasks/task-1')
        .set('Authorization', `Bearer ${token}`);

      const task = response.body.data;
      expect(task).toHaveProperty('id');
      expect(task).toHaveProperty('type');
      expect(task).toHaveProperty('title');
      expect(task).toHaveProperty('description');
      expect(task).toHaveProperty('status');
      expect(task).toHaveProperty('priority');
      expect(task).toHaveProperty('agentId');
      expect(task).toHaveProperty('payload');
      expect(task).toHaveProperty('progress');
      expect(task).toHaveProperty('logs');
      expect(task).toHaveProperty('createdAt');
      expect(task).toHaveProperty('updatedAt');
    });

    it('should include task logs when available', async () => {
      const token = generateTestToken({
        permissions: ['tasks:read'],
      });

      const response = await request(app)
        .get('/tasks/task-1')
        .set('Authorization', `Bearer ${token}`);

      const task = response.body.data;
      if (task.logs && task.logs.length > 0) {
        const log = task.logs[0];
        expect(log).toHaveProperty('level');
        expect(log).toHaveProperty('message');
        expect(log).toHaveProperty('timestamp');
      }
    });

    it('should reject requests without authentication', async () => {
      const response = await request(app).get('/tasks/task-1');

      expect(response.status).toBe(401);
      expectErrorResponse(response, 'UNAUTHORIZED');
    });
  });

  describe('PUT /tasks/:id', () => {
    it('should update an existing task', async () => {
      const token = generateTestToken({
        permissions: ['tasks:read', 'tasks:write'],
      });

      const updateData = {
        title: 'Updated Task Title',
        description: 'Updated description',
        status: 'completed',
        progress: 100,
      };

      const response = await request(app)
        .put('/tasks/task-1')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.status).toBe(updateData.status);
      expect(response.body.data.progress).toBe(updateData.progress);
    });

    it('should allow partial updates', async () => {
      const token = generateTestToken({
        permissions: ['tasks:write'],
      });

      const response = await request(app)
        .put('/tasks/task-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Only Title Updated' });

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(response.body.data.title).toBe('Only Title Updated');
    });

    it('should validate status values', async () => {
      const token = generateTestToken({
        permissions: ['tasks:write'],
      });

      const response = await request(app)
        .put('/tasks/task-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'invalid-status' });

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'VALIDATION_ERROR');
    });

    it('should accept valid status values', async () => {
      const token = generateTestToken({
        permissions: ['tasks:write'],
      });

      const validStatuses = ['pending', 'running', 'paused', 'completed', 'failed', 'cancelled'];

      for (const status of validStatuses) {
        const response = await request(app)
          .put('/tasks/task-1')
          .set('Authorization', `Bearer ${token}`)
          .send({ status });

        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe(status);
      }
    });

    it('should validate priority values', async () => {
      const token = generateTestToken({
        permissions: ['tasks:write'],
      });

      const response = await request(app)
        .put('/tasks/task-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ priority: 'invalid-priority' });

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'VALIDATION_ERROR');
    });

    it('should reject updates without write permission', async () => {
      const token = generateTestToken({
        permissions: ['tasks:read'],
      });

      const response = await request(app)
        .put('/tasks/task-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'New Title' });

      expect(response.status).toBe(403);
      expectErrorResponse(response, 'FORBIDDEN');
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete a task with write permission', async () => {
      const token = generateTestToken({
        permissions: ['tasks:write'],
      });

      const response = await request(app)
        .delete('/tasks/task-1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('deleted', true);
      expect(response.body.data).toHaveProperty('id', 'task-1');
    });

    it('should reject deletion without write permission', async () => {
      const token = generateTestToken({
        permissions: ['tasks:read'],
      });

      const response = await request(app)
        .delete('/tasks/task-1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expectErrorResponse(response, 'FORBIDDEN');
    });

    it('should reject deletion without authentication', async () => {
      const response = await request(app).delete('/tasks/task-1');

      expect(response.status).toBe(401);
      expectErrorResponse(response, 'UNAUTHORIZED');
    });
  });

  describe('POST /tasks/:id/cancel', () => {
    it('should cancel a running task', async () => {
      const token = generateTestToken({
        permissions: ['tasks:write'],
      });

      const response = await request(app)
        .post('/tasks/task-2/cancel')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('status', 'cancelled');
      expect(response.body.data).toHaveProperty('cancelledAt');
    });

    it('should reject cancellation without write permission', async () => {
      const token = generateTestToken({
        permissions: ['tasks:read'],
      });

      const response = await request(app)
        .post('/tasks/task-1/cancel')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expectErrorResponse(response, 'FORBIDDEN');
    });

    it('should reject cancellation without authentication', async () => {
      const response = await request(app).post('/tasks/task-1/cancel');

      expect(response.status).toBe(401);
      expectErrorResponse(response, 'UNAUTHORIZED');
    });
  });

  describe('Response Format', () => {
    it('should include requestId in all responses', async () => {
      const token = generateTestToken({
        permissions: ['tasks:read'],
      });

      const response = await request(app)
        .get('/tasks')
        .set('Authorization', `Bearer ${token}`);

      expectValidResponse(response);
      expect(response.body).toHaveProperty('requestId');
    });

    it('should include timestamp in all responses', async () => {
      const token = generateTestToken({
        permissions: ['tasks:read'],
      });

      const response = await request(app)
        .get('/tasks')
        .set('Authorization', `Bearer ${token}`);

      expectValidResponse(response);
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return consistent error format', async () => {
      const response = await request(app).get('/tasks');

      expectErrorResponse(response);
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });
  });

  describe('Task Status Workflow', () => {
    it('should track task progress correctly', async () => {
      const token = generateTestToken({
        permissions: ['tasks:write'],
      });

      // Create a task
      const createResponse = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Progress Test Task',
          type: 'code-generation',
        });

      expect(createResponse.body.data.progress).toBe(0);

      // Update progress
      const updateResponse = await request(app)
        .put(`/tasks/${createResponse.body.data.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'running',
          progress: 50,
        });

      expect(updateResponse.body.data.progress).toBe(50);
    });
  });
});
