// ============================================
// Agora Web Components - Index
// ============================================

// Profile Components
export { AgentProfile } from './AgentProfile';
export type { AgentProfileData, ProfileStatsData, ProfileTab, AgentProfileProps } from './AgentProfile';
export { generateSampleProfile, generateSampleStats, generateSampleAchievements } from './AgentProfile';

// Survival Components
export { SurvivalMonitor, generateSampleSurvivalData } from './SurvivalMonitor';
export type { 
  SurvivalMonitorProps, 
  SurvivalData, 
  HealthMetrics, 
  EconomicData, 
  HealthTrend,
  SurvivalAction,
  HealthStatus,
  ActionType,
  Priority,
  TrendDirection
} from './SurvivalMonitor';

export { SurvivalPanel, SurvivalPanelEmbed } from './SurvivalPanel';
export type { SurvivalPanelProps, SurvivalPanelEmbedProps } from './SurvivalPanel';

export { AgentAvatar, AgentAvatarSkeleton } from './AgentAvatar';

export { AgentLevelProgress, calculateLevel, CompareAgents, generateSampleLevel } from './AgentLevelProgress';
export type { AgentLevel } from './AgentLevelProgress';

export { ProfileStats } from './ProfileStats';

// Achievement Components
export { AchievementGallery } from './AchievementGallery';
export type { Achievement, AchievementTier } from './AchievementGallery';

export { AchievementBadge } from './AchievementBadge';

// Activity Components
export { ActivityHeatmap, ActivityHeatmapGrid, ActivityHeatmapCompact, generateActivityData } from './ActivityHeatmap';
export type { ActivityDay } from './ActivityHeatmap';

// Social Components
export { ShareProfile } from './ShareProfile';

// Bridge Components
export { BridgeCard } from './BridgeCard';
export { BridgeHistory } from './BridgeHistory';
export { BridgeStatus } from './BridgeStatus';

// Mobile Components
export { ResponsiveContainer } from './ResponsiveContainer';
export { TouchFeedback } from './TouchFeedback';
export { MobileBottomNav } from './MobileBottomNav';
export { MobileHeader } from './MobileHeader';
export { PullToRefresh } from './PullToRefresh';
export { 
  MobileLayout, 
  MobileContentCard, 
  MobileSection, 
  MobileList, 
  MobileListItem,
  MobileGrid,
  MobileFab,
  MobileTabs,
  MobileSearchBar,
  MobileEmptyState,
  MobileToast
} from './MobileLayout';

// Performance Components
export { PerformanceDashboard } from './PerformanceDashboard';
export { 
  VirtualList, 
  VirtualGrid, 
  OptimizedImage, 
  LazyComponent,
  useWindowSize,
  useIntersectionObserver
} from './VirtualList';

// UI Components
export { AgentLeaderboard } from './AgentLeaderboard';
export { AnalyticsDashboard } from './AnalyticsDashboard';
export { EscrowStatus } from './EscrowStatus';
export { Feed } from './Feed';
export { Hero } from './Hero';
export { Layout } from './Layout';
export { MultiChainBalance } from './MultiChainBalance';
export { NetworkStats } from './NetworkStats';
export { OpsMonitoringPanel } from './OpsMonitoringPanel';
export { PaymentModal } from './PaymentModal';
export { PostTaskModal } from './PostTaskModal';
export { SandboxExecuteModal } from './SandboxExecuteModal';
