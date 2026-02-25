/**
 * Cross-Chain Bridge Module for Agora
 * Supports Base, Optimism, and Arbitrum chains
 * Uses LayerZero V2 for cross-chain messaging and USDC transfers via OFT (Omnichain Fungible Token)
 */
import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, optimism, arbitrum, mainnet } from 'viem/chains';
// Supported chains
export const SUPPORTED_CHAINS = { base, optimism, arbitrum, ethereum: mainnet };
// USDC addresses
export const USDC_ADDRESSES = {
    ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    optimism: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};
// LayerZero Endpoint addresses (V2)
export const LAYERZERO_ENDPOINTS = {
    ethereum: '0x1a44076050125825900e736c501f859c50fE728c',
    base: '0x1a44076050125825900e736c501f859c50fE728c',
    optimism: '0x1a44076050125825900e736c501f859c50fE728c',
    arbitrum: '0x1a44076050125825900e736c501f859c50fE728c'
};
// LayerZero EID (Endpoint ID) for V2
export const LAYERZERO_CHAIN_IDS = {
    ethereum: 30101,
    base: 30184,
    optimism: 30111,
    arbitrum: 30110
};
// LayerZero USDC OFT Adapter addresses (V2)
// These are the actual LayerZero USDC standard OFT contracts
export const LAYERZERO_USDC_OFT = {
    ethereum: '0xF1BA1643132dE7EB30cBFF738946DA77195c3D1C',
    base: '0x27d7F516FF969a711E80e7Ae46BC0205C0bf8A65',
    optimism: '0xF1BA1643132dE7EB30cBFF738946DA77195c3D1C',
    arbitrum: '0xF1BA1643132dE7EB30cBFF738946DA77195c3D1C'
};
// Bridge transaction history class with localStorage persistence
export class BridgeTransactionHistory {
    storageKey;
    transactions;
    constructor(address) {
        this.storageKey = `bridge-history-${address.toLowerCase()}`;
        this.transactions = this.loadFromStorage();
    }
    loadFromStorage() {
        try {
            // Check if we're in a browser environment
            const storage = typeof globalThis !== 'undefined' && 'localStorage' in globalThis
                ? globalThis.localStorage
                : null;
            if (!storage)
                return [];
            const stored = storage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        }
        catch {
            return [];
        }
    }
    saveToStorage() {
        try {
            // Check if we're in a browser environment
            const storage = typeof globalThis !== 'undefined' && 'localStorage' in globalThis
                ? globalThis.localStorage
                : null;
            if (!storage)
                return;
            storage.setItem(this.storageKey, JSON.stringify(this.transactions));
        }
        catch (error) {
            console.error('[BridgeHistory] Failed to save to storage:', error);
        }
    }
    addTransaction(tx) {
        // Check for duplicates
        const existingIndex = this.transactions.findIndex(t => t.txHash.toLowerCase() === tx.txHash.toLowerCase());
        if (existingIndex >= 0) {
            // Update existing transaction
            this.transactions[existingIndex] = { ...this.transactions[existingIndex], ...tx };
        }
        else {
            // Add new transaction at the beginning
            this.transactions.unshift(tx);
        }
        // Keep only last 100 transactions
        if (this.transactions.length > 100) {
            this.transactions = this.transactions.slice(0, 100);
        }
        this.saveToStorage();
    }
    getTransactions(filter) {
        let result = [...this.transactions];
        if (filter) {
            if (filter.chain) {
                result = result.filter(t => t.sourceChain === filter.chain || t.destinationChain === filter.chain);
            }
            if (filter.status) {
                result = result.filter(t => t.status === filter.status);
            }
            if (filter.startTime) {
                result = result.filter(t => t.timestamp >= filter.startTime);
            }
            if (filter.endTime) {
                result = result.filter(t => t.timestamp <= filter.endTime);
            }
        }
        return result;
    }
    getTransactionByHash(txHash) {
        return this.transactions.find(t => t.txHash.toLowerCase() === txHash.toLowerCase());
    }
    updateTransactionStatus(txHash, status) {
        const index = this.transactions.findIndex(t => t.txHash.toLowerCase() === txHash.toLowerCase());
        if (index >= 0) {
            this.transactions[index].status = status;
            this.saveToStorage();
            return true;
        }
        return false;
    }
    clearHistory() {
        this.transactions = [];
        this.saveToStorage();
    }
    getPendingTransactions() {
        return this.transactions.filter(t => t.status === 'pending');
    }
    getTransactionCount() {
        return this.transactions.length;
    }
}
// Get bridge history for an address
export function getBridgeHistory(address, chain) {
    const history = new BridgeTransactionHistory(address);
    return history.getTransactions(chain ? { chain } : undefined);
}
// RPC endpoints
export const RPC_URLS = {
    ethereum: ['https://eth.llamarpc.com', 'https://rpc.ankr.com/eth'],
    base: ['https://base.llamarpc.com', 'https://mainnet.base.org'],
    optimism: ['https://optimism.llamarpc.com', 'https://mainnet.optimism.io'],
    arbitrum: ['https://arbitrum.llamarpc.com', 'https://arb1.arbitrum.io/rpc']
};
// LayerZero OFT V2 ABI
const OFT_ABI = [
    {
        name: 'send',
        type: 'function',
        inputs: [
            {
                name: 'sendParam',
                type: 'tuple',
                components: [
                    { name: 'dstEid', type: 'uint32' },
                    { name: 'to', type: 'bytes32' },
                    { name: 'amountLD', type: 'uint256' },
                    { name: 'minAmountLD', type: 'uint256' },
                    { name: 'extraOptions', type: 'bytes' },
                    { name: 'composeMsg', type: 'bytes' },
                    { name: 'oftCmd', type: 'bytes' }
                ]
            },
            {
                name: 'fee',
                type: 'tuple',
                components: [
                    { name: 'nativeFee', type: 'uint256' },
                    { name: 'lzTokenFee', type: 'uint256' }
                ]
            },
            { name: 'refundAddress', type: 'address' }
        ],
        outputs: [
            {
                name: 'msgReceipt',
                type: 'tuple',
                components: [
                    { name: 'guid', type: 'bytes32' },
                    { name: 'nonce', type: 'uint64' },
                    { name: 'fee', type: 'tuple', components: [{ name: 'nativeFee', type: 'uint256' }, { name: 'lzTokenFee', type: 'uint256' }] }
                ]
            },
            {
                name: 'oftReceipt',
                type: 'tuple',
                components: [
                    { name: 'amountSentLD', type: 'uint256' },
                    { name: 'amountReceivedLD', type: 'uint256' }
                ]
            }
        ],
        stateMutability: 'payable'
    },
    {
        name: 'quoteSend',
        type: 'function',
        inputs: [
            {
                name: 'sendParam',
                type: 'tuple',
                components: [
                    { name: 'dstEid', type: 'uint32' },
                    { name: 'to', type: 'bytes32' },
                    { name: 'amountLD', type: 'uint256' },
                    { name: 'minAmountLD', type: 'uint256' },
                    { name: 'extraOptions', type: 'bytes' },
                    { name: 'composeMsg', type: 'bytes' },
                    { name: 'oftCmd', type: 'bytes' }
                ]
            },
            { name: 'payInLzToken', type: 'bool' }
        ],
        outputs: [
            {
                name: 'fee',
                type: 'tuple',
                components: [
                    { name: 'nativeFee', type: 'uint256' },
                    { name: 'lzTokenFee', type: 'uint256' }
                ]
            }
        ],
        stateMutability: 'view'
    },
    {
        name: 'approvalRequired',
        type: 'function',
        inputs: [],
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view'
    },
    {
        name: 'sharedDecimals',
        type: 'function',
        inputs: [],
        outputs: [{ name: '', type: 'uint8' }],
        stateMutability: 'view'
    },
    {
        name: 'token',
        type: 'function',
        inputs: [],
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view'
    }
];
// USDC Token ABI
const USDC_ABI = [
    {
        name: 'approve',
        type: 'function',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' }
        ],
        outputs: [{ type: 'bool' }],
        stateMutability: 'nonpayable'
    },
    {
        name: 'allowance',
        type: 'function',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' }
        ],
        outputs: [{ type: 'uint256' }],
        stateMutability: 'view'
    },
    {
        name: 'balanceOf',
        type: 'function',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ type: 'uint256' }],
        stateMutability: 'view'
    },
    {
        name: 'decimals',
        type: 'function',
        inputs: [],
        outputs: [{ type: 'uint8' }],
        stateMutability: 'view'
    }
];
/**
 * Create public client for chain
 */
export function createChainPublicClient(chain) {
    return createPublicClient({
        chain: SUPPORTED_CHAINS[chain],
        transport: http(RPC_URLS[chain][0])
    });
}
/**
 * Get USDC balance
 */
export async function getUSDCBalance(address, chain) {
    const client = createChainPublicClient(chain);
    try {
        const balance = await client.readContract({
            address: USDC_ADDRESSES[chain],
            abi: USDC_ABI,
            functionName: 'balanceOf',
            args: [address]
        });
        return formatUnits(balance, 6);
    }
    catch (error) {
        console.error(`[Bridge] Failed to get USDC balance on ${chain}:`, error);
        return '0';
    }
}
/**
 * Get native token balance
 */
export async function getNativeBalance(address, chain) {
    const client = createChainPublicClient(chain);
    try {
        const balance = await client.getBalance({ address });
        return formatUnits(balance, 18);
    }
    catch (error) {
        console.error(`[Bridge] Failed to get native balance on ${chain}:`, error);
        return '0';
    }
}
/**
 * Get all balances across chains
 */
export async function getAllBalances(address) {
    const chains = ['ethereum', 'base', 'optimism', 'arbitrum'];
    const balances = [];
    for (const chain of chains) {
        const [nativeBalance, usdcBalance] = await Promise.all([
            getNativeBalance(address, chain),
            getUSDCBalance(address, chain)
        ]);
        balances.push({ chain, nativeBalance, usdcBalance });
    }
    return balances;
}
/**
 * Quote LayerZero bridge fees using OFT quoteSend
 */
async function quoteOFTSend(sourceChain, destinationChain, amount, recipient) {
    const publicClient = createChainPublicClient(sourceChain);
    const oftAddress = LAYERZERO_USDC_OFT[sourceChain];
    const dstEid = LAYERZERO_CHAIN_IDS[destinationChain];
    // Convert address to bytes32
    const toBytes32 = ('0x' + recipient.slice(2).padStart(64, '0'));
    // 0.5% slippage tolerance
    const minAmountLD = (amount * 995n) / 1000n;
    const sendParam = {
        dstEid,
        to: toBytes32,
        amountLD: amount,
        minAmountLD: minAmountLD,
        extraOptions: '0x',
        composeMsg: '0x',
        oftCmd: '0x'
    };
    const fee = await publicClient.readContract({
        address: oftAddress,
        abi: OFT_ABI,
        functionName: 'quoteSend',
        args: [sendParam, false]
    });
    return fee;
}
/**
 * Get bridge quote for cross-chain transfer
 * Uses LayerZero OFT quoteSend for accurate fee estimation
 */
export async function getBridgeQuote(params, senderAddress) {
    const { sourceChain, destinationChain, token, amount } = params;
    // Validate chains are different
    if (sourceChain === destinationChain) {
        throw new Error('Source and destination chains must be different');
    }
    let lzFee;
    // Get accurate LZ fee quote for USDC transfers
    if (token === 'USDC') {
        try {
            const amountInUnits = parseUnits(amount, 6);
            lzFee = await quoteOFTSend(sourceChain, destinationChain, amountInUnits, senderAddress);
        }
        catch (error) {
            console.warn(`[Bridge] Failed to get LZ fee quote:`, error);
        }
    }
    // Estimated time varies by route (in seconds)
    const timeEstimates = {
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
    const route = `${sourceChain}-${destinationChain}`;
    const estimatedTime = timeEstimates[route] || 60;
    // Path represents the route
    const path = [sourceChain, 'layerzero', destinationChain];
    // Format estimated fee
    let estimatedFee;
    if (lzFee) {
        // Convert native fee to ETH for display
        const nativeFeeEth = formatUnits(lzFee.nativeFee, 18);
        estimatedFee = nativeFeeEth;
    }
    else {
        // Fallback estimates
        const baseFees = {
            'base-optimism': 0.001, 'base-arbitrum': 0.0012, 'optimism-base': 0.001,
            'optimism-arbitrum': 0.0012, 'arbitrum-base': 0.0012, 'arbitrum-optimism': 0.0012,
            'ethereum-base': 0.005, 'ethereum-optimism': 0.005, 'ethereum-arbitrum': 0.005,
            'base-ethereum': 0.01, 'optimism-ethereum': 0.01, 'arbitrum-ethereum': 0.01
        };
        estimatedFee = (baseFees[route] || 0.001).toFixed(6);
    }
    return {
        sourceChain,
        destinationChain,
        token,
        amount,
        estimatedFee,
        estimatedTime,
        path,
        lzFee
    };
}
/**
 * Find cheapest chain for operation
 */
export async function findCheapestChain(operation, excludeChains) {
    const chains = ['base', 'optimism', 'arbitrum'];
    const filtered = excludeChains ? chains.filter(c => !excludeChains.includes(c)) : chains;
    // Cost estimates in USD
    const costs = {
        'send-base': 0.001, 'send-optimism': 0.002, 'send-arbitrum': 0.003,
        'contract-base': 0.005, 'contract-optimism': 0.008, 'contract-arbitrum': 0.012
    };
    let cheapest = filtered[0];
    let lowestCost = Infinity;
    for (const chain of filtered) {
        const cost = costs[`${operation}-${chain}`] || 0.01;
        if (cost < lowestCost) {
            lowestCost = cost;
            cheapest = chain;
        }
    }
    return { chain: cheapest, estimatedCost: lowestCost.toFixed(4) };
}
/**
 * Retry helper with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt < maxRetries) {
                const delay = baseDelay * Math.pow(2, attempt);
                console.log(`[Bridge] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
}
/**
 * Wait for transaction receipt with timeout
 */
async function waitForTransaction(publicClient, txHash, timeoutMs = 60000, confirmations = 1) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
        try {
            const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
            if (receipt && receipt.blockNumber) {
                const currentBlock = await publicClient.getBlockNumber();
                const confirmationsReceived = Number(currentBlock - receipt.blockNumber) + 1;
                if (confirmationsReceived >= confirmations) {
                    return receipt.status === 'success';
                }
            }
        }
        catch {
            // Transaction not yet mined
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    return false;
}
/**
 * CrossChainBridge class
 */
export class CrossChainBridge {
    privateKey;
    defaultChain;
    constructor(privateKey, defaultChain = 'base') {
        this.privateKey = privateKey;
        this.defaultChain = defaultChain;
    }
    async getBalances(address) {
        const account = privateKeyToAccount(this.privateKey);
        return getAllBalances(address || account.address);
    }
    async findCheapestChain(operation) {
        return findCheapestChain(operation);
    }
    /**
     * Get bridge quote for cross-chain transfer
     * Instance method wrapper around getBridgeQuote function
     */
    async getQuote(destinationChain, token, amount, sourceChain) {
        const account = privateKeyToAccount(this.privateKey);
        const srcChain = sourceChain || this.defaultChain;
        return getBridgeQuote({
            sourceChain: srcChain,
            destinationChain,
            token,
            amount
        }, account.address);
    }
    /**
     * Bridge USDC using LayerZero OFT (Omnichain Fungible Token) protocol
     * Supports Base ↔ Optimism ↔ Arbitrum transfers
     * Uses LayerZero V2 for cross-chain messaging
     *
     * @param destinationChain - Target chain
     * @param amount - Amount to bridge (in USDC, e.g., "10.5")
     * @param sourceChain - Source chain (defaults to defaultChain)
     * @returns BridgeResult with transaction details
     */
    async bridgeUSDC(destinationChain, amount, sourceChain) {
        const account = privateKeyToAccount(this.privateKey);
        const srcChain = sourceChain || this.defaultChain;
        try {
            // Validate chains are supported and different
            if (srcChain === destinationChain) {
                return {
                    success: false,
                    error: 'Source and destination chains must be different',
                    sourceChain: srcChain,
                    destinationChain,
                    amount
                };
            }
            // Check if we have valid L2 chains for bridging
            const supportedL2s = ['base', 'optimism', 'arbitrum'];
            if (!supportedL2s.includes(srcChain) || !supportedL2s.includes(destinationChain)) {
                return {
                    success: false,
                    error: 'Only Base, Optimism, and Arbitrum are supported for direct USDC bridging',
                    sourceChain: srcChain,
                    destinationChain,
                    amount
                };
            }
            // Create wallet and public clients for source chain
            const { walletClient, publicClient } = createMultiChainClient(this.privateKey, srcChain);
            const oftAddress = LAYERZERO_USDC_OFT[srcChain];
            const usdcAddress = USDC_ADDRESSES[srcChain];
            const amountInUnits = parseUnits(amount, 6);
            // Step 1: Check USDC balance
            const balance = await publicClient.readContract({
                address: usdcAddress,
                abi: USDC_ABI,
                functionName: 'balanceOf',
                args: [account.address]
            });
            if (balance < amountInUnits) {
                return {
                    success: false,
                    error: `Insufficient USDC balance. Have: ${formatUnits(balance, 6)}, Need: ${amount}`,
                    sourceChain: srcChain,
                    destinationChain,
                    amount
                };
            }
            // Step 2: Get quote for fees
            let lzFee;
            try {
                lzFee = await quoteOFTSend(srcChain, destinationChain, amountInUnits, account.address);
            }
            catch (error) {
                return {
                    success: false,
                    error: `Failed to get LayerZero fee quote: ${error instanceof Error ? error.message : String(error)}`,
                    sourceChain: srcChain,
                    destinationChain,
                    amount
                };
            }
            // Step 3: Check native balance for fees
            const nativeBalance = await publicClient.getBalance({ address: account.address });
            if (nativeBalance < lzFee.nativeFee) {
                return {
                    success: false,
                    error: `Insufficient native token for gas fees. Have: ${formatUnits(nativeBalance, 18)} ETH, Need: ${formatUnits(lzFee.nativeFee, 18)} ETH`,
                    sourceChain: srcChain,
                    destinationChain,
                    amount
                };
            }
            // Step 4: Check and approve USDC allowance for OFT contract
            const currentAllowance = await publicClient.readContract({
                address: usdcAddress,
                abi: USDC_ABI,
                functionName: 'allowance',
                args: [account.address, oftAddress]
            });
            if (currentAllowance < amountInUnits) {
                console.log(`[Bridge] Approving USDC for OFT contract...`);
                const approveTx = await retryWithBackoff(async () => {
                    return await walletClient.writeContract({
                        address: usdcAddress,
                        abi: USDC_ABI,
                        functionName: 'approve',
                        args: [oftAddress, amountInUnits],
                        chain: SUPPORTED_CHAINS[srcChain],
                        account
                    });
                });
                console.log(`[Bridge] Approval transaction: ${approveTx}`);
                // Wait for approval confirmation
                const approvalConfirmed = await waitForTransaction(publicClient, approveTx, 60000, 1);
                if (!approvalConfirmed) {
                    return {
                        success: false,
                        error: 'USDC approval transaction failed or timed out',
                        sourceChain: srcChain,
                        destinationChain,
                        amount
                    };
                }
            }
            // Step 5: Execute the cross-chain transfer via LayerZero OFT
            console.log(`[Bridge] Initiating cross-chain transfer via LayerZero...`);
            const dstEid = LAYERZERO_CHAIN_IDS[destinationChain];
            const toBytes32 = ('0x' + account.address.slice(2).padStart(64, '0'));
            const minAmountLD = (amountInUnits * 995n) / 1000n; // 0.5% slippage
            const sendParam = {
                dstEid,
                to: toBytes32,
                amountLD: amountInUnits,
                minAmountLD: minAmountLD,
                extraOptions: '0x',
                composeMsg: '0x',
                oftCmd: '0x'
            };
            const bridgeTx = await retryWithBackoff(async () => {
                return await walletClient.writeContract({
                    address: oftAddress,
                    abi: OFT_ABI,
                    functionName: 'send',
                    args: [sendParam, lzFee, account.address],
                    chain: SUPPORTED_CHAINS[srcChain],
                    account,
                    value: lzFee.nativeFee // Pay for LayerZero messaging
                });
            });
            console.log(`[Bridge] Bridge transaction submitted: ${bridgeTx}`);
            // Step 6: Wait for transaction confirmation
            const confirmed = await waitForTransaction(publicClient, bridgeTx, 120000, 1);
            if (!confirmed) {
                return {
                    success: false,
                    error: 'Bridge transaction not confirmed within timeout',
                    sourceChain: srcChain,
                    destinationChain,
                    amount,
                    txHash: bridgeTx
                };
            }
            console.log(`[Bridge] Bridge confirmed! From ${srcChain} to ${destinationChain}: ${bridgeTx}`);
            return {
                success: true,
                txHash: bridgeTx,
                sourceChain: srcChain,
                destinationChain,
                amount,
                fees: {
                    nativeFee: formatUnits(lzFee.nativeFee, 18),
                    lzTokenFee: formatUnits(lzFee.lzTokenFee, 18)
                }
            };
        }
        catch (error) {
            console.error(`[Bridge] Bridge failed:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Bridge transaction failed',
                sourceChain: srcChain,
                destinationChain,
                amount
            };
        }
    }
}
/**
 * Create multi-chain client for a specific chain
 */
function createMultiChainClient(privateKey, chain) {
    const account = privateKeyToAccount(privateKey);
    const urls = RPC_URLS[chain];
    const walletClient = createWalletClient({
        account,
        chain: SUPPORTED_CHAINS[chain],
        transport: http(urls[0])
    });
    const publicClient = createPublicClient({
        chain: SUPPORTED_CHAINS[chain],
        transport: http(urls[0])
    });
    return { walletClient, publicClient, account };
}
export default CrossChainBridge;
//# sourceMappingURL=bridge.js.map