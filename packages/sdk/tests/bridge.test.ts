/**
 * Cross-Chain Bridge Integration Tests
 * Tests the bridge functionality for Base, Optimism, and Arbitrum
 */

import { describe, it, expect, beforeAll } from 'vitest';
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
  type SupportedChain
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

// Test wallet address (a known address with some activity)
const TEST_ADDRESS: Address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'; // Random test address

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
        expect(client.chain?.name.toLowerCase()).toContain(chain === 'ethereum' ? 'ethereum' : chain);
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

console.log('[Integration Tests] Cross-chain bridge test suite loaded');
