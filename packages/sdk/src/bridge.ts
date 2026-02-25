/**
 * Cross-Chain Bridge Module for Agora
 * Supports Base, Optimism, and Arbitrum chains
 * Uses LayerZero V2 for cross-chain messaging and USDC transfers via OFT (Omnichain Fungible Token)
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  type Hex,
  type Address
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, optimism, arbitrum, mainnet } from 'viem/chains';
import { EventEmitter } from 'events';

// Bridge event types
export type BridgeEventType = 
  | 'quoteReceived'
  | 'transactionSent'
  | 'transactionConfirmed'
  | 'transactionFailed'
  | 'approvalRequired'
  | 'approvalConfirmed'
  | 'balanceInsufficient'
  | 'feeEstimated';

// Bridge event data interfaces
export interface BridgeQuoteEvent {
  sourceChain: SupportedChain;
  destinationChain: SupportedChain;
  token: string;
  amount: string;
  estimatedFee: string;
  estimatedTime: number;
}

export interface BridgeTransactionEvent {
  txHash: Hex;
  sourceChain: SupportedChain;
  destinationChain: SupportedChain;
  amount: string;
  token: string;
  timestamp: number;
}

export interface BridgeErrorEvent {
  error: string;
  sourceChain: SupportedChain;
  destinationChain: SupportedChain;
  amount: string;
  token: string;
}

export interface BridgeFeeEvent {
  nativeFee: string;
  lzTokenFee: string;
  sourceChain: SupportedChain;
  destinationChain: SupportedChain;
}

export type BridgeEventData = 
  | BridgeQuoteEvent 
  | BridgeTransactionEvent 
  | BridgeErrorEvent 
  | BridgeFeeEvent 
  | { sourceChain: SupportedChain; destinationChain: SupportedChain; amount: string; token: string };

// Supported chains
export const SUPPORTED_CHAINS = { base, optimism, arbitrum, ethereum: mainnet } as const;
export type SupportedChain = keyof typeof SUPPORTED_CHAINS;

// USDC addresses
export const USDC_ADDRESSES: Record<SupportedChain, Address> = {
  ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  optimism: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

// LayerZero Endpoint addresses (V2)
export const LAYERZERO_ENDPOINTS: Record<SupportedChain, Address> = {
  ethereum: '0x1a44076050125825900e736c501f859c50fE728c',
  base: '0x1a44076050125825900e736c501f859c50fE728c',
  optimism: '0x1a44076050125825900e736c501f859c50fE728c',
  arbitrum: '0x1a44076050125825900e736c501f859c50fE728c'
};

// LayerZero EID (Endpoint ID) for V2
export const LAYERZERO_CHAIN_IDS: Record<SupportedChain, number> = {
  ethereum: 30101,
  base: 30184,
  optimism: 30111,
  arbitrum: 30110
};

// LayerZero USDC OFT Adapter addresses (V2)
// These are the actual LayerZero USDC standard OFT contracts
export const LAYERZERO_USDC_OFT: Record<SupportedChain, Address> = {
  ethereum: '0xF1BA1643132dE7EB30cBFF738946DA77195c3D1C',
  base: '0x27d7F516FF969a711E80e7Ae46BC0205C0bf8A65',
  optimism: '0xF1BA1643132dE7EB30cBFF738946DA77195c3D1C',
  arbitrum: '0xF1BA1643132dE7EB30cBFF738946DA77195c3D1C'
};

// Bridge quote interface
export interface BridgeQuote {
  sourceChain: SupportedChain;
  destinationChain: SupportedChain;
  token: string;
  amount: string;
  estimatedFee: string;
  estimatedTime: number; // in seconds
  path?: string[];
  lzFee?: {
    nativeFee: bigint;
    lzTokenFee: bigint;
  };
}

// Bridge transaction status
type BridgeTransactionStatus = 'pending' | 'completed' | 'failed';

// Bridge transaction interface
export interface BridgeTransaction {
  txHash: Hex;
  sourceChain: SupportedChain;
  destinationChain: SupportedChain;
  amount: string;
  token: string;
  status: BridgeTransactionStatus;
  timestamp: number;
  fees?: {
    nativeFee: string;
    lzTokenFee: string;
  };
  senderAddress: Address;
  recipientAddress: Address;
}

// Bridge transaction filter interface
export interface BridgeTransactionFilter {
  chain?: SupportedChain;
  status?: BridgeTransactionStatus;
  startTime?: number;
  endTime?: number;
}

// Bridge transaction history class with localStorage persistence
export class BridgeTransactionHistory {
  private storageKey: string;
  private transactions: BridgeTransaction[];

  constructor(address: Address) {
    this.storageKey = `bridge-history-${address.toLowerCase()}`;
    this.transactions = this.loadFromStorage();
  }

  private loadFromStorage(): BridgeTransaction[] {
    try {
      // Check if we're in a browser environment
      const storage = typeof globalThis !== 'undefined' && 'localStorage' in globalThis 
        ? (globalThis as any).localStorage 
        : null;
      if (!storage) return [];
      const stored = storage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveToStorage(): void {
    try {
      // Check if we're in a browser environment
      const storage = typeof globalThis !== 'undefined' && 'localStorage' in globalThis 
        ? (globalThis as any).localStorage 
        : null;
      if (!storage) return;
      storage.setItem(this.storageKey, JSON.stringify(this.transactions));
    } catch (error) {
      console.error('[BridgeHistory] Failed to save to storage:', error);
    }
  }

  addTransaction(tx: BridgeTransaction): void {
    // Check for duplicates
    const existingIndex = this.transactions.findIndex(
      t => t.txHash.toLowerCase() === tx.txHash.toLowerCase()
    );
    
    if (existingIndex >= 0) {
      // Update existing transaction
      this.transactions[existingIndex] = { ...this.transactions[existingIndex], ...tx };
    } else {
      // Add new transaction at the beginning
      this.transactions.unshift(tx);
    }
    
    // Keep only last 100 transactions
    if (this.transactions.length > 100) {
      this.transactions = this.transactions.slice(0, 100);
    }
    
    this.saveToStorage();
  }

  getTransactions(filter?: BridgeTransactionFilter): BridgeTransaction[] {
    let result = [...this.transactions];

    if (filter) {
      if (filter.chain) {
        result = result.filter(
          t => t.sourceChain === filter.chain || t.destinationChain === filter.chain
        );
      }
      if (filter.status) {
        result = result.filter(t => t.status === filter.status);
      }
      if (filter.startTime) {
        result = result.filter(t => t.timestamp >= filter.startTime!);
      }
      if (filter.endTime) {
        result = result.filter(t => t.timestamp <= filter.endTime!);
      }
    }

    return result;
  }

  getTransactionByHash(txHash: Hex): BridgeTransaction | undefined {
    return this.transactions.find(
      t => t.txHash.toLowerCase() === txHash.toLowerCase()
    );
  }

  updateTransactionStatus(txHash: Hex, status: BridgeTransactionStatus): boolean {
    const index = this.transactions.findIndex(
      t => t.txHash.toLowerCase() === txHash.toLowerCase()
    );
    
    if (index >= 0) {
      this.transactions[index].status = status;
      this.saveToStorage();
      return true;
    }
    return false;
  }

  clearHistory(): void {
    this.transactions = [];
    this.saveToStorage();
  }

  getPendingTransactions(): BridgeTransaction[] {
    return this.transactions.filter(t => t.status === 'pending');
  }

  getTransactionCount(): number {
    return this.transactions.length;
  }
}

// Get bridge history for an address
export function getBridgeHistory(
  address: Address,
  chain?: SupportedChain
): BridgeTransaction[] {
  const history = new BridgeTransactionHistory(address);
  return history.getTransactions(chain ? { chain } : undefined);
}

// RPC endpoints
export const RPC_URLS: Record<SupportedChain, string[]> = {
  ethereum: ['https://eth.llamarpc.com', 'https://rpc.ankr.com/eth'],
  base: ['https://base.llamarpc.com', 'https://mainnet.base.org'],
  optimism: ['https://optimism.llamarpc.com', 'https://mainnet.optimism.io'],
  arbitrum: ['https://arbitrum.llamarpc.com', 'https://arb1.arbitrum.io/rpc']
};

export interface ChainBalance {
  chain: SupportedChain;
  nativeBalance: string;
  usdcBalance: string;
}

export interface BridgeResult {
  success: boolean;
  txHash?: Hex;
  error?: string;
  sourceChain: SupportedChain;
  destinationChain: SupportedChain;
  amount: string;
  fees?: {
    nativeFee: string;
    lzTokenFee: string;
  };
}

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
] as const;

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
] as const;

/**
 * Create public client for chain
 */
export function createChainPublicClient(chain: SupportedChain) {
  return createPublicClient({
    chain: SUPPORTED_CHAINS[chain],
    transport: http(RPC_URLS[chain][0])
  });
}

/**
 * Get USDC balance
 */
export async function getUSDCBalance(address: Address, chain: SupportedChain): Promise<string> {
  const client = createChainPublicClient(chain);
  
  try {
    const balance = await client.readContract({
      address: USDC_ADDRESSES[chain],
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [address]
    });
    return formatUnits(balance, 6);
  } catch (error) {
    console.error(`[Bridge] Failed to get USDC balance on ${chain}:`, error);
    return '0';
  }
}

/**
 * Get native token balance
 */
export async function getNativeBalance(address: Address, chain: SupportedChain): Promise<string> {
  const client = createChainPublicClient(chain);
  try {
    const balance = await client.getBalance({ address });
    return formatUnits(balance, 18);
  } catch (error) {
    console.error(`[Bridge] Failed to get native balance on ${chain}:`, error);
    return '0';
  }
}

/**
 * Get all balances across chains
 */
export async function getAllBalances(address: Address): Promise<ChainBalance[]> {
  const chains: SupportedChain[] = ['ethereum', 'base', 'optimism', 'arbitrum'];
  const balances: ChainBalance[] = [];
  
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
async function quoteOFTSend(
  sourceChain: SupportedChain,
  destinationChain: SupportedChain,
  amount: bigint,
  recipient: Address
): Promise<{ nativeFee: bigint; lzTokenFee: bigint }> {
  const publicClient = createChainPublicClient(sourceChain);
  const oftAddress = LAYERZERO_USDC_OFT[sourceChain];
  const dstEid = LAYERZERO_CHAIN_IDS[destinationChain];
  
  // Convert address to bytes32
  const toBytes32 = ('0x' + recipient.slice(2).padStart(64, '0')) as `0x${string}`;
  
  // 0.5% slippage tolerance
  const minAmountLD = (amount * 995n) / 1000n;
  
  const sendParam = {
    dstEid,
    to: toBytes32,
    amountLD: amount,
    minAmountLD: minAmountLD,
    extraOptions: '0x' as `0x${string}`,
    composeMsg: '0x' as `0x${string}`,
    oftCmd: '0x' as `0x${string}`
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
export async function getBridgeQuote(
  params: {
    sourceChain: SupportedChain;
    destinationChain: SupportedChain;
    token: 'USDC' | 'ETH';
    amount: string;
  },
  senderAddress: Address
): Promise<BridgeQuote> {
  const { sourceChain, destinationChain, token, amount } = params;
  
  // Validate chains are different
  if (sourceChain === destinationChain) {
    throw new Error('Source and destination chains must be different');
  }
  
  let lzFee: { nativeFee: bigint; lzTokenFee: bigint } | undefined;
  
  // Get accurate LZ fee quote for USDC transfers
  if (token === 'USDC') {
    try {
      const amountInUnits = parseUnits(amount, 6);
      lzFee = await quoteOFTSend(sourceChain, destinationChain, amountInUnits, senderAddress);
    } catch (error) {
      console.warn(`[Bridge] Failed to get LZ fee quote:`, error);
    }
  }
  
  // Estimated time varies by route (in seconds)
  const timeEstimates: Record<string, number> = {
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
  let estimatedFee: string;
  if (lzFee) {
    // Convert native fee to ETH for display
    const nativeFeeEth = formatUnits(lzFee.nativeFee, 18);
    estimatedFee = nativeFeeEth;
  } else {
    // Fallback estimates
    const baseFees: Record<string, number> = {
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
export async function findCheapestChain(
  operation: 'send' | 'swap' | 'contract',
  excludeChains?: SupportedChain[]
): Promise<{ chain: SupportedChain; estimatedCost: string }> {
  const chains: SupportedChain[] = ['base', 'optimism', 'arbitrum'];
  const filtered = excludeChains ? chains.filter(c => !excludeChains.includes(c)) : chains;
  
  // Cost estimates in USD
  const costs: Record<string, number> = {
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
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
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
async function waitForTransaction(
  publicClient: any,
  txHash: Hex,
  timeoutMs: number = 60000,
  confirmations: number = 1
): Promise<boolean> {
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
    } catch {
      // Transaction not yet mined
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return false;
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
  private privateKey: Hex;
  private defaultChain: SupportedChain;
  private history: BridgeTransactionHistory;
  
  constructor(privateKey: Hex, defaultChain: SupportedChain = 'base') {
    super();
    this.privateKey = privateKey;
    this.defaultChain = defaultChain;
    const account = privateKeyToAccount(privateKey);
    this.history = new BridgeTransactionHistory(account.address);
  }

  /**
   * Subscribe to bridge events
   * @param event - Event type to listen for
   * @param listener - Callback function
   */
  on(event: BridgeEventType, listener: (data: BridgeEventData) => void): this {
    return super.on(event, listener);
  }

  /**
   * Subscribe to bridge events (one-time)
   * @param event - Event type to listen for
   * @param listener - Callback function
   */
  once(event: BridgeEventType, listener: (data: BridgeEventData) => void): this {
    return super.once(event, listener);
  }

  /**
   * Remove event listener
   * @param event - Event type
   * @param listener - Callback function to remove
   */
  off(event: BridgeEventType, listener: (data: BridgeEventData) => void): this {
    return super.off(event, listener);
  }

  /**
   * Emit a bridge event
   * @param event - Event type
   * @param data - Event data
   */
  emit(event: BridgeEventType, data: BridgeEventData): boolean {
    return super.emit(event, data);
  }

  /**
   * Get transaction history for the bridge's address
   */
  getTransactionHistory(filter?: BridgeTransactionFilter): BridgeTransaction[] {
    return this.history.getTransactions(filter);
  }

  /**
   * Update transaction status and emit event
   */
  private updateTransactionStatus(txHash: Hex, status: BridgeTransactionStatus, sourceChain: SupportedChain, destinationChain: SupportedChain, amount: string): void {
    this.history.updateTransactionStatus(txHash, status);
    
    if (status === 'completed') {
      this.emit('transactionConfirmed', {
        txHash,
        sourceChain,
        destinationChain,
        amount,
        token: 'USDC',
        timestamp: Date.now()
      } as BridgeTransactionEvent);
    } else if (status === 'failed') {
      this.emit('transactionFailed', {
        error: 'Transaction failed',
        sourceChain,
        destinationChain,
        amount,
        token: 'USDC'
      } as BridgeErrorEvent);
    }
  }
  
  async getBalances(address?: Address): Promise<ChainBalance[]> {
    const account = privateKeyToAccount(this.privateKey);
    return getAllBalances(address || account.address);
  }
  
  async findCheapestChain(operation: 'send' | 'swap' | 'contract'): Promise<{ chain: SupportedChain; estimatedCost: string }> {
    return findCheapestChain(operation);
  }

  /**
   * Get bridge quote for cross-chain transfer
   * Instance method wrapper around getBridgeQuote function
   * Emits 'quoteReceived' and 'feeEstimated' events
   */
  async getQuote(
    destinationChain: SupportedChain,
    token: 'USDC' | 'ETH',
    amount: string,
    sourceChain?: SupportedChain
  ): Promise<BridgeQuote> {
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
    } as BridgeQuoteEvent);

    if (quote.lzFee) {
      this.emit('feeEstimated', {
        nativeFee: formatUnits(quote.lzFee.nativeFee, 18),
        lzTokenFee: formatUnits(quote.lzFee.lzTokenFee, 18),
        sourceChain: srcChain,
        destinationChain
      } as BridgeFeeEvent);
    }

    return quote;
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
  async bridgeUSDC(
    destinationChain: SupportedChain,
    amount: string,
    sourceChain?: SupportedChain
  ): Promise<BridgeResult> {
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
        } as BridgeErrorEvent);
        return {
          success: false,
          error,
          sourceChain: srcChain,
          destinationChain,
          amount
        };
      }
      
      // Check if we have valid L2 chains for bridging
      const supportedL2s: SupportedChain[] = ['base', 'optimism', 'arbitrum'];
      if (!supportedL2s.includes(srcChain) || !supportedL2s.includes(destinationChain)) {
        const error = 'Only Base, Optimism, and Arbitrum are supported for direct USDC bridging';
        this.emit('transactionFailed', {
          error,
          sourceChain: srcChain,
          destinationChain,
          amount,
          token: 'USDC'
        } as BridgeErrorEvent);
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
        } as BridgeErrorEvent);
        return {
          success: false,
          error,
          sourceChain: srcChain,
          destinationChain,
          amount
        };
      }
      
      // Step 2: Get quote for fees
      let lzFee: { nativeFee: bigint; lzTokenFee: bigint };
      try {
        lzFee = await quoteOFTSend(srcChain, destinationChain, amountInUnits, account.address);
        this.emit('feeEstimated', {
          nativeFee: formatUnits(lzFee.nativeFee, 18),
          lzTokenFee: formatUnits(lzFee.lzTokenFee, 18),
          sourceChain: srcChain,
          destinationChain
        } as BridgeFeeEvent);
      } catch (error) {
        const errorMsg = `Failed to get LayerZero fee quote: ${error instanceof Error ? error.message : String(error)}`;
        this.emit('transactionFailed', {
          error: errorMsg,
          sourceChain: srcChain,
          destinationChain,
          amount,
          token: 'USDC'
        } as BridgeErrorEvent);
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
        } as BridgeErrorEvent);
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
          } as BridgeErrorEvent);
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
      const toBytes32 = ('0x' + account.address.slice(2).padStart(64, '0')) as `0x${string}`;
      const minAmountLD = (amountInUnits * 995n) / 1000n; // 0.5% slippage
      
      const sendParam = {
        dstEid,
        to: toBytes32,
        amountLD: amountInUnits,
        minAmountLD: minAmountLD,
        extraOptions: '0x' as `0x${string}`,
        composeMsg: '0x' as `0x${string}`,
        oftCmd: '0x' as `0x${string}`
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
      } as BridgeTransactionEvent);
      
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
      
    } catch (error) {
      console.error(`[Bridge] Bridge failed:`, error);
      const errorMsg = error instanceof Error ? error.message : 'Bridge transaction failed';
      this.emit('transactionFailed', {
        error: errorMsg,
        sourceChain: srcChain,
        destinationChain,
        amount,
        token: 'USDC'
      } as BridgeErrorEvent);
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
function createMultiChainClient(privateKey: Hex, chain: SupportedChain) {
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
