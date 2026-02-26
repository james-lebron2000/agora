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
// Echo Survival mechanism (v1.5) - Enhanced with multi-token & predictive analytics
export { EchoSurvivalManager, getOrCreateSurvivalManager, getSurvivalManager, removeSurvivalManager, DEFAULT_SURVIVAL_CONFIG, formatSurvivalReport, shouldAcceptTask } from './survival.js';
// Survival Alert System (v1.0) - Real-time alerts with aggregation
export { SurvivalAlertSystem, getOrCreateAlertSystem, getAlertSystem, DEFAULT_ALERT_CONFIG } from './survival-alerts.js';
// Cross-Chain Survival Optimizer (v1.0) - Chain optimization & rebalancing
export { CrossChainSurvivalOptimizer, getOrCreateSurvivalOptimizer, getSurvivalOptimizer, removeSurvivalOptimizer, DEFAULT_OPTIMIZER_CONFIG } from './survival-optimizer.js';
// Wallet management (v1.1)
export { generateWallet, loadOrCreateWallet, loadWallet, saveEncryptedWallet, getWalletAddress, walletExists, getWalletPath, AGORA_DIR, WALLET_FILE } from './wallet-manager.js';
// Multi-chain wallet management (v1.2)
export { createMultiChainClient, createMultiChainWallet, loadOrCreateMultiChainWallet, refreshBalances, getTotalUSDCBalance, getChainWithHighestBalance, getCheapestChainForOperations, hasSufficientBalance, selectOptimalChain, MultiChainWalletManager } from './wallet-manager.js';
// Cross-chain bridge (v1.3) - Multi-token support
export { CrossChainBridge, createChainPublicClient, getUSDCBalance, getNativeBalance, getAllBalances, getTokenBalance, getAllTokenBalances, getBridgeQuote, findCheapestChain, estimateBridgeFee, SUPPORTED_CHAINS, SUPPORTED_TOKENS, USDC_ADDRESSES, USDT_ADDRESSES, DAI_ADDRESSES, WETH_ADDRESSES, TOKEN_ADDRESSES, TOKEN_DECIMALS, LAYERZERO_ENDPOINTS, LAYERZERO_CHAIN_IDS, LAYERZERO_USDC_OFT, RPC_URLS, BridgeTransactionHistory, BridgeTransactionMonitor, BridgeError, defaultLogger, listenLayerZeroMessages, getBridgeHistory } from './bridge.js';
// Performance Optimization module (v2.0) - Enhanced with analytics & monitoring
export { PerformanceMonitor, createPerformanceMonitor, createEnhancedPerformanceMonitor, benchmark, measureLatency, measureLatencyAsync, withLatencyTracking, withLatencyTrackingAsync, trackMemory, generateOptimizationReport, } from './performance.js';
// API Cache Layer (v1.0)
export { ApiCache, getGlobalCache, setGlobalCache, cachedFetch, withCache, } from './cache.js';
// Agent Profile module (v1.1) - with frontend optimizations
export { ProfileManager, createProfileManager, calculateLevel, xpForNextLevel, levelProgress, getTierColor, getDefaultAchievements, 
// Frontend optimizations
ProfileCache, getProfileCache, batchGetProfiles, checkProfileCompleteness, saveProfileToLocalStorage, loadProfileFromLocalStorage, clearProfileFromLocalStorage, createOptimisticProfileUpdate, uploadAvatar, } from './profile.js';
// Agent Profile React Hooks (v1.0) - frontend integration
export { 
// Hooks
useProfile, useMyProfile, useUpdateProfile, useProfileStats, useAchievements, useReputationHistory, useSearchProfiles, useLeaderboard, useProfileCompleteness, useUploadAvatar, useLevelProgress, useBatchProfiles, useProfileCache, 
// Initialization
initializeProfileManager, setGlobalAuthToken, getGlobalAuthToken, getGlobalManager, } from './profile-hooks.js';
// Reputation Oracle module (v1.0)
export { ReputationOracle, getOrCreateReputationOracle, getReputationOracle, resetReputationOracle, createEmptyReputation, addSignal, addTaskRating, addEndorsement, addDispute, updatePaymentReliability, calculateReputation, calculateReputationBreakdown, recalculateReputation, calculateDecay, calculateSignalValue, calculatePaymentReliability, calculateEndorsementValue, getReputationTier, getReputationTierColor, formatReputation, generateReputationReport, DEFAULT_REPUTATION_CONFIG, } from './reputation.js';
// End-to-End Encryption (E2EE) module (v1.0)
export { E2EESessionManager, getOrCreateE2EEManager, getE2EEManager, resetE2EEManager, createEncryptedEnvelope, decryptEnvelope, DEFAULT_E2EE_CONFIG, } from './e2ee.js';
// Analytics module (v1.0) - Comprehensive analytics infrastructure
export { AnalyticsManager, EventTracker, MetricsCollector, getOrCreateAnalyticsManager, getAnalyticsManager, removeAnalyticsManager, createPerformanceMonitor as createAnalyticsPerformanceMonitor, } from './analytics.js';
// Analytics Charts module (v1.0) - Chart data visualization helpers
export { toLineChartData, toBarChartData, toPieChartData, toAreaChartData, calculateWoW, calculateMoM, calculateYoY, formatPercentageChange, toKpiCardData, toSparklineData, toHeatmapData, metricsToTimeSeries, groupTimeSeriesByLabel, normalizeTimeSeries, mergeTimeSeries, calculateMovingAverage, DEFAULT_COLOR_PALETTE, } from './analytics-charts.js';
// Survival Prediction module (v1.0) - Predictive analytics for agent survival
export { SurvivalPredictor, createPredictorFromSnapshots, getGlobalPredictor, } from './survival-prediction.js';
// Survival Simulation module (v1.0) - "What-if" scenario analysis
export { SurvivalSimulator, createSimulatorFromSnapshot, simulateFromSnapshot, getGlobalSimulator, } from './survival-simulation.js';
// Portfolio module (v1.0) - Agent storefront and portfolio management
export { calculateAgentScore, formatPriceRange, getStarRating, formatETA, } from './portfolio.js';
// Performance Monitor module (v1.0) - Simple performance tracking and metrics
export { PerformanceTracker, MemoryMonitor, MetricCollector, createPerformanceTracker, createMemoryMonitor, createMetricCollector, } from './performance-monitor.js';
// DateTime Formatter utilities (v1.0) - Internationalized date/time formatting
export { formatDate, formatTime, formatDuration, timeAgo, } from './utils/formatters.js';
// Mobile module (v1.0) - Device detection, optimization, and gesture handling
export { DeviceDetector, MobileOptimizer, TouchGestureHandler, isMobile, isTablet, getOptimizedConfig, DEFAULT_GESTURE_CONFIG, } from './mobile.js';
//# sourceMappingURL=index.js.map