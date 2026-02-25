/**
 * Cross-Chain Bridge Integration Tests
 * Tests the bridge functionality for Base, Optimism, and Arbitrum
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
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
  type SupportedChain,
  type BridgeTransaction
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
    it('should query USDC balance on Base', async () => {
      const balance = await getUSDCBalance(TEST_ADDRESS, 'base');
      expect(typeof balance).toBe('string');
      expect(parseFloat(balance)).toBeGreaterThanOrEqual(0);
    }, 10000);

    it('should query native balance on Optimism', async () => {
      const balance = await getNativeBalance(TEST_ADDRESS, 'optimism');
      expect(typeof balance).toBe('string');
      expect(parseFloat(balance)).toBeGreaterThanOrEqual(0);
    }, 10000);

    it('should query all balances', async () => {
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
    it('should generate bridge quote for USDC transfer', async () => {
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

    it('should generate bridge quote for ETH transfer', async () => {
      const account = privateKeyToAccount(testPrivateKey);
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
    it('should simulate bridge execution', async () => {
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
  it('should integrate bridge with multi-chain wallet', async () => {
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

  it('should find cheapest chain and get bridge quote', async () => {
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

console.log('[Integration Tests] Cross-chain bridge test suite loaded');
