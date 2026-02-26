/**
 * Payments Routes Tests
 * @module __tests__/payments.routes.test
 */

import request from 'supertest';
import app from '../index';
import {
  generateTestToken,
  expectSuccessResponse,
  expectErrorResponse,
  expectValidResponse,
} from './helpers';

describe('Payments Routes', () => {
  describe('Authentication & Authorization', () => {
    it('should reject requests without authentication for GET /payments', async () => {
      const response = await request(app).get('/payments');

      expect(response.status).toBe(401);
      expectErrorResponse(response, 'UNAUTHORIZED');
    });

    it('should reject requests without authentication for POST /payments', async () => {
      const response = await request(app)
        .post('/payments')
        .send({ amount: 100, description: 'Test payment' });

      expect(response.status).toBe(401);
      expectErrorResponse(response, 'UNAUTHORIZED');
    });

    it('should reject requests without payments:read permission', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .get('/payments')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expectErrorResponse(response, 'FORBIDDEN');
    });
  });

  describe('GET /payments', () => {
    it('should list all payments with valid authentication', async () => {
      const token = generateTestToken({
        permissions: ['payments:read'],
      });

      const response = await request(app)
        .get('/payments')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support pagination via query params', async () => {
      const token = generateTestToken({
        permissions: ['payments:read'],
      });

      const response = await request(app)
        .get('/payments?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(10);
    });

    it('should filter by status', async () => {
      const token = generateTestToken({
        permissions: ['payments:read'],
      });

      const response = await request(app)
        .get('/payments?status=completed')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
    });

    it('should return payments with correct structure', async () => {
      const token = generateTestToken({
        permissions: ['payments:read'],
      });

      const response = await request(app)
        .get('/payments')
        .set('Authorization', `Bearer ${token}`);

      const payment = response.body.data[0];
      expect(payment).toHaveProperty('id');
      expect(payment).toHaveProperty('amount');
      expect(payment).toHaveProperty('currency');
      expect(payment).toHaveProperty('status');
      expect(payment).toHaveProperty('description');
      expect(payment).toHaveProperty('customerId');
      expect(payment).toHaveProperty('paymentMethod');
      expect(payment).toHaveProperty('createdAt');
    });

    it('should include payment metadata for completed payments', async () => {
      const token = generateTestToken({
        permissions: ['payments:read'],
      });

      const response = await request(app)
        .get('/payments')
        .set('Authorization', `Bearer ${token}`);

      const completedPayment = response.body.data.find(
        (p: any) => p.status === 'completed'
      );

      if (completedPayment) {
        expect(completedPayment).toHaveProperty('completedAt');
      }
    });

    it('should return valid currency codes', async () => {
      const token = generateTestToken({
        permissions: ['payments:read'],
      });

      const response = await request(app)
        .get('/payments')
        .set('Authorization', `Bearer ${token}`);

      response.body.data.forEach((payment: any) => {
        expect(payment.currency).toMatch(/^[A-Z]{3}$/);
      });
    });
  });

  describe('POST /payments', () => {
    it('should create a new payment with valid data', async () => {
      const token = generateTestToken({
        permissions: ['payments:read'],
      });

      const paymentData = {
        amount: 49.99,
        currency: 'USD',
        description: 'Premium plan subscription',
        customerId: 'cust-1',
        paymentMethod: 'card',
        metadata: { plan: 'premium' },
      };

      const response = await request(app)
        .post('/payments')
        .set('Authorization', `Bearer ${token}`)
        .send(paymentData);

      expect(response.status).toBe(201);
      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.amount).toBe(paymentData.amount);
      expect(response.body.data.currency).toBe(paymentData.currency);
      expect(response.body.data.status).toBe('pending');
    });

    it('should require amount field', async () => {
      const token = generateTestToken({
        permissions: ['payments:read'],
      });

      const response = await request(app)
        .post('/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'Test payment' });

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'VALIDATION_ERROR');
    });

    it('should require description field', async () => {
      const token = generateTestToken({
        permissions: ['payments:read'],
      });

      const response = await request(app)
        .post('/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 100 });

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'VALIDATION_ERROR');
    });

    it('should validate amount is positive', async () => {
      const token = generateTestToken({
        permissions: ['payments:read'],
      });

      const response = await request(app)
        .post('/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: -10,
          description: 'Test payment',
        });

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'VALIDATION_ERROR');
    });

    it('should validate currency code length', async () => {
      const token = generateTestToken({
        permissions: ['payments:read'],
      });

      const response = await request(app)
        .post('/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 100,
          currency: 'US Dollar',
          description: 'Test payment',
        });

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'VALIDATION_ERROR');
    });

    it('should default currency to USD', async () => {
      const token = generateTestToken({
        permissions: ['payments:read'],
      });

      const response = await request(app)
        .post('/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 100,
          description: 'Test payment',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.currency).toBe('USD');
    });

    it('should accept valid payment methods', async () => {
      const token = generateTestToken({
        permissions: ['payments:read'],
      });

      const validMethods = ['card', 'bank_transfer', 'crypto', 'credit'];

      for (const method of validMethods) {
        const response = await request(app)
          .post('/payments')
          .set('Authorization', `Bearer ${token}`)
          .send({
            amount: 100,
            description: `Payment via ${method}`,
            paymentMethod: method,
          });

        expect(response.status).toBe(201);
        expect(response.body.data.paymentMethod).toBe(method);
      }
    });

    it('should validate payment method values', async () => {
      const token = generateTestToken({
        permissions: ['payments:read'],
      });

      const response = await request(app)
        .post('/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 100,
          description: 'Test payment',
          paymentMethod: 'cash',
        });

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'VALIDATION_ERROR');
    });

    it('should validate description length', async () => {
      const token = generateTestToken({
        permissions: ['payments:read'],
      });

      const response = await request(app)
        .post('/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 100,
          description: 'a'.repeat(501),
        });

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'VALIDATION_ERROR');
    });

    it('should include createdBy field', async () => {
      const token = generateTestToken({
        permissions: ['payments:read'],
        sub: 'test-user-123',
      });

      const response = await request(app)
        .post('/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 100,
          description: 'Test payment',
        });

      expect(response.body.data.createdBy).toBe('test-user-123');
    });
  });

  describe('GET /payments/:id', () => {
    it('should get a specific payment by ID', async () => {
      const token = generateTestToken({
        permissions: ['payments:read'],
      });

      const response = await request(app)
        .get('/payments/pay-1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('id', 'pay-1');
    });

    it('should include detailed payment information', async () => {
      const token = generateTestToken({
        permissions: ['payments:read'],
      });

      const response = await request(app)
        .get('/payments/pay-1')
        .set('Authorization', `Bearer ${token}`);

      const payment = response.body.data;
      expect(payment).toHaveProperty('id');
      expect(payment).toHaveProperty('amount');
      expect(payment).toHaveProperty('currency');
      expect(payment).toHaveProperty('status');
      expect(payment).toHaveProperty('description');
      expect(payment).toHaveProperty('metadata');
      expect(payment).toHaveProperty('customerId');
      expect(payment).toHaveProperty('paymentMethod');
      expect(payment).toHaveProperty('receiptUrl');
      expect(payment).toHaveProperty('createdAt');
      expect(payment).toHaveProperty('completedAt');
    });

    it('should reject requests without authentication', async () => {
      const response = await request(app).get('/payments/pay-1');

      expect(response.status).toBe(401);
      expectErrorResponse(response, 'UNAUTHORIZED');
    });
  });

  describe('POST /payments/:id/confirm', () => {
    it('should confirm a pending payment', async () => {
      const token = generateTestToken({
        permissions: ['payments:read'],
      });

      const confirmData = {
        paymentMethodId: 'pm_test_123',
      };

      const response = await request(app)
        .post('/payments/pay-1/confirm')
        .set('Authorization', `Bearer ${token}`)
        .send(confirmData);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('status', 'completed');
      expect(response.body.data).toHaveProperty('completedAt');
    });

    it('should accept confirmation without paymentMethodId', async () => {
      const token = generateTestToken({
        permissions: ['payments:read'],
      });

      const response = await request(app)
        .post('/payments/pay-1/confirm')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
    });

    it('should reject confirmation without authentication', async () => {
      const response = await request(app)
        .post('/payments/pay-1/confirm')
        .send({});

      expect(response.status).toBe(401);
      expectErrorResponse(response, 'UNAUTHORIZED');
    });

    it('should reject confirmation without read permission', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .post('/payments/pay-1/confirm')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(403);
      expectErrorResponse(response, 'FORBIDDEN');
    });
  });

  describe('Response Format', () => {
    it('should include requestId in all responses', async () => {
      const token = generateTestToken({
        permissions: ['payments:read'],
      });

      const response = await request(app)
        .get('/payments')
        .set('Authorization', `Bearer ${token}`);

      expectValidResponse(response);
      expect(response.body).toHaveProperty('requestId');
    });

    it('should include timestamp in all responses', async () => {
      const token = generateTestToken({
        permissions: ['payments:read'],
      });

      const response = await request(app)
        .get('/payments')
        .set('Authorization', `Bearer ${token}`);

      expectValidResponse(response);
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return consistent error format', async () => {
      const response = await request(app).get('/payments');

      expectErrorResponse(response);
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });
  });

  describe('Payment Amount Handling', () => {
    it('should handle decimal amounts correctly', async () => {
      const token = generateTestToken({
        permissions: ['payments:read'],
      });

      const response = await request(app)
        .post('/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 49.99,
          description: 'Decimal amount test',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.amount).toBe(49.99);
    });

    it('should handle large amounts', async () => {
      const token = generateTestToken({
        permissions: ['payments:read'],
      });

      const response = await request(app)
        .post('/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 999999.99,
          description: 'Large amount test',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.amount).toBe(999999.99);
    });

    it('should reject zero amount', async () => {
      const token = generateTestToken({
        permissions: ['payments:read'],
      });

      const response = await request(app)
        .post('/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 0,
          description: 'Zero amount test',
        });

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'VALIDATION_ERROR');
    });
  });

  describe('Payment Status Workflow', () => {
    it('should create payment with pending status', async () => {
      const token = generateTestToken({
        permissions: ['payments:read'],
      });

      const response = await request(app)
        .post('/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 100,
          description: 'Status workflow test',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.status).toBe('pending');
    });

    it('should transition to completed after confirmation', async () => {
      const token = generateTestToken({
        permissions: ['payments:read'],
      });

      // First create a payment
      const createResponse = await request(app)
        .post('/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 100,
          description: 'Confirmation test',
        });

      const paymentId = createResponse.body.data.id;

      // Then confirm it
      const confirmResponse = await request(app)
        .post(`/payments/${paymentId}/confirm`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(confirmResponse.body.data.status).toBe('completed');
    });
  });
});
