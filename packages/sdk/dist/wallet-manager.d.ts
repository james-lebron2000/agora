import { type Hex, type Address } from 'viem';
import type { WalletClient } from 'viem';
import { type SupportedChain, type ChainBalance } from './bridge.js';
declare const AGORA_DIR: string;
declare const WALLET_FILE: string;
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
        walletClient: any;
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
    priority?: number;
}
/**
 * Generate a new EVM wallet
 * @returns The wallet data including address and private key
 */
export declare function generateWallet(): {
    address: string;
    privateKey: Hex;
};
/**
 * Save wallet to disk with encryption
 * @param wallet - The wallet data to save
 * @param password - Password for encryption
 */
export declare function saveEncryptedWallet(wallet: {
    address: string;
    privateKey: Hex;
}, password?: string): void;
/**
 * Load wallet from disk
 * @param password - Password for decryption
 * @returns The decrypted wallet or null if not found
 */
export declare function loadWallet(password?: string): AgentWallet | null;
/**
 * Load existing wallet or create a new one
 * This is the main entry point for agent initialization
 * @param password - Password for encryption/decryption
 * @returns The agent wallet (existing or newly created)
 */
export declare function loadOrCreateWallet(password?: string): AgentWallet;
/**
 * Get wallet address without loading full wallet
 * @returns The wallet address or null if no wallet exists
 */
export declare function getWalletAddress(): string | null;
/**
 * Check if a wallet exists
 * @returns True if wallet file exists
 */
export declare function walletExists(): boolean;
/**
 * Get the wallet file path
 * @returns Path to the wallet file
 */
export declare function getWalletPath(): string;
export { WALLET_FILE, AGORA_DIR };
/**
 * Create a multi-chain wallet client for a specific chain
 * @param privateKey - The wallet's private key
 * @param chain - The target chain
 * @returns Wallet client and public client for the chain
 */
export declare function createMultiChainClient(privateKey: Hex, chain: SupportedChain): {
    walletClient: any;
    publicClient: any;
};
/**
 * Create a multi-chain wallet with clients for all supported chains
 * @param privateKey - The wallet's private key
 * @returns MultiChainWallet with clients for Base, Optimism, Arbitrum, and Ethereum
 */
export declare function createMultiChainWallet(privateKey: Hex): MultiChainWallet;
/**
 * Load or create a multi-chain wallet
 * @param password - Password for encryption/decryption
 * @returns MultiChainWallet with all chain clients
 */
export declare function loadOrCreateMultiChainWallet(password?: string): MultiChainWallet;
/**
 * Refresh balances across all chains for a multi-chain wallet
 * @param wallet - The multi-chain wallet
 * @returns Updated wallet with fresh balances
 */
export declare function refreshBalances(wallet: MultiChainWallet): Promise<MultiChainWallet>;
/**
 * Get total USDC balance across all chains
 * @param wallet - The multi-chain wallet
 * @returns Total USDC balance as a string
 */
export declare function getTotalUSDCBalance(wallet: MultiChainWallet): string;
/**
 * Get the chain with the highest USDC balance
 * @param wallet - The multi-chain wallet
 * @returns The chain with the most USDC, or null if no balance
 */
export declare function getChainWithHighestBalance(wallet: MultiChainWallet): {
    chain: SupportedChain;
    balance: string;
} | null;
/**
 * Get the chain with the lowest gas costs
 * Useful for selecting where to execute transactions
 * @returns The cheapest chain for operations
 */
export declare function getCheapestChainForOperations(): SupportedChain;
/**
 * Check if wallet has sufficient balance on a specific chain
 * @param wallet - The multi-chain wallet
 * @param chain - The chain to check
 * @param minUSDC - Minimum USDC required
 * @param minNative - Minimum native token required (in ETH)
 * @returns True if wallet has sufficient balance
 */
export declare function hasSufficientBalance(wallet: MultiChainWallet, chain: SupportedChain, minUSDC?: string, minNative?: string): boolean;
/**
 * Select the best chain for a transaction based on balance and cost
 * @param wallet - The multi-chain wallet
 * @param requiredUSDC - USDC required for the operation
 * @param preferredChain - Optional preferred chain
 * @returns The best chain to use
 */
export declare function selectOptimalChain(wallet: MultiChainWallet, requiredUSDC?: string, preferredChain?: SupportedChain): SupportedChain;
/**
 * MultiChainWalletManager class for easy integration
 */
export declare class MultiChainWalletManager {
    private wallet;
    constructor(password?: string);
    /**
     * Get the wallet address
     */
    getAddress(): Address;
    /**
     * Get wallet clients for a specific chain
     */
    getChainClients(chain: SupportedChain): {
        walletClient: any;
        publicClient: any;
    };
    /**
     * Refresh and get latest balances
     */
    refreshBalances(): Promise<ChainBalance[]>;
    /**
     * Get current balances (may be stale)
     */
    getBalances(): ChainBalance[];
    /**
     * Get total USDC across all chains
     */
    getTotalUSDC(): string;
    /**
     * Get chain with highest USDC balance
     */
    getHighestBalanceChain(): {
        chain: SupportedChain;
        balance: string;
    } | null;
    /**
     * Select optimal chain for transaction
     */
    selectChain(requiredUSDC?: string, preferredChain?: SupportedChain): SupportedChain;
    /**
     * Get the underlying multi-chain wallet
     */
    getWallet(): MultiChainWallet;
}
//# sourceMappingURL=wallet-manager.d.ts.map