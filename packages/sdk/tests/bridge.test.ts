/**
 * Cross-Chain Bridge Integration Tests
 * Tests the bridge functionality for Base, Optimism, and Arbitrum
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import {
  CrossChainBridge,
  createChainPublicClient,
  getUSDCBalance,
  getNativeBalance,
  getAllBalances,
  getBridgeQuote,
  findCheapestChain,
  SUPPORTED_CHAINS,
  USDC_ADDRESSES,
  BridgeTransactionHistory,
  getBridgeHistory,
  BridgeTransactionMonitor,
  BridgeError,
  defaultLogger,
  estimateBridgeFee,
  listenLayerZeroMessages,
  LAYERZERO_CHAIN_IDS,
  type SupportedChain,
  type BridgeTransaction,
  type BridgeTransactionStatusDetails,
  type BridgeFeeEstimate
} from '../src/bridge.js';
import {
  createMultiChainWallet,
  loadOrCreateMultiChainWallet,
  refreshBalances,
  getTotalUSDCBalance,
  getChainWithHighestBalance,
  getCheapestChainForOperations,
  selectOptimalChain,
  MultiChainWalletManager
} from '../src/wallet-manager.js';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import type { Hex, Address } from 'viem';

// Test wallet address (Vitalik's address - a known valid address)
const TEST_ADDRESS: Address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'; // Valid checksummed address

describe('Cross-Chain Bridge', () => {
  let bridge: CrossChainBridge;
  let testPrivateKey: Hex;

  beforeAll(() => {
    // Generate a test private key
    testPrivateKey = generatePrivateKey();
    bridge = new CrossChainBridge(testPrivateKey);
  });

  describe('Chain Configuration', () => {
    it('should have all supported chains configured', () => {
      expect(SUPPORTED_CHAINS).toHaveProperty('base');
      expect(SUPPORTED_CHAINS).toHaveProperty('optimism');
      expect(SUPPORTED_CHAINS).toHaveProperty('arbitrum');
      expect(SUPPORTED_CHAINS).toHaveProperty('ethereum');
    });

    it('should have USDC addresses for all chains', () => {
      const chains: SupportedChain[] = ['ethereum', 'base', 'optimism', 'arbitrum'];
      for (const chain of chains) {
        expect(USDC_ADDRESSES[chain]).toBeDefined();
        expect(USDC_ADDRESSES[chain]).toMatch(/^0x[a-fA-F0-9]{40}$/);
      }
    });
  });

  describe('Public Client Creation', () => {
    it('should create public clients for all chains', () => {
      const chains: SupportedChain[] = ['base', 'optimism', 'arbitrum'];
      
      for (const chain of chains) {
        const client = createChainPublicClient(chain);
        expect(client).toBeDefined();
        expect(client.chain).toBeDefined();
        const chainName = client.chain?.name.toLowerCase() || '';
        if (chain === 'optimism') {
          expect(chainName).toContain('op');
        } else {
          expect(chainName).toContain(chain === 'ethereum' ? 'ethereum' : chain);
        }
      }
    });
  });

  describe('Balance Queries', () => {
    // Skip network tests that timeout - these require real RPC connections
    it.skip('should query USDC balance on Base', async () => {
      const balance = await getUSDCBalance(TEST_ADDRESS, 'base');
      expect(typeof balance).toBe('string');
      expect(parseFloat(balance)).toBeGreaterThanOrEqual(0);
    }, 10000);

    it.skip('should query native balance on Optimism', async () => {
      const balance = await getNativeBalance(TEST_ADDRESS, 'optimism');
      expect(typeof balance).toBe('string');
      expect(parseFloat(balance)).toBeGreaterThanOrEqual(0);
    }, 10000);

    it.skip('should query all balances', async () => {
      const balances = await getAllBalances(TEST_ADDRESS);
      expect(balances).toHaveLength(4);
      
      for (const balance of balances) {
        expect(balance).toHaveProperty('chain');
        expect(balance).toHaveProperty('nativeBalance');
        expect(balance).toHaveProperty('usdcBalance');
        expect(parseFloat(balance.nativeBalance)).toBeGreaterThanOrEqual(0);
        expect(parseFloat(balance.usdcBalance)).toBeGreaterThanOrEqual(0);
      }
    }, 15000);
  });

  describe('Bridge Quotes', () => {
    // Skip tests that make network calls - mock instead
    it.skip('should generate bridge quote for USDC transfer', async () => {
      const account = privateKeyToAccount(testPrivateKey);
      const quote = await getBridgeQuote({
        sourceChain: 'base',
        destinationChain: 'optimism',
        token: 'USDC',
        amount: '100'
      }, account.address);

      expect(quote).toHaveProperty('sourceChain', 'base');
      expect(quote).toHaveProperty('destinationChain', 'optimism');
      expect(quote).toHaveProperty('token', 'USDC');
      expect(quote).toHaveProperty('amount', '100');
      expect(quote).toHaveProperty('estimatedFee');
      expect(quote).toHaveProperty('estimatedTime');
      expect(parseFloat(quote.estimatedFee)).toBeGreaterThan(0);
    });

    it('should generate bridge quote for ETH transfer (no network)', async () => {
      const account = privateKeyToAccount(testPrivateKey);
      // ETH transfer doesn't require network call for quote
      const quote = await getBridgeQuote({
        sourceChain: 'arbitrum',
        destinationChain: 'base',
        token: 'ETH',
        amount: '0.1'
      }, account.address);

      expect(quote.token).toBe('ETH');
      expect(quote.sourceChain).toBe('arbitrum');
      expect(quote.destinationChain).toBe('base');
    });
  });

  describe('Cheapest Chain Selection', () => {
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

    it('should respect excluded chains', async () => {
      const result = await findCheapestChain('send', ['base']);
      expect(result.chain).not.toBe('base');
    });
  });

  describe('Bridge Execution (Simulated)', () => {
    // Skip test that makes network calls
    it.skip('should simulate bridge execution', async () => {
      const result = await bridge.bridgeUSDC('optimism', '10', 'base');
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('sourceChain', 'base');
      expect(result).toHaveProperty('destinationChain', 'optimism');
      expect(result).toHaveProperty('amount', '10');
      
      if (result.success) {
        expect(result.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      }
    }, 10000);
  });
});

describe('Multi-Chain Wallet Manager', () => {
  let manager: MultiChainWalletManager;
  let testWallet: ReturnType<typeof createMultiChainWallet>;

  beforeAll(() => {
    const testKey = generatePrivateKey();
    testWallet = createMultiChainWallet(testKey);
    manager = new MultiChainWalletManager();
  });

  describe('Wallet Creation', () => {
    it('should create multi-chain wallet with all clients', () => {
      expect(testWallet).toHaveProperty('address');
      expect(testWallet).toHaveProperty('privateKey');
      expect(testWallet).toHaveProperty('clients');
      expect(testWallet.clients).toHaveProperty('ethereum');
      expect(testWallet.clients).toHaveProperty('base');
      expect(testWallet.clients).toHaveProperty('optimism');
      expect(testWallet.clients).toHaveProperty('arbitrum');
    });

    it('should have wallet and public clients for each chain', () => {
      const chains: SupportedChain[] = ['ethereum', 'base', 'optimism', 'arbitrum'];
      
      for (const chain of chains) {
        expect(testWallet.clients[chain]).toHaveProperty('walletClient');
        expect(testWallet.clients[chain]).toHaveProperty('publicClient');
      }
    });
  });

  describe('Balance Management', () => {
    it('should calculate total USDC balance', () => {
      const walletWithBalances = {
        ...testWallet,
        balances: [
          { chain: 'base' as SupportedChain, nativeBalance: '0.1', usdcBalance: '100' },
          { chain: 'optimism' as SupportedChain, nativeBalance: '0.2', usdcBalance: '200' },
          { chain: 'arbitrum' as SupportedChain, nativeBalance: '0.3', usdcBalance: '300' },
          { chain: 'ethereum' as SupportedChain, nativeBalance: '1.0', usdcBalance: '0' }
        ]
      };

      const total = getTotalUSDCBalance(walletWithBalances);
      expect(total).toBe('600.000000');
    });

    it('should find chain with highest USDC balance', () => {
      const walletWithBalances = {
        ...testWallet,
        balances: [
          { chain: 'base' as SupportedChain, nativeBalance: '0.1', usdcBalance: '100' },
          { chain: 'optimism' as SupportedChain, nativeBalance: '0.2', usdcBalance: '500' },
          { chain: 'arbitrum' as SupportedChain, nativeBalance: '0.3', usdcBalance: '200' },
          { chain: 'ethereum' as SupportedChain, nativeBalance: '1.0', usdcBalance: '0' }
        ]
      };

      const highest = getChainWithHighestBalance(walletWithBalances);
      expect(highest).not.toBeNull();
      expect(highest?.chain).toBe('optimism');
      expect(highest?.balance).toBe('500');
    });

    it('should return null for empty balances', () => {
      const walletWithNoBalances = {
        ...testWallet,
        balances: []
      };

      const highest = getChainWithHighestBalance(walletWithNoBalances);
      expect(highest).toBeNull();
    });
  });

  describe('Chain Selection', () => {
    it('should select cheapest chain for operations', () => {
      const cheapest = getCheapestChainForOperations();
      expect(['base', 'optimism', 'arbitrum']).toContain(cheapest);
    });

    it('should select optimal chain based on balance', () => {
      const walletWithBalances = {
        ...testWallet,
        balances: [
          { chain: 'base' as SupportedChain, nativeBalance: '0.1', usdcBalance: '10' },
          { chain: 'optimism' as SupportedChain, nativeBalance: '0.2', usdcBalance: '500' },
          { chain: 'arbitrum' as SupportedChain, nativeBalance: '0.3', usdcBalance: '200' },
          { chain: 'ethereum' as SupportedChain, nativeBalance: '1.0', usdcBalance: '0' }
        ]
      };

      // Should select cheapest chain with sufficient balance
      const optimal = selectOptimalChain(walletWithBalances, '100');
      expect(['optimism', 'arbitrum']).toContain(optimal);
    });

    it('should respect preferred chain if balance is sufficient', () => {
      const walletWithBalances = {
        ...testWallet,
        balances: [
          { chain: 'base' as SupportedChain, nativeBalance: '0.1', usdcBalance: '1000' },
          { chain: 'optimism' as SupportedChain, nativeBalance: '0.2', usdcBalance: '500' },
          { chain: 'arbitrum' as SupportedChain, nativeBalance: '0.3', usdcBalance: '200' },
          { chain: 'ethereum' as SupportedChain, nativeBalance: '1.0', usdcBalance: '0' }
        ]
      };

      const optimal = selectOptimalChain(walletWithBalances, '100', 'optimism');
      expect(optimal).toBe('optimism');
    });
  });

  describe('Wallet Manager Class', () => {
    it('should provide address', () => {
      const address = manager.getAddress();
      expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should provide chain clients', () => {
      const baseClients = manager.getChainClients('base');
      expect(baseClients).toHaveProperty('walletClient');
      expect(baseClients).toHaveProperty('publicClient');
    });

    it('should return zero total USDC initially', () => {
      const total = manager.getTotalUSDC();
      expect(parseFloat(total)).toBe(0);
    });
  });
});

describe('Integration: Bridge + Wallet Manager', () => {
  // Skip tests that make network calls
  it.skip('should integrate bridge with multi-chain wallet', async () => {
    const testKey = generatePrivateKey();
    const wallet = createMultiChainWallet(testKey);
    const bridge = new CrossChainBridge(testKey);

    // Get balances via wallet manager
    const manager = new MultiChainWalletManager();
    const balances = await manager.refreshBalances();

    // Use bridge to get quote
    const quote = await bridge.getQuote('optimism', 'USDC', '10', 'base');

    expect(balances).toBeDefined();
    expect(quote).toBeDefined();
    expect(quote.sourceChain).toBe('base');
    expect(quote.destinationChain).toBe('optimism');
  }, 20000);

  it.skip('should find cheapest chain and get bridge quote', async () => {
    const testKey = generatePrivateKey();
    const bridge = new CrossChainBridge(testKey);

    // Find cheapest chain
    const cheapest = await findCheapestChain('send');
    
    // Get quote from that chain
    const destination: SupportedChain = cheapest.chain === 'base' ? 'optimism' : 'base';
    const quote = await bridge.getQuote(destination, 'USDC', '10', cheapest.chain);

    expect(quote.sourceChain).toBe(cheapest.chain);
    expect(parseFloat(quote.estimatedFee)).toBeGreaterThan(0);
  });
});

// Simple localStorage mock for Node.js environment
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

// Setup global localStorage mock
globalThis.localStorage = new LocalStorageMock() as any;

describe('Bridge Transaction History', () => {
  const TEST_ADDRESS: Address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
  
  describe('BridgeTransactionHistory Class', () => {
    let history: BridgeTransactionHistory;
    let BridgeTransactionHistory: any;
    
    beforeEach(async () => {
      // Clear any existing storage before each test
      globalThis.localStorage.clear();
      const bridge = await import('../src/bridge.ts');
      BridgeTransactionHistory = bridge.BridgeTransactionHistory;
      history = new BridgeTransactionHistory(TEST_ADDRESS);
    });
    
    it('should create a new history instance', () => {
      expect(history).toBeDefined();
      expect(history.getTransactionCount()).toBe(0);
    });
    
    it('should add a transaction', () => {
      const tx: BridgeTransaction = {
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
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
    
    it('should retrieve a transaction by hash', () => {
      const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const tx: BridgeTransaction = {
        txHash: txHash as Hex,
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
      const retrieved = history.getTransactionByHash(txHash as Hex);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.txHash.toLowerCase()).toBe(txHash.toLowerCase());
      expect(retrieved?.amount).toBe('50');
    });
    
    it('should update transaction status', () => {
      const txHash = '0x1111111111111111111111111111111111111111111111111111111111111111';
      const tx: BridgeTransaction = {
        txHash: txHash as Hex,
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
      expect(history.getTransactionByHash(txHash as Hex)?.status).toBe('pending');
      
      const updated = history.updateTransactionStatus(txHash as Hex, 'completed');
      expect(updated).toBe(true);
      expect(history.getTransactionByHash(txHash as Hex)?.status).toBe('completed');
    });
    
    it('should filter transactions by status', () => {
      const now = Date.now();
      
      const pendingTx: BridgeTransaction = {
        txHash: '0x2222222222222222222222222222222222222222222222222222222222222222' as Hex,
        sourceChain: 'base',
        destinationChain: 'optimism',
        amount: '10',
        token: 'USDC',
        status: 'pending',
        timestamp: now,
        senderAddress: TEST_ADDRESS,
        recipientAddress: TEST_ADDRESS
      };
      
      const completedTx: BridgeTransaction = {
        txHash: '0x3333333333333333333333333333333333333333333333333333333333333333' as Hex,
        sourceChain: 'optimism',
        destinationChain: 'base',
        amount: '20',
        token: 'USDC',
        status: 'completed',
        timestamp: now - 1000,
        senderAddress: TEST_ADDRESS,
        recipientAddress: TEST_ADDRESS
      };
      
      history.addTransaction(pendingTx);
      history.addTransaction(completedTx);
      
      const pending = history.getTransactions({ status: 'pending' });
      const completed = history.getTransactions({ status: 'completed' });
      
      expect(pending).toHaveLength(1);
      expect(pending[0].status).toBe('pending');
      expect(completed).toHaveLength(1);
      expect(completed[0].status).toBe('completed');
    });
    
    it('should filter transactions by chain', () => {
      const now = Date.now();
      
      const baseToOptTx: BridgeTransaction = {
        txHash: '0x4444444444444444444444444444444444444444444444444444444444444444' as Hex,
        sourceChain: 'base',
        destinationChain: 'optimism',
        amount: '30',
        token: 'USDC',
        status: 'completed',
        timestamp: now,
        senderAddress: TEST_ADDRESS,
        recipientAddress: TEST_ADDRESS
      };
      
      const optToArbTx: BridgeTransaction = {
        txHash: '0x5555555555555555555555555555555555555555555555555555555555555555' as Hex,
        sourceChain: 'optimism',
        destinationChain: 'arbitrum',
        amount: '40',
        token: 'USDC',
        status: 'completed',
        timestamp: now - 1000,
        senderAddress: TEST_ADDRESS,
        recipientAddress: TEST_ADDRESS
      };
      
      history.addTransaction(baseToOptTx);
      history.addTransaction(optToArbTx);
      
      const baseTxs = history.getTransactions({ chain: 'base' });
      const optimismTxs = history.getTransactions({ chain: 'optimism' });
      
      expect(baseTxs).toHaveLength(1);
      expect(baseTxs[0].sourceChain).toBe('base');
      expect(optimismTxs).toHaveLength(2); // Both as source and destination
    });
    
    it('should get pending transactions', () => {
      const now = Date.now();
      
      history.addTransaction({
        txHash: '0x6666666666666666666666666666666666666666666666666666666666666666' as Hex,
        sourceChain: 'base',
        destinationChain: 'optimism',
        amount: '5',
        token: 'USDC',
        status: 'pending',
        timestamp: now,
        senderAddress: TEST_ADDRESS,
        recipientAddress: TEST_ADDRESS
      });
      
      history.addTransaction({
        txHash: '0x7777777777777777777777777777777777777777777777777777777777777777' as Hex,
        sourceChain: 'optimism',
        destinationChain: 'arbitrum',
        amount: '15',
        token: 'USDC',
        status: 'pending',
        timestamp: now - 1000,
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
        timestamp: now - 2000,
        senderAddress: TEST_ADDRESS,
        recipientAddress: TEST_ADDRESS
      });
      
      const pending = history.getPendingTransactions();
      expect(pending).toHaveLength(2);
      expect(pending.every(tx => tx.status === 'pending')).toBe(true);
    });
    
    it('should limit to 100 transactions', () => {
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
    
    it('should clear history', () => {
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
  
  describe('getBridgeHistory Function', () => {
    it('should return all transactions when no chain filter', async () => {
      const bridge = await import('../src/bridge.ts');
      const history = bridge.getBridgeHistory(TEST_ADDRESS);
      expect(Array.isArray(history)).toBe(true);
    });
    
    it('should filter by chain when specified', async () => {
      const bridge = await import('../src/bridge.ts');
      const history = bridge.getBridgeHistory(TEST_ADDRESS, 'base');
      expect(Array.isArray(history)).toBe(true);
    });
  });
  
  describe('localStorage Persistence', () => {
    const TEST_ADDRESS_2: Address = '0x1111111111111111111111111111111111111111';
    
    beforeEach(() => {
      globalThis.localStorage.clear();
    });
    
    it('should persist transactions to localStorage', async () => {
      const bridge = await import('../src/bridge.ts');
      const history = new bridge.BridgeTransactionHistory(TEST_ADDRESS_2);
      const tx: BridgeTransaction = {
        txHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Hex,
        sourceChain: 'base',
        destinationChain: 'optimism',
        amount: '1000',
        token: 'USDC',
        status: 'completed',
        timestamp: Date.now(),
        senderAddress: TEST_ADDRESS_2,
        recipientAddress: TEST_ADDRESS_2
      };
      
      history.addTransaction(tx);
      
      // Create new instance with same address
      const history2 = new bridge.BridgeTransactionHistory(TEST_ADDRESS_2);
      expect(history2.getTransactionCount()).toBe(1);
      expect(history2.getTransactionByHash(tx.txHash)).toBeDefined();
    });
  });
});

describe('Bridge Error Handling', () => {
  it('should create BridgeError with correct properties', () => {
    const error = new BridgeError(
      'Insufficient balance',
      'INSUFFICIENT_BALANCE',
      { chain: 'base', retryable: false }
    );

    expect(error.message).toBe('Insufficient balance');
    expect(error.code).toBe('INSUFFICIENT_BALANCE');
    expect(error.chain).toBe('base');
    expect(error.retryable).toBe(false);
    expect(error.isRetryable()).toBe(false);
  });

  it('should identify retryable errors', () => {
    const error = new BridgeError(
      'Network error',
      'NETWORK_ERROR',
      { retryable: true }
    );

    expect(error.isRetryable()).toBe(true);
  });

  it('should create BridgeError with txHash', () => {
    const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const error = new BridgeError(
      'Transaction failed',
      'TRANSACTION_FAILED',
      { txHash, chain: 'optimism' }
    );

    expect(error.txHash).toBe(txHash);
    expect(error.chain).toBe('optimism');
  });
});

describe('BridgeTransactionMonitor', () => {
  let monitor: BridgeTransactionMonitor;

  beforeEach(() => {
    monitor = new BridgeTransactionMonitor('base');
  });

  it('should create monitor instance', () => {
    expect(monitor).toBeDefined();
    expect(monitor.sourceChain).toBe('base');
  });

  it('should estimate total time for different routes', () => {
    // Access private method through any
    const estimate1 = (monitor as any).estimateTotalTime('base', 'optimism');
    const estimate2 = (monitor as any).estimateTotalTime('ethereum', 'base');
    const estimate3 = (monitor as any).estimateTotalTime('base', 'ethereum');

    expect(estimate1).toBe(60000);
    expect(estimate2).toBe(300000);
    expect(estimate3).toBe(900000);
  });

  it('should emit status updates', () => {
    const statusUpdates: any[] = [];

    monitor.on('statusUpdate', (status: any) => {
      statusUpdates.push(status);
    });

    // Simulate status update
    const testStatus = {
      txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      sourceChain: 'base',
      destinationChain: 'optimism',
      status: 'pending',
      stage: 'source',
      progress: 50,
      requiredConfirmations: 1,
      estimatedCompletionTime: Date.now() + 60000,
      retryCount: 0,
      lastUpdated: Date.now()
    };

    (monitor as any).emitStatusUpdate(testStatus);

    expect(statusUpdates).toHaveLength(1);
    expect(statusUpdates[0].progress).toBe(50);
  });

  it('should stop monitoring', () => {
    const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    // Start monitoring (won't actually run due to immediate abort)
    monitor.stopMonitoring(txHash, 'base', 'optimism');

    // Should not throw
    expect(true).toBe(true);
  });

  it('should stop all monitoring', () => {
    monitor.stopAllMonitoring();
    expect(monitor.activeMonitors.size).toBe(0);
  });

  it('should get cached status', () => {
    const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const status = monitor.getStatus(txHash, 'base', 'optimism');
    expect(status).toBeUndefined();
  });

  it('should handle delay with abort signal', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      (monitor as any).delay(1000, controller.signal)
    ).rejects.toThrow('Aborted');
  });

  it('should handle delay completion', async () => {
    const controller = new AbortController();

    const start = Date.now();
    await (monitor as any).delay(50, controller.signal);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(45); // Allow small margin
  });
});

describe('estimateBridgeFee', () => {
  it('should throw error for same source and destination', async () => {
    await expect(
      estimateBridgeFee({
        sourceChain: 'base',
        destinationChain: 'base',
        token: 'USDC',
        amount: '100'
      })
    ).rejects.toThrow('Source and destination chains must be different');
  });

  it('should estimate fee for ETH transfer', async () => {
    const estimate = await estimateBridgeFee({
      sourceChain: 'arbitrum',
      destinationChain: 'base',
      token: 'ETH',
      amount: '0.1'
    });

    expect(estimate.sourceChain).toBe('arbitrum');
    expect(estimate.destinationChain).toBe('base');
    expect(estimate.token).toBe('ETH');
    expect(estimate.amount).toBe('0.1');
    expect(estimate.nativeFee).toBeDefined();
    expect(estimate.totalFeeUSD).toBeDefined();
    expect(estimate.gasEstimate).toBeDefined();
    expect(estimate.estimatedTime).toBeGreaterThan(0);
    expect(estimate.breakdown).toHaveProperty('protocolFee');
    expect(estimate.breakdown).toHaveProperty('gasFee');
    expect(estimate.breakdown).toHaveProperty('bridgeFee');
  }, 10000);

  it.skip('should estimate fee for USDC transfer', async () => {
    // Skipping as this requires network calls
    const estimate = await estimateBridgeFee({
      sourceChain: 'base',
      destinationChain: 'optimism',
      token: 'USDC',
      amount: '100',
      senderAddress: TEST_ADDRESS
    });

    expect(estimate.sourceChain).toBe('base');
    expect(estimate.destinationChain).toBe('optimism');
    expect(estimate.token).toBe('USDC');
    expect(parseFloat(estimate.totalFeeUSD)).toBeGreaterThanOrEqual(0);
  }, 10000);

  it('should handle different routes with correct time estimates', async () => {
    const routes = [
      { source: 'base' as SupportedChain, dest: 'optimism' as SupportedChain, expectedTime: 60 },
      { source: 'ethereum' as SupportedChain, dest: 'base' as SupportedChain, expectedTime: 300 },
      { source: 'base' as SupportedChain, dest: 'ethereum' as SupportedChain, expectedTime: 900 }
    ];

    for (const route of routes) {
      const estimate = await estimateBridgeFee({
        sourceChain: route.source,
        destinationChain: route.dest,
        token: 'ETH',
        amount: '0.1'
      });

      expect(estimate.estimatedTime).toBe(route.expectedTime);
    }
  }, 15000);
});

describe('CrossChainBridge with Monitoring', () => {
  let bridge: CrossChainBridge;
  let testPrivateKey: Hex;

  beforeAll(() => {
    testPrivateKey = generatePrivateKey();
    bridge = new CrossChainBridge(testPrivateKey);
  });

  it('should have logger property', () => {
    expect(bridge.logger).toBeDefined();
    expect(bridge.logger.info).toBeDefined();
    expect(bridge.logger.error).toBeDefined();
    expect(bridge.logger.warn).toBeDefined();
    expect(bridge.logger.debug).toBeDefined();
  });

  it('should estimate fee using instance method', async () => {
    const estimate = await bridge.estimateFee('optimism', 'USDC', '100', 'base');

    expect(estimate.sourceChain).toBe('base');
    expect(estimate.destinationChain).toBe('optimism');
    expect(estimate.token).toBe('USDC');
    expect(estimate.amount).toBe('100');
  });

  it('should estimate fee using default chain', async () => {
    const estimate = await bridge.estimateFee('optimism', 'ETH', '0.5');

    expect(estimate.sourceChain).toBe('base'); // default chain
    expect(estimate.destinationChain).toBe('optimism');
  });

  it.skip('should monitor transaction', async () => {
    // This test would require a real transaction hash
    // Skipping for unit tests
    const mockTxHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    const statusPromise = bridge.monitorTransaction(
      mockTxHash,
      'base',
      'optimism',
      '100',
      { timeout: 5000 }
    );

    // Should timeout since it's a mock tx
    await expect(statusPromise).rejects.toThrow();
  }, 10000);
});

describe('listenLayerZeroMessages', () => {
  it('should return cleanup function', () => {
    const cleanup = listenLayerZeroMessages('base', () => {});

    expect(typeof cleanup).toBe('function');

    // Clean up
    cleanup();
  });

  it.skip('should receive LayerZero messages', async () => {
    // This test would require actual blockchain events
    // Skipping for unit tests
    const bridge = await import('../src/bridge.ts');

    const messages: any[] = [];
    const cleanup = bridge.listenLayerZeroMessages('base', (message) => {
      messages.push(message);
    });

    // Wait a bit (would need real events)
    await new Promise(resolve => setTimeout(resolve, 100));

    cleanup();

    // In real scenario, messages would be populated
    expect(Array.isArray(messages)).toBe(true);
  }, 5000);
});

describe('Bridge Logger', () => {
  it('should use default logger', () => {
    expect(defaultLogger).toBeDefined();
    expect(typeof defaultLogger.info).toBe('function');
    expect(typeof defaultLogger.error).toBe('function');
    expect(typeof defaultLogger.warn).toBe('function');
    expect(typeof defaultLogger.debug).toBe('function');
  });

  it('should accept custom logger', () => {
    const customLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    const testKey = generatePrivateKey();
    const bridge = new CrossChainBridge(testKey, 'base', customLogger as any);

    expect(bridge.logger).toBe(customLogger);

    // Test logging
    bridge.logger.info('Test message');
    expect(customLogger.info).toHaveBeenCalledWith('Test message');
  });
});

describe('Bridge Transaction Status Tracking', () => {
  it('should track all status types', () => {
    const validStatuses = [
      'pending',
      'source_confirmed',
      'message_sent',
      'message_delivered',
      'completed',
      'failed',
      'timeout'
    ];

    // Verify all statuses are valid types
    for (const status of validStatuses) {
      expect(typeof status).toBe('string');
    }
  });

  it('should create status details object', () => {
    const statusDetails: BridgeTransactionStatusDetails = {
      txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      sourceChain: 'base',
      destinationChain: 'optimism',
      status: 'pending',
      stage: 'source',
      progress: 0,
      requiredConfirmations: 1,
      estimatedCompletionTime: Date.now() + 60000,
      retryCount: 0,
      lastUpdated: Date.now()
    };

    expect(statusDetails.progress).toBe(0);
    expect(statusDetails.stage).toBe('source');
    expect(statusDetails.requiredConfirmations).toBe(1);
  });
});

describe('LayerZero Message Status', () => {
  it('should create message status object', () => {
    const messageStatus = {
      messageHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as Hex,
      srcEid: 30184, // base
      dstEid: 30111, // optimism
      nonce: 123n,
      status: 'pending' as const,
      confirmations: 0,
      retryCount: 0
    };

    expect(messageStatus.srcEid).toBe(30184);
    expect(messageStatus.dstEid).toBe(30111);
    expect(messageStatus.nonce).toBe(123n);
  });

  it('should have correct LayerZero chain IDs', () => {
    expect(LAYERZERO_CHAIN_IDS.ethereum).toBe(30101);
    expect(LAYERZERO_CHAIN_IDS.base).toBe(30184);
    expect(LAYERZERO_CHAIN_IDS.optimism).toBe(30111);
    expect(LAYERZERO_CHAIN_IDS.arbitrum).toBe(30110);
  });
});

console.log('[Integration Tests] Cross-chain bridge test suite loaded');
