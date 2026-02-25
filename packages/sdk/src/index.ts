export * from './envelope.js';
export * from './messages.js';
export * from './relay.js';
export * from './did.js';
export * from './agent.js';
export * from './payment.js';
export * from './escrow.js';

// Batch escrow operations
export {
  batchRelease,
  batchRefund,
  type BatchEscrowOptions
} from './escrow.js';

// Echo Survival mechanism (v1.4)
export {
  EchoSurvivalManager,
  getOrCreateSurvivalManager,
  getSurvivalManager,
  removeSurvivalManager,
  DEFAULT_SURVIVAL_CONFIG,
  formatSurvivalReport,
  shouldAcceptTask,
  type AgentHealth,
  type AgentEconomics,
  type SurvivalCheckResult,
  type HeartbeatRecord,
  type SurvivalConfig,
  type AgentHealthStatus,
  type SurvivalSnapshot,
  type TaskDecision,
  type SurvivalEventType,
  type SurvivalEventCallback
} from './survival.js';

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
  getUSDCBalance,
  getNativeBalance,
  getAllBalances,
  getBridgeQuote,
  findCheapestChain,
  SUPPORTED_CHAINS,
  USDC_ADDRESSES,
  LAYERZERO_ENDPOINTS,
  LAYERZERO_CHAIN_IDS,
  LAYERZERO_USDC_OFT,
  RPC_URLS,
  type SupportedChain,
  type BridgeQuote,
  type ChainBalance,
  type BridgeResult
} from './bridge.js';
