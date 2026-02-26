/**
 * Bridge Client for Agora
 * A simplified, high-level client-side wrapper for the Cross-Chain Bridge
 * Provides an easy-to-use interface for bridging tokens across chains
 */

import {
  type Hex,
  type Address,
  parseUnits,
  formatUnits
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { EventEmitter } from 'events';

// Import from bridge module
import {
  CrossChainBridge,
  BridgeTransactionHistory,
  BridgeAnalytics,
  CoinGeckoPriceOracle,
  BridgeTransactionMonitor,
  BridgeError,
  type SupportedChain,
  type SupportedToken,
  type BridgeQuote,
  type BridgeTransaction,
  type BridgeTransactionStatusDetails,
  type BridgeResult,
  type BridgeStatistics,
  type BridgeEventType,
  type BridgeEventData,
  type BridgeFeeEstimate,
  type BridgeTransactionFilter,
  SUPPORTED_CHAINS,
  SUPPORTED_TOKENS,
  TOKEN_DECIMALS,
  TOKEN_ADDRESSES,
  RPC_URLS,
  getBridgeQuote,
  getBridgeHistory,
  estimateBridgeFee,
  getTokenBalance,
  getAllTokenBalances,
  createChainPublicClient
} from './bridge.js';

// Re-export types for convenience
export type {
  SupportedChain,
  SupportedToken,
  BridgeQuote,
  BridgeTransaction,
  BridgeTransactionStatusDetails,
  BridgeResult,
  BridgeStatistics,
  BridgeEventType,
  BridgeEventData,
  BridgeFeeEstimate,
  BridgeTransactionFilter
};

// Export constants
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
export class BridgeClient extends EventEmitter {
  private bridgeInstance: CrossChainBridge;
  private history: BridgeTransactionHistory;
  private analytics: BridgeAnalytics;
  private monitor: BridgeTransactionMonitor;
  private config: BridgeClientConfig;
  private address: Address;

  /**
   * Create a new BridgeClient instance
   * @param config - Bridge client configuration
   */
  constructor(config: BridgeClientConfig) {
    super();
    
    this.config = {
      debug: false,
      defaultSourceChain: 'base',
      defaultDestinationChain: 'optimism',
      defaultToken: 'USDC',
      analytics: { enabled: true, maxHistoryDays: 30 },
      ...config
    };

    // Get wallet address
    const account = privateKeyToAccount(config.privateKey);
    this.address = account.address;

    // Initialize bridge with default chain and logger
    this.bridgeInstance = new CrossChainBridge(
      config.privateKey,
      this.config.defaultSourceChain,
      this.createLogger()
    );

    // Initialize history
    this.history = new BridgeTransactionHistory(this.address);

    // Initialize analytics
    this.analytics = new BridgeAnalytics(this.address, {
      enableFeeTracking: this.config.analytics?.enabled ?? true,
      enableCompletionTimeTracking: this.config.analytics?.enabled ?? true,
      maxHistoryDays: this.config.analytics?.maxHistoryDays ?? 30
    });

    // Initialize monitor
    this.monitor = new BridgeTransactionMonitor(this.config.defaultSourceChain!);

    // Forward events from bridge
    this.setupEventForwarding();

    if (this.config.debug) {
      console.log(`[BridgeClient] Initialized for ${this.address}`);
    }
  }

  /**
   * Create a logger for the bridge
   */
  private createLogger() {
    return {
      debug: (message: string, data?: any) => {
        if (this.config.debug) {
          console.log(`[Bridge] ${message}`, data || '');
        }
      },
      info: (message: string, data?: any) => {
        console.log(`[Bridge] ${message}`, data || '');
      },
      warn: (message: string, data?: any) => {
        console.warn(`[Bridge] ${message}`, data || '');
      },
      error: (message: string, data?: any) => {
        console.error(`[Bridge] ${message}`, data || '');
      }
    };
  }

  /**
   * Forward events from the underlying bridge
   */
  private setupEventForwarding(): void {
    const events: BridgeEventType[] = [
      'quoteReceived',
      'transactionSent',
      'transactionConfirmed',
      'transactionFailed',
      'approvalRequired',
      'approvalConfirmed',
      'balanceInsufficient',
      'feeEstimated',
      'monitoringStarted',
      'monitorStatusUpdate',
      'monitorCompleted',
      'monitorFailed'
    ];

    for (const event of events) {
      this.bridgeInstance.on(event, (data: BridgeEventData) => {
        this.emit(event, data);
      });
    }
  }

  /**
   * Get the wallet address
   */
  getAddress(): Address {
    return this.address;
  }

  /**
   * Get a bridge quote
   * @param options - Quote options
   * @returns Bridge quote with fee estimates
   */
  async getQuote(options: QuoteOptions): Promise<BridgeQuote> {
    const sourceChain = options.sourceChain ?? this.config.defaultSourceChain!;
    const destinationChain = options.destinationChain ?? this.config.defaultDestinationChain!;
    const token = options.token ?? this.config.defaultToken!;

    if (!sourceChain || !destinationChain || !token) {
      throw new BridgeError(
        'Source chain, destination chain, and token must be specified',
        'INVALID_PARAMS'
      );
    }

    return this.bridgeInstance.getQuote(destinationChain, token, options.amount, sourceChain);
  }

  /**
   * Get quotes for all possible routes
   * @param amount - Amount to bridge
   * @param token - Token to bridge
   * @returns Array of quotes for all valid routes
   */
  async getAllQuotes(
    amount: string,
    token?: SupportedToken
  ): Promise<Array<BridgeQuote & { valid: boolean; error?: string }>> {
    const chains: SupportedChain[] = ['ethereum', 'base', 'optimism', 'arbitrum'];
    const targetToken = token ?? this.config.defaultToken!;

    const quotes = await Promise.all(
      chains.flatMap(sourceChain =>
        chains
          .filter(destChain => destChain !== sourceChain)
          .map(async destinationChain => {
            try {
              const quote = await this.getQuote({
                sourceChain,
                destinationChain,
                token: targetToken,
                amount
              });
              return { ...quote, valid: true };
            } catch (error) {
              return {
                sourceChain,
                destinationChain,
                token: targetToken,
                amount,
                estimatedFee: '0',
                estimatedTime: 0,
                valid: false,
                error: error instanceof Error ? error.message : String(error)
              } as BridgeQuote & { valid: boolean; error?: string };
            }
          })
      )
    );

    return quotes;
  }

  /**
   * Estimate bridge fees
   * @param destinationChain - Target chain
   * @param token - Token to bridge
   * @param amount - Amount to bridge
   * @param sourceChain - Source chain (optional)
   * @returns Detailed fee estimate
   */
  async estimateFee(
    destinationChain: SupportedChain,
    token: SupportedToken,
    amount: string,
    sourceChain?: SupportedChain
  ): Promise<BridgeFeeEstimate> {
    return this.bridgeInstance.estimateFee(
      destinationChain,
      token,
      amount,
      sourceChain ?? this.config.defaultSourceChain
    );
  }

  /**
   * Execute a bridge transaction
   * @param options - Bridge options
   * @returns Bridge result with transaction hash
   */
  async executeBridge(options: BridgeOptions): Promise<BridgeResult> {
    const sourceChain = options.sourceChain ?? this.config.defaultSourceChain!;
    const destinationChain = options.destinationChain ?? this.config.defaultDestinationChain!;
    const token = options.token ?? this.config.defaultToken!;

    if (!sourceChain || !destinationChain || !token) {
      throw new BridgeError(
        'Source chain, destination chain, and token must be specified',
        'INVALID_PARAMS'
      );
    }

    // Check balance first
    const balance = await this.getBalance(sourceChain, token);
    const requiredAmount = parseUnits(options.amount, TOKEN_DECIMALS[token]);
    
    if (BigInt(parseUnits(balance, TOKEN_DECIMALS[token])) < requiredAmount) {
      const error = new BridgeError(
        `Insufficient ${token} balance on ${sourceChain}. Have: ${balance}, Need: ${options.amount}`,
        'INSUFFICIENT_BALANCE'
      );
      
      if (options.onError) {
        options.onError(error);
      }
      
      throw error;
    }

    // Execute the bridge using the bridgeToken method
    const result = await this.bridgeInstance.bridgeToken(
      destinationChain,
      token,
      options.amount,
      sourceChain
    );

    if (!result.success) {
      const error = new BridgeError(
        result.error || 'Bridge transaction failed',
        'TRANSACTION_FAILED'
      );
      
      if (options.onError) {
        options.onError(error);
      }
      
      throw error;
    }

    // Add to history
    if (result.txHash) {
      this.history.addTransaction({
        txHash: result.txHash,
        sourceChain,
        destinationChain,
        amount: options.amount,
        token,
        status: 'pending',
        timestamp: Date.now(),
        fees: result.fees,
        senderAddress: this.address,
        recipientAddress: this.address
      });
    }

    // Monitor if requested
    if (options.monitor && result.txHash) {
      this.monitorTransaction(
        result.txHash,
        sourceChain,
        destinationChain,
        options.amount,
        options.onStatusUpdate,
        options.onComplete,
        options.onError
      );
    } else if (options.onComplete) {
      options.onComplete(result);
    }

    return result;
  }

  /**
   * Bridge with automatic route optimization
   * @param destinationChain - Target chain
   * @param token - Token to bridge
   * @param amount - Amount to bridge
   * @param criteria - Optimization criteria
   * @returns Bridge result
   */
  async bridgeWithOptimalRoute(
    destinationChain: SupportedChain,
    token: SupportedToken,
    amount: string,
    criteria: 'cheapest' | 'fastest' | 'most_reliable' = 'cheapest'
  ): Promise<BridgeResult> {
    const route = await this.findOptimalRoute(destinationChain, token, amount, criteria);
    
    console.log(`[BridgeClient] Using optimal route: ${route.sourceChain} -> ${destinationChain}`);
    console.log(`[BridgeClient] Reason: ${route.reason}`);
    
    return this.executeBridge({
      sourceChain: route.sourceChain,
      destinationChain,
      token,
      amount
    });
  }

  /**
   * Find the optimal route for bridging
   * @param destinationChain - Target chain
   * @param token - Token to bridge
   * @param amount - Amount to bridge
   * @param criteria - Optimization criteria
   * @returns Optimal route information
   */
  async findOptimalRoute(
    destinationChain: SupportedChain,
    token: SupportedToken,
    amount: string,
    criteria: 'cheapest' | 'fastest' | 'most_reliable' = 'cheapest'
  ): Promise<{
    sourceChain: SupportedChain;
    destinationChain: SupportedChain;
    estimatedFee: string;
    estimatedTime: number;
    score: number;
    reason: string;
  }> {
    return this.bridgeInstance.findOptimalRoute(destinationChain, token, amount, criteria);
  }

  /**
   * Compare all available routes
   * @param destinationChain - Target chain
   * @param token - Token to bridge
   * @param amount - Amount to bridge
   * @returns Array of route comparisons
   */
  async compareRoutes(
    destinationChain: SupportedChain,
    token: SupportedToken,
    amount: string
  ): Promise<Array<{
    sourceChain: SupportedChain;
    estimatedFee: string;
    estimatedTime: number;
    ranking: number;
  }>> {
    return this.bridgeInstance.compareRoutes(destinationChain, token, amount);
  }

  /**
   * Monitor a bridge transaction
   */
  private monitorTransaction(
    txHash: Hex,
    sourceChain: SupportedChain,
    destinationChain: SupportedChain,
    amount: string,
    onStatusUpdate?: (status: BridgeTransactionStatusDetails) => void,
    onComplete?: (result: BridgeResult) => void,
    onError?: (error: BridgeError) => void
  ): void {
    // Monitor using the bridge's monitorTransaction method
    this.bridgeInstance.monitorTransaction(txHash, sourceChain, destinationChain, amount)
      .then((status) => {
        // Update history
        this.history.updateTransactionStatus(txHash, status.status);
        
        // Track in analytics
        this.analytics.trackTransaction({
          txHash,
          sourceChain,
          destinationChain,
          token: 'USDC', // Default token
          amount
        });

        if (onStatusUpdate) {
          onStatusUpdate(status);
        }
        
        if (onComplete && status.status === 'completed') {
          onComplete({
            success: true,
            txHash,
            sourceChain,
            destinationChain,
            amount
          });
        }
      })
      .catch((error) => {
        this.history.updateTransactionStatus(txHash, 'failed');
        
        if (onStatusUpdate) {
          onStatusUpdate({
            txHash,
            sourceChain,
            destinationChain,
            status: 'failed',
            stage: 'source',
            progress: 0,
            requiredConfirmations: 1,
            estimatedCompletionTime: 0,
            retryCount: 0,
            lastUpdated: Date.now(),
            error: error instanceof Error ? error.message : String(error)
          } as BridgeTransactionStatusDetails);
        }
        
        if (onError) {
          onError(error instanceof BridgeError ? error : new BridgeError(
            error instanceof Error ? error.message : String(error),
            'UNKNOWN_ERROR'
          ));
        }
      });
  }

  /**
   * Wait for a bridge transaction to complete
   * @param txHash - Transaction hash
   * @param sourceChain - Source chain
   * @param destinationChain - Destination chain
   * @param timeoutMs - Timeout in milliseconds
   * @returns Final transaction status
   */
  async waitForCompletion(
    txHash: Hex,
    sourceChain: SupportedChain,
    destinationChain: SupportedChain,
    timeoutMs: number = 300000
  ): Promise<BridgeTransactionStatusDetails> {
    return this.monitor.monitorTransaction(txHash, sourceChain, destinationChain, '', {
      timeout: timeoutMs,
      onStatusUpdate: undefined
    });
  }

  /**
   * Get token balance on a specific chain
   * @param chain - Chain to check
   * @param token - Token to check
   * @returns Balance as string
   */
  async getBalance(chain: SupportedChain, token: SupportedToken): Promise<string> {
    return getTokenBalance(this.address, chain, token);
  }

  /**
   * Get native token balance on a specific chain
   * @param chain - Chain to check
   * @returns Native balance as string (in ETH)
   */
  async getNativeBalance(chain: SupportedChain): Promise<string> {
    const client = createChainPublicClient(chain);
    const balance = await client.getBalance({ address: this.address });
    return formatUnits(balance, 18);
  }

  /**
   * Get all balances across all chains
   * @returns Balance information for all chains
   */
  async getAllBalances(): Promise<BalanceInfo[]> {
    const balances = await getAllTokenBalances(this.address);
    const balanceInfos: BalanceInfo[] = [];

    for (const [chain, tokenBalances] of Object.entries(balances)) {
      const nativeBalance = await this.getNativeBalance(chain as SupportedChain);
      balanceInfos.push({
        chain: chain as SupportedChain,
        nativeBalance,
        tokenBalances
      });
    }

    return balanceInfos;
  }

  /**
   * Get total balance of a token across all chains
   * @param token - Token to sum
   * @returns Total balance as string
   */
  async getTotalBalance(token: SupportedToken): Promise<string> {
    const balances = await getAllTokenBalances(this.address);
    
    let total = BigInt(0);
    for (const chainBalances of Object.values(balances)) {
      const balance = chainBalances[token];
      if (balance) {
        total += BigInt(parseUnits(balance, TOKEN_DECIMALS[token]));
      }
    }
    
    return formatUnits(total, TOKEN_DECIMALS[token]);
  }

  /**
   * Get chain with highest balance for a specific token
   * @param token - Token to check
   * @returns Chain with highest balance
   */
  async getChainWithHighestBalance(token: SupportedToken): Promise<{
    chain: SupportedChain;
    balance: string;
  } | null> {
    const balances = await getAllTokenBalances(this.address);
    
    let bestChain: SupportedChain | null = null;
    let bestBalance = BigInt(0);
    
    for (const [chain, chainBalances] of Object.entries(balances)) {
      const balance = chainBalances[token];
      if (balance) {
        const balanceBigInt = BigInt(parseUnits(balance, TOKEN_DECIMALS[token]));
        if (balanceBigInt > bestBalance) {
          bestBalance = balanceBigInt;
          bestChain = chain as SupportedChain;
        }
      }
    }
    
    if (!bestChain) return null;
    
    return {
      chain: bestChain,
      balance: formatUnits(bestBalance, TOKEN_DECIMALS[token])
    };
  }

  /**
   * Check if wallet has sufficient balance
   * @param chain - Chain to check
   * @param token - Token to check
   * @param amount - Required amount
   * @returns True if sufficient balance
   */
  async hasSufficientBalance(
    chain: SupportedChain,
    token: SupportedToken,
    amount: string
  ): Promise<boolean> {
    const balance = await this.getBalance(chain, token);
    return BigInt(parseUnits(balance, TOKEN_DECIMALS[token])) >= BigInt(parseUnits(amount, TOKEN_DECIMALS[token]));
  }

  /**
   * Get transaction history
   * @param chain - Optional chain filter
   * @returns Array of bridge transactions
   */
  getTransactionHistory(chain?: SupportedChain): BridgeTransaction[] {
    return this.history.getTransactions(chain ? { chain } : undefined);
  }

  /**
   * Get pending transactions
   * @returns Array of pending transactions
   */
  getPendingTransactions(): BridgeTransaction[] {
    return this.history.getPendingTransactions();
  }

  /**
   * Get transaction by hash
   * @param txHash - Transaction hash
   * @returns Transaction or undefined
   */
  getTransaction(txHash: Hex): BridgeTransaction | undefined {
    return this.history.getTransactionByHash(txHash);
  }

  /**
   * Get bridge statistics
   * @returns Bridge statistics
   */
  async getStatistics(): Promise<BridgeStatistics> {
    return this.analytics.getStatistics();
  }

  /**
   * Get fee trends for a route
   * @param sourceChain - Source chain
   * @param destinationChain - Destination chain
   * @param token - Token
   * @returns Fee trend data
   */
  getFeeTrends(
    sourceChain: SupportedChain,
    destinationChain: SupportedChain,
    token: SupportedToken
  ): ReturnType<BridgeAnalytics['getFeeTrends']> {
    return this.analytics.getFeeTrends(sourceChain, destinationChain, token);
  }

  /**
   * Get supported chains
   */
  getSupportedChains(): SupportedChain[] {
    return Object.keys(SUPPORTED_CHAINS) as SupportedChain[];
  }

  /**
   * Get supported tokens
   */
  getSupportedTokens(): SupportedToken[] {
    return [...SUPPORTED_TOKENS];
  }

  /**
   * Check if a chain is supported
   * @param chain - Chain to check
   */
  isChainSupported(chain: string): chain is SupportedChain {
    return chain in SUPPORTED_CHAINS;
  }

  /**
   * Check if a token is supported
   * @param token - Token to check
   */
  isTokenSupported(token: string): token is SupportedToken {
    return SUPPORTED_TOKENS.includes(token as SupportedToken);
  }

  /**
   * Get the cheapest chain for operations
   */
  async findCheapestChain(operation: 'send' | 'swap' | 'contract' = 'send'): Promise<{
    chain: SupportedChain;
    estimatedCost: string;
  }> {
    return this.bridgeInstance.findCheapestChain(operation);
  }

  /**
   * Disconnect and cleanup resources
   */
  disconnect(): void {
    this.monitor.removeAllListeners();
    this.bridgeInstance.removeAllListeners();
    this.removeAllListeners();
    
    if (this.config.debug) {
      console.log('[BridgeClient] Disconnected');
    }
  }
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
export function createBridgeClient(config: BridgeClientConfig): BridgeClient {
  return new BridgeClient(config);
}

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
export async function quickBridge(
  privateKey: Hex,
  sourceChain: SupportedChain,
  destinationChain: SupportedChain,
  token: SupportedToken,
  amount: string
): Promise<BridgeResult> {
  const client = new BridgeClient({ privateKey });
  
  try {
    const result = await client.executeBridge({
      sourceChain,
      destinationChain,
      token,
      amount
    });
    
    return result;
  } finally {
    client.disconnect();
  }
}

/**
 * Get a quick quote without creating a client
 * @param sourceChain - Source chain
 * @param destinationChain - Destination chain
 * @param token - Token to bridge
 * @param amount - Amount to bridge
 * @param address - Wallet address (optional, for accurate quotes)
 * @returns Bridge quote
 */
export async function quickQuote(
  sourceChain: SupportedChain,
  destinationChain: SupportedChain,
  token: SupportedToken,
  amount: string,
  address?: Address
): Promise<BridgeQuote> {
  return getBridgeQuote({
    sourceChain,
    destinationChain,
    token,
    amount
  }, address || '0x0000000000000000000000000000000000000000');
}

/**
 * Check balances across all chains
 * @param address - Wallet address
 * @returns Balance information
 */
export async function checkBalances(address: Address): Promise<BalanceInfo[]> {
  const balances = await getAllTokenBalances(address);
  
  const results: BalanceInfo[] = [];
  
  for (const [chain, tokenBalances] of Object.entries(balances)) {
    // Get native balance
    const client = createChainPublicClient(chain as SupportedChain);
    const nativeBalanceWei = await client.getBalance({ address });
    
    results.push({
      chain: chain as SupportedChain,
      nativeBalance: formatUnits(nativeBalanceWei, 18),
      tokenBalances
    });
  }
  
  return results;
}

export default BridgeClient;
