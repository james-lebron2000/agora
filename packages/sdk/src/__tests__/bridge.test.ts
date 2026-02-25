/**
 * Bridge Module Unit Tests
 * Tests for BridgeTransactionHistory and utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  BridgeTransactionHistory,
  findCheapestChain,
  SUPPORTED_CHAINS,
  USDC_ADDRESSES,
  LAYERZERO_ENDPOINTS,
  LAYERZERO_CHAIN_IDS,
  LAYERZERO_USDC_OFT,
  RPC_URLS,
  getBridgeHistory,
  type SupportedChain,
  type BridgeTransaction,
  type BridgeTransactionFilter
} from '../bridge.js';
import type { Hex, Address } from 'viem';
import { base, optimism, arbitrum, mainnet } from 'viem/chains';

// Mock localStorage for Node.js environment
class LocalStorageMock {
  private store: Record<string, string> = {};
  
  getItem(key: string): string | null {
    return this.store[key] || null;
  }
  
  setItem(key: string, value: string): void {
    this.store[key] = value;
  }
  
  removeItem(key: string): void {
    delete this.store[key];
  }
  
  clear(): void {
    this.store = {};
  }
}

// Setup global localStorage mock before tests
(globalThis as any).localStorage = new LocalStorageMock();

// Test addresses
const TEST_ADDRESS: Address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const TEST_ADDRESS_2: Address = '0x1111111111111111111111111111111111111111';

describe('BridgeTransactionHistory', () => {
  let history: BridgeTransactionHistory;
  
  beforeEach(() => {
    (globalThis as any).localStorage.clear();
    history = new BridgeTransactionHistory(TEST_ADDRESS);
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create a new history instance with empty transactions', () => {
      expect(history).toBeDefined();
      expect(history.getTransactionCount()).toBe(0);
    });

    it('should load existing transactions from storage', () => {
      const existingTx: BridgeTransaction = {
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as Hex,
        sourceChain: 'base',
        destinationChain: 'optimism',
        amount: '100',
        token: 'USDC',
        status: 'completed',
        timestamp: Date.now(),
        senderAddress: TEST_ADDRESS,
        recipientAddress: TEST_ADDRESS
      };
      
      history.addTransaction(existingTx);
      
      // Create new instance - should load from storage
      const history2 = new BridgeTransactionHistory(TEST_ADDRESS);
      expect(history2.getTransactionCount()).toBe(1);
    });
  });

  describe('addTransaction', () => {
    it('should add a transaction to history', () => {
      const tx: BridgeTransaction = {
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as Hex,
        sourceChain: 'base',
        destinationChain: 'optimism',
        amount: '100',
        token: 'USDC',
        status: 'pending',
        timestamp: Date.now(),
        fees: { nativeFee: '0.001', lzTokenFee: '0' },
        senderAddress: TEST_ADDRESS,
        recipientAddress: TEST_ADDRESS
      };
      
      history.addTransaction(tx);
      expect(history.getTransactionCount()).toBe(1);
    });

    it('should update existing transaction instead of duplicating', () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as Hex;
      
      const tx1: BridgeTransaction = {
        txHash,
        sourceChain: 'base',
        destinationChain: 'optimism',
        amount: '100',
        token: 'USDC',
        status: 'pending',
        timestamp: Date.now(),
        senderAddress: TEST_ADDRESS,
        recipientAddress: TEST_ADDRESS
      };
      
      const tx2: BridgeTransaction = {
        txHash,
        sourceChain: 'base',
        destinationChain: 'optimism',
        amount: '100',
        token: 'USDC',
        status: 'completed',
        timestamp: Date.now(),
        senderAddress: TEST_ADDRESS,
        recipientAddress: TEST_ADDRESS
      };
      
      history.addTransaction(tx1);
      history.addTransaction(tx2);
      
      expect(history.getTransactionCount()).toBe(1);
      expect(history.getTransactionByHash(txHash)?.status).toBe('completed');
    });

    it('should limit to 100 transactions (keep most recent)', () => {
      for (let i = 0; i < 105; i++) {
        const tx: BridgeTransaction = {
          txHash: `0x${i.toString(16).padStart(64, '0')}` as Hex,
          sourceChain: 'base',
          destinationChain: 'optimism',
          amount: String(i),
          token: 'USDC',
          status: 'completed',
          timestamp: Date.now() - i * 1000,
          senderAddress: TEST_ADDRESS,
          recipientAddress: TEST_ADDRESS
        };
        history.addTransaction(tx);
      }
      
      expect(history.getTransactionCount()).toBe(100);
    });
  });

  describe('getTransactionByHash', () => {
    it('should retrieve a transaction by hash', () => {
      const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as Hex;
      const tx: BridgeTransaction = {
        txHash,
        sourceChain: 'arbitrum',
        destinationChain: 'base',
        amount: '50',
        token: 'USDC',
        status: 'completed',
        timestamp: Date.now(),
        senderAddress: TEST_ADDRESS,
        recipientAddress: TEST_ADDRESS
      };
      
      history.addTransaction(tx);
      const retrieved = history.getTransactionByHash(txHash);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.amount).toBe('50');
    });

    it('should return undefined for non-existent hash', () => {
      const result = history.getTransactionByHash('0x9999999999999999999999999999999999999999999999999999999999999999' as Hex);
      expect(result).toBeUndefined();
    });

    it('should be case-insensitive when matching hashes', () => {
      const txHash = '0xABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890' as Hex;
      const tx: BridgeTransaction = {
        txHash: txHash.toLowerCase() as Hex,
        sourceChain: 'base',
        destinationChain: 'optimism',
        amount: '100',
        token: 'USDC',
        status: 'completed',
        timestamp: Date.now(),
        senderAddress: TEST_ADDRESS,
        recipientAddress: TEST_ADDRESS
      };
      
      history.addTransaction(tx);
      const retrieved = history.getTransactionByHash(txHash);
      
      expect(retrieved).toBeDefined();
    });
  });

  describe('updateTransactionStatus', () => {
    it('should update transaction status', () => {
      const txHash = '0x1111111111111111111111111111111111111111111111111111111111111111' as Hex;
      const tx: BridgeTransaction = {
        txHash,
        sourceChain: 'optimism',
        destinationChain: 'arbitrum',
        amount: '25',
        token: 'USDC',
        status: 'pending',
        timestamp: Date.now(),
        senderAddress: TEST_ADDRESS,
        recipientAddress: TEST_ADDRESS
      };
      
      history.addTransaction(tx);
      expect(history.getTransactionByHash(txHash)?.status).toBe('pending');
      
      const updated = history.updateTransactionStatus(txHash, 'completed');
      expect(updated).toBe(true);
      expect(history.getTransactionByHash(txHash)?.status).toBe('completed');
    });

    it('should return false for non-existent transaction', () => {
      const result = history.updateTransactionStatus(
        '0x9999999999999999999999999999999999999999999999999999999999999999' as Hex,
        'completed'
      );
      expect(result).toBe(false);
    });
  });

  describe('getTransactions with filters', () => {
    beforeEach(() => {
      const now = Date.now();
      
      history.addTransaction({
        txHash: '0x2222222222222222222222222222222222222222222222222222222222222222' as Hex,
        sourceChain: 'base',
        destinationChain: 'optimism',
        amount: '10',
        token: 'USDC',
        status: 'pending',
        timestamp: now,
        senderAddress: TEST_ADDRESS,
        recipientAddress: TEST_ADDRESS
      });
      
      history.addTransaction({
        txHash: '0x3333333333333333333333333333333333333333333333333333333333333333' as Hex,
        sourceChain: 'optimism',
        destinationChain: 'base',
        amount: '20',
        token: 'USDC',
        status: 'completed',
        timestamp: now - 1000,
        senderAddress: TEST_ADDRESS,
        recipientAddress: TEST_ADDRESS
      });
      
      history.addTransaction({
        txHash: '0x4444444444444444444444444444444444444444444444444444444444444444' as Hex,
        sourceChain: 'arbitrum',
        destinationChain: 'base',
        amount: '30',
        token: 'USDC',
        status: 'failed',
        timestamp: now - 2000,
        senderAddress: TEST_ADDRESS,
        recipientAddress: TEST_ADDRESS
      });
    });

    it('should filter by status', () => {
      const pending = history.getTransactions({ status: 'pending' });
      const completed = history.getTransactions({ status: 'completed' });
      const failed = history.getTransactions({ status: 'failed' });
      
      expect(pending).toHaveLength(1);
      expect(pending[0].status).toBe('pending');
      expect(completed).toHaveLength(1);
      expect(completed[0].status).toBe('completed');
      expect(failed).toHaveLength(1);
      expect(failed[0].status).toBe('failed');
    });

    it('should filter by chain (source or destination)', () => {
      const baseTxs = history.getTransactions({ chain: 'base' });
      const optimismTxs = history.getTransactions({ chain: 'optimism' });
      
      expect(baseTxs).toHaveLength(3); // base is source in 1, destination in 2
      expect(optimismTxs).toHaveLength(2); // optimism is source in 1, destination in 1
    });

    it('should filter by time range', () => {
      const now = Date.now();
      const recent = history.getTransactions({ startTime: now - 1500 });
      const old = history.getTransactions({ endTime: now - 1500 });
      
      expect(recent).toHaveLength(2);
      expect(old).toHaveLength(1);
    });

    it('should apply multiple filters', () => {
      const now = Date.now();
      const filtered = history.getTransactions({
        chain: 'base',
        status: 'completed',
        startTime: now - 1500
      });
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].status).toBe('completed');
    });
  });

  describe('getPendingTransactions', () => {
    it('should return only pending transactions', () => {
      history.addTransaction({
        txHash: '0x6666666666666666666666666666666666666666666666666666666666666666' as Hex,
        sourceChain: 'base',
        destinationChain: 'optimism',
        amount: '5',
        token: 'USDC',
        status: 'pending',
        timestamp: Date.now(),
        senderAddress: TEST_ADDRESS,
        recipientAddress: TEST_ADDRESS
      });
      
      history.addTransaction({
        txHash: '0x8888888888888888888888888888888888888888888888888888888888888888' as Hex,
        sourceChain: 'arbitrum',
        destinationChain: 'base',
        amount: '25',
        token: 'USDC',
        status: 'completed',
        timestamp: Date.now() - 2000,
        senderAddress: TEST_ADDRESS,
        recipientAddress: TEST_ADDRESS
      });
      
      const pending = history.getPendingTransactions();
      expect(pending).toHaveLength(1);
      expect(pending[0].status).toBe('pending');
    });
  });

  describe('clearHistory', () => {
    it('should remove all transactions', () => {
      history.addTransaction({
        txHash: '0x9999999999999999999999999999999999999999999999999999999999999999' as Hex,
        sourceChain: 'base',
        destinationChain: 'optimism',
        amount: '100',
        token: 'USDC',
        status: 'completed',
        timestamp: Date.now(),
        senderAddress: TEST_ADDRESS,
        recipientAddress: TEST_ADDRESS
      });
      
      expect(history.getTransactionCount()).toBe(1);
      history.clearHistory();
      expect(history.getTransactionCount()).toBe(0);
    });
  });
});

describe('Constants and Configuration', () => {
  it('should have all supported chains configured', () => {
    expect(SUPPORTED_CHAINS).toHaveProperty('base');
    expect(SUPPORTED_CHAINS).toHaveProperty('optimism');
    expect(SUPPORTED_CHAINS).toHaveProperty('arbitrum');
    expect(SUPPORTED_CHAINS).toHaveProperty('ethereum');
    
    expect(SUPPORTED_CHAINS.base).toBe(base);
    expect(SUPPORTED_CHAINS.optimism).toBe(optimism);
    expect(SUPPORTED_CHAINS.arbitrum).toBe(arbitrum);
    expect(SUPPORTED_CHAINS.ethereum).toBe(mainnet);
  });

  it('should have valid USDC addresses for all chains', () => {
    const chains: SupportedChain[] = ['ethereum', 'base', 'optimism', 'arbitrum'];
    
    for (const chain of chains) {
      expect(USDC_ADDRESSES[chain]).toBeDefined();
      expect(USDC_ADDRESSES[chain]).toMatch(/^0x[a-fA-F0-9]{40}$/);
    }
  });

  it('should have LayerZero endpoint addresses', () => {
    const chains: SupportedChain[] = ['ethereum', 'base', 'optimism', 'arbitrum'];
    
    for (const chain of chains) {
      expect(LAYERZERO_ENDPOINTS[chain]).toBeDefined();
      expect(LAYERZERO_ENDPOINTS[chain]).toMatch(/^0x[a-fA-F0-9]{40}$/);
    }
  });

  it('should have LayerZero chain IDs', () => {
    expect(LAYERZERO_CHAIN_IDS.ethereum).toBe(30101);
    expect(LAYERZERO_CHAIN_IDS.base).toBe(30184);
    expect(LAYERZERO_CHAIN_IDS.optimism).toBe(30111);
    expect(LAYERZERO_CHAIN_IDS.arbitrum).toBe(30110);
  });

  it('should have LayerZero USDC OFT addresses', () => {
    const chains: SupportedChain[] = ['ethereum', 'base', 'optimism', 'arbitrum'];
    
    for (const chain of chains) {
      expect(LAYERZERO_USDC_OFT[chain]).toBeDefined();
      expect(LAYERZERO_USDC_OFT[chain]).toMatch(/^0x[a-fA-F0-9]{40}$/);
    }
  });

  it('should have RPC URLs for all chains', () => {
    const chains: SupportedChain[] = ['ethereum', 'base', 'optimism', 'arbitrum'];
    
    for (const chain of chains) {
      expect(RPC_URLS[chain]).toBeDefined();
      expect(Array.isArray(RPC_URLS[chain])).toBe(true);
      expect(RPC_URLS[chain].length).toBeGreaterThan(0);
    }
  });
});

describe('Utility Functions', () => {
  describe('findCheapestChain', () => {
    it('should find cheapest chain for send operations', async () => {
      const result = await findCheapestChain('send');
      expect(result).toHaveProperty('chain');
      expect(result).toHaveProperty('estimatedCost');
      expect(['base', 'optimism', 'arbitrum']).toContain(result.chain);
    });

    it('should find cheapest chain for swap operations', async () => {
      const result = await findCheapestChain('swap');
      expect(result.chain).toBeDefined();
      expect(parseFloat(result.estimatedCost)).toBeGreaterThan(0);
    });

    it('should find cheapest chain for contract operations', async () => {
      const result = await findCheapestChain('contract');
      expect(result.chain).toBeDefined();
    });

    it('should respect excluded chains', async () => {
      const result = await findCheapestChain('send', ['base']);
      expect(result.chain).not.toBe('base');
    });

    it('should exclude multiple chains', async () => {
      const result = await findCheapestChain('send', ['base', 'optimism']);
      expect(result.chain).toBe('arbitrum');
    });
  });

  describe('getBridgeHistory', () => {
    it('should return empty array for new address', () => {
      const history = getBridgeHistory(TEST_ADDRESS_2);
      expect(Array.isArray(history)).toBe(true);
      expect(history).toHaveLength(0);
    });

    it('should filter by chain when specified', () => {
      // First add a transaction
      const txHistory = new BridgeTransactionHistory(TEST_ADDRESS_2);
      txHistory.addTransaction({
        txHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Hex,
        sourceChain: 'base',
        destinationChain: 'optimism',
        amount: '100',
        token: 'USDC',
        status: 'completed',
        timestamp: Date.now(),
        senderAddress: TEST_ADDRESS_2,
        recipientAddress: TEST_ADDRESS_2
      });
      
      const baseHistory = getBridgeHistory(TEST_ADDRESS_2, 'base');
      expect(Array.isArray(baseHistory)).toBe(true);
    });
  });
});

describe('Type Exports', () => {
  it('should have all required type definitions', () => {
    // These are compile-time checks - if they compile, types are exported correctly
    const _filter: BridgeTransactionFilter = {
      chain: 'base',
      status: 'pending',
      startTime: Date.now(),
      endTime: Date.now()
    };
    
    const _tx: BridgeTransaction = {
      txHash: '0x1234' as Hex,
      sourceChain: 'base',
      destinationChain: 'optimism',
      amount: '100',
      token: 'USDC',
      status: 'pending',
      timestamp: Date.now(),
      senderAddress: TEST_ADDRESS,
      recipientAddress: TEST_ADDRESS
    };
    
    expect(_filter).toBeDefined();
    expect(_tx).toBeDefined();
  });
});

console.log('[Unit Tests] Bridge module test suite loaded');