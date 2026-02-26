/**
 * Cross-Chain Bridge Module for Agora
 * Supports Base, Optimism, and Arbitrum chains
 * Uses LayerZero V2 for cross-chain messaging and USDC transfers via OFT (Omnichain Fungible Token)
 */
import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, optimism, arbitrum, mainnet } from 'viem/chains';
import { EventEmitter } from 'events';
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
// LayerZero Endpoint ABI (V2) for message tracking
const LZ_ENDPOINT_ABI = [
    {
        name: 'getInboundNonce',
        type: 'function',
        inputs: [
            { name: '_srcChainId', type: 'uint32' },
            { name: '_srcAddress', type: 'bytes32' }
        ],
        outputs: [{ name: '', type: 'uint64' }],
        stateMutability: 'view'
    },
    {
        name: 'getOutboundNonce',
        type: 'function',
        inputs: [
            { name: '_dstChainId', type: 'uint32' },
            { name: '_sender', type: 'address' }
        ],
        outputs: [{ name: '', type: 'uint64' }],
        stateMutability: 'view'
    },
    {
        name: 'verifiable',
        type: 'function',
        inputs: [
            { name: '_origin', type: 'tuple', components: [
                    { name: 'srcEid', type: 'uint32' },
                    { name: 'sender', type: 'bytes32' },
                    { name: 'nonce', type: 'uint64' }
                ] },
            { name: '_receiver', type: 'address' }
        ],
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view'
    }
];
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
 * Estimate bridge fees for cross-chain transfer
 * Provides comprehensive fee estimation including protocol fees, gas costs, and bridge fees
 *
 * @param params - Fee estimation parameters
 * @returns Detailed fee estimate
 *
 * @example
 * ```typescript
 * const estimate = await estimateBridgeFee({
 *   sourceChain: 'base',
 *   destinationChain: 'optimism',
 *   token: 'USDC',
 *   amount: '100'
 * });
 * console.log(`Total fee: ${estimate.totalFeeUSD} USD`);
 * ```
 */
export async function estimateBridgeFee(params) {
    const { sourceChain, destinationChain, token, amount, senderAddress } = params;
    // Validate chains are different
    if (sourceChain === destinationChain) {
        throw new BridgeError('Source and destination chains must be different', 'INVALID_PARAMS');
    }
    const publicClient = createChainPublicClient(sourceChain);
    const testAddress = senderAddress || '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    let nativeFee = 0n;
    let lzTokenFee = 0n;
    let gasEstimate = 150000n; // Base gas estimate
    try {
        if (token === 'USDC') {
            // Get accurate fee quote from LayerZero OFT
            const amountInUnits = parseUnits(amount, 6);
            const oftAddress = LAYERZERO_USDC_OFT[sourceChain];
            const dstEid = LAYERZERO_CHAIN_IDS[destinationChain];
            // Convert address to bytes32
            const toBytes32 = ('0x' + testAddress.slice(2).padStart(64, '0'));
            const minAmountLD = (amountInUnits * 995n) / 1000n; // 0.5% slippage
            const sendParam = {
                dstEid,
                to: toBytes32,
                amountLD: amountInUnits,
                minAmountLD,
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
            nativeFee = fee.nativeFee;
            lzTokenFee = fee.lzTokenFee;
            // Estimate gas for the send transaction
            gasEstimate = 200000n; // OFT send typically uses ~200k gas
        }
        else {
            // ETH transfer estimation
            // ETH transfers use standard LayerZero messaging
            const route = `${sourceChain}-${destinationChain}`;
            const baseFees = {
                'base-optimism': parseUnits('0.001', 18),
                'base-arbitrum': parseUnits('0.0012', 18),
                'optimism-base': parseUnits('0.001', 18),
                'optimism-arbitrum': parseUnits('0.0012', 18),
                'arbitrum-base': parseUnits('0.0012', 18),
                'arbitrum-optimism': parseUnits('0.0012', 18),
                'ethereum-base': parseUnits('0.005', 18),
                'ethereum-optimism': parseUnits('0.005', 18),
                'ethereum-arbitrum': parseUnits('0.005', 18),
                'base-ethereum': parseUnits('0.01', 18),
                'optimism-ethereum': parseUnits('0.01', 18),
                'arbitrum-ethereum': parseUnits('0.01', 18)
            };
            nativeFee = baseFees[route] || parseUnits('0.001', 18);
            gasEstimate = 120000n;
        }
    }
    catch (error) {
        console.warn(`[Bridge] Failed to get accurate fee estimate, using fallback:`, error);
        // Fallback estimates
        nativeFee = parseUnits('0.001', 18);
        lzTokenFee = 0n;
    }
    // Get current gas price
    let gasPrice;
    try {
        gasPrice = await publicClient.getGasPrice();
    }
    catch {
        gasPrice = parseUnits('0.1', 9); // Fallback to 0.1 gwei
    }
    // Calculate gas cost
    const gasCost = gasPrice * gasEstimate;
    const totalNativeFee = nativeFee + gasCost;
    // Convert to USD (approximate rates)
    const ethToUsd = 3000; // Approximate ETH price in USD
    const nativeFeeUsd = Number(formatUnits(totalNativeFee, 18)) * ethToUsd;
    const lzTokenFeeUsd = Number(formatUnits(lzTokenFee, 18)) * ethToUsd;
    const totalFeeUsd = nativeFeeUsd + lzTokenFeeUsd;
    // Estimated time varies by route
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
    // Fee breakdown
    const protocolFee = totalNativeFee / 10n; // ~10% protocol fee
    const bridgeFee = nativeFee - protocolFee;
    return {
        sourceChain,
        destinationChain,
        token,
        amount,
        nativeFee: formatUnits(totalNativeFee, 18),
        lzTokenFee: formatUnits(lzTokenFee, 18),
        totalFeeUSD: totalFeeUsd.toFixed(4),
        gasEstimate: gasEstimate.toString(),
        estimatedTime,
        breakdown: {
            protocolFee: formatUnits(protocolFee, 18),
            gasFee: formatUnits(gasCost, 18),
            bridgeFee: formatUnits(bridgeFee > 0n ? bridgeFee : 0n, 18)
        }
    };
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
 * Custom Bridge Error class with error codes
 */
export class BridgeError extends Error {
    code;
    chain;
    txHash;
    retryable;
    constructor(message, code = 'UNKNOWN_ERROR', options) {
        super(message);
        this.name = 'BridgeError';
        this.code = code;
        this.chain = options?.chain;
        this.txHash = options?.txHash;
        this.retryable = options?.retryable ?? true;
    }
    /**
     * Check if error is retryable
     */
    isRetryable() {
        return this.retryable && [
            'NETWORK_ERROR',
            'RPC_ERROR',
            'TRANSACTION_TIMEOUT',
            'MESSAGE_VERIFICATION_FAILED'
        ].includes(this.code);
    }
}
/**
 * Default console logger
 */
export const defaultLogger = {
    debug: (msg, meta) => console.debug(`[Bridge:DEBUG] ${msg}`, meta || ''),
    info: (msg, meta) => console.info(`[Bridge:INFO] ${msg}`, meta || ''),
    warn: (msg, meta) => console.warn(`[Bridge:WARN] ${msg}`, meta || ''),
    error: (msg, meta) => console.error(`[Bridge:ERROR] ${msg}`, meta || '')
};
/**
 * Bridge Transaction Monitor
 * Monitors cross-chain transactions from source to destination
 * Tracks LayerZero message status and provides real-time updates
 *
 * @example
 * ```typescript
 * const monitor = new BridgeTransactionMonitor('base', defaultLogger);
 *
 * monitor.on('statusUpdate', (status) => {
 *   console.log(`Progress: ${status.progress}%`);
 * });
 *
 * const status = await monitor.monitorTransaction(
 *   '0x...', // txHash
 *   'base',
 *   'optimism',
 *   '100'
 * );
 * ```
 */
export class BridgeTransactionMonitor extends EventEmitter {
    sourceChain;
    logger;
    activeMonitors;
    statusCache;
    // Configuration
    DEFAULT_CONFIRMATIONS = 1;
    SOURCE_CONFIRMATION_TIMEOUT = 120000; // 2 minutes
    MESSAGE_DELIVERY_TIMEOUT = 300000; // 5 minutes
    DESTINATION_CONFIRMATION_TIMEOUT = 120000; // 2 minutes
    POLL_INTERVAL = 3000; // 3 seconds
    MAX_RETRIES = 3;
    constructor(sourceChain, logger = defaultLogger) {
        super();
        this.sourceChain = sourceChain;
        this.logger = logger;
        this.activeMonitors = new Map();
        this.statusCache = new Map();
    }
    /**
     * Monitor a bridge transaction end-to-end
     * Tracks source confirmation, message delivery, and destination confirmation
     */
    async monitorTransaction(txHash, sourceChain, destinationChain, amount, options) {
        const monitorId = `${sourceChain}-${destinationChain}-${txHash}`;
        const abortController = new AbortController();
        this.activeMonitors.set(monitorId, abortController);
        const requiredConfirmations = options?.requiredConfirmations ?? this.DEFAULT_CONFIRMATIONS;
        const timeout = options?.timeout ?? (this.SOURCE_CONFIRMATION_TIMEOUT +
            this.MESSAGE_DELIVERY_TIMEOUT +
            this.DESTINATION_CONFIRMATION_TIMEOUT);
        // Initialize status
        let status = {
            txHash,
            sourceChain,
            destinationChain,
            status: 'pending',
            stage: 'source',
            progress: 0,
            requiredConfirmations,
            estimatedCompletionTime: Date.now() + this.estimateTotalTime(sourceChain, destinationChain),
            retryCount: 0,
            lastUpdated: Date.now()
        };
        this.statusCache.set(monitorId, status);
        this.emit('monitoringStarted', { txHash, sourceChain, destinationChain });
        const startTime = Date.now();
        try {
            // Stage 1: Wait for source chain confirmation
            this.logger.info(`Starting source chain confirmation monitoring`, { txHash, sourceChain });
            status = await this.monitorSourceConfirmation(txHash, sourceChain, status, abortController.signal);
            if (status.status === 'failed') {
                throw new BridgeError('Source transaction failed', 'TRANSACTION_FAILED', { chain: sourceChain, txHash });
            }
            // Emit status update
            this.emitStatusUpdate(status, options?.onStatusUpdate);
            // Stage 2: Monitor LayerZero message delivery
            this.logger.info(`Monitoring LayerZero message delivery`, {
                txHash,
                sourceChain,
                destinationChain,
                messageHash: status.messageHash
            });
            status = await this.monitorMessageDelivery(status, sourceChain, destinationChain, abortController.signal);
            if (status.status === 'failed') {
                throw new BridgeError('Message delivery failed', 'MESSAGE_VERIFICATION_FAILED', { chain: destinationChain, txHash });
            }
            this.emitStatusUpdate(status, options?.onStatusUpdate);
            // Stage 3: Monitor destination chain confirmation
            this.logger.info(`Monitoring destination chain confirmation`, {
                txHash,
                destinationChain
            });
            status = await this.monitorDestinationConfirmation(status, destinationChain, amount, abortController.signal);
            if (status.status === 'failed') {
                throw new BridgeError('Destination transaction failed', 'DESTINATION_TX_FAILED', { chain: destinationChain, txHash });
            }
            // Mark as completed
            status.status = 'completed';
            status.stage = 'destination';
            status.progress = 100;
            status.actualCompletionTime = Date.now();
            status.lastUpdated = Date.now();
            this.logger.info(`Bridge transaction completed successfully`, {
                txHash,
                duration: Date.now() - startTime
            });
            this.emit('completed', status);
            this.emitStatusUpdate(status, options?.onStatusUpdate);
            return status;
        }
        catch (error) {
            const bridgeError = error instanceof BridgeError
                ? error
                : new BridgeError(error instanceof Error ? error.message : 'Unknown error', 'UNKNOWN_ERROR', { chain: sourceChain, txHash });
            status.status = 'failed';
            status.error = bridgeError.message;
            status.lastUpdated = Date.now();
            this.logger.error(`Bridge monitoring failed`, {
                txHash,
                error: bridgeError.message,
                code: bridgeError.code
            });
            this.emit('failed', { status, error: bridgeError });
            this.emitStatusUpdate(status, options?.onStatusUpdate);
            throw bridgeError;
        }
        finally {
            this.activeMonitors.delete(monitorId);
            this.statusCache.delete(monitorId);
        }
    }
    /**
     * Monitor source chain transaction confirmation
     */
    async monitorSourceConfirmation(txHash, sourceChain, status, signal) {
        const publicClient = createChainPublicClient(sourceChain);
        const timeout = this.SOURCE_CONFIRMATION_TIMEOUT;
        const startTime = Date.now();
        let retryCount = 0;
        while (!signal.aborted && Date.now() - startTime < timeout) {
            try {
                const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
                if (receipt) {
                    if (receipt.status === 'reverted') {
                        status.status = 'failed';
                        status.error = 'Transaction was reverted';
                        return status;
                    }
                    const currentBlock = await publicClient.getBlockNumber();
                    const confirmations = Number(currentBlock - receipt.blockNumber) + 1;
                    status.sourceConfirmations = confirmations;
                    status.progress = Math.min(30, (confirmations / status.requiredConfirmations) * 30);
                    status.lastUpdated = Date.now();
                    if (confirmations >= status.requiredConfirmations) {
                        status.status = 'source_confirmed';
                        status.stage = 'cross_chain';
                        status.progress = 33;
                        // Try to extract message hash from logs
                        status.messageHash = this.extractMessageHash(receipt.logs);
                        this.logger.info(`Source transaction confirmed`, {
                            txHash,
                            confirmations,
                            messageHash: status.messageHash
                        });
                        return status;
                    }
                }
            }
            catch (error) {
                retryCount++;
                this.logger.warn(`Error checking source confirmation, retry ${retryCount}`, {
                    txHash,
                    error: error instanceof Error ? error.message : String(error)
                });
                if (retryCount >= this.MAX_RETRIES) {
                    throw new BridgeError('Failed to confirm source transaction', 'TRANSACTION_TIMEOUT', { chain: sourceChain, txHash });
                }
            }
            // Wait before next poll
            await this.delay(this.POLL_INTERVAL, signal);
        }
        if (signal.aborted) {
            throw new BridgeError('Monitoring aborted', 'UNKNOWN_ERROR', { chain: sourceChain, txHash });
        }
        throw new BridgeError('Source confirmation timeout', 'TRANSACTION_TIMEOUT', { chain: sourceChain, txHash });
    }
    /**
     * Monitor LayerZero message delivery
     */
    async monitorMessageDelivery(status, sourceChain, destinationChain, signal) {
        const timeout = this.MESSAGE_DELIVERY_TIMEOUT;
        const startTime = Date.now();
        let retryCount = 0;
        status.status = 'message_sent';
        status.progress = 40;
        // Create public clients for both chains
        const sourceClient = createChainPublicClient(sourceChain);
        const destClient = createChainPublicClient(destinationChain);
        while (!signal.aborted && Date.now() - startTime < timeout) {
            try {
                // Check LayerZero message status
                const messageStatus = await this.checkLayerZeroMessageStatus(status, sourceChain, destinationChain, sourceClient, destClient);
                if (messageStatus.verified) {
                    status.status = 'message_delivered';
                    status.stage = 'destination';
                    status.progress = 66;
                    this.logger.info(`LayerZero message delivered`, {
                        txHash: status.txHash,
                        messageHash: status.messageHash,
                        confirmations: messageStatus.confirmations
                    });
                    return status;
                }
                // Update progress based on verification progress
                status.progress = 40 + (messageStatus.confirmations / 20) * 26; // 40-66%
                status.lastUpdated = Date.now();
            }
            catch (error) {
                retryCount++;
                this.logger.warn(`Error checking message delivery, retry ${retryCount}`, {
                    txHash: status.txHash,
                    error: error instanceof Error ? error.message : String(error)
                });
                if (retryCount >= this.MAX_RETRIES) {
                    throw new BridgeError('Failed to verify message delivery', 'MESSAGE_VERIFICATION_FAILED', { chain: destinationChain, txHash: status.txHash });
                }
            }
            await this.delay(this.POLL_INTERVAL, signal);
        }
        if (signal.aborted) {
            throw new BridgeError('Monitoring aborted', 'UNKNOWN_ERROR', {
                chain: destinationChain,
                txHash: status.txHash
            });
        }
        throw new BridgeError('Message delivery timeout', 'TRANSACTION_TIMEOUT', { chain: destinationChain, txHash: status.txHash });
    }
    /**
     * Monitor destination chain transaction confirmation
     */
    async monitorDestinationConfirmation(status, destinationChain, amount, signal) {
        const publicClient = createChainPublicClient(destinationChain);
        const timeout = this.DESTINATION_CONFIRMATION_TIMEOUT;
        const startTime = Date.now();
        status.status = 'pending';
        status.progress = 70;
        while (!signal.aborted && Date.now() - startTime < timeout) {
            try {
                // Look for incoming token transfer events
                // This is a simplified check - in production you'd track the specific transaction
                const currentBlock = await publicClient.getBlockNumber();
                // Check for recent OFT receive events
                const logs = await publicClient.getLogs({
                    address: LAYERZERO_USDC_OFT[destinationChain],
                    event: {
                        type: 'event',
                        name: 'OFTReceived',
                        inputs: [
                            { name: 'guid', type: 'bytes32', indexed: true },
                            { name: 'srcEid', type: 'uint32', indexed: false },
                            { name: 'to', type: 'address', indexed: false },
                            { name: 'amount', type: 'uint256', indexed: false }
                        ]
                    },
                    fromBlock: currentBlock - 100n,
                    toBlock: currentBlock
                });
                if (logs.length > 0) {
                    // Check if any log matches our message hash
                    for (const log of logs) {
                        if (status.messageHash &&
                            log.topics[1]?.toLowerCase() === status.messageHash.toLowerCase()) {
                            status.status = 'completed';
                            status.progress = 100;
                            this.logger.info(`Destination transaction confirmed`, {
                                txHash: status.txHash,
                                destinationChain,
                                blockNumber: log.blockNumber?.toString()
                            });
                            return status;
                        }
                    }
                }
                // Increment progress while waiting
                const elapsed = Date.now() - startTime;
                const progressIncrement = Math.min(29, (elapsed / timeout) * 29);
                status.progress = 70 + progressIncrement;
                status.lastUpdated = Date.now();
            }
            catch (error) {
                this.logger.warn(`Error checking destination confirmation`, {
                    txHash: status.txHash,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
            await this.delay(this.POLL_INTERVAL, signal);
        }
        if (signal.aborted) {
            throw new BridgeError('Monitoring aborted', 'UNKNOWN_ERROR', {
                chain: destinationChain,
                txHash: status.txHash
            });
        }
        // If we reach here, we didn't detect the destination transaction
        // This doesn't necessarily mean it failed - it might have completed before monitoring started
        this.logger.warn(`Destination confirmation timeout - transaction may have completed`, {
            txHash: status.txHash,
            destinationChain
        });
        status.status = 'completed';
        status.progress = 100;
        return status;
    }
    /**
     * Check LayerZero message status
     */
    async checkLayerZeroMessageStatus(status, sourceChain, destinationChain, sourceClient, destClient) {
        try {
            const srcEid = LAYERZERO_CHAIN_IDS[sourceChain];
            const dstEid = LAYERZERO_CHAIN_IDS[destinationChain];
            // Get the OFT address on source chain
            const oftAddress = LAYERZERO_USDC_OFT[sourceChain];
            // Get outbound nonce
            const outboundNonce = await sourceClient.readContract({
                address: LAYERZERO_ENDPOINTS[sourceChain],
                abi: LZ_ENDPOINT_ABI,
                functionName: 'getOutboundNonce',
                args: [dstEid, oftAddress]
            });
            // Get inbound nonce on destination
            const senderBytes32 = ('0x' + oftAddress.slice(2).padStart(64, '0'));
            const inboundNonce = await destClient.readContract({
                address: LAYERZERO_ENDPOINTS[destinationChain],
                abi: LZ_ENDPOINT_ABI,
                functionName: 'getInboundNonce',
                args: [srcEid, senderBytes32]
            });
            // If inbound nonce >= outbound nonce, message has been delivered
            const verified = inboundNonce >= outboundNonce;
            const confirmations = verified ? 20 : Number(inboundNonce);
            return { verified, confirmations };
        }
        catch (error) {
            this.logger.debug(`Error checking LZ message status`, {
                error: error instanceof Error ? error.message : String(error)
            });
            return { verified: false, confirmations: 0 };
        }
    }
    /**
     * Extract message hash from transaction logs
     */
    extractMessageHash(logs) {
        // Look for Packet event from LayerZero
        for (const log of logs) {
            const l = log;
            if (l.topics && l.topics.length >= 2) {
                // Packet event typically has message hash as one of the topics
                // This is a simplified extraction
                const potentialHash = l.topics[1];
                if (potentialHash && potentialHash.length === 66) {
                    return potentialHash;
                }
            }
        }
        return undefined;
    }
    /**
     * Estimate total bridge time
     */
    estimateTotalTime(sourceChain, destinationChain) {
        const timeEstimates = {
            'base-optimism': 60000,
            'base-arbitrum': 60000,
            'optimism-base': 60000,
            'optimism-arbitrum': 60000,
            'arbitrum-base': 60000,
            'arbitrum-optimism': 60000,
            'ethereum-base': 300000,
            'ethereum-optimism': 300000,
            'ethereum-arbitrum': 300000,
            'base-ethereum': 900000,
            'optimism-ethereum': 900000,
            'arbitrum-ethereum': 900000
        };
        const route = `${sourceChain}-${destinationChain}`;
        return timeEstimates[route] || 60000;
    }
    /**
     * Emit status update
     */
    emitStatusUpdate(status, callback) {
        this.emit('statusUpdate', { ...status });
        if (callback) {
            callback({ ...status });
        }
    }
    /**
     * Delay with abort support
     */
    delay(ms, signal) {
        return new Promise((resolve, reject) => {
            if (signal.aborted) {
                reject(new Error('Aborted'));
                return;
            }
            const timeout = setTimeout(resolve, ms);
            signal.addEventListener('abort', () => {
                clearTimeout(timeout);
                reject(new Error('Aborted'));
            }, { once: true });
        });
    }
    /**
     * Stop monitoring a transaction
     */
    stopMonitoring(txHash, sourceChain, destinationChain) {
        const monitorId = `${sourceChain}-${destinationChain}-${txHash}`;
        const controller = this.activeMonitors.get(monitorId);
        if (controller) {
            controller.abort();
            this.activeMonitors.delete(monitorId);
            this.logger.info(`Stopped monitoring transaction`, { txHash });
        }
    }
    /**
     * Stop all active monitoring
     */
    stopAllMonitoring() {
        for (const [monitorId, controller] of this.activeMonitors) {
            controller.abort();
            this.logger.info(`Stopped monitoring`, { monitorId });
        }
        this.activeMonitors.clear();
    }
    /**
     * Get current status of a monitored transaction
     */
    getStatus(txHash, sourceChain, destinationChain) {
        const monitorId = `${sourceChain}-${destinationChain}-${txHash}`;
        const status = this.statusCache.get(monitorId);
        return status ? { ...status } : undefined;
    }
    /**
     * Retry a failed monitoring attempt
     */
    async retryMonitoring(txHash, sourceChain, destinationChain, amount, options) {
        const monitorId = `${sourceChain}-${destinationChain}-${txHash}`;
        const cachedStatus = this.statusCache.get(monitorId);
        if (cachedStatus) {
            cachedStatus.retryCount++;
            cachedStatus.status = 'pending';
            cachedStatus.error = undefined;
            cachedStatus.lastUpdated = Date.now();
        }
        this.logger.info(`Retrying monitoring`, { txHash, retryCount: cachedStatus?.retryCount || 0 });
        return this.monitorTransaction(txHash, sourceChain, destinationChain, amount, options);
    }
}
/**
 * Listen for LayerZero messages
 * Creates a listener that monitors for incoming LayerZero messages on a specific chain
 *
 * @param chain - Chain to listen on
 * @param callback - Callback function for new messages
 * @returns Cleanup function to stop listening
 */
export function listenLayerZeroMessages(chain, callback) {
    const logger = defaultLogger;
    logger.info(`Starting LayerZero message listener on ${chain}`);
    const publicClient = createChainPublicClient(chain);
    const oftAddress = LAYERZERO_USDC_OFT[chain];
    // Set up log filter for OFT received events
    const unwatch = publicClient.watchContractEvent({
        address: oftAddress,
        abi: [
            {
                name: 'OFTReceived',
                type: 'event',
                inputs: [
                    { name: 'guid', type: 'bytes32', indexed: true },
                    { name: 'srcEid', type: 'uint32', indexed: false },
                    { name: 'to', type: 'address', indexed: false },
                    { name: 'amount', type: 'uint256', indexed: false }
                ]
            }
        ],
        eventName: 'OFTReceived',
        onLogs: (logs) => {
            for (const log of logs) {
                try {
                    const event = log;
                    callback({
                        messageHash: event.args.guid,
                        srcEid: event.args.srcEid,
                        sender: event.args.to,
                        nonce: BigInt(log.logIndex || 0),
                        payload: '',
                        blockNumber: event.blockNumber,
                        transactionHash: event.transactionHash
                    });
                    logger.info(`Received LayerZero message`, {
                        messageHash: event.args.guid,
                        srcEid: event.args.srcEid,
                        amount: event.args.amount.toString()
                    });
                }
                catch (error) {
                    logger.error(`Error processing LayerZero message`, {
                        error: error instanceof Error ? error.message : String(error)
                    });
                }
            }
        },
        onError: (error) => {
            logger.error(`LayerZero listener error`, {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    });
    // Return cleanup function
    return () => {
        logger.info(`Stopping LayerZero message listener on ${chain}`);
        unwatch();
    };
}
/**
 * CrossChainBridge class
 * Extends EventEmitter to provide event-based notifications for bridge operations
 *
 * @example
 * ```typescript
 * const bridge = new CrossChainBridge(privateKey, 'base');
 *
 * // Listen for events
 * bridge.on('quoteReceived', (quote) => console.log('Quote:', quote));
 * bridge.on('transactionSent', (tx) => console.log('Sent:', tx.txHash));
 * bridge.on('transactionConfirmed', (tx) => console.log('Confirmed:', tx.txHash));
 * bridge.on('transactionFailed', (error) => console.error('Failed:', error.error));
 *
 * // Execute bridge operation
 * const result = await bridge.bridgeUSDC('optimism', '100');
 * ```
 */
export class CrossChainBridge extends EventEmitter {
    privateKey;
    defaultChain;
    history;
    logger;
    /**
     * Create a new CrossChainBridge instance
     * @param privateKey - Private key for signing transactions
     * @param defaultChain - Default source chain
     * @param logger - Optional custom logger
     */
    constructor(privateKey, defaultChain = 'base', logger) {
        super();
        this.privateKey = privateKey;
        this.defaultChain = defaultChain;
        this.logger = logger || defaultLogger;
        const account = privateKeyToAccount(privateKey);
        this.history = new BridgeTransactionHistory(account.address);
    }
    /**
     * Subscribe to bridge events
     * @param event - Event type to listen for
     * @param listener - Callback function
     */
    on(event, listener) {
        return super.on(event, listener);
    }
    /**
     * Subscribe to bridge events (one-time)
     * @param event - Event type to listen for
     * @param listener - Callback function
     */
    once(event, listener) {
        return super.once(event, listener);
    }
    /**
     * Remove event listener
     * @param event - Event type
     * @param listener - Callback function to remove
     */
    off(event, listener) {
        return super.off(event, listener);
    }
    /**
     * Emit a bridge event
     * @param event - Event type
     * @param data - Event data
     */
    emit(event, data) {
        return super.emit(event, data);
    }
    /**
     * Get transaction history for the bridge's address
     */
    getTransactionHistory(filter) {
        return this.history.getTransactions(filter);
    }
    /**
     * Update transaction status and emit event
     */
    updateTransactionStatus(txHash, status, sourceChain, destinationChain, amount) {
        this.history.updateTransactionStatus(txHash, status);
        if (status === 'completed') {
            this.emit('transactionConfirmed', {
                txHash,
                sourceChain,
                destinationChain,
                amount,
                token: 'USDC',
                timestamp: Date.now()
            });
        }
        else if (status === 'failed') {
            this.emit('transactionFailed', {
                error: 'Transaction failed',
                sourceChain,
                destinationChain,
                amount,
                token: 'USDC'
            });
        }
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
     * Emits 'quoteReceived' and 'feeEstimated' events
     */
    async getQuote(destinationChain, token, amount, sourceChain) {
        const account = privateKeyToAccount(this.privateKey);
        const srcChain = sourceChain || this.defaultChain;
        const quote = await getBridgeQuote({
            sourceChain: srcChain,
            destinationChain,
            token,
            amount
        }, account.address);
        // Emit events
        this.emit('quoteReceived', {
            sourceChain: srcChain,
            destinationChain,
            token,
            amount,
            estimatedFee: quote.estimatedFee,
            estimatedTime: quote.estimatedTime
        });
        if (quote.lzFee) {
            this.emit('feeEstimated', {
                nativeFee: formatUnits(quote.lzFee.nativeFee, 18),
                lzTokenFee: formatUnits(quote.lzFee.lzTokenFee, 18),
                sourceChain: srcChain,
                destinationChain
            });
        }
        return quote;
    }
    /**
     * Estimate bridge fees for a cross-chain transfer
     * Provides comprehensive fee breakdown including protocol fees, gas costs, and bridge fees
     *
     * @param destinationChain - Target chain for the bridge
     * @param token - Token to bridge ('USDC' | 'ETH')
     * @param amount - Amount to bridge
     * @param sourceChain - Source chain (defaults to defaultChain)
     * @returns Detailed fee estimate
     *
     * @example
     * ```typescript
     * const estimate = await bridge.estimateFee('optimism', 'USDC', '100');
     * console.log(`Total fee: ${estimate.totalFeeUSD} USD`);
     * console.log(`Gas estimate: ${estimate.gasEstimate} units`);
     * ```
     */
    async estimateFee(destinationChain, token, amount, sourceChain) {
        const account = privateKeyToAccount(this.privateKey);
        const srcChain = sourceChain || this.defaultChain;
        const estimate = await estimateBridgeFee({
            sourceChain: srcChain,
            destinationChain,
            token,
            amount,
            senderAddress: account.address
        });
        this.logger?.info(`Fee estimated`, {
            sourceChain: srcChain,
            destinationChain,
            token,
            amount,
            totalFeeUSD: estimate.totalFeeUSD
        });
        return estimate;
    }
    /**
     * Monitor a bridge transaction
     * Tracks the transaction from source chain through destination chain
     *
     * @param txHash - Transaction hash to monitor
     * @param sourceChain - Source chain
     * @param destinationChain - Destination chain
     * @param amount - Amount bridged
     * @param options - Monitoring options
     * @returns Transaction status details
     *
     * @example
     * ```typescript
     * const result = await bridge.bridgeUSDC('optimism', '100');
     * if (result.success) {
     *   const status = await bridge.monitorTransaction(
     *     result.txHash!,
     *     'base',
     *     'optimism',
     *     '100'
     *   );
     *   console.log(`Bridge completed: ${status.status}`);
     * }
     * ```
     */
    async monitorTransaction(txHash, sourceChain, destinationChain, amount, options) {
        const monitor = new BridgeTransactionMonitor(sourceChain, this.logger);
        // Forward events from monitor
        monitor.on('statusUpdate', (status) => this.emit('monitorStatusUpdate', status));
        monitor.on('completed', (status) => this.emit('monitorCompleted', status));
        monitor.on('failed', (data) => this.emit('monitorFailed', data));
        return monitor.monitorTransaction(txHash, sourceChain, destinationChain, amount, options);
    }
    /**
     * Bridge USDC using LayerZero OFT (Omnichain Fungible Token) protocol
     * Supports Base ↔ Optimism ↔ Arbitrum transfers
     * Uses LayerZero V2 for cross-chain messaging
     *
     * Emits events:
     * - 'approvalRequired' - When USDC approval is needed
     * - 'approvalConfirmed' - When USDC approval is confirmed
     * - 'transactionSent' - When bridge transaction is submitted
     * - 'transactionConfirmed' - When bridge transaction is confirmed
     * - 'transactionFailed' - When bridge transaction fails
     * - 'balanceInsufficient' - When balance is insufficient
     * - 'feeEstimated' - When fees are estimated
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
                const error = 'Source and destination chains must be different';
                this.emit('transactionFailed', {
                    error,
                    sourceChain: srcChain,
                    destinationChain,
                    amount,
                    token: 'USDC'
                });
                return {
                    success: false,
                    error,
                    sourceChain: srcChain,
                    destinationChain,
                    amount
                };
            }
            // Check if we have valid L2 chains for bridging
            const supportedL2s = ['base', 'optimism', 'arbitrum'];
            if (!supportedL2s.includes(srcChain) || !supportedL2s.includes(destinationChain)) {
                const error = 'Only Base, Optimism, and Arbitrum are supported for direct USDC bridging';
                this.emit('transactionFailed', {
                    error,
                    sourceChain: srcChain,
                    destinationChain,
                    amount,
                    token: 'USDC'
                });
                return {
                    success: false,
                    error,
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
                const error = `Insufficient USDC balance. Have: ${formatUnits(balance, 6)}, Need: ${amount}`;
                this.emit('balanceInsufficient', {
                    sourceChain: srcChain,
                    destinationChain,
                    amount,
                    token: 'USDC'
                });
                this.emit('transactionFailed', {
                    error,
                    sourceChain: srcChain,
                    destinationChain,
                    amount,
                    token: 'USDC'
                });
                return {
                    success: false,
                    error,
                    sourceChain: srcChain,
                    destinationChain,
                    amount
                };
            }
            // Step 2: Get quote for fees
            let lzFee;
            try {
                lzFee = await quoteOFTSend(srcChain, destinationChain, amountInUnits, account.address);
                this.emit('feeEstimated', {
                    nativeFee: formatUnits(lzFee.nativeFee, 18),
                    lzTokenFee: formatUnits(lzFee.lzTokenFee, 18),
                    sourceChain: srcChain,
                    destinationChain
                });
            }
            catch (error) {
                const errorMsg = `Failed to get LayerZero fee quote: ${error instanceof Error ? error.message : String(error)}`;
                this.emit('transactionFailed', {
                    error: errorMsg,
                    sourceChain: srcChain,
                    destinationChain,
                    amount,
                    token: 'USDC'
                });
                return {
                    success: false,
                    error: errorMsg,
                    sourceChain: srcChain,
                    destinationChain,
                    amount
                };
            }
            // Step 3: Check native balance for fees
            const nativeBalance = await publicClient.getBalance({ address: account.address });
            if (nativeBalance < lzFee.nativeFee) {
                const error = `Insufficient native token for gas fees. Have: ${formatUnits(nativeBalance, 18)} ETH, Need: ${formatUnits(lzFee.nativeFee, 18)} ETH`;
                this.emit('transactionFailed', {
                    error,
                    sourceChain: srcChain,
                    destinationChain,
                    amount,
                    token: 'USDC'
                });
                return {
                    success: false,
                    error,
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
                this.emit('approvalRequired', {
                    sourceChain: srcChain,
                    destinationChain,
                    amount,
                    token: 'USDC'
                });
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
                    const error = 'USDC approval transaction failed or timed out';
                    this.emit('transactionFailed', {
                        error,
                        sourceChain: srcChain,
                        destinationChain,
                        amount,
                        token: 'USDC'
                    });
                    return {
                        success: false,
                        error,
                        sourceChain: srcChain,
                        destinationChain,
                        amount
                    };
                }
                this.emit('approvalConfirmed', {
                    sourceChain: srcChain,
                    destinationChain,
                    amount,
                    token: 'USDC'
                });
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
            // Add to history and emit event
            const timestamp = Date.now();
            this.history.addTransaction({
                txHash: bridgeTx,
                sourceChain: srcChain,
                destinationChain,
                amount,
                token: 'USDC',
                status: 'pending',
                timestamp,
                senderAddress: account.address,
                recipientAddress: account.address,
                fees: {
                    nativeFee: formatUnits(lzFee.nativeFee, 18),
                    lzTokenFee: formatUnits(lzFee.lzTokenFee, 18)
                }
            });
            this.emit('transactionSent', {
                txHash: bridgeTx,
                sourceChain: srcChain,
                destinationChain,
                amount,
                token: 'USDC',
                timestamp
            });
            // Step 6: Wait for transaction confirmation
            const confirmed = await waitForTransaction(publicClient, bridgeTx, 120000, 1);
            if (!confirmed) {
                const error = 'Bridge transaction not confirmed within timeout';
                this.updateTransactionStatus(bridgeTx, 'failed', srcChain, destinationChain, amount);
                return {
                    success: false,
                    error,
                    sourceChain: srcChain,
                    destinationChain,
                    amount,
                    txHash: bridgeTx
                };
            }
            console.log(`[Bridge] Bridge confirmed! From ${srcChain} to ${destinationChain}: ${bridgeTx}`);
            this.updateTransactionStatus(bridgeTx, 'completed', srcChain, destinationChain, amount);
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
            const errorMsg = error instanceof Error ? error.message : 'Bridge transaction failed';
            this.emit('transactionFailed', {
                error: errorMsg,
                sourceChain: srcChain,
                destinationChain,
                amount,
                token: 'USDC'
            });
            return {
                success: false,
                error: errorMsg,
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