/**
 * Jest Test Setup and Configuration
 * @module __tests__/setup
 */

import 'jest';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.REDIS_URL = 'redis://localhost:6379';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
  // Any global setup needed before all tests
  console.log('🧪 Starting test suite...');
});

// Global test teardown
afterAll(async () => {
  // Any global cleanup needed after all tests
  console.log('✅ Test suite completed');
});

// Clean up after each test
afterEach(async () => {
  // Reset any mocks
  jest.clearAllMocks();
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection during test:', reason);
  // Don't throw to prevent test suite from crashing
});

// Handle uncaught exceptions in tests
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception during test:', error);
  // Don't throw to prevent test suite from crashing
});

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidResponse(): R;
      toHaveStatusCode(expected: number): R;
    }
  }
}

// Custom matchers
expect.extend({
  toBeValidResponse(received) {
    const hasSuccess = typeof received.body?.success === 'boolean';
    const hasTimestamp = typeof received.body?.timestamp === 'string';
    const hasRequestId = typeof received.body?.requestId === 'string';

    const pass = hasSuccess && hasTimestamp && hasRequestId;

    return {
      pass,
      message: () =>
        pass
          ? 'Expected response not to be a valid API response'
          : `Expected response to be a valid API response, but missing: ${[
              !hasSuccess && 'success field',
              !hasTimestamp && 'timestamp field',
              !hasRequestId && 'requestId field',
            ]
              .filter(Boolean)
              .join(', ')}`,
    };
  },

  toHaveStatusCode(received, expected: number) {
    const pass = received.status === expected;

    return {
      pass,
      message: () =>
        pass
          ? `Expected status code not to be ${expected}`
          : `Expected status code ${expected}, but received ${received.status}`,
    };
  },
});
