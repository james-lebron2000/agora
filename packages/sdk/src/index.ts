export * from './envelope.js';
export * from './messages.js';
export * from './relay.js';
export * from './did.js';
export * from './agent.js';
export * from './payment.js';
export * from './escrow.js';
export * from './schema.js';

// Wallet management (v1.1)
export {
  generateWallet,
  loadOrCreateWallet,
  loadWallet,
  saveEncryptedWallet,
  getWalletAddress,
  walletExists,
  getWalletPath,
  AGORA_DIR,
  WALLET_FILE,
  type WalletData,
  type AgentWallet
} from './wallet-manager.js';

// Cross-chain bridge (v1.2)
export {
  CrossChainBridge,
  createChainPublicClient,
  getUSDCBalance,
  getNativeBalance,
  getAllBalances,
  findCheapestChain,
  SUPPORTED_CHAINS,
  USDC_ADDRESSES,
  type SupportedChain,
  type ChainBalance,
  type BridgeResult
} from './bridge.js';
