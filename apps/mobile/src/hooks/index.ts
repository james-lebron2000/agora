// API Hooks
export { 
  useAgents, 
  useAgent, 
  useTasks, 
  useTask,
  useWalletBalance,
  useBridge,
  useApiHealth,
  useProfileApi,
  updateProfile,
  uploadAvatar,
  getUserStats,
  type UserProfile,
  type UserStats,
  type UserAchievement,
  type UserStatsPoint,
} from './useApi';

// Survival Hooks
export {
  useSurvival,
} from './useSurvival';

export {
  useSurvivalPrediction,
} from './useSurvivalPrediction';

export {
  useSurvivalSimulation,
  generateSimulationChartData,
  generatePredictionChartData,
} from './useSurvivalSimulation';

// Network Hooks
export {
  useNetworkState,
  useIsOnline,
  useIsOffline,
  useConnectionType,
  useIsWifi,
  useIsCellular,
  NetworkOfflineFallback,
  OfflineFallback,
  type NetworkState,
} from './useNetwork';

// Performance Hooks
export {
  usePerformance,
  useOptimizedFlatList,
  useDebouncedCallback as usePerformanceDebouncedCallback,
  useThrottledCallback as usePerformanceThrottledCallback,
  type PerformanceMetrics,
} from './usePerformance';

// Push Notifications
export {
  usePushNotifications,
} from './usePushNotifications';

// Profile Hooks
export {
  useProfile,
  useMyProfile,
  useProfileSearch,
  useLeaderboard,
} from './useProfile';

// SDK Hooks
export {
  useSDK,
  useSurvivalSDK,
  useBridgeSDK,
  type AgentStatus,
  type AgentTier,
} from './useSDK';

// Cache Hooks
export {
  useCache,
  useSimpleCache,
  type CacheOptions,
  type CacheState,
  type CacheActions,
} from './useCache';

// Debounce Hooks
export {
  useDebounce,
  useDebouncedCallback,
  useDebouncedState,
  useDebouncedSearch,
  type DebounceOptions,
} from './useDebounce';

// Throttle Hooks
export {
  useThrottle,
  useThrottledCallback,
  useThrottledState,
  useThrottledScroll,
  type ThrottleOptions,
} from './useThrottle';

// Offline Sync Hooks
export {
  useOfflineSync,
  useCachedData,
  useOptimisticUpdate,
  type SyncState,
  type SyncResult,
} from './useOfflineSync';
