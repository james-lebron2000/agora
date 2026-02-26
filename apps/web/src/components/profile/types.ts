/**
 * Profile Component Types
 * 
 * Type definitions for Agent Profile UI components
 */

import type { 
  AgentProfile, 
  Achievement, 
  ProfileStats,
  ReputationHistoryEntry 
} from '@agora/sdk';

// ============================================================================
// Profile Card Types
// ============================================================================

export interface SurvivalScore {
  /** Overall survival score (0-100) */
  overall: number;
  /** Economic health score */
  economic: number;
  /** Reputation score */
  reputation: number;
  /** Activity score */
  activity: number;
  /** Trend direction */
  trend: 'up' | 'down' | 'stable';
  /** Trend percentage */
  trendPercent: number;
}

export interface ProfileCardProps {
  /** Agent profile data */
  profile: AgentProfile;
  /** Optional survival score */
  survivalScore?: SurvivalScore;
  /** Optional stats */
  stats?: ProfileStats;
  /** Loading state */
  isLoading?: boolean;
  /** Compact mode for small displays */
  compact?: boolean;
  /** Whether this is the current user's profile */
  isOwnProfile?: boolean;
  /** Edit handler */
  onEdit?: () => void;
  /** Share handler */
  onShare?: () => void;
  /** Message handler */
  onMessage?: () => void;
  /** Class name for styling */
  className?: string;
}

// ============================================================================
// Activity Timeline Types
// ============================================================================

export type ActivityType = 
  | 'task_completed'
  | 'task_posted'
  | 'payment_received'
  | 'payment_sent'
  | 'achievement_unlocked'
  | 'level_up'
  | 'reputation_change'
  | 'bridge_completed'
  | 'profile_updated';

export interface ActivityItem {
  /** Unique activity ID */
  id: string;
  /** Activity type */
  type: ActivityType;
  /** Activity title */
  title: string;
  /** Activity description */
  description?: string;
  /** Timestamp */
  timestamp: number;
  /** Associated metadata */
  metadata?: Record<string, any>;
  /** Icon override */
  icon?: string;
  /** Color theme */
  color?: string;
}

export interface ActivityTimelineProps {
  /** Activity items to display */
  activities: ActivityItem[];
  /** Loading state */
  isLoading?: boolean;
  /** Maximum items to show (default: 50) */
  maxItems?: number;
  /** Enable infinite scroll */
  infiniteScroll?: boolean;
  /** Load more handler */
  onLoadMore?: () => Promise<void>;
  /** Has more items */
  hasMore?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Group by date */
  groupByDate?: boolean;
  /** Class name */
  className?: string;
}

// ============================================================================
// Portfolio View Types
// ============================================================================

export interface PortfolioAsset {
  /** Asset ID/symbol */
  id: string;
  /** Asset name */
  name: string;
  /** Asset icon URL */
  icon?: string;
  /** Chain identifier */
  chain: string;
  /** Token balance */
  balance: string;
  /** Balance in USD */
  balanceUsd: string;
  /** Current price */
  price: string;
  /** 24h change percentage */
  change24h: number;
  /** Token decimals */
  decimals: number;
  /** Contract address */
  address?: string;
}

export interface PortfolioData {
  /** Total portfolio value in USD */
  totalValueUsd: string;
  /** 24h change percentage */
  change24h: number;
  /** Assets in portfolio */
  assets: PortfolioAsset[];
  /** Last updated timestamp */
  lastUpdated: number;
}

export type PortfolioViewMode = 'grid' | 'list' | 'chart';
export type PortfolioSortBy = 'value' | 'name' | 'change' | 'chain';

export interface PortfolioViewProps {
  /** Portfolio data */
  portfolio: PortfolioData;
  /** Loading state */
  isLoading?: boolean;
  /** Default view mode */
  defaultViewMode?: PortfolioViewMode;
  /** Enable view mode toggle */
  enableViewToggle?: boolean;
  /** On asset click handler */
  onAssetClick?: (asset: PortfolioAsset) => void;
  /** Refresh handler */
  onRefresh?: () => Promise<void>;
  /** Class name */
  className?: string;
}

// ============================================================================
// Profile Editor Types
// ============================================================================

export interface ProfileFormData {
  /** Display name */
  name: string;
  /** Bio/description */
  bio: string;
  /** Avatar URL or File */
  avatar: string | File;
  /** Skills array */
  skills: string[];
  /** Social links */
  socials: {
    twitter?: string;
    github?: string;
    website?: string;
    email?: string;
  };
  /** Preferences */
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    notifications?: boolean;
    publicProfile?: boolean;
  };
}

export interface ProfileEditorEnhancedProps {
  /** Initial profile data */
  initialData?: Partial<ProfileFormData>;
  /** Save handler */
  onSave: (data: ProfileFormData) => Promise<void>;
  /** Cancel handler */
  onCancel?: () => void;
  /** Upload avatar handler */
  onUploadAvatar?: (file: File) => Promise<string>;
  /** Validation errors */
  errors?: Record<string, string>;
  /** Loading state */
  isSaving?: boolean;
  /** Class name */
  className?: string;
}

// ============================================================================
// Re-exports from SDK for convenience
// ============================================================================

export type { AgentProfile, Achievement, ProfileStats, ReputationHistoryEntry };
