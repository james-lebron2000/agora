/**
 * Wallet Manager for Agora Agents
 * Handles EVM wallet generation, encryption, and persistence
 * Supports multi-chain operations across Base, Optimism, and Arbitrum
 */
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, http, publicActions, createPublicClient, type Hex, type Address } from 'viem';
import type { WalletClient, PublicClient } from 'viem';
import { mainnet, base, optimism, arbitrum } from 'viem/chains';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createHash } from 'crypto';

// Multi-chain imports
import {
  type SupportedChain,
  SUPPORTED_CHAINS,
  RPC_URLS,
  getUSDCBalance,
  getNativeBalance,
  type ChainBalance
} from './bridge.js';

// Wallet storage configuration
const AGORA_DIR = path.join(os.homedir(), '.agora');
const WALLET_FILE = path.join(AGORA_DIR, 'wallet.json');

// Simple encryption using XOR with password hash (for demo purposes)
// In production, use proper encryption like AES-256-GCM
function simpleEncrypt(data: string, password: string): string {
  const passwordHash = createHash('sha256').update(password).digest('hex');
  let encrypted = '';
  for (let i = 0; i < data.length; i++) {
    encrypted += String.fromCharCode(
      data.charCodeAt(i) ^ passwordHash.charCodeAt(i % passwordHash.length)
    );
  }
  return Buffer.from(encrypted).toString('base64');
}

function simpleDecrypt(encryptedData: string, password: string): string {
  const passwordHash = createHash('sha256').update(password).digest('hex');
  const data = Buffer.from(encryptedData, 'base64').toString('binary');
  let decrypted = '';
  for (let i = 0; i < data.length; i++) {
    decrypted += String.fromCharCode(
      data.charCodeAt(i) ^ passwordHash.charCodeAt(i % passwordHash.length)
    );
  }
  return decrypted;
}

export interface WalletData {
  address: string;
  encryptedPrivateKey: string;
  createdAt: string;
  version: string;
}

export interface AgentWallet {
  address: string;
  privateKey: Hex;
  walletClient: WalletClient;
}

/**
 * Multi-chain wallet with clients for each supported chain
 */
export interface MultiChainWallet {
  address: Address;
  privateKey: Hex;
  clients: Record<SupportedChain, {
    walletClient: any; // Simplified to avoid viem type issues
    publicClient: any;
  }>;
  balances: ChainBalance[];
  lastUpdated: string;
}

/**
 * Chain configuration for wallet operations
 */
export interface ChainConfig {
  chain: SupportedChain;
  rpcUrl?: string;
  priority?: number; // Lower is higher priority
}

/**
 * Ensure the .agora directory exists
 */
function ensureAgoraDir(): void {
  if (!fs.existsSync(AGORA_DIR)) {
    fs.mkdirSync(AGORA_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Generate a new EVM wallet
 * @returns The wallet data including address and private key
 */
export function generateWallet(): { address: string; privateKey: Hex } {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  
  return {
    address: account.address,
    privateKey: privateKey
  };
}

/**
 * Save wallet to disk with encryption
 * @param wallet - The wallet data to save
 * @param password - Password for encryption
 */
export function saveEncryptedWallet(
  wallet: { address: string; privateKey: Hex },
  password: string = 'agora-default-password'
): void {
  ensureAgoraDir();
  
  const walletData: WalletData = {
    address: wallet.address,
    encryptedPrivateKey: simpleEncrypt(wallet.privateKey, password),
    createdAt: new Date().toISOString(),
    version: '1.0'
  };
  
  fs.writeFileSync(WALLET_FILE, JSON.stringify(walletData, null, 2), { mode: 0o600 });
}

/**
 * Load wallet from disk
 * @param password - Password for decryption
 * @returns The decrypted wallet or null if not found
 */
export function loadWallet(password: string = 'agora-default-password'): AgentWallet | null {
  if (!fs.existsSync(WALLET_FILE)) {
    return null;
  }
  
  try {
    const walletData: WalletData = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf-8'));
    const privateKey = simpleDecrypt(walletData.encryptedPrivateKey, password) as Hex;
    
    const account = privateKeyToAccount(privateKey);
    
    // Verify the address matches
    if (account.address !== walletData.address) {
      throw new Error('Wallet address mismatch - possible corruption or wrong password');
    }
    
    const walletClient = createWalletClient({
      account,
      chain: mainnet,
      transport: http()
    }).extend(publicActions);
    
    return {
      address: walletData.address,
      privateKey,
      walletClient
    };
  } catch (error) {
    throw new Error(`Failed to load wallet: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Load existing wallet or create a new one
 * This is the main entry point for agent initialization
 * @param password - Password for encryption/decryption
 * @returns The agent wallet (existing or newly created)
 */
export function loadOrCreateWallet(
  password: string = 'agora-default-password'
): AgentWallet {
  // Try to load existing wallet
  const existingWallet = loadWallet(password);
  
  if (existingWallet) {
    console.log(`[Wallet] Loaded existing wallet: ${existingWallet.address}`);
    return existingWallet;
  }
  
  // Generate new wallet
  console.log('[Wallet] No existing wallet found. Generating new EVM wallet...');
  const newWallet = generateWallet();
  
  // Save encrypted wallet
  saveEncryptedWallet(newWallet, password);
  
  console.log(`[Wallet] New wallet created and saved: ${newWallet.address}`);
  
  // Load and return the newly saved wallet
  const loadedWallet = loadWallet(password);
  if (!loadedWallet) {
    throw new Error('Failed to load newly created wallet');
  }
  
  return loadedWallet;
}

/**
 * Get wallet address without loading full wallet
 * @returns The wallet address or null if no wallet exists
 */
export function getWalletAddress(): string | null {
  if (!fs.existsSync(WALLET_FILE)) {
    return null;
  }
  
  try {
    const walletData: WalletData = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf-8'));
    return walletData.address;
  } catch {
    return null;
  }
}

/**
 * Check if a wallet exists
 * @returns True if wallet file exists
 */
export function walletExists(): boolean {
  return fs.existsSync(WALLET_FILE);
}

/**
 * Get the wallet file path
 * @returns Path to the wallet file
 */
export function getWalletPath(): string {
  return WALLET_FILE;
}

// Export wallet path for external use
export { WALLET_FILE, AGORA_DIR };

/**
 * Create a multi-chain wallet client for a specific chain
 * @param privateKey - The wallet's private key
 * @param chain - The target chain
 * @returns Wallet client and public client for the chain
 */
export function createMultiChainClient(
  privateKey: Hex,
  chain: SupportedChain
): { walletClient: any; publicClient: any } {
  const account = privateKeyToAccount(privateKey);
  const urls = RPC_URLS[chain];

  const walletClient = createWalletClient({
    account,
    chain: SUPPORTED_CHAINS[chain],
    transport: http(urls[0])
  }).extend(publicActions);

  const publicClient = createPublicClient({
    chain: SUPPORTED_CHAINS[chain],
    transport: http(urls[0])
  });

  return { walletClient, publicClient };
}

/**
 * Create a multi-chain wallet with clients for all supported chains
 * @param privateKey - The wallet's private key
 * @returns MultiChainWallet with clients for Base, Optimism, Arbitrum, and Ethereum
 */
export function createMultiChainWallet(privateKey: Hex): MultiChainWallet {
  const account = privateKeyToAccount(privateKey);
  const chains: SupportedChain[] = ['ethereum', 'base', 'optimism', 'arbitrum'];
  
  const clients = {} as Record<SupportedChain, {
    walletClient: WalletClient;
    publicClient: PublicClient;
  }>;
  
  for (const chain of chains) {
    clients[chain] = createMultiChainClient(privateKey, chain);
  }
  
  return {
    address: account.address,
    privateKey,
    clients,
    balances: [],
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Load or create a multi-chain wallet
 * @param password - Password for encryption/decryption
 * @returns MultiChainWallet with all chain clients
 */
export function loadOrCreateMultiChainWallet(
  password: string = 'agora-default-password'
): MultiChainWallet {
  // Try to load existing wallet
  const existingWallet = loadWallet(password);
  
  let privateKey: Hex;
  let address: string;
  
  if (existingWallet) {
    console.log(`[Wallet] Loading existing wallet for multi-chain: ${existingWallet.address}`);
    privateKey = existingWallet.privateKey;
    address = existingWallet.address;
  } else {
    // Generate new wallet
    console.log('[Wallet] Creating new multi-chain wallet...');
    const newWallet = generateWallet();
    saveEncryptedWallet(newWallet, password);
    privateKey = newWallet.privateKey;
    address = newWallet.address;
    console.log(`[Wallet] New multi-chain wallet created: ${address}`);
  }
  
  return createMultiChainWallet(privateKey);
}

/**
 * Refresh balances across all chains for a multi-chain wallet
 * @param wallet - The multi-chain wallet
 * @returns Updated wallet with fresh balances
 */
export async function refreshBalances(
  wallet: MultiChainWallet
): Promise<MultiChainWallet> {
  console.log(`[Wallet] Refreshing balances for ${wallet.address}...`);
  
  const chains: SupportedChain[] = ['ethereum', 'base', 'optimism', 'arbitrum'];
  const balances: ChainBalance[] = [];
  
  for (const chain of chains) {
    try {
      const [nativeBalance, usdcBalance] = await Promise.all([
        getNativeBalance(wallet.address, chain),
        getUSDCBalance(wallet.address, chain)
      ]);
      
      balances.push({
        chain,
        nativeBalance,
        usdcBalance
      });
      
      console.log(`[Wallet] ${chain}: ${nativeBalance} ETH, ${usdcBalance} USDC`);
    } catch (error) {
      console.error(`[Wallet] Failed to get balance for ${chain}:`, error);
      balances.push({
        chain,
        nativeBalance: '0',
        usdcBalance: '0'
      });
    }
  }
  
  return {
    ...wallet,
    balances,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Get total USDC balance across all chains
 * @param wallet - The multi-chain wallet
 * @returns Total USDC balance as a string
 */
export function getTotalUSDCBalance(wallet: MultiChainWallet): string {
  const total = wallet.balances.reduce((sum, b) => {
    return sum + parseFloat(b.usdcBalance);
  }, 0);
  
  return total.toFixed(6);
}

/**
 * Get the chain with the highest USDC balance
 * @param wallet - The multi-chain wallet
 * @returns The chain with the most USDC, or null if no balance
 */
export function getChainWithHighestBalance(
  wallet: MultiChainWallet
): { chain: SupportedChain; balance: string } | null {
  if (wallet.balances.length === 0) return null;
  
  const sorted = [...wallet.balances].sort((a, b) => {
    return parseFloat(b.usdcBalance) - parseFloat(a.usdcBalance);
  });
  
  const highest = sorted[0];
  return {
    chain: highest.chain,
    balance: highest.usdcBalance
  };
}

/**
 * Get the chain with the lowest gas costs
 * Useful for selecting where to execute transactions
 * @returns The cheapest chain for operations
 */
export function getCheapestChainForOperations(): SupportedChain {
  // Based on typical L2 gas costs: Base < Optimism < Arbitrum
  // This is a simplified heuristic - production would use real gas oracles
  const gasCosts: Record<SupportedChain, number> = {
    ethereum: 100,  // Baseline (expensive)
    base: 1,        // Cheapest
    optimism: 2,    // Moderate
    arbitrum: 3,    // Higher but still cheap
    polygon: 2,     // Similar to Optimism
    avalanche: 4,   // Moderate
    bsc: 1          // Very cheap
  };
  
  const chains: SupportedChain[] = ['base', 'optimism', 'arbitrum'];
  let cheapest = chains[0];
  let lowestCost = gasCosts[cheapest];
  
  for (const chain of chains) {
    if (gasCosts[chain] < lowestCost) {
      lowestCost = gasCosts[chain];
      cheapest = chain;
    }
  }
  
  return cheapest;
}

/**
 * Check if wallet has sufficient balance on a specific chain
 * @param wallet - The multi-chain wallet
 * @param chain - The chain to check
 * @param minUSDC - Minimum USDC required
 * @param minNative - Minimum native token required (in ETH)
 * @returns True if wallet has sufficient balance
 */
export function hasSufficientBalance(
  wallet: MultiChainWallet,
  chain: SupportedChain,
  minUSDC: string = '0',
  minNative: string = '0'
): boolean {
  const balance = wallet.balances.find(b => b.chain === chain);
  if (!balance) return false;
  
  const usdcOk = parseFloat(balance.usdcBalance) >= parseFloat(minUSDC);
  const nativeOk = parseFloat(balance.nativeBalance) >= parseFloat(minNative);
  
  return usdcOk && nativeOk;
}

/**
 * Select the best chain for a transaction based on balance and cost
 * @param wallet - The multi-chain wallet
 * @param requiredUSDC - USDC required for the operation
 * @param preferredChain - Optional preferred chain
 * @returns The best chain to use
 */
export function selectOptimalChain(
  wallet: MultiChainWallet,
  requiredUSDC: string = '0',
  preferredChain?: SupportedChain
): SupportedChain {
  // If preferred chain has sufficient balance, use it
  if (preferredChain && hasSufficientBalance(wallet, preferredChain, requiredUSDC, '0.001')) {
    return preferredChain;
  }
  
  // Otherwise, find the cheapest chain with sufficient balance
  const chains: SupportedChain[] = ['base', 'optimism', 'arbitrum'];
  
  for (const chain of chains) {
    if (hasSufficientBalance(wallet, chain, requiredUSDC, '0.001')) {
      return chain;
    }
  }
  
  // Default to the chain with highest balance if none meet criteria
  const highest = getChainWithHighestBalance(wallet);
  return highest?.chain || 'base';
}

/**
 * MultiChainWalletManager class for easy integration
 */
export class MultiChainWalletManager {
  private wallet: MultiChainWallet;
  
  constructor(password?: string) {
    this.wallet = loadOrCreateMultiChainWallet(password);
  }
  
  /**
   * Get the wallet address
   */
  getAddress(): Address {
    return this.wallet.address;
  }
  
  /**
   * Get wallet clients for a specific chain
   */
  getChainClients(chain: SupportedChain) {
    return this.wallet.clients[chain];
  }
  
  /**
   * Refresh and get latest balances
   */
  async refreshBalances(): Promise<ChainBalance[]> {
    this.wallet = await refreshBalances(this.wallet);
    return this.wallet.balances;
  }
  
  /**
   * Get current balances (may be stale)
   */
  getBalances(): ChainBalance[] {
    return this.wallet.balances;
  }
  
  /**
   * Get total USDC across all chains
   */
  getTotalUSDC(): string {
    return getTotalUSDCBalance(this.wallet);
  }
  
  /**
   * Get chain with highest USDC balance
   */
  getHighestBalanceChain() {
    return getChainWithHighestBalance(this.wallet);
  }
  
  /**
   * Select optimal chain for transaction
   */
  selectChain(requiredUSDC?: string, preferredChain?: SupportedChain): SupportedChain {
    return selectOptimalChain(this.wallet, requiredUSDC, preferredChain);
  }
  
  /**
   * Get the underlying multi-chain wallet
   */
  getWallet(): MultiChainWallet {
    return this.wallet;
  }
}