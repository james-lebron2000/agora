export * from './envelope.js';
export * from './messages.js';
export * from './relay.js';
export * from './did.js';
export * from './agent.js';
export * from './payment.js';
export * from './escrow.js';
export * from './crypto.js';

// Ad Auction module (v1.0)
export {
  AdAuctionManager,
  getOrCreateAdAuctionManager,
  getAdAuctionManager,
  removeAdAuctionManager,
  getAuctionStats,
  getAllActiveBids,
  calculateVickreyPrice,
  calculateDecayedPrice,
  validateAdContent,
  formatBidAmount,
  getRecommendedBid,
  DEFAULT_AUCTION_CONFIG,
  SLOT_BASE_PRICES,
  type AdSlotType,
  type AdContent,
  type BidRequest,
  type Bid,
  type AuctionSlot,
  type BudgetAllocation,
  type AdBudget,
  type BidResult,
  type AuctionConfig
} from './ad-auction.js';

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
  type SurvivalEventCallback,
  type SurvivalAction,
  type SurvivalActionType,
  type SurvivalActionPriority
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
  estimateBridgeFee,
  SUPPORTED_CHAINS,
  USDC_ADDRESSES,
  LAYERZERO_ENDPOINTS,
  LAYERZERO_CHAIN_IDS,
  LAYERZERO_USDC_OFT,
  RPC_URLS,
  BridgeTransactionHistory,
  BridgeTransactionMonitor,
  BridgeError,
  defaultLogger,
  listenLayerZeroMessages,
  getBridgeHistory,
  type SupportedChain,
  type BridgeQuote,
  type ChainBalance,
  type BridgeResult,
  type BridgeTransaction,
  type BridgeTransactionFilter,
  type BridgeTransactionStatusDetails,
  type BridgeFeeEstimate,
  type BridgeErrorCode,
  type BridgeLogger,
  type BridgeEventType,
  type BridgeQuoteEvent,
  type BridgeTransactionEvent,
  type BridgeErrorEvent,
  type BridgeFeeEvent,
  type BridgeMonitoringEvent,
  type BridgeMonitoringStatusEvent,
  type BridgeMonitoringFailedEvent,
  type BridgeEventData,
  type LayerZeroMessageStatus
} from './bridge.js';

// Performance Optimization module (v1.0)
export {
  PerformanceMonitor,
  createPerformanceMonitor,
  benchmark,
  measureLatency,
  measureLatencyAsync,
  withLatencyTracking,
  withLatencyTrackingAsync,
  trackMemory,
  generateOptimizationReport,
  type PerformanceMetrics,
  type BenchmarkResult,
  type LatencyHistogram,
  type MemorySnapshot,
  type LeakDetectionResult,
  type SeverityLevel,
  type OptimizationRecommendation,
  type OptimizationReport,
  type AlertThresholds,
  type PerformanceMonitorConfig,
  type PerformanceAlert,
} from './performance.js';

// Agent Profile module (v1.1) - with frontend optimizations
export {
  ProfileManager,
  createProfileManager,
  calculateLevel,
  xpForNextLevel,
  levelProgress,
  getTierColor,
  getDefaultAchievements,
  // Frontend optimizations
  ProfileCache,
  getProfileCache,
  batchGetProfiles,
  checkProfileCompleteness,
  saveProfileToLocalStorage,
  loadProfileFromLocalStorage,
  clearProfileFromLocalStorage,
  createOptimisticProfileUpdate,
  uploadAvatar,
  type AgentProfile,
  type AchievementTier,
  type Achievement,
  type ProfileStats,
  type UpdateProfileRequest,
  type ReputationHistoryEntry,
  type ProfileCompleteness,
  type AvatarUploadResult,
  type OptimisticUpdate,
  type UseProfileOptions,
} from './profile.js';
