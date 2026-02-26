/**
 * Authentication Routes Tests
 * @module __tests__/auth.routes.test
 */

import request from 'supertest';
import app from '../index';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import {
  generateTestToken,
  DEMO_API_KEY,
  expectSuccessResponse,
  expectErrorResponse,
} from './helpers';

// Test JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';

describe('Authentication Routes', () => {
  describe('POST /auth/token', () => {
    it('should exchange valid API key for JWT token', async () => {
      const response = await request(app)
        .post('/auth/token')
        .send({ apiKey: DEMO_API_KEY });

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('expiresIn');
      expect(typeof response.body.data.token).toBe('string');
      expect(response.body.data.expiresIn).toBe('1h');
    });

    it('should reject request without API key', async () => {
      const response = await request(app)
        .post('/auth/token')
        .send({});

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'VALIDATION_ERROR');
    });

    it('should reject request with empty API key', async () => {
      const response = await request(app)
        .post('/auth/token')
        .send({ apiKey: '' });

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'VALIDATION_ERROR');
    });

    it('should reject invalid API key', async () => {
      const response = await request(app)
        .post('/auth/token')
        .send({ apiKey: 'invalid_api_key' });

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'VALIDATION_ERROR', 'Invalid API key');
    });

    it('should reject non-string API key', async () => {
      const response = await request(app)
        .post('/auth/token')
        .send({ apiKey: 12345 });

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'VALIDATION_ERROR');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh valid JWT token', async () => {
      const token = generateTestToken();

      const response = await request(app)
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('expiresIn');
    });

    it('should reject request without authorization header', async () => {
      const response = await request(app)
        .post('/auth/refresh');

      expect(response.status).toBe(401);
      expectErrorResponse(response, 'UNAUTHORIZED', 'Bearer token required');
    });

    it('should reject request with invalid authorization format', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .set('Authorization', 'InvalidFormat token123');

      expect(response.status).toBe(401);
      expectErrorResponse(response, 'UNAUTHORIZED');
    });

    it('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        {
          sub: 'test-user',
          tier: 'premium',
          permissions: ['agents:read'],
          jti: uuidv4(),
          iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
          exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        },
        JWT_SECRET
      );

      const response = await request(app)
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expectErrorResponse(response, 'UNAUTHORIZED');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(response.status).toBe(401);
      expectErrorResponse(response, 'UNAUTHORIZED');
    });
  });

  describe('DELETE /auth/token', () => {
    it('should revoke valid JWT token', async () => {
      const token = generateTestToken();

      const response = await request(app)
        .delete('/auth/token')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data.message).toBe('Token revoked successfully');
    });

    it('should reject request without authorization header', async () => {
      const response = await request(app)
        .delete('/auth/token');

      expect(response.status).toBe(401);
      expectErrorResponse(response, 'UNAUTHORIZED');
    });

    it('should handle already revoked token gracefully', async () => {
      const token = generateTestToken();

      // First revocation
      await request(app)
        .delete('/auth/token')
        .set('Authorization', `Bearer ${token}`);

      // Second revocation should still succeed
      const response = await request(app)
        .delete('/auth/token')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user info', async () => {
      const token = generateTestToken({
        sub: 'test-user-123',
        tier: 'premium',
        permissions: ['agents:read', 'agents:write'],
      });

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(response.body.data).toMatchObject({
        id: 'test-user-123',
        tier: 'premium',
        permissions: ['agents:read', 'agents:write'],
      });
    });

    it('should reject request without authorization header', async () => {
      const response = await request(app)
        .get('/auth/me');

      expect(response.status).toBe(401);
      expectErrorResponse(response, 'UNAUTHORIZED');
    });

    it('should handle different user tiers', async () => {
      const tiers: Array<'default' | 'premium' | 'internal'> = ['default', 'premium', 'internal'];

      for (const tier of tiers) {
        const token = generateTestToken({ tier });

        const response = await request(app)
          .get('/auth/me')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expectSuccessResponse(response);
        expect(response.body.data.tier).toBe(tier);
      }
    });

    it('should return correct permissions', async () => {
      const permissions = ['custom:read', 'custom:write', 'admin'];
      const token = generateTestToken({ permissions });

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(response.body.data.permissions).toEqual(permissions);
    });
  });

  describe('Response Format', () => {
    it('should include requestId in all responses', async () => {
      const response = await request(app)
        .post('/auth/token')
        .send({ apiKey: DEMO_API_KEY });

      expect(response.body).toHaveProperty('requestId');
      expect(typeof response.body.requestId).toBe('string');
      expect(response.body.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should include timestamp in all responses', async () => {
      const response = await request(app)
        .post('/auth/token')
        .send({ apiKey: DEMO_API_KEY });

      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp).toISOString()).toBe(
        response.body.timestamp
      );
    });

    it('should include x-request-id header', async () => {
      const response = await request(app)
        .post('/auth/token')
        .send({ apiKey: DEMO_API_KEY });

      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.headers['x-request-id']).toBe(response.body.requestId);
    });
  });

  describe('Error Handling', () => {
    it('should return proper error structure', async () => {
      const response = await request(app)
        .post('/auth/token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('requestId');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/auth/token')
        .set('Content-Type', 'application/json')
        .send('not valid json');

      expect(response.status).toBe(400);
    });
  });
});

// Helper to generate tokens with custom expiration
declare module './helpers' {
  export function generateTestToken(
    overrides?: Partial<{
      sub: string;
      tier: string;
      permissions: string[];
    }>,
    expiresInSeconds?: number
  ): string;
}
