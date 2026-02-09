/**
 * Wallet Manager for Agora Agents
 * Handles EVM wallet generation, encryption, and persistence
 */
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, http, publicActions } from 'viem';
import { mainnet } from 'viem/chains';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createHash } from 'crypto';
// Wallet storage configuration
const AGORA_DIR = path.join(os.homedir(), '.agora');
const WALLET_FILE = path.join(AGORA_DIR, 'wallet.json');
// Simple encryption using XOR with password hash (for demo purposes)
// In production, use proper encryption like AES-256-GCM
function simpleEncrypt(data, password) {
    const passwordHash = createHash('sha256').update(password).digest('hex');
    let encrypted = '';
    for (let i = 0; i < data.length; i++) {
        encrypted += String.fromCharCode(data.charCodeAt(i) ^ passwordHash.charCodeAt(i % passwordHash.length));
    }
    return Buffer.from(encrypted).toString('base64');
}
function simpleDecrypt(encryptedData, password) {
    const passwordHash = createHash('sha256').update(password).digest('hex');
    const data = Buffer.from(encryptedData, 'base64').toString('binary');
    let decrypted = '';
    for (let i = 0; i < data.length; i++) {
        decrypted += String.fromCharCode(data.charCodeAt(i) ^ passwordHash.charCodeAt(i % passwordHash.length));
    }
    return decrypted;
}
/**
 * Ensure the .agora directory exists
 */
function ensureAgoraDir() {
    if (!fs.existsSync(AGORA_DIR)) {
        fs.mkdirSync(AGORA_DIR, { recursive: true, mode: 0o700 });
    }
}
/**
 * Generate a new EVM wallet
 * @returns The wallet data including address and private key
 */
export function generateWallet() {
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
export function saveEncryptedWallet(wallet, password = 'agora-default-password') {
    ensureAgoraDir();
    const walletData = {
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
export function loadWallet(password = 'agora-default-password') {
    if (!fs.existsSync(WALLET_FILE)) {
        return null;
    }
    try {
        const walletData = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf-8'));
        const privateKey = simpleDecrypt(walletData.encryptedPrivateKey, password);
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
    }
    catch (error) {
        throw new Error(`Failed to load wallet: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * Load existing wallet or create a new one
 * This is the main entry point for agent initialization
 * @param password - Password for encryption/decryption
 * @returns The agent wallet (existing or newly created)
 */
export function loadOrCreateWallet(password = 'agora-default-password') {
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
export function getWalletAddress() {
    if (!fs.existsSync(WALLET_FILE)) {
        return null;
    }
    try {
        const walletData = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf-8'));
        return walletData.address;
    }
    catch {
        return null;
    }
}
/**
 * Check if a wallet exists
 * @returns True if wallet file exists
 */
export function walletExists() {
    return fs.existsSync(WALLET_FILE);
}
/**
 * Get the wallet file path
 * @returns Path to the wallet file
 */
export function getWalletPath() {
    return WALLET_FILE;
}
// Export wallet path for external use
export { WALLET_FILE, AGORA_DIR };
//# sourceMappingURL=wallet-manager.js.map