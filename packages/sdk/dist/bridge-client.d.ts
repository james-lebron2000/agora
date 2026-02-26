/**
 * Bridge Client for Agora
 * A simplified, high-level client-side wrapper for the Cross-Chain Bridge
 * Provides an easy-to-use interface for bridging tokens across chains
 */
import { type Hex, type Address } from 'viem';
import { EventEmitter } from 'events';
import { BridgeAnalytics, BridgeError, type SupportedChain, type SupportedToken, type BridgeQuote, type BridgeTransaction, type BridgeTransactionStatus, type BridgeTransactionStatusDetails, type BridgeResult, type BridgeStatistics, type BridgeEventType, type BridgeEventData, type BridgeFeeEstimate, type BridgeTransactionFilter, SUPPORTED_CHAINS, SUPPORTED_TOKENS, TOKEN_DECIMALS, TOKEN_ADDRESSES, RPC_URLS } from './bridge.js';
export type { SupportedChain, SupportedToken, BridgeQuote, BridgeTransaction, BridgeTransactionStatus, BridgeTransactionStatusDetails, BridgeResult, BridgeStatistics, BridgeEventType, BridgeEventData, BridgeFeeEstimate, BridgeTransactionFilter };
export { SUPPORTED_CHAINS, SUPPORTED_TOKENS, TOKEN_DECIMALS, TOKEN_ADDRESSES, RPC_URLS };
/**
 * Configuration options for BridgeClient
 */
export interface BridgeClientConfig {
    /** Private key for the wallet (required) */
    privateKey: Hex;
    /** Optional custom RPC URLs for specific chains */
    customRpcUrls?: Partial<Record<SupportedChain, string>>;
    /** Enable debug logging */
    debug?: boolean;
    /** Default source chain */
    defaultSourceChain?: SupportedChain;
    /** Default destination chain */
    defaultDestinationChain?: SupportedChain;
    /** Default token to bridge */
    defaultToken?: SupportedToken;
    /** Analytics configuration */
    analytics?: {
        enabled: boolean;
        maxHistoryDays?: number;
    };
}
/**
 * Bridge operation options
 */
export interface BridgeOptions {
    /** Source chain */
    sourceChain?: SupportedChain;
    /** Destination chain */
    destinationChain?: SupportedChain;
    /** Token to bridge */
    token?: SupportedToken;
    /** Amount to bridge */
    amount: string;
    /** Maximum slippage percentage (default: 0.5%) */
    maxSlippage?: number;
    /** Enable transaction monitoring */
    monitor?: boolean;
    /** Callback for status updates */
    onStatusUpdate?: (status: BridgeTransactionStatusDetails) => void;
    /** Callback for completion */
    onComplete?: (result: BridgeResult) => void;
    /** Callback for errors */
    onError?: (error: BridgeError) => void;
}
/**
 * Quote options
 */
export interface QuoteOptions {
    /** Source chain */
    sourceChain?: SupportedChain;
    /** Destination chain */
    destinationChain?: SupportedChain;
    /** Token to bridge */
    token?: SupportedToken;
    /** Amount to bridge */
    amount: string;
}
/**
 * Balance information
 */
export interface BalanceInfo {
    chain: SupportedChain;
    nativeBalance: string;
    tokenBalances: Partial<Record<SupportedToken, string>>;
}
/**
 * BridgeClient - High-level client for cross-chain bridging
 *
 * @example
 * ```typescript
 * const client = new BridgeClient({
 *   privateKey: '0x...',
 *   defaultSourceChain: 'base',
 *   defaultDestinationChain: 'optimism',
 *   defaultToken: 'USDC'
 * });
 *
 * // Get a quote
 * const quote = await client.getQuote({ amount: '100' });
 * console.log(`Fee: ${quote.estimatedFee}`);
 *
 * // Execute bridge
 * const result = await client.bridge({
 *   amount: '100',
 *   onStatusUpdate: (status) => console.log(status.status),
 *   onComplete: (result) => console.log(`Completed: ${result.txHash}`)
 * });
 * ```
 */
export declare class BridgeClient extends EventEmitter {
    private bridge;
    private history;
    private analytics;
    private monitor;
    private config;
    private address;
    /**
     * Create a new BridgeClient instance
     * @param config - Bridge client configuration
     */
    constructor(config: BridgeClientConfig);
    /**
     * Create a logger for the bridge
     */
    private createLogger;
    /**
     * Forward events from the underlying bridge
     */
    private setupEventForwarding;
    /**
     * Get the wallet address
     */
    getAddress(): Address;
    /**
     * Get a bridge quote
     * @param options - Quote options
     * @returns Bridge quote with fee estimates
     */
    getQuote(options: QuoteOptions): Promise<BridgeQuote>;
    /**
     * Get quotes for all possible routes
     * @param amount - Amount to bridge
     * @param token - Token to bridge
     * @returns Array of quotes for all valid routes
     */
    getAllQuotes(amount: string, token?: SupportedToken): Promise<Array<BridgeQuote & {
        valid: boolean;
        error?: string;
    }>>;
    /**
     * Estimate bridge fees
     * @param destinationChain - Target chain
     * @param token - Token to bridge
     * @param amount - Amount to bridge
     * @param sourceChain - Source chain (optional)
     * @returns Detailed fee estimate
     */
    estimateFee(destinationChain: SupportedChain, token: SupportedToken, amount: string, sourceChain?: SupportedChain): Promise<BridgeFeeEstimate>;
    /**
     * Execute a bridge transaction
     * @param options - Bridge options
     * @returns Bridge result with transaction hash
     */
    bridge(options: BridgeOptions): Promise<BridgeResult>;
    /**
     * Bridge with automatic route optimization
     * @param destinationChain - Target chain
     * @param token - Token to bridge
     * @param amount - Amount to bridge
     * @param criteria - Optimization criteria
     * @returns Bridge result
     */
    bridgeWithOptimalRoute(destinationChain: SupportedChain, token: SupportedToken, amount: string, criteria?: 'cheapest' | 'fastest' | 'most_reliable'): Promise<BridgeResult>;
    /**
     * Find the optimal route for bridging
     * @param destinationChain - Target chain
     * @param token - Token to bridge
     * @param amount - Amount to bridge
     * @param criteria - Optimization criteria
     * @returns Optimal route information
     */
    findOptimalRoute(destinationChain: SupportedChain, token: SupportedToken, amount: string, criteria?: 'cheapest' | 'fastest' | 'most_reliable'): Promise<{
        sourceChain: SupportedChain;
        destinationChain: SupportedChain;
        estimatedFee: string;
        estimatedTime: number;
        score: number;
        reason: string;
    }>;
    /**
     * Compare all available routes
     * @param destinationChain - Target chain
     * @param token - Token to bridge
     * @param amount - Amount to bridge
     * @returns Array of route comparisons
     */
    compareRoutes(destinationChain: SupportedChain, token: SupportedToken, amount: string): Promise<Array<{
        sourceChain: SupportedChain;
        estimatedFee: string;
        estimatedTime: number;
        ranking: number;
    }>>;
    /**
     * Monitor a bridge transaction
     */
    private monitorTransaction;
    /**
     * Wait for a bridge transaction to complete
     * @param txHash - Transaction hash
     * @param sourceChain - Source chain
     * @param destinationChain - Destination chain
     * @param timeoutMs - Timeout in milliseconds
     * @returns Final transaction status
     */
    waitForCompletion(txHash: Hex, sourceChain: SupportedChain, destinationChain: SupportedChain, timeoutMs?: number): Promise<BridgeTransactionStatusDetails>;
    /**
     * Get token balance on a specific chain
     * @param chain - Chain to check
     * @param token - Token to check
     * @returns Balance as string
     */
    getBalance(chain: SupportedChain, token: SupportedToken): Promise<string>;
    /**
     * Get native token balance on a specific chain
     * @param chain - Chain to check
     * @returns Native balance as string (in ETH)
     */
    getNativeBalance(chain: SupportedChain): Promise<string>;
    /**
     * Get all balances across all chains
     * @returns Balance information for all chains
     */
    getAllBalances(): Promise<BalanceInfo[]>;
    /**
     * Get total balance of a token across all chains
     * @param token - Token to sum
     * @returns Total balance as string
     */
    getTotalBalance(token: SupportedToken): Promise<string>;
    /**
     * Get chain with highest balance for a specific token
     * @param token - Token to check
     * @returns Chain with highest balance
     */
    getChainWithHighestBalance(token: SupportedToken): Promise<{
        chain: SupportedChain;
        balance: string;
    } | null>;
    /**
     * Check if wallet has sufficient balance
     * @param chain - Chain to check
     * @param token - Token to check
     * @param amount - Required amount
     * @returns True if sufficient balance
     */
    hasSufficientBalance(chain: SupportedChain, token: SupportedToken, amount: string): Promise<boolean>;
    /**
     * Get transaction history
     * @param chain - Optional chain filter
     * @returns Array of bridge transactions
     */
    getTransactionHistory(chain?: SupportedChain): BridgeTransaction[];
    /**
     * Get pending transactions
     * @returns Array of pending transactions
     */
    getPendingTransactions(): BridgeTransaction[];
    /**
     * Get transaction by hash
     * @param txHash - Transaction hash
     * @returns Transaction or undefined
     */
    getTransaction(txHash: Hex): BridgeTransaction | undefined;
    /**
     * Get bridge statistics
     * @returns Bridge statistics
     */
    getStatistics(): Promise<BridgeStatistics>;
    /**
     * Get fee trends for a route
     * @param sourceChain - Source chain
     * @param destinationChain - Destination chain
     * @param token - Token
     * @returns Fee trend data
     */
    getFeeTrends(sourceChain: SupportedChain, destinationChain: SupportedChain, token: SupportedToken): ReturnType<BridgeAnalytics['getFeeTrends']>;
    /**
     * Get supported chains
     */
    getSupportedChains(): SupportedChain[];
    /**
     * Get supported tokens
     */
    getSupportedTokens(): SupportedToken[];
    /**
     * Check if a chain is supported
     * @param chain - Chain to check
     */
    isChainSupported(chain: string): chain is SupportedChain;
    /**
     * Check if a token is supported
     * @param token - Token to check
     */
    isTokenSupported(token: string): token is SupportedToken;
    /**
     * Get the cheapest chain for operations
     */
    findCheapestChain(operation?: 'send' | 'swap' | 'contract'): Promise<{
        chain: SupportedChain;
        estimatedCost: string;
    }>;
    /**
     * Disconnect and cleanup resources
     */
    disconnect(): void;
}
/**
 * Create a BridgeClient instance
 * @param config - Bridge client configuration
 * @returns BridgeClient instance
 *
 * @example
 * ```typescript
 * const client = createBridgeClient({
 *   privateKey: process.env.PRIVATE_KEY as Hex,
 *   defaultSourceChain: 'base',
 *   defaultDestinationChain: 'optimism'
 * });
 *
 * const quote = await client.getQuote({ amount: '100' });
 * ```
 */
export declare function createBridgeClient(config: BridgeClientConfig): BridgeClient;
/**
 * Quick bridge function for one-off transfers
 * @param privateKey - Wallet private key
 * @param sourceChain - Source chain
 * @param destinationChain - Destination chain
 * @param token - Token to bridge
 * @param amount - Amount to bridge
 * @returns Bridge result
 *
 * @example
 * ```typescript
 * const result = await quickBridge(
 *   '0x...',
 *   'base',
 *   'optimism',
 *   'USDC',
 *   '100'
 * );
 *
 * if (result.success) {
 *   console.log(`Bridged! Tx: ${result.txHash}`);
 * }
 * ```
 */
export declare function quickBridge(privateKey: Hex, sourceChain: SupportedChain, destinationChain: SupportedChain, token: SupportedToken, amount: string): Promise<BridgeResult>;
/**
 * Get a quick quote without creating a client
 * @param sourceChain - Source chain
 * @param destinationChain - Destination chain
 * @param token - Token to bridge
 * @param amount - Amount to bridge
 * @param address - Wallet address (optional, for accurate quotes)
 * @returns Bridge quote
 */
export declare function quickQuote(sourceChain: SupportedChain, destinationChain: SupportedChain, token: SupportedToken, amount: string, address?: Address): Promise<BridgeQuote>;
/**
 * Check balances across all chains
 * @param address - Wallet address
 * @returns Balance information
 */
export declare function checkBalances(address: Address): Promise<BalanceInfo[]>;
export default BridgeClient;
//# sourceMappingURL=bridge-client.d.ts.map