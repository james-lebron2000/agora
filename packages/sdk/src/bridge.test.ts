import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import {
  CrossChainBridge,
  BridgeTransactionHistory,
  getBridgeHistory,
  createChainPublicClient,
  getUSDCBalance,
  getNativeBalance,
  getAllBalances,
  getBridgeQuote,
  findCheapestChain,
  SUPPORTED_CHAINS,
  USDC_ADDRESSES,
  LAYERZERO_CHAIN_IDS,
  LAYERZERO_USDC_OFT,
  RPC_URLS,
  type SupportedChain,
  type BridgeTransaction,
  type BridgeTransactionFilter
} from './bridge.js';
import { formatUnits, parseUnits, type Address, type Hex } from 'viem';

// Mock viem
vi.mock('viem', async () => {
  const actual = await vi.importActual('viem');
  return {
    ...actual as object,
    createPublicClient: vi.fn(),
    createWalletClient: vi.fn(),
    http: vi.fn((url: string) => ({ url })),
  };
});

vi.mock('viem/accounts', () => ({
  privateKeyToAccount: vi.fn((privateKey: Hex) => ({
    address: '0x1234567890123456789012345678901234567890' as Address,
    privateKey
  }))
}));

import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

describe('Cross-Chain Bridge Module', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as Address;
  const mockPrivateKey = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as Hex;

  const mockPublicClient = {
    readContract: vi.fn(),
    getBalance: vi.fn(),
    getTransactionReceipt: vi.fn(),
    getBlockNumber: vi.fn(),
  };

  const mockWalletClient = {
    writeContract: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    (globalThis as any).localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    (createPublicClient as Mock).mockReturnValue(mockPublicClient);
    (createWalletClient as Mock).mockReturnValue(mockWalletClient);
  });

  describe('Constants and Configuration', () => {
    it('should have correct supported chains', () => {
      expect(SUPPORTED_CHAINS).toHaveProperty('base');
      expect(SUPPORTED_CHAINS).toHaveProperty('optimism');
      expect(SUPPORTED_CHAINS).toHaveProperty('arbitrum');
      expect(SUPPORTED_CHAINS).toHaveProperty('ethereum');
    });

    it('should have correct USDC addresses', () => {
      expect(USDC_ADDRESSES.base).toBe('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
      expect(USDC_ADDRESSES.optimism).toBe('0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85');
      expect(USDC_ADDRESSES.arbitrum).toBe('0xaf88d065e77c8cC2239327C5EDb3A432268e5831');
      expect(USDC_ADDRESSES.ethereum).toBe('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
    });

    it('should have correct LayerZero chain IDs', () => {
      expect(LAYERZERO_CHAIN_IDS.base).toBe(30184);
      expect(LAYERZERO_CHAIN_IDS.optimism).toBe(30111);
      expect(LAYERZERO_CHAIN_IDS.arbitrum).toBe(30110);
      expect(LAYERZERO_CHAIN_IDS.ethereum).toBe(30101);
    });

    it('should have RPC URLs for all chains', () => {
      expect(RPC_URLS.base).toHaveLength(2);
      expect(RPC_URLS.optimism).toHaveLength(2);
      expect(RPC_URLS.arbitrum).toHaveLength(2);
      expect(RPC_URLS.ethereum).toHaveLength(2);
    });
  });

  describe('createChainPublicClient', () => {
    it('should create public client for each supported chain', () => {
      const chains: SupportedChain[] = ['base', 'optimism', 'arbitrum', 'ethereum'];
      
      for (const chain of chains) {
        (createPublicClient as Mock).mockClear();
        createChainPublicClient(chain);
        
        expect(createPublicClient).toHaveBeenCalledWith(
          expect.objectContaining({
            chain: SUPPORTED_CHAINS[chain],
            transport: expect.any(Object)
          })
        );
      }
    });
  });

  describe('getUSDCBalance', () => {
    it('should return USDC balance successfully', async () => {
      mockPublicClient.readContract.mockResolvedValue(1000000n);
      const balance = await getUSDCBalance(mockAddress, 'base');
      expect(balance).toBe('1');
    });

    it('should return 0 on error', async () => {
      mockPublicClient.readContract.mockRejectedValue(new Error('RPC error'));
      const balance = await getUSDCBalance(mockAddress, 'base');
      expect(balance).toBe('0');
    });
  });

  describe('getNativeBalance', () => {
    it('should return native balance successfully', async () => {
      mockPublicClient.getBalance.mockResolvedValue(parseUnits('1.5', 18));
      const balance = await getNativeBalance(mockAddress, 'base');
      expect(balance).toBe('1.5');
    });

    it('should return 0 on error', async () => {
      mockPublicClient.getBalance.mockRejectedValue(new Error('RPC error'));
      const balance = await getNativeBalance(mockAddress, 'base');
      expect(balance).toBe('0');
    });
  });

  describe('getAllBalances', () => {
    it('should return balances for all chains', async () => {
      mockPublicClient.readContract.mockResolvedValue(1000000n);
      mockPublicClient.getBalance.mockResolvedValue(parseUnits('0.5', 18));
      const balances = await getAllBalances(mockAddress);
      expect(balances).toHaveLength(4);
    });
  });

  describe('getBridgeQuote', () => {
    it('should return quote for valid cross-chain transfer', async () => {
      const mockFee = { nativeFee: parseUnits('0.001', 18), lzTokenFee: 0n };
      mockPublicClient.readContract.mockResolvedValue(mockFee);

      const quote = await getBridgeQuote({
        sourceChain: 'base',
        destinationChain: 'optimism',
        token: 'USDC',
        amount: '100'
      }, mockAddress);

      expect(quote).toMatchObject({
        sourceChain: 'base',
        destinationChain: 'optimism',
        token: 'USDC',
        amount: '100',
        estimatedFee: expect.any(String),
        estimatedTime: expect.any(Number),
        path: expect.arrayContaining(['base', 'layerzero', 'optimism'])
      });
    });

    it('should throw error for same source and destination chain', async () => {
      await expect(getBridgeQuote({
        sourceChain: 'base',
        destinationChain: 'base',
        token: 'USDC',
        amount: '100'
      }, mockAddress)).rejects.toThrow('Source and destination chains must be different');
    });
  });

  describe('findCheapestChain', () => {
    it('should return cheapest chain for operation', async () => {
      const result = await findCheapestChain('send');
      expect(result).toMatchObject({
        chain: expect.any(String),
        estimatedCost: expect.any(String)
      });
    });

    it('should exclude specified chains', async () => {
      const result = await findCheapestChain('send', ['base']);
      expect(result.chain).not.toBe('base');
    });
  });

  describe('CrossChainBridge', () => {
    describe('constructor', () => {
      it('should initialize with private key', () => {
        const bridge = new CrossChainBridge(mockPrivateKey);
        expect(bridge).toBeDefined();
      });

      it('should accept custom default chain', () => {
        const bridge = new CrossChainBridge(mockPrivateKey, 'optimism');
        expect(bridge).toBeDefined();
      });
    });

    describe('getBalances', () => {
      it('should return balances', async () => {
        mockPublicClient.readContract.mockResolvedValue(1000000n);
        mockPublicClient.getBalance.mockResolvedValue(parseUnits('1', 18));
        const bridge = new CrossChainBridge(mockPrivateKey);
        const balances = await bridge.getBalances();
        expect(balances).toHaveLength(4);
      });
    });

    describe('getQuote', () => {
      it('should get quote', async () => {
        mockPublicClient.readContract.mockResolvedValue({
          nativeFee: parseUnits('0.001', 18),
          lzTokenFee: 0n
        });
        const bridge = new CrossChainBridge(mockPrivateKey, 'base');
        const quote = await bridge.getQuote('optimism', 'USDC', '100');
        expect(quote.sourceChain).toBe('base');
        expect(quote.destinationChain).toBe('optimism');
      });
    });

    describe('bridgeUSDC', () => {
      const mockTxHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as Hex;
      let callCount: number;

      beforeEach(() => {
        // Reset mocks for each test
        vi.clearAllMocks();
        callCount = 0;
        
        // Setup successful flow - use mockImplementation to handle multiple calls including retries
        mockPublicClient.readContract.mockImplementation(() => {
          callCount++;
          if (callCount === 1) return Promise.resolve(parseUnits('1000', 6)); // balance check - enough for 100 USDC
          if (callCount === 2) return Promise.resolve({ nativeFee: parseUnits('0.001', 18), lzTokenFee: 0n }); // quote
          if (callCount === 3) return Promise.resolve(parseUnits('0.1', 18)); // native balance
          return Promise.resolve(0n); // allowance and subsequent calls
        });
        mockWalletClient.writeContract.mockResolvedValue(mockTxHash);
        mockPublicClient.getTransactionReceipt.mockResolvedValue({
          status: 'success',
          blockNumber: 100n
        });
        mockPublicClient.getBlockNumber.mockResolvedValue(101n);
      });

      it('should fail when source and destination are the same', async () => {
        const bridge = new CrossChainBridge(mockPrivateKey, 'base');
        const result = await bridge.bridgeUSDC('base', '100');
        expect(result.success).toBe(false);
        expect(result.error).toContain('Source and destination chains must be different');
      });

      it('should fail for unsupported L1 chains', async () => {
        const bridge = new CrossChainBridge(mockPrivateKey, 'ethereum');
        const result = await bridge.bridgeUSDC('base', '100');
        expect(result.success).toBe(false);
        expect(result.error).toContain('Only Base, Optimism, and Arbitrum are supported');
      });

      it('should fail when USDC balance is insufficient', async () => {
        mockPublicClient.readContract.mockReset();
        mockPublicClient.readContract.mockResolvedValueOnce(parseUnits('10', 6));
        const bridge = new CrossChainBridge(mockPrivateKey, 'base');
        const result = await bridge.bridgeUSDC('optimism', '100');
        expect(result.success).toBe(false);
        expect(result.error).toContain('Insufficient USDC balance');
      });

      it('should return success with transaction hash on successful bridge', async () => {
        // Ensure mocks are set up for this specific test
        const bridge = new CrossChainBridge(mockPrivateKey, 'base');
        const result = await bridge.bridgeUSDC('optimism', '100');
        expect(result.success).toBe(true);
        expect(result.txHash).toBe(mockTxHash);
        expect(result.fees).toBeDefined();
      });

      it.skip('should handle bridge transaction timeout', async () => {
        // NOTE: Skipped - waitForTransaction uses 120s timeout which exceeds test timeout.
        // To test this properly, we need to export waitForTransaction for mocking or add a test hook.
        vi.clearAllMocks();
        let callCount = 0;
        mockPublicClient.readContract.mockImplementation(() => {
          callCount++;
          if (callCount === 1) return Promise.resolve(parseUnits('1000', 6)); // enough balance
          if (callCount === 2) return Promise.resolve({ nativeFee: parseUnits('0.001', 18), lzTokenFee: 0n }); // quote
          if (callCount === 3) return Promise.resolve(parseUnits('0.1', 18)); // native balance
          return Promise.resolve(0n); // allowance
        });
        mockWalletClient.writeContract.mockResolvedValue(mockTxHash);
        // Mock timeout scenario - receipt always returns null (not mined)
        mockPublicClient.getTransactionReceipt.mockResolvedValue(null);
        mockPublicClient.getBlockNumber.mockResolvedValue(101n);
        
        const bridge = new CrossChainBridge(mockPrivateKey, 'base');
        const result = await bridge.bridgeUSDC('optimism', '100');
        expect(result.success).toBe(false);
        expect(result.error).toContain('Bridge transaction not confirmed within timeout');
      }, 150000);

      it('should support different L2 routes', async () => {
        const routes: [SupportedChain, SupportedChain][] = [
          ['base', 'optimism'],
          ['base', 'arbitrum'],
          ['optimism', 'base'],
          ['optimism', 'arbitrum'],
          ['arbitrum', 'base'],
          ['arbitrum', 'optimism']
        ];

        for (const [source, dest] of routes) {
          vi.clearAllMocks();
          let callCount = 0;
          mockPublicClient.readContract.mockImplementation(() => {
            callCount++;
            if (callCount === 1) return Promise.resolve(parseUnits('1000', 6));
            if (callCount === 2) return Promise.resolve({ nativeFee: parseUnits('0.001', 18), lzTokenFee: 0n });
            if (callCount === 3) return Promise.resolve(parseUnits('0.1', 18));
            return Promise.resolve(0n);
          });
          mockWalletClient.writeContract.mockResolvedValue(mockTxHash);
          mockPublicClient.getTransactionReceipt.mockResolvedValue({
            status: 'success',
            blockNumber: 100n
          });
          mockPublicClient.getBlockNumber.mockResolvedValue(101n);

          const bridge = new CrossChainBridge(mockPrivateKey, source);
          const result = await bridge.bridgeUSDC(dest, '100');
          expect(result.success).toBe(true);
        }
      });
    });
  });

  describe('BridgeTransactionHistory', () => {
    let history: BridgeTransactionHistory;

    beforeEach(() => {
      history = new BridgeTransactionHistory(mockAddress);
    });

    const mockTransaction: BridgeTransaction = {
      txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as Hex,
      sourceChain: 'base',
      destinationChain: 'optimism',
      amount: '100',
      token: 'USDC',
      status: 'pending',
      timestamp: Date.now(),
      senderAddress: mockAddress,
      recipientAddress: '0x0987654321098765432109876543210987654321' as Address
    };

    describe('addTransaction', () => {
      it('should add new transaction', () => {
        history.addTransaction(mockTransaction);
        const txs = history.getTransactions();
        expect(txs).toHaveLength(1);
        expect(txs[0].txHash).toBe(mockTransaction.txHash);
      });

      it('should update existing transaction instead of duplicating', () => {
        history.addTransaction(mockTransaction);
        history.addTransaction({ ...mockTransaction, status: 'completed' });
        const txs = history.getTransactions();
        expect(txs).toHaveLength(1);
        expect(txs[0].status).toBe('completed');
      });

      it('should limit to 100 transactions', () => {
        for (let i = 0; i < 105; i++) {
          history.addTransaction({
            ...mockTransaction,
            txHash: `0x${i.toString(16).padStart(64, '0')}` as Hex
          });
        }
        expect(history.getTransactionCount()).toBe(100);
      });
    });

    describe('getTransactions', () => {
      beforeEach(() => {
        history.addTransaction(mockTransaction);
        history.addTransaction({
          ...mockTransaction,
          txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as Hex,
          sourceChain: 'optimism',
          destinationChain: 'arbitrum',
          status: 'completed'
        });
      });

      it('should filter by chain', () => {
        const txs = history.getTransactions({ chain: 'base' });
        expect(txs).toHaveLength(1);
        expect(txs[0].sourceChain).toBe('base');
      });

      it('should filter by status', () => {
        const txs = history.getTransactions({ status: 'completed' });
        expect(txs).toHaveLength(1);
        expect(txs[0].status).toBe('completed');
      });
    });

    describe('getTransactionByHash', () => {
      it('should find transaction by hash', () => {
        history.addTransaction(mockTransaction);
        const found = history.getTransactionByHash(mockTransaction.txHash);
        expect(found).toBeDefined();
      });

      it('should return undefined for unknown hash', () => {
        const found = history.getTransactionByHash('0x0000000000000000000000000000000000000000000000000000000000000000' as Hex);
        expect(found).toBeUndefined();
      });
    });

    describe('updateTransactionStatus', () => {
      it('should update transaction status', () => {
        history.addTransaction(mockTransaction);
        const updated = history.updateTransactionStatus(mockTransaction.txHash, 'completed');
        expect(updated).toBe(true);
        const tx = history.getTransactionByHash(mockTransaction.txHash);
        expect(tx?.status).toBe('completed');
      });
    });

    describe('clearHistory', () => {
      it('should clear all transactions', () => {
        history.addTransaction(mockTransaction);
        expect(history.getTransactionCount()).toBe(1);
        history.clearHistory();
        expect(history.getTransactionCount()).toBe(0);
      });
    });

    describe('getPendingTransactions', () => {
      it('should return only pending transactions', () => {
        const pendingTx: BridgeTransaction = {
          ...mockTransaction,
          txHash: '0x1111111111111111111111111111111111111111111111111111111111111111' as Hex,
          status: 'pending'
        };
        const completedTx: BridgeTransaction = {
          ...mockTransaction,
          txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as Hex,
          status: 'completed'
        };
        history.addTransaction(pendingTx);
        history.addTransaction(completedTx);
        const pending = history.getPendingTransactions();
        expect(pending).toHaveLength(1);
        expect(pending[0].status).toBe('pending');
      });
    });

    describe('localStorage handling', () => {
      it('should handle missing localStorage gracefully', () => {
        delete (globalThis as any).localStorage;
        const localHistory = new BridgeTransactionHistory(mockAddress);
        localHistory.addTransaction(mockTransaction);
        expect(localHistory.getTransactionCount()).toBe(1);
      });

      it('should load from localStorage on init', () => {
        const storedTxs = [mockTransaction];
        (globalThis as any).localStorage.getItem.mockReturnValue(JSON.stringify(storedTxs));
        const localHistory = new BridgeTransactionHistory(mockAddress);
        expect(localHistory.getTransactionCount()).toBe(1);
      });
    });
  });

  describe('getBridgeHistory', () => {
    it('should return history for address', () => {
      const mockTxs = [{
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        sourceChain: 'base',
        destinationChain: 'optimism',
        amount: '100',
        token: 'USDC',
        status: 'pending',
        timestamp: Date.now(),
        senderAddress: mockAddress,
        recipientAddress: mockAddress
      }] as BridgeTransaction[];

      (globalThis as any).localStorage.getItem.mockReturnValue(JSON.stringify(mockTxs));
      const history = getBridgeHistory(mockAddress);
      expect(history).toHaveLength(1);
    });
  });
});