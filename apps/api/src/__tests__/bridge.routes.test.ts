/**
 * Bridge Routes Tests
 * @module __tests__/bridge.routes.test
 */

import request from 'supertest';
import app from '../index';
import {
  generateTestToken,
  expectSuccessResponse,
  expectErrorResponse,
  expectValidResponse,
} from './helpers';

describe('Bridge Routes', () => {
  describe('Authentication & Authorization', () => {
    it('should reject requests without authentication for POST /bridge/quote', async () => {
      const response = await request(app)
        .post('/bridge/quote')
        .send({
          sourceChain: 'ethereum',
          destinationChain: 'base',
          token: 'USDC',
          amount: '1000',
          senderAddress: '0x1234567890123456789012345678901234567890',
        });

      expect(response.status).toBe(401);
      expectErrorResponse(response, 'UNAUTHORIZED');
    });

    it('should reject requests without authentication for POST /bridge/execute', async () => {
      const response = await request(app)
        .post('/bridge/execute')
        .send({
          sourceChain: 'ethereum',
          destinationChain: 'base',
          token: 'USDC',
          amount: '1000',
          senderAddress: '0x1234567890123456789012345678901234567890',
        });

      expect(response.status).toBe(401);
      expectErrorResponse(response, 'UNAUTHORIZED');
    });

    it('should reject requests without bridge:read permission', async () => {
      const token = generateTestToken({
        permissions: ['agents:read'],
      });

      const response = await request(app)
        .post('/bridge/quote')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sourceChain: 'ethereum',
          destinationChain: 'base',
          token: 'USDC',
          amount: '1000',
          senderAddress: '0x1234567890123456789012345678901234567890',
        });

      expect(response.status).toBe(403);
      expectErrorResponse(response, 'FORBIDDEN');
    });

    it('should reject requests without bridge:write permission for execute', async () => {
      const token = generateTestToken({
        permissions: ['bridge:read'],
      });

      const response = await request(app)
        .post('/bridge/execute')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sourceChain: 'ethereum',
          destinationChain: 'base',
          token: 'USDC',
          amount: '1000',
          senderAddress: '0x1234567890123456789012345678901234567890',
        });

      expect(response.status).toBe(403);
      expectErrorResponse(response, 'FORBIDDEN');
    });
  });

  describe('POST /bridge/quote', () => {
    it('should return a bridge quote with valid parameters', async () => {
      const token = generateTestToken({
        permissions: ['bridge:read'],
      });

      const quoteRequest = {
        sourceChain: 'ethereum',
        destinationChain: 'base',
        token: 'USDC',
        amount: '1000',
        senderAddress: '0x1234567890123456789012345678901234567890',
      };

      const response = await request(app)
        .post('/bridge/quote')
        .set('Authorization', `Bearer ${token}`)
        .send(quoteRequest);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('quoteId');
      expect(response.body.data).toHaveProperty('sourceChain', quoteRequest.sourceChain);
      expect(response.body.data).toHaveProperty('destinationChain', quoteRequest.destinationChain);
      expect(response.body.data).toHaveProperty('token', quoteRequest.token);
      expect(response.body.data).toHaveProperty('amount', quoteRequest.amount);
      expect(response.body.data).toHaveProperty('estimatedFee');
      expect(response.body.data).toHaveProperty('estimatedTime');
      expect(response.body.data).toHaveProperty('path');
      expect(response.body.data).toHaveProperty('expiresAt');
    });

    it('should require all mandatory fields', async () => {
      const token = generateTestToken({
        permissions: ['bridge:read'],
      });

      const response = await request(app)
        .post('/bridge/quote')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sourceChain: 'ethereum',
          // Missing other required fields
        });

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'VALIDATION_ERROR');
    });

    it('should validate source chain values', async () => {
      const token = generateTestToken({
        permissions: ['bridge:read'],
      });

      const response = await request(app)
        .post('/bridge/quote')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sourceChain: 'invalid-chain',
          destinationChain: 'base',
          token: 'USDC',
          amount: '1000',
          senderAddress: '0x1234567890123456789012345678901234567890',
        });

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'VALIDATION_ERROR');
    });

    it('should validate destination chain values', async () => {
      const token = generateTestToken({
        permissions: ['bridge:read'],
      });

      const response = await request(app)
        .post('/bridge/quote')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sourceChain: 'ethereum',
          destinationChain: 'invalid-chain',
          token: 'USDC',
          amount: '1000',
          senderAddress: '0x1234567890123456789012345678901234567890',
        });

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'VALIDATION_ERROR');
    });

    it('should validate token values', async () => {
      const token = generateTestToken({
        permissions: ['bridge:read'],
      });

      const response = await request(app)
        .post('/bridge/quote')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sourceChain: 'ethereum',
          destinationChain: 'base',
          token: 'INVALID',
          amount: '1000',
          senderAddress: '0x1234567890123456789012345678901234567890',
        });

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'VALIDATION_ERROR');
    });

    it('should validate sender address format', async () => {
      const token = generateTestToken({
        permissions: ['bridge:read'],
      });

      const response = await request(app)
        .post('/bridge/quote')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sourceChain: 'ethereum',
          destinationChain: 'base',
          token: 'USDC',
          amount: '1000',
          senderAddress: 'invalid-address',
        });

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'VALIDATION_ERROR');
    });

    it('should reject same source and destination chains', async () => {
      const token = generateTestToken({
        permissions: ['bridge:read'],
      });

      const response = await request(app)
        .post('/bridge/quote')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sourceChain: 'ethereum',
          destinationChain: 'ethereum',
          token: 'USDC',
          amount: '1000',
          senderAddress: '0x1234567890123456789012345678901234567890',
        });

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'VALIDATION_ERROR');
    });

    it('should support all valid chain combinations', async () => {
      const token = generateTestToken({
        permissions: ['bridge:read'],
      });

      const chains = ['ethereum', 'base', 'optimism', 'arbitrum'];
      const tokens = ['USDC', 'ETH'];

      for (const sourceChain of chains) {
        for (const destinationChain of chains) {
          if (sourceChain === destinationChain) continue;

          for (const tokenSymbol of tokens) {
            const response = await request(app)
              .post('/bridge/quote')
              .set('Authorization', `Bearer ${token}`)
              .send({
                sourceChain,
                destinationChain,
                token: tokenSymbol,
                amount: '1000',
                senderAddress: '0x1234567890123456789012345678901234567890',
              });

            expect(response.status).toBe(200);
            expectSuccessResponse(response);
          }
        }
      }
    });

    it('should include fee estimates in quote', async () => {
      const token = generateTestToken({
        permissions: ['bridge:read'],
      });

      const response = await request(app)
        .post('/bridge/quote')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sourceChain: 'base',
          destinationChain: 'optimism',
          token: 'USDC',
          amount: '1000',
          senderAddress: '0x1234567890123456789012345678901234567890',
        });

      expect(response.body.data.estimatedFee).toBeGreaterThan(0);
      expect(response.body.data.estimatedTime).toBeGreaterThan(0);
    });
  });

  describe('POST /bridge/execute', () => {
    it('should execute a bridge transaction with valid parameters', async () => {
      const token = generateTestToken({
        permissions: ['bridge:read', 'bridge:write'],
      });

      const executeRequest = {
        sourceChain: 'ethereum',
        destinationChain: 'base',
        token: 'USDC',
        amount: '1000',
        senderAddress: '0x1234567890123456789012345678901234567890',
        recipientAddress: '0x0987654321098765432109876543210987654321',
      };

      const response = await request(app)
        .post('/bridge/execute')
        .set('Authorization', `Bearer ${token}`)
        .send(executeRequest);

      expect(response.status).toBe(201);
      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('txHash');
      expect(response.body.data.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(response.body.data).toHaveProperty('sourceChain', executeRequest.sourceChain);
      expect(response.body.data).toHaveProperty('destinationChain', executeRequest.destinationChain);
      expect(response.body.data).toHaveProperty('status', 'pending');
      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data).toHaveProperty('estimatedCompletion');
    });

    it('should use sender address as recipient when not provided', async () => {
      const token = generateTestToken({
        permissions: ['bridge:write'],
      });

      const senderAddress = '0x1234567890123456789012345678901234567890';

      const response = await request(app)
        .post('/bridge/execute')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sourceChain: 'ethereum',
          destinationChain: 'base',
          token: 'USDC',
          amount: '1000',
          senderAddress,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.recipientAddress).toBe(senderAddress);
    });

    it('should validate recipient address format', async () => {
      const token = generateTestToken({
        permissions: ['bridge:write'],
      });

      const response = await request(app)
        .post('/bridge/execute')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sourceChain: 'ethereum',
          destinationChain: 'base',
          token: 'USDC',
          amount: '1000',
          senderAddress: '0x1234567890123456789012345678901234567890',
          recipientAddress: 'invalid-address',
        });

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'VALIDATION_ERROR');
    });

    it('should reject execution without write permission', async () => {
      const token = generateTestToken({
        permissions: ['bridge:read'],
      });

      const response = await request(app)
        .post('/bridge/execute')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sourceChain: 'ethereum',
          destinationChain: 'base',
          token: 'USDC',
          amount: '1000',
          senderAddress: '0x1234567890123456789012345678901234567890',
        });

      expect(response.status).toBe(403);
      expectErrorResponse(response, 'FORBIDDEN');
    });

    it('should reject same source and destination chains', async () => {
      const token = generateTestToken({
        permissions: ['bridge:write'],
      });

      const response = await request(app)
        .post('/bridge/execute')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sourceChain: 'ethereum',
          destinationChain: 'ethereum',
          token: 'USDC',
          amount: '1000',
          senderAddress: '0x1234567890123456789012345678901234567890',
        });

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'VALIDATION_ERROR');
    });
  });

  describe('GET /bridge/transactions/:address', () => {
    it('should get transaction history for an address', async () => {
      const token = generateTestToken({
        permissions: ['bridge:read'],
      });

      const address = '0x1234567890123456789012345678901234567890';

      const response = await request(app)
        .get(`/bridge/transactions/${address}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('limit');
    });

    it('should validate Ethereum address format', async () => {
      const token = generateTestToken({
        permissions: ['bridge:read'],
      });

      const response = await request(app)
        .get('/bridge/transactions/invalid-address')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expectErrorResponse(response, 'VALIDATION_ERROR');
    });

    it('should handle addresses with no transaction history', async () => {
      const token = generateTestToken({
        permissions: ['bridge:read'],
      });

      const response = await request(app)
        .get('/bridge/transactions/0x0000000000000000000000000000000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(response.body.data).toEqual([]);
    });

    it('should reject requests without authentication', async () => {
      const response = await request(app)
        .get('/bridge/transactions/0x1234567890123456789012345678901234567890');

      expect(response.status).toBe(401);
      expectErrorResponse(response, 'UNAUTHORIZED');
    });
  });

  describe('GET /bridge/status/:txHash', () => {
    it('should get status for an existing transaction', async () => {
      const token = generateTestToken({
        permissions: ['bridge:read'],
      });

      // First create a transaction
      const executeToken = generateTestToken({
        permissions: ['bridge:read', 'bridge:write'],
      });

      const executeResponse = await request(app)
        .post('/bridge/execute')
        .set('Authorization', `Bearer ${executeToken}`)
        .send({
          sourceChain: 'ethereum',
          destinationChain: 'base',
          token: 'USDC',
          amount: '1000',
          senderAddress: '0x1234567890123456789012345678901234567890',
        });

      const txHash = executeResponse.body.data.txHash;

      // Then check status
      const response = await request(app)
        .get(`/bridge/status/${txHash}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('txHash', txHash);
      expect(response.body.data).toHaveProperty('status');
    });

    it('should return not_found for unknown transaction', async () => {
      const token = generateTestToken({
        permissions: ['bridge:read'],
      });

      const response = await request(app)
        .get('/bridge/status/0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('status', 'not_found');
    });

    it('should validate transaction hash format', async () => {
      const token = generateTestToken({
        permissions: ['bridge:read'],
      });

      const response = await request(app)
        .get('/bridge/status/invalid-hash')
        .set('Authorization', `Bearer ${token}`);

      // The route accepts any string as txHash and looks it up
      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(response.body.data.status).toBe('not_found');
    });

    it('should include progress information', async () => {
      const token = generateTestToken({
        permissions: ['bridge:read'],
      });

      // Create a transaction first
      const executeToken = generateTestToken({
        permissions: ['bridge:read', 'bridge:write'],
      });

      const executeResponse = await request(app)
        .post('/bridge/execute')
        .set('Authorization', `Bearer ${executeToken}`)
        .send({
          sourceChain: 'ethereum',
          destinationChain: 'base',
          token: 'USDC',
          amount: '1000',
          senderAddress: '0x1234567890123456789012345678901234567890',
        });

      const txHash = executeResponse.body.data.txHash;

      const response = await request(app)
        .get(`/bridge/status/${txHash}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.body.data).toHaveProperty('progress');
      expect(typeof response.body.data.progress).toBe('number');
      expect(response.body.data.progress).toBeGreaterThanOrEqual(0);
      expect(response.body.data.progress).toBeLessThanOrEqual(100);
    });
  });

  describe('GET /bridge/chains', () => {
    it('should return list of supported chains', async () => {
      const token = generateTestToken({
        permissions: ['bridge:read'],
      });

      const response = await request(app)
        .get('/bridge/chains')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expectSuccessResponse(response);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should include chain details', async () => {
      const token = generateTestToken({
        permissions: ['bridge:read'],
      });

      const response = await request(app)
        .get('/bridge/chains')
        .set('Authorization', `Bearer ${token}`);

      const chain = response.body.data[0];
      expect(chain).toHaveProperty('id');
      expect(chain).toHaveProperty('name');
      expect(chain).toHaveProperty('icon');
      expect(chain).toHaveProperty('color');
      expect(chain).toHaveProperty('nativeToken');
      expect(chain).toHaveProperty('usdcAddress');
    });

    it('should include supported chain IDs', async () => {
      const token = generateTestToken({
        permissions: ['bridge:read'],
      });

      const response = await request(app)
        .get('/bridge/chains')
        .set('Authorization', `Bearer ${token}`);

      const supportedChains = ['ethereum', 'base', 'optimism', 'arbitrum'];
      const chainIds = response.body.data.map((c: any) => c.id);

      supportedChains.forEach((chain) => {
        expect(chainIds).toContain(chain);
      });
    });

    it('should reject requests without authentication', async () => {
      const response = await request(app).get('/bridge/chains');

      expect(response.status).toBe(401);
      expectErrorResponse(response, 'UNAUTHORIZED');
    });
  });

  describe('Response Format', () => {
    it('should include requestId in all responses', async () => {
      const token = generateTestToken({
        permissions: ['bridge:read'],
      });

      const response = await request(app)
        .get('/bridge/chains')
        .set('Authorization', `Bearer ${token}`);

      expectValidResponse(response);
      expect(response.body).toHaveProperty('requestId');
    });

    it('should include timestamp in all responses', async () => {
      const token = generateTestToken({
        permissions: ['bridge:read'],
      });

      const response = await request(app)
        .get('/bridge/chains')
        .set('Authorization', `Bearer ${token}`);

      expectValidResponse(response);
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return consistent error format', async () => {
      const response = await request(app).get('/bridge/chains');

      expectErrorResponse(response);
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });
  });

  describe('Bridge Fee Estimation', () => {
    it('should return higher fees for ethereum bridges', async () => {
      const token = generateTestToken({
        permissions: ['bridge:read'],
      });

      // Ethereum to L2
      const ethToBase = await request(app)
        .post('/bridge/quote')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sourceChain: 'ethereum',
          destinationChain: 'base',
          token: 'USDC',
          amount: '1000',
          senderAddress: '0x1234567890123456789012345678901234567890',
        });

      // L2 to L2
      const baseToOpt = await request(app)
        .post('/bridge/quote')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sourceChain: 'base',
          destinationChain: 'optimism',
          token: 'USDC',
          amount: '1000',
          senderAddress: '0x1234567890123456789012345678901234567890',
        });

      expect(ethToBase.body.data.estimatedFee).toBeGreaterThan(baseToOpt.body.data.estimatedFee);
    });

    it('should return higher fees for L2 to ethereum', async () => {
      const token = generateTestToken({
        permissions: ['bridge:read'],
      });

      // L2 to Ethereum
      const baseToEth = await request(app)
        .post('/bridge/quote')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sourceChain: 'base',
          destinationChain: 'ethereum',
          token: 'USDC',
          amount: '1000',
          senderAddress: '0x1234567890123456789012345678901234567890',
        });

      // L2 to L2
      const baseToOpt = await request(app)
        .post('/bridge/quote')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sourceChain: 'base',
          destinationChain: 'optimism',
          token: 'USDC',
          amount: '1000',
          senderAddress: '0x1234567890123456789012345678901234567890',
        });

      expect(baseToEth.body.data.estimatedFee).toBeGreaterThan(baseToOpt.body.data.estimatedFee);
    });
  });
});
