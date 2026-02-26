/**
 * Profile Components Index
 * 
 * Central export point for all Agent Profile UI components.
 */

// ============================================================================
// Component Exports
// ============================================================================

export { ProfileCard } from './ProfileCard';
export { ActivityTimeline } from './ActivityTimeline';
export { PortfolioView } from './PortfolioView';
export { ProfileEditor } from './ProfileEditor';

// ============================================================================
// Type Exports
// ============================================================================

export type {
  // Profile Card
  SurvivalScore,
  ProfileCardProps,
  
  // Activity Timeline
  ActivityType,
  ActivityItem,
  ActivityTimelineProps,
  
  // Portfolio
  PortfolioAsset,
  PortfolioData,
  PortfolioViewMode,
  PortfolioSortBy,
  PortfolioViewProps,
  
  // Profile Editor
  ProfileFormData,
  ProfileEditorEnhancedProps,
  
  // Re-exports from SDK
  AgentProfile,
  Achievement,
  ProfileStats,
  ReputationHistoryEntry,
} from './types';

// ============================================================================
// Utility Exports
// ============================================================================

export {
  // Activity type configurations
  activityTypeConfig,
} from './ActivityTimeline';
