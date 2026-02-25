export * from './envelope.js';
export * from './messages.js';
export * from './relay.js';
export * from './did.js';
export * from './agent.js';
export * from './payment.js';
export * from './escrow.js';

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

// Multi-chain wallet management (v1.2)
export {
  createMultiChainClient,
  createMultiChainWallet,
  loadOrCreateMultiChainWallet,
  refreshBalances,
  getTotalUSDCBalance,
  getChainWithHighestBalance,
  getCheapestChainForOperations,
  hasSufficientBalance,
  selectOptimalChain,
  MultiChainWalletManager,
  type MultiChainWallet,
  type ChainConfig
} from './wallet-manager.js';

// Cross-chain bridge (v1.2)
export {
  CrossChainBridge,
  createChainPublicClient,
  createChainWalletClient,
  getUSDCBalance,
  getNativeBalance,
  getAllBalances,
  getBridgeQuote,
  executeBridge,
  findCheapestChain,
  getBridgeStatus,
  approveUSDCForBridge,
  SUPPORTED_CHAINS,
  USDC_ADDRESSES,
  LAYERZERO_ENDPOINTS,
  LAYERZERO_CHAIN_IDS,
  NATIVE_SYMBOLS,
  RPC_URLS,
  type SupportedChain,
  type BridgeConfig,
  type BridgeQuote,
  type ChainBalance,
  type BridgeResult
} from './bridge.js';
