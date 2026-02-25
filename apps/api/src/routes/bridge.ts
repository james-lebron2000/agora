import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requirePermission } from '../middleware/auth';
import { redisService } from '../services/redis';
import { ValidationError } from '../middleware/errorHandler';
import { SuccessResponse } from '../types';

const router = Router();

// Validation schemas
const quoteSchema = z.object({
  sourceChain: z.enum(['ethereum', 'base', 'optimism', 'arbitrum']),
  destinationChain: z.enum(['ethereum', 'base', 'optimism', 'arbitrum']),
  token: z.enum(['USDC', 'ETH']),
  amount: z.string().min(1),
  senderAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

const executeSchema = z.object({
  sourceChain: z.enum(['ethereum', 'base', 'optimism', 'arbitrum']),
  destinationChain: z.enum(['ethereum', 'base', 'optimism', 'arbitrum']),
  token: z.enum(['USDC', 'ETH']),
  amount: z.string().min(1),
  senderAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  recipientAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
});

// Bridge fee estimates (in USD)
const BRIDGE_FEES: Record<string, number> = {
  'base-optimism': 0.5,
  'base-arbitrum': 0.6,
  'optimism-base': 0.5,
  'optimism-arbitrum': 0.6,
  'arbitrum-base': 0.6,
  'arbitrum-optimism': 0.6,
  'ethereum-base': 1.0,
  'ethereum-optimism': 1.0,
  'ethereum-arbitrum': 1.0,
  'base-ethereum': 2.0,
  'optimism-ethereum': 2.0,
  'arbitrum-ethereum': 2.0
};

// Time estimates (in seconds)
const TIME_ESTIMATES: Record<string, number> = {
  'base-optimism': 60,
  'base-arbitrum': 60,
  'optimism-base': 60,
  'optimism-arbitrum': 60,
  'arbitrum-base': 60,
  'arbitrum-optimism': 60,
  'ethereum-base': 300,
  'ethereum-optimism': 300,
  'ethereum-arbitrum': 300,
  'base-ethereum': 900,
  'optimism-ethereum': 900,
  'arbitrum-ethereum': 900
};

// POST /bridge/quote - Get bridge quote
router.post('/quote',
  requirePermission('bridge:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = quoteSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError(result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '));
      }

      const { sourceChain, destinationChain, token, amount, senderAddress } = result.data;

      // Validate chains are different
      if (sourceChain === destinationChain) {
        throw new ValidationError('Source and destination chains must be different');
      }

      const route = `${sourceChain}-${destinationChain}`;
      const estimatedFee = BRIDGE_FEES[route] || 0.5;
      const estimatedTime = TIME_ESTIMATES[route] || 60;

      // Generate quote ID for tracking
      const quoteId = `quote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Cache quote for 5 minutes
      const quoteData = {
        quoteId,
        sourceChain,
        destinationChain,
        token,
        amount,
        senderAddress,
        estimatedFee,
        estimatedTime,
        path: [sourceChain, 'layerzero', destinationChain],
        expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
      };

      await redisService.set(`bridge:quote:${quoteId}`, quoteData, 300);

      const response: SuccessResponse<typeof quoteData> = {
        success: true,
        data: quoteData,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// POST /bridge/execute - Execute bridge transaction
router.post('/execute',
  requirePermission('bridge:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = executeSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError(result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '));
      }

      const { sourceChain, destinationChain, token, amount, senderAddress, recipientAddress } = result.data;

      // Validate chains are different
      if (sourceChain === destinationChain) {
        throw new ValidationError('Source and destination chains must be different');
      }

      // Generate mock transaction hash (in production, this would execute the actual bridge)
      const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

      // Store transaction record
      const transaction = {
        txHash,
        sourceChain,
        destinationChain,
        token,
        amount,
        senderAddress,
        recipientAddress: recipientAddress || senderAddress,
        status: 'pending',
        createdAt: new Date().toISOString(),
        estimatedCompletion: new Date(Date.now() + (TIME_ESTIMATES[`${sourceChain}-${destinationChain}`] || 60) * 1000).toISOString()
      };

      await redisService.set(`bridge:tx:${txHash}`, transaction, 86400); // 24 hours

      // Add to user's transaction history
      const historyKey = `bridge:history:${senderAddress.toLowerCase()}`;
      await redisService.lpush(historyKey, JSON.stringify(transaction));
      await redisService.expire(historyKey, 30 * 24 * 60 * 60); // 30 days

      const response: SuccessResponse<typeof transaction> = {
        success: true,
        data: transaction,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// GET /bridge/transactions/:address - Get bridge history for address
router.get('/transactions/:address',
  requirePermission('bridge:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { address } = req.params;

      // Validate address
      if (!/^0x[a-fA-F0-9]{40}$/i.test(address)) {
        throw new ValidationError('Invalid Ethereum address');
      }

      // Get transaction history from Redis
      const historyKey = `bridge:history:${address.toLowerCase()}`;
      const transactions = await redisService.lrange(historyKey, 0, 49); // Last 50 transactions

      const parsedTransactions = transactions
        .map(tx => {
          try {
            return JSON.parse(tx);
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      const response: SuccessResponse<typeof parsedTransactions> = {
        success: true,
        data: parsedTransactions,
        meta: {
          total: parsedTransactions.length,
          limit: 50,
          page: 1,
          hasMore: parsedTransactions.length === 50
        },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// GET /bridge/status/:txHash - Get bridge transaction status
router.get('/status/:txHash',
  requirePermission('bridge:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { txHash } = req.params;

      // Get transaction from Redis
      const transaction = await redisService.get(`bridge:tx:${txHash}`);

      if (!transaction) {
        // Return not found status
        const response: SuccessResponse<{ status: 'not_found'; txHash: string }> = {
          success: true,
          data: {
            txHash,
            status: 'not_found'
          },
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        };
        res.json(response);
        return;
      }

      // Simulate status progression based on time
      const tx = typeof transaction === 'string' ? JSON.parse(transaction) : transaction;
      const elapsed = Date.now() - new Date(tx.createdAt).getTime();
      const estimated = new Date(tx.estimatedCompletion).getTime() - new Date(tx.createdAt).getTime();
      
      let status = tx.status;
      if (status === 'pending') {
        if (elapsed > estimated * 1.2) {
          status = 'completed';
        } else if (elapsed > estimated * 0.5) {
          status = 'processing';
        }
      }

      const response: SuccessResponse<typeof tx> = {
        success: true,
        data: {
          ...tx,
          status,
          progress: Math.min(100, Math.floor((elapsed / estimated) * 100))
        },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// GET /bridge/chains - Get supported chains
router.get('/chains',
  requirePermission('bridge:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const chains = [
        {
          id: 'ethereum',
          name: 'Ethereum',
          icon: '🔷',
          color: '#627EEA',
          nativeToken: 'ETH',
          usdcAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
        },
        {
          id: 'base',
          name: 'Base',
          icon: '🔵',
          color: '#0052FF',
          nativeToken: 'ETH',
          usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
        },
        {
          id: 'optimism',
          name: 'Optimism',
          icon: '🔴',
          color: '#FF0420',
          nativeToken: 'ETH',
          usdcAddress: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
        },
        {
          id: 'arbitrum',
          name: 'Arbitrum',
          icon: '💠',
          color: '#28A0F0',
          nativeToken: 'ETH',
          usdcAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
        }
      ];

      const response: SuccessResponse<typeof chains> = {
        success: true,
        data: chains,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
