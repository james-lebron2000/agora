import { type WalletClient, type Hex } from 'viem';
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
//# sourceMappingURL=wallet-manager.d.ts.map