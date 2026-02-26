// Reusable UI components
export { MultiChainBalance } from './MultiChainBalance';
export { SurvivalMonitor } from './SurvivalMonitor';
export { SurvivalIndicator } from './SurvivalIndicator';
export { default as ProfileEditModal } from './ProfileEditModal';
export { default as SkillRadar } from './SkillRadar';
export { default as AchievementBadge } from './AchievementBadge';
export { default as Timeline } from './Timeline';

// Optimized components with React.memo
export { Card, ListItem, Badge } from './OptimizedComponents';

// Agent Profile components
export { ActivityHeatmap, ActivityHeatmapCompact, generateActivityData } from './ActivityHeatmap';
export { AgentAvatar, AgentAvatarSkeleton } from './AgentAvatar';
export { AgentLeaderboard, type LeaderboardEntry, type TimePeriod, type SortMetric } from './AgentLeaderboard';
export { AgentLevelProgress, CompareAgents, calculateLevel, generateSampleLevel } from './AgentLevelProgress';
export { ShareProfile } from './ShareProfile';

// Profile SDK Components
export { ProfileStats } from './ProfileStats';
export { AchievementGallery, type Achievement, type AchievementTier } from './AchievementGallery';

// Performance Components
export { PerformanceMonitor } from './PerformanceMonitor';

// Responsive utilities
export {
  scale,
  verticalScale,
  moderateScale,
  responsiveFontSize,
  spacing,
  isSmallScreen,
  isTablet,
  isExtraSmallScreen,
  isMediumScreen,
  isLargeScreen,
  isExtraLargeScreen,
  hasNotch,
  hasDynamicIsland,
  useResponsiveDimensions,
  useDeviceType,
  usePlatformOptimization,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
} from '../utils/responsive';

// Network utilities
export {
  useNetworkState,
  useIsOnline,
  useIsOffline,
  useConnectionType,
  useIsWifi,
  useIsCellular,
  NetworkOfflineFallback,
  OfflineFallback,
} from '../hooks/useNetwork.tsx';

// Theme utilities
export {
  useTheme,
  createTheme,
  COLORS,
  SPACING,
  FONT_SIZE,
  BORDER_RADIUS,
  SHADOWS,
  SUPPORTED_CHAINS,
} from '../constants/theme';

// Performance hooks
export {
  useOptimizedFlatList,
  useDebouncedCallback,
  useThrottledCallback,
} from '../hooks/usePerformance';