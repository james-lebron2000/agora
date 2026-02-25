export * from './envelope.js';
export * from './messages.js';
export * from './relay.js';
export * from './did.js';
export * from './agent.js';
export * from './payment.js';
export * from './escrow.js';
export * from './crypto.js';
// Ad Auction module (v1.0)
export { AdAuctionManager, getOrCreateAdAuctionManager, getAdAuctionManager, removeAdAuctionManager, getAuctionStats, getAllActiveBids, calculateVickreyPrice, calculateDecayedPrice, validateAdContent, formatBidAmount, getRecommendedBid, DEFAULT_AUCTION_CONFIG, SLOT_BASE_PRICES } from './ad-auction.js';
// Batch escrow operations
export { batchRelease, batchRefund } from './escrow.js';
// Echo Survival mechanism (v1.4)
export { EchoSurvivalManager, getOrCreateSurvivalManager, getSurvivalManager, removeSurvivalManager, DEFAULT_SURVIVAL_CONFIG, formatSurvivalReport, shouldAcceptTask } from './survival.js';
// Wallet management (v1.1)
export { generateWallet, loadOrCreateWallet, loadWallet, saveEncryptedWallet, getWalletAddress, walletExists, getWalletPath, AGORA_DIR, WALLET_FILE } from './wallet-manager.js';
// Multi-chain wallet management (v1.2)
export { createMultiChainClient, createMultiChainWallet, loadOrCreateMultiChainWallet, refreshBalances, getTotalUSDCBalance, getChainWithHighestBalance, getCheapestChainForOperations, hasSufficientBalance, selectOptimalChain, MultiChainWalletManager } from './wallet-manager.js';
// Cross-chain bridge (v1.2)
export { CrossChainBridge, createChainPublicClient, getUSDCBalance, getNativeBalance, getAllBalances, getBridgeQuote, findCheapestChain, SUPPORTED_CHAINS, USDC_ADDRESSES, LAYERZERO_ENDPOINTS, LAYERZERO_CHAIN_IDS, LAYERZERO_USDC_OFT, RPC_URLS, BridgeTransactionHistory, getBridgeHistory } from './bridge.js';
// Performance Optimization module (v1.0)
export { PerformanceMonitor, createPerformanceMonitor, benchmark, measureLatency, measureLatencyAsync, withLatencyTracking, withLatencyTrackingAsync, trackMemory, generateOptimizationReport, } from './performance.js';
// Agent Profile module (v1.1) - with frontend optimizations
export { ProfileManager, createProfileManager, calculateLevel, xpForNextLevel, levelProgress, getTierColor, getDefaultAchievements, 
// Frontend optimizations
ProfileCache, getProfileCache, batchGetProfiles, checkProfileCompleteness, saveProfileToLocalStorage, loadProfileFromLocalStorage, clearProfileFromLocalStorage, createOptimisticProfileUpdate, uploadAvatar, } from './profile.js';
//# sourceMappingURL=index.js.map