/**
 * Test Helpers and Utilities
 * @module __tests__/helpers
 */

import request from 'supertest';
import { Express } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// Demo API key for testing
export const DEMO_API_KEY = 'agora_demo_api_key_12345';

// Test JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';

/**
 * Generate a test JWT token
 */
export function generateTestToken(
  overrides: Partial<{
    sub: string;
    tier: string;
    permissions: string[];
  }> = {}
): string {
  const payload = {
    sub: overrides.sub || 'test-user',
    tier: overrides.tier || 'premium',
    permissions: overrides.permissions || [
      'agents:read',
      'agents:write',
      'tasks:read',
      'tasks:write',
      'payments:read',
    ],
    jti: uuidv4(),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  };

  return jwt.sign(payload, JWT_SECRET);
}

/**
 * Create test authentication headers
 */
export function createAuthHeaders(
  type: 'apiKey' | 'bearer' = 'bearer',
  overrides?: Parameters<typeof generateTestToken>[0]
): Record<string, string> {
  if (type === 'apiKey') {
    return {
      'X-API-Key': DEMO_API_KEY,
    };
  }

  const token = generateTestToken(overrides);
  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Test request builder with common defaults
 */
export class TestRequestBuilder {
  private headers: Record<string, string> = {};
  private query: Record<string, string> = {};

  constructor(
    private app: Express,
    private basePath: string = ''
  ) {}

  /**
   * Set authentication headers
   */
  withAuth(type: 'apiKey' | 'bearer' = 'bearer', overrides?: Parameters<typeof generateTestToken>[0]): this {
    this.headers = {
      ...this.headers,
      ...createAuthHeaders(type, overrides),
    };
    return this;
  }

  /**
   * Set custom headers
   */
  withHeaders(headers: Record<string, string>): this {
    this.headers = { ...this.headers, ...headers };
    return this;
  }

  /**
   * Set query parameters
   */
  withQuery(query: Record<string, string>): this {
    this.query = { ...this.query, ...query };
    return this;
  }

  /**
   * Execute GET request
   */
  get(path: string) {
    return request(this.app)
      .get(`${this.basePath}${path}`)
      .query(this.query)
      .set(this.headers);
  }

  /**
   * Execute POST request
   */
  post(path: string, body?: unknown) {
    const req = request(this.app)
      .post(`${this.basePath}${path}`)
      .set(this.headers);
    
    if (body) {
      req.send(body);
    }
    
    return req;
  }

  /**
   * Execute PUT request
   */
  put(path: string, body?: unknown) {
    const req = request(this.app)
      .put(`${this.basePath}${path}`)
      .set(this.headers);
    
    if (body) {
      req.send(body);
    }
    
    return req;
  }

  /**
   * Execute PATCH request
   */
  patch(path: string, body?: unknown) {
    const req = request(this.app)
      .patch(`${this.basePath}${path}`)
      .set(this.headers);
    
    if (body) {
      req.send(body);
    }
    
    return req;
  }

  /**
   * Execute DELETE request
   */
  delete(path: string) {
    return request(this.app)
      .delete(`${this.basePath}${path}`)
      .set(this.headers);
  }
}

/**
 * Create a test request builder
 */
export function createTestRequest(app: Express, basePath: string = ''): TestRequestBuilder {
  return new TestRequestBuilder(app, basePath);
}

/**
 * Wait for a specified amount of time
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, delayMs = 100, backoffMultiplier = 2 } = options;

  let lastError: Error | undefined;
  let currentDelay = delayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxAttempts) {
        await wait(currentDelay);
        currentDelay *= backoffMultiplier;
      }
    }
  }

  throw lastError;
}

/**
 * Mock date for consistent testing
 */
export function mockDate(isoDate: string): () => void {
  const RealDate = Date;
  const mockedDate = new RealDate(isoDate);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  global.Date = class extends RealDate {
    constructor() {
      super();
      return mockedDate;
    }

    static now() {
      return mockedDate.getTime();
    }
  };

  return () => {
    global.Date = RealDate;
  };
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return uuidv4();
}

/**
 * Assert that a response matches the standard API response format
 */
export function expectValidResponse(response: {
  body: {
    success: boolean;
    timestamp: string;
    requestId: string;
    data?: unknown;
    error?: unknown;
  };
}): void {
  expect(response.body).toHaveProperty('success');
  expect(typeof response.body.success).toBe('boolean');
  expect(response.body).toHaveProperty('timestamp');
  expect(typeof response.body.timestamp).toBe('string');
  expect(response.body).toHaveProperty('requestId');
  expect(typeof response.body.requestId).toBe('string');
}

/**
 * Assert that a response is a successful response
 */
export function expectSuccessResponse<T>(
  response: {
    body: {
      success: boolean;
      data: T;
      timestamp: string;
      requestId: string;
    };
  },
  expectedData?: Partial<T>
): void {
  expectValidResponse(response);
  expect(response.body.success).toBe(true);
  expect(response.body).toHaveProperty('data');

  if (expectedData) {
    expect(response.body.data).toMatchObject(expectedData);
  }
}

/**
 * Assert that a response is an error response
 */
export function expectErrorResponse(
  response: {
    body: {
      success: boolean;
      error: {
        code: string;
        message: string;
      };
      timestamp: string;
      requestId: string;
    };
  },
  expectedCode?: string,
  expectedMessage?: string | RegExp
): void {
  expectValidResponse(response);
  expect(response.body.success).toBe(false);
  expect(response.body).toHaveProperty('error');
  expect(response.body.error).toHaveProperty('code');
  expect(response.body.error).toHaveProperty('message');

  if (expectedCode) {
    expect(response.body.error.code).toBe(expectedCode);
  }

  if (expectedMessage) {
    if (typeof expectedMessage === 'string') {
      expect(response.body.error.message).toBe(expectedMessage);
    } else {
      expect(response.body.error.message).toMatch(expectedMessage);
    }
  }
}
