/**
 * ActivityTimeline Component
 * 
 * Displays agent activity history in a chronological timeline view.
 */

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  PlusCircle,
  DollarSign,
  Send,
  Award,
  TrendingUp,
  ArrowLeftRight,
  User,
  Loader2,
  ChevronDown,
  Clock,
  Calendar,
  Filter,
} from 'lucide-react';
import { useProfileTheme } from '../../contexts/ProfileThemeContext';
import type { ActivityTimelineProps, ActivityItem, ActivityType } from './types';

// ============================================================================
// Activity Type Configuration
// ============================================================================

interface ActivityTypeConfig {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  label: string;
}

export const activityTypeConfig: Record<ActivityType, ActivityTypeConfig> = {
  task_completed: {
    icon: <CheckCircle2 size={16} />,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Task Completed',
  },
  task_posted: {
    icon: <PlusCircle size={16} />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Task Posted',
  },
  payment_received: {
    icon: <DollarSign size={16} />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    label: 'Payment Received',
  },
  payment_sent: {
    icon: <Send size={16} />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    label: 'Payment Sent',
  },
  achievement_unlocked: {
    icon: <Award size={16} />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    label: 'Achievement',
  },
  level_up: {
    icon: <TrendingUp size={16} />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    label: 'Level Up',
  },
  reputation_change: {
    icon: <CheckCircle2 size={16} />,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
    label: 'Reputation',
  },
  bridge_completed: {
    icon: <ArrowLeftRight size={16} />,
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
    label: 'Bridge',
  },
  profile_updated: {
    icon: <User size={16} />,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    label: 'Profile',
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function formatDateGroup(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';
  
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

// ============================================================================
// Activity Item Component
// ============================================================================

interface TimelineItemProps {
  activity: ActivityItem;
  isLast: boolean;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ activity, isLast }) => {
  const { themeConfig } = useProfileTheme();
  const config = activityTypeConfig[activity.type];
  const [isExpanded, setIsExpanded] = useState(false);

  const hasMetadata = activity.metadata && Object.keys(activity.metadata).length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="relative flex gap-4"
    >
      {/* Timeline line */}
      {!isLast && (
        <div className={`
          absolute left-5 top-10 bottom-0 w-px
          ${themeConfig.border} border-l border-dashed
        `} />
      )}

      {/* Icon */}
      <div className={`
        relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0
        ${config.bgColor} ${config.color}
        border-2 border-white dark:border-gray-900
        shadow-sm
      `}>
        {activity.icon ? <span>{activity.icon}</span> : config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-6">
        <div className={`
          p-4 rounded-xl
          ${themeConfig.surface} 
          ${themeConfig.border} border
          hover:shadow-md transition-shadow
        `}>
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-semibold text-sm ${themeConfig.text}`}>
                  {activity.title}
                </span>
                <span className={`
                  px-2 py-0.5 rounded-full text-xs
                  ${config.bgColor} ${config.color}
                `}>
                  {config.label}
                </span>
              </div>
              
              {activity.description && (
                <p className={`mt-1 text-sm ${themeConfig.textMuted}`}>
                  {activity.description}
                </p>
              )}
            </div>
            
            <span className={`text-xs ${themeConfig.textMuted} shrink-0`}>
              {formatTimeAgo(activity.timestamp)}
            </span>
          </div>

          {/* Metadata (expandable) */}
          {hasMetadata && (
            <div className="mt-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`
                  flex items-center gap-1 text-xs
                  ${themeConfig.textMuted} hover:${themeConfig.text}
                  transition-colors
                `}
              >
                <ChevronDown 
                  size={14} 
                  className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
                {isExpanded ? 'Less details' : 'More details'}
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className={`
                      mt-2 p-3 rounded-lg
                      ${themeConfig.background}
                      font-mono text-xs
                    `}>
                      {Object.entries(activity.metadata || {}).map(([key, value]) => (
                        <div key={key} className="flex justify-between gap-4">
                          <span className={themeConfig.textMuted}>{key}:</span>
                          <span className={`${themeConfig.text} truncate`}>
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================================
// Date Group Component
// ============================================================================

interface DateGroupProps {
  date: string;
  activities: ActivityItem[];
  isLastGroup: boolean;
}

const DateGroup: React.FC<DateGroupProps> = ({ date, activities, isLastGroup }) => {
  const { themeConfig } = useProfileTheme();

  return (
    <div className="mb-6">
      {/* Date header */}
      <div className={`
        sticky top-0 z-20
        flex items-center gap-2 mb-4
        py-2
        ${themeConfig.surface}
      `}>
        <Calendar size={16} className={themeConfig.textMuted} />
        <span className={`text-sm font-semibold ${themeConfig.text}`}>{date}</span>
        <div className={`flex-1 h-px ${themeConfig.border} border-t`} />
        <span className={`text-xs ${themeConfig.textMuted}`}>
          {activities.length} activity{activities.length !== 1 ? 'ies' : 'y'}
        </span>
      </div>

      {/* Activities */}
      <div className="space-y-0">
        {activities.map((activity, index) => (
          <TimelineItem
            key={activity.id}
            activity={activity}
            isLast={isLastGroup && index === activities.length - 1}
          />
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Main Activity Timeline Component
// ============================================================================

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  activities,
  isLoading = false,
  maxItems = 50,
  infiniteScroll = false,
  onLoadMore,
  hasMore = false,
  emptyMessage = "No activity yet. Complete tasks to see your activity here!",
  groupByDate = true,
  className = '',
}) => {
  const { themeConfig } = useProfileTheme();
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Group activities by date
  const groupedActivities = useMemo(() => {
    if (!groupByDate) {
      return { 'All Activities': activities.slice(0, maxItems) };
    }

    const groups: Record<string, ActivityItem[]> = {};
    
    activities.slice(0, maxItems).forEach((activity) => {
      const dateKey = formatDateGroup(activity.timestamp);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(activity);
    });

    return groups;
  }, [activities, groupByDate, maxItems]);

  // Handle load more
  const handleLoadMore = async () => {
    if (!onLoadMore || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      await onLoadMore();
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`${className}`}>
        <div className={`
          rounded-2xl p-6
          ${themeConfig.surface} ${themeConfig.border} border
        `}>
          <div className="flex items-center gap-2 mb-6">
            <Clock size={20} className={themeConfig.textMuted} />
            <h3 className={`text-lg font-semibold ${themeConfig.text}`}>Activity</h3>
          </div>
          
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (activities.length === 0) {
    return (
      <div className={`${className}`}>
        <div className={`
          rounded-2xl p-8 text-center
          ${themeConfig.surface} ${themeConfig.border} border
        `}>
          <Clock size={48} className={`mx-auto mb-4 ${themeConfig.textMuted} opacity-50`} />
          <p className={`${themeConfig.textMuted}`}>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  const groupEntries = Object.entries(groupedActivities);

  return (
    <div className={`${className}`}>
      <div className={`
        rounded-2xl p-6
        ${themeConfig.surface} ${themeConfig.border} border
        ${themeConfig.shadowStyle}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Clock size={20} className={themeConfig.textMuted} />
            <h3 className={`text-lg font-semibold ${themeConfig.text}`}>Activity</h3>
            <span className={`
              px-2 py-0.5 rounded-full text-xs
              ${themeConfig.background} ${themeConfig.textMuted}
            `}>
              {activities.length}
            </span>
          </div>
          
          {/* Filter button (placeholder for future) */}
          <button className={`
            p-2 rounded-lg
            ${themeConfig.background} ${themeConfig.textMuted}
            hover:${themeConfig.text}
            transition-colors
          `}>
            <Filter size={16} />
          </button>
        </div>

        {/* Timeline */}
        <div>
          {groupEntries.map(([date, items], groupIndex) => (
            <DateGroup
              key={date}
              date={date}
              activities={items}
              isLastGroup={groupIndex === groupEntries.length - 1}
            />
          ))}
        </div>

        {/* Load more */}
        {(infiniteScroll || hasMore) && (
          <div className="flex justify-center mt-4">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore || !hasMore}
              className={`
                flex items-center gap-2 px-6 py-2 rounded-lg
                ${themeConfig.background} ${themeConfig.text}
                border ${themeConfig.border}
                hover:shadow-md transition-all
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {isLoadingMore ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Loading...
                </>
              ) : hasMore ? (
                <>
                  <ChevronDown size={16} />
                  Load More
                </>
              ) : (
                'No more activities'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityTimeline;
