import request from 'supertest';
import express from 'express';
import { errorHandler, ValidationError, NotFoundError } from '../src/middleware/errorHandler';

describe('Error Handler Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.requestId = 'test-request-id';
      next();
    });
  });

  it('should handle ValidationError', async () => {
    app.get('/error', () => {
      throw new ValidationError('Invalid input');
    });
    app.use(errorHandler);

    const response = await request(app).get('/error');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toBe('Invalid input');
    expect(response.body.requestId).toBe('test-request-id');
  });

  it('should handle NotFoundError', async () => {
    app.get('/error', () => {
      throw new NotFoundError('Resource not found');
    });
    app.use(errorHandler);

    const response = await request(app).get('/error');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('should handle unknown errors as internal errors', async () => {
    app.get('/error', () => {
      throw new Error('Something went wrong');
    });
    app.use(errorHandler);

    const response = await request(app).get('/error');

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
  });

  it('should include timestamp in error response', async () => {
    app.get('/error', () => {
      throw new Error('Test error');
    });
    app.use(errorHandler);

    const response = await request(app).get('/error');

    expect(response.body.timestamp).toBeDefined();
    expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
  });
});
