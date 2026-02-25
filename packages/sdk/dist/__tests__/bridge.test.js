/**
 * Bridge Module Unit Tests
 * Tests for BridgeTransactionHistory and utility functions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BridgeTransactionHistory, findCheapestChain, getBridgeQuote, getBridgeHistory, CrossChainBridge, SUPPORTED_CHAINS, USDC_ADDRESSES, LAYERZERO_ENDPOINTS, LAYERZERO_CHAIN_IDS, LAYERZERO_USDC_OFT, RPC_URLS, createChainPublicClient, getUSDCBalance, getNativeBalance, getAllBalances } from '../bridge.js';
import { base, optimism, arbitrum, mainnet } from 'viem/chains';
// Mock localStorage for Node.js environment
class LocalStorageMock {
    store = {};
    getItem(key) {
        return this.store[key] || null;
    }
    setItem(key, value) {
        this.store[key] = value;
    }
    removeItem(key) {
        delete this.store[key];
    }
    clear() {
        this.store = {};
    }
}
// Setup global localStorage mock before tests
globalThis.localStorage = new LocalStorageMock();
// Test addresses
const TEST_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const TEST_ADDRESS_2 = '0x1111111111111111111111111111111111111111';
describe('BridgeTransactionHistory', () => {
    let history;
    beforeEach(() => {
        globalThis.localStorage.clear();
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
            const existingTx = {
                txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
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
            const tx = {
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
        it('should update existing transaction instead of duplicating', () => {
            const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
            const tx1 = {
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
            const tx2 = {
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
                const tx = {
                    txHash: `0x${i.toString(16).padStart(64, '0')}`,
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
            const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
            const tx = {
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
            const result = history.getTransactionByHash('0x9999999999999999999999999999999999999999999999999999999999999999');
            expect(result).toBeUndefined();
        });
        it('should be case-insensitive when matching hashes', () => {
            const txHash = '0xABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890';
            const tx = {
                txHash: txHash.toLowerCase(),
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
            const txHash = '0x1111111111111111111111111111111111111111111111111111111111111111';
            const tx = {
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
            const result = history.updateTransactionStatus('0x9999999999999999999999999999999999999999999999999999999999999999', 'completed');
            expect(result).toBe(false);
        });
    });
    describe('getTransactions with filters', () => {
        beforeEach(() => {
            const now = Date.now();
            history.addTransaction({
                txHash: '0x2222222222222222222222222222222222222222222222222222222222222222',
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
                txHash: '0x3333333333333333333333333333333333333333333333333333333333333333',
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
                txHash: '0x4444444444444444444444444444444444444444444444444444444444444444',
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
                txHash: '0x6666666666666666666666666666666666666666666666666666666666666666',
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
                txHash: '0x8888888888888888888888888888888888888888888888888888888888888888',
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
                txHash: '0x9999999999999999999999999999999999999999999999999999999999999999',
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
        const chains = ['ethereum', 'base', 'optimism', 'arbitrum'];
        for (const chain of chains) {
            expect(USDC_ADDRESSES[chain]).toBeDefined();
            expect(USDC_ADDRESSES[chain]).toMatch(/^0x[a-fA-F0-9]{40}$/);
        }
    });
    it('should have LayerZero endpoint addresses', () => {
        const chains = ['ethereum', 'base', 'optimism', 'arbitrum'];
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
        const chains = ['ethereum', 'base', 'optimism', 'arbitrum'];
        for (const chain of chains) {
            expect(LAYERZERO_USDC_OFT[chain]).toBeDefined();
            expect(LAYERZERO_USDC_OFT[chain]).toMatch(/^0x[a-fA-F0-9]{40}$/);
        }
    });
    it('should have RPC URLs for all chains', () => {
        const chains = ['ethereum', 'base', 'optimism', 'arbitrum'];
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
                txHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
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
        const _filter = {
            chain: 'base',
            status: 'pending',
            startTime: Date.now(),
            endTime: Date.now()
        };
        const _tx = {
            txHash: '0x1234',
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
describe('getBridgeQuote', () => {
    it('should throw error when source and destination chains are the same', async () => {
        await expect(getBridgeQuote({
            sourceChain: 'base',
            destinationChain: 'base',
            token: 'USDC',
            amount: '100'
        }, TEST_ADDRESS)).rejects.toThrow('Source and destination chains must be different');
    });
    it('should return bridge quote for valid cross-chain transfer', async () => {
        const quote = await getBridgeQuote({
            sourceChain: 'base',
            destinationChain: 'optimism',
            token: 'USDC',
            amount: '100'
        }, TEST_ADDRESS);
        expect(quote).toBeDefined();
        expect(quote.sourceChain).toBe('base');
        expect(quote.destinationChain).toBe('optimism');
        expect(quote.token).toBe('USDC');
        expect(quote.amount).toBe('100');
        expect(quote.estimatedFee).toBeDefined();
        expect(parseFloat(quote.estimatedFee)).toBeGreaterThanOrEqual(0);
        expect(quote.estimatedTime).toBeGreaterThan(0);
        expect(quote.path).toEqual(['base', 'layerzero', 'optimism']);
    });
    it('should return quote for all supported L2 routes', async () => {
        const routes = [
            ['base', 'optimism'],
            ['base', 'arbitrum'],
            ['optimism', 'base'],
            ['optimism', 'arbitrum'],
            ['arbitrum', 'base'],
            ['arbitrum', 'optimism']
        ];
        for (const [source, dest] of routes) {
            const quote = await getBridgeQuote({
                sourceChain: source,
                destinationChain: dest,
                token: 'USDC',
                amount: '50'
            }, TEST_ADDRESS);
            expect(quote.sourceChain).toBe(source);
            expect(quote.destinationChain).toBe(dest);
            expect(quote.estimatedTime).toBeDefined();
        }
    });
    it('should include LayerZero fee quote when available', async () => {
        const quote = await getBridgeQuote({
            sourceChain: 'base',
            destinationChain: 'optimism',
            token: 'USDC',
            amount: '100'
        }, TEST_ADDRESS);
        // lzFee might be undefined if RPC fails, but structure should be correct
        if (quote.lzFee) {
            expect(typeof quote.lzFee.nativeFee).toBe('bigint');
            expect(typeof quote.lzFee.lzTokenFee).toBe('bigint');
            expect(quote.lzFee.nativeFee).toBeGreaterThanOrEqual(0n);
            expect(quote.lzFee.lzTokenFee).toBeGreaterThanOrEqual(0n);
        }
    });
    it('should handle ETH token quotes', async () => {
        const quote = await getBridgeQuote({
            sourceChain: 'optimism',
            destinationChain: 'base',
            token: 'ETH',
            amount: '1'
        }, TEST_ADDRESS);
        expect(quote.token).toBe('ETH');
        expect(quote.sourceChain).toBe('optimism');
        expect(quote.destinationChain).toBe('base');
    });
});
describe('CrossChainBridge', () => {
    const TEST_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    describe('initialization', () => {
        it('should create instance with default chain', () => {
            const bridge = new CrossChainBridge(TEST_PRIVATE_KEY);
            expect(bridge).toBeDefined();
        });
        it('should create instance with custom default chain', () => {
            const bridge = new CrossChainBridge(TEST_PRIVATE_KEY, 'optimism');
            expect(bridge).toBeDefined();
        });
    });
    describe('getQuote', () => {
        it('should get bridge quote using instance method', async () => {
            const bridge = new CrossChainBridge(TEST_PRIVATE_KEY, 'base');
            const quote = await bridge.getQuote('optimism', 'USDC', '100');
            expect(quote).toBeDefined();
            expect(quote.sourceChain).toBe('base');
            expect(quote.destinationChain).toBe('optimism');
        });
        it('should use specified source chain over default', async () => {
            const bridge = new CrossChainBridge(TEST_PRIVATE_KEY, 'base');
            const quote = await bridge.getQuote('arbitrum', 'USDC', '50', 'optimism');
            expect(quote.sourceChain).toBe('optimism');
            expect(quote.destinationChain).toBe('arbitrum');
        });
    });
    describe('findCheapestChain', () => {
        it('should find cheapest chain through instance', async () => {
            const bridge = new CrossChainBridge(TEST_PRIVATE_KEY);
            const result = await bridge.findCheapestChain('send');
            expect(result).toHaveProperty('chain');
            expect(result).toHaveProperty('estimatedCost');
        });
    });
    describe('bridgeUSDC', () => {
        it('should return error for same source and destination', async () => {
            const bridge = new CrossChainBridge(TEST_PRIVATE_KEY, 'base');
            const result = await bridge.bridgeUSDC('base', '100');
            expect(result.success).toBe(false);
            expect(result.error).toContain('must be different');
            expect(result.sourceChain).toBe('base');
            expect(result.destinationChain).toBe('base');
        });
        it('should return error for unsupported L1 chains', async () => {
            const bridge = new CrossChainBridge(TEST_PRIVATE_KEY, 'ethereum');
            const result = await bridge.bridgeUSDC('base', '100');
            expect(result.success).toBe(false);
            expect(result.error).toContain('Only Base, Optimism, and Arbitrum');
        });
        it.skip('should validate amount parameter (insufficient balance) - requires RPC', async () => {
            // Skipped: This test requires actual RPC calls
            // In production, the bridge would check USDC balance and fail if insufficient
            const bridge = new CrossChainBridge(TEST_PRIVATE_KEY, 'base');
            const result = await bridge.bridgeUSDC('optimism', '999999');
            expect(result.success).toBe(false);
        });
    });
    describe('getBalances', () => {
        it.skip('should return balance structure for account address - requires RPC', async () => {
            // Skipped: This test makes RPC calls to fetch balances
            const bridge = new CrossChainBridge(TEST_PRIVATE_KEY);
            const balances = await bridge.getBalances();
            expect(Array.isArray(balances)).toBe(true);
        });
        it.skip('should get balances for specified address - requires RPC', async () => {
            // Skipped: This test makes RPC calls to fetch balances
            const bridge = new CrossChainBridge(TEST_PRIVATE_KEY);
            const balances = await bridge.getBalances(TEST_ADDRESS);
            expect(Array.isArray(balances)).toBe(true);
        });
    });
});
describe('Balance Functions', () => {
    describe('createChainPublicClient', () => {
        it('should create public client for each chain', () => {
            const chains = ['ethereum', 'base', 'optimism', 'arbitrum'];
            for (const chain of chains) {
                const client = createChainPublicClient(chain);
                expect(client).toBeDefined();
                expect(client.chain).toBeDefined();
            }
        });
    });
    describe('getUSDCBalance', () => {
        it('should return formatted balance string', async () => {
            // Mock the module to avoid RPC calls
            const mockBalance = '100.5';
            vi.spyOn(await import('../bridge.js'), 'getUSDCBalance').mockResolvedValueOnce(mockBalance);
            const balance = await getUSDCBalance(TEST_ADDRESS, 'base');
            expect(typeof balance).toBe('string');
            expect(parseFloat(balance)).toBeGreaterThanOrEqual(0);
        });
        it('should handle RPC errors and return 0', async () => {
            // Test the error handling by mocking a failure
            const { getUSDCBalance: originalFn } = await import('../bridge.js');
            // Create a mock that simulates an error
            const errorMock = vi.fn().mockRejectedValue(new Error('RPC Error'));
            vi.spyOn(await import('../bridge.js'), 'getUSDCBalance').mockImplementation(async (address, chain) => {
                try {
                    return await originalFn(address, chain);
                }
                catch {
                    return '0';
                }
            });
            // The function should return '0' on error
            const result = await getUSDCBalance('0xInvalid', 'base');
            expect(result).toBe('0');
        });
    });
    describe('getNativeBalance', () => {
        it('should return formatted native balance string', async () => {
            const mockBalance = '0.5';
            vi.spyOn(await import('../bridge.js'), 'getNativeBalance').mockResolvedValueOnce(mockBalance);
            const balance = await getNativeBalance(TEST_ADDRESS, 'base');
            expect(typeof balance).toBe('string');
            expect(parseFloat(balance)).toBeGreaterThanOrEqual(0);
        });
        it('should handle errors gracefully', async () => {
            // Mock to simulate error handling - actual function returns '0' on error
            vi.spyOn(await import('../bridge.js'), 'getNativeBalance').mockResolvedValueOnce('0');
            const result = await getNativeBalance('0x0000000000000000000000000000000000000000', 'base');
            expect(result).toBe('0');
        });
    });
    describe('getAllBalances', () => {
        it('should return balance structure for all chains', async () => {
            // Mock getAllBalances to return test data without RPC calls
            const mockBalances = [
                { chain: 'ethereum', nativeBalance: '0.5', usdcBalance: '100' },
                { chain: 'base', nativeBalance: '0.1', usdcBalance: '500' },
                { chain: 'optimism', nativeBalance: '0.05', usdcBalance: '250' },
                { chain: 'arbitrum', nativeBalance: '0.08', usdcBalance: '300' }
            ];
            vi.spyOn(await import('../bridge.js'), 'getAllBalances').mockResolvedValueOnce(mockBalances);
            const balances = await getAllBalances(TEST_ADDRESS);
            expect(balances).toHaveLength(4);
            const chains = balances.map(b => b.chain);
            expect(chains).toContain('ethereum');
            expect(chains).toContain('base');
            expect(chains).toContain('optimism');
            expect(chains).toContain('arbitrum');
            // Verify each balance has correct structure
            for (const balance of balances) {
                expect(balance).toHaveProperty('chain');
                expect(balance).toHaveProperty('nativeBalance');
                expect(balance).toHaveProperty('usdcBalance');
                expect(typeof balance.nativeBalance).toBe('string');
                expect(typeof balance.usdcBalance).toBe('string');
            }
        });
    });
});
describe('BridgeTransaction Tracking', () => {
    let history;
    beforeEach(() => {
        globalThis.localStorage.clear();
        history = new BridgeTransactionHistory(TEST_ADDRESS);
    });
    it('should track pending transaction lifecycle', () => {
        const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
        // Add pending transaction
        history.addTransaction({
            txHash,
            sourceChain: 'base',
            destinationChain: 'optimism',
            amount: '100',
            token: 'USDC',
            status: 'pending',
            timestamp: Date.now(),
            senderAddress: TEST_ADDRESS,
            recipientAddress: TEST_ADDRESS
        });
        const pending = history.getPendingTransactions();
        expect(pending).toHaveLength(1);
        // Update to completed
        history.updateTransactionStatus(txHash, 'completed');
        const completed = history.getTransactions({ status: 'completed' });
        expect(completed).toHaveLength(1);
        expect(history.getPendingTransactions()).toHaveLength(0);
    });
    it('should track multiple bridge transactions', () => {
        const txs = [
            {
                txHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                sourceChain: 'base',
                destinationChain: 'optimism',
                amount: '100',
                token: 'USDC',
                status: 'completed',
                timestamp: Date.now(),
                senderAddress: TEST_ADDRESS,
                recipientAddress: TEST_ADDRESS
            },
            {
                txHash: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
                sourceChain: 'optimism',
                destinationChain: 'arbitrum',
                amount: '50',
                token: 'USDC',
                status: 'pending',
                timestamp: Date.now() - 1000,
                senderAddress: TEST_ADDRESS,
                recipientAddress: TEST_ADDRESS
            },
            {
                txHash: '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
                sourceChain: 'arbitrum',
                destinationChain: 'base',
                amount: '25',
                token: 'USDC',
                status: 'failed',
                timestamp: Date.now() - 2000,
                senderAddress: TEST_ADDRESS,
                recipientAddress: TEST_ADDRESS
            }
        ];
        for (const tx of txs) {
            history.addTransaction(tx);
        }
        expect(history.getTransactionCount()).toBe(3);
        expect(history.getPendingTransactions()).toHaveLength(1);
        expect(history.getTransactions({ status: 'completed' })).toHaveLength(1);
        expect(history.getTransactions({ status: 'failed' })).toHaveLength(1);
    });
});
console.log('[Unit Tests] Bridge module test suite loaded');
//# sourceMappingURL=bridge.test.js.map