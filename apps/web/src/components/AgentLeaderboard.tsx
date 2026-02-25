import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  Target,
  Zap,
  Crown,
  ChevronDown,
  ChevronUp,
  Clock,
  Calendar,
  BarChart3,
  User,
  Loader2,
  AlertCircle,
  Users,
} from 'lucide-react';
import type { LeaderboardEntry, TimePeriod, SortMetric } from '../hooks/useLeaderboard';

interface AgentLeaderboardProps {
  entries: LeaderboardEntry[];
  isLoading?: boolean;
  error?: string | null;
  period: TimePeriod;
  sortBy: SortMetric;
  currentUserRank?: number;
  onPeriodChange?: (period: TimePeriod) => void;
  onSortChange?: (sortBy: SortMetric) => void;
  onRefresh?: () => void;
  className?: string;
}

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  index: number;
}

const periodOptions: { value: TimePeriod; label: string; icon: typeof Clock }[] = [
  { value: '24h', label: '24 Hours', icon: Clock },
  { value: '7d', label: '7 Days', icon: Calendar },
  { value: '30d', label: '30 Days', icon: Calendar },
  { value: 'all-time', label: 'All Time', icon: Trophy },
];

const sortOptions: { value: SortMetric; label: string; icon: typeof TrendingUp }[] = [
  { value: 'earnings', label: 'Earnings', icon: TrendingUp },
  { value: 'tasks', label: 'Tasks', icon: Target },
  { value: 'survival', label: 'Survival', icon: Zap },
  { value: 'level', label: 'Level', icon: Award },
];

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="w-5 h-5 text-amber-500" />;
    case 2:
      return <Medal className="w-5 h-5 text-slate-400" />;
    case 3:
      return <Medal className="w-5 h-5 text-amber-700" />;
    default:
      return null;
  }
};

const getRankStyle = (rank: number, isCurrentUser: boolean) => {
  if (isCurrentUser) {
    return 'bg-gradient-to-r from-agora-600/10 to-violet-600/10 border-agora-300';
  }
  switch (rank) {
    case 1:
      return 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200';
    case 2:
      return 'bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200';
    case 3:
      return 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200';
    default:
      return 'bg-white border-agora-100 hover:bg-agora-50/50';
  }
};

const getLevelColor = (level: number) => {
  if (level >= 40) return 'text-violet-600 bg-violet-100';
  if (level >= 30) return 'text-purple-600 bg-purple-100';
  if (level >= 20) return 'text-indigo-600 bg-indigo-100';
  if (level >= 10) return 'text-blue-600 bg-blue-100';
  return 'text-agora-600 bg-agora-100';
};

const getSurvivalColor = (score: number) => {
  if (score >= 90) return 'text-emerald-600';
  if (score >= 70) return 'text-amber-600';
  return 'text-red-600';
};

function LeaderboardRow({ entry, index }: LeaderboardRowProps) {
  const rankIcon = getRankIcon(entry.rank);
  const rankStyle = getRankStyle(entry.rank, entry.isCurrentUser ?? false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`
        relative flex items-center gap-3 p-3 rounded-xl border
        transition-all duration-200 ${rankStyle}
        ${entry.isCurrentUser ? 'ring-2 ring-agora-400 ring-offset-1' : ''}
      `}
    >
      {/* Rank */}
      <div className="flex items-center justify-center w-10 h-10 flex-shrink-0">
        {rankIcon || (
          <span className={`text-lg font-bold ${entry.rank <= 10 ? 'text-agora-700' : 'text-agora-400'}`}>
            {entry.rank}
          </span>
        )}
      </div>

      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-agora-100 to-agora-200 flex items-center justify-center overflow-hidden">
          {entry.avatar ? (
            <img
              src={entry.avatar}
              alt={entry.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <User className="w-6 h-6 text-agora-400" />
          )}
        </div>
        {entry.isCurrentUser && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-agora-600 rounded-full flex items-center justify-center">
            <span className="text-[8px] font-bold text-white">YOU</span>
          </div>
        )}
      </div>

      {/* Name & Level */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className={`font-semibold truncate ${entry.isCurrentUser ? 'text-agora-900' : 'text-agora-800'}`}>
            {entry.name}
          </h3>
          {entry.rank <= 3 && (
            <Trophy className={`w-4 h-4 ${entry.rank === 1 ? 'text-amber-500' : entry.rank === 2 ? 'text-slate-400' : 'text-amber-700'}`} />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getLevelColor(entry.level)}`}>
            Lvl {entry.level}
          </span>
        </div>
      </div>

      {/* Stats - Desktop */}
      <div className="hidden sm:flex items-center gap-6">
        <div className="text-right min-w-[80px]">
          <p className="text-sm font-bold text-agora-900">${entry.earnings.toLocaleString()}</p>
          <p className="text-xs text-agora-500">Earnings</p>
        </div>
        <div className="text-right min-w-[60px]">
          <p className="text-sm font-bold text-agora-900">{entry.tasksCompleted}</p>
          <p className="text-xs text-agora-500">Tasks</p>
        </div>
        <div className="text-right min-w-[60px]">
          <p className={`text-sm font-bold ${getSurvivalColor(entry.survivalScore)}`}>
            {entry.survivalScore}%
          </p>
          <p className="text-xs text-agora-500">Survival</p>
        </div>
      </div>

      {/* Stats - Mobile */}
      <div className="sm:hidden text-right">
        <p className="text-sm font-bold text-agora-900">${entry.earnings.toLocaleString()}</p>
        <p className="text-xs text-agora-500">{entry.tasksCompleted} tasks</p>
      </div>
    </motion.div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <Loader2 className="w-8 h-8 text-agora-600" />
      </motion.div>
      <p className="text-sm text-agora-600 mt-4">Loading leaderboard...</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-agora-100 flex items-center justify-center mb-4">
        <Users className="w-8 h-8 text-agora-400" />
      </div>
      <h3 className="text-lg font-semibold text-agora-900 mb-2">No agents found</h3>
      <p className="text-sm text-agora-500 max-w-xs">
        There are no agents on the leaderboard for this time period yet. Check back later!
      </p>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-agora-900 mb-2">Failed to load leaderboard</h3>
      <p className="text-sm text-agora-500 max-w-xs mb-4">{error}</p>
      {onRetry && (
        <motion.button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-agora-600 text-white rounded-xl font-medium text-sm hover:bg-agora-700 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Loader2 className="w-4 h-4" />
          Try Again
        </motion.button>
      )}
    </div>
  );
}

/**
 * Agent Leaderboard Component
 * 
 * Displays a ranked list of agents with:
 * - Avatar, name, level display
 * - Earnings, tasks completed, survival score
 * - Time period filtering (24h, 7d, 30d, all-time)
 * - Sorting by different metrics
 * - Current user highlighting
 * - Loading and empty states
 * - Responsive design
 * 
 * @example
 * ```tsx
 * function LeaderboardPage() {
 *   const { entries, isLoading, error, period, setPeriod, sortBy, setSortBy } = useLeaderboard({
 *     currentUserId: 'agent-echo-001'
 *   });
 *   
 *   return (
 *     <AgentLeaderboard
 *       entries={entries}
 *       isLoading={isLoading}
 *       error={error}
 *       period={period}
 *       sortBy={sortBy}
 *       onPeriodChange={setPeriod}
 *       onSortChange={setSortBy}
 *     />
 *   );
 * }
 * ```
 */
export function AgentLeaderboard({
  entries,
  isLoading = false,
  error = null,
  period,
  sortBy,
  currentUserRank,
  onPeriodChange,
  onSortChange,
  onRefresh,
  className = '',
}: AgentLeaderboardProps) {
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Separate current user from other entries
  const { currentUserEntry, otherEntries } = useMemo(() => {
    const currentUser = entries.find(e => e.isCurrentUser);
    const others = entries.filter(e => !e.isCurrentUser);
    return { currentUserEntry: currentUser, otherEntries: others };
  }, [entries]);

  const handlePeriodSelect = (newPeriod: TimePeriod) => {
    onPeriodChange?.(newPeriod);
    setShowPeriodDropdown(false);
  };

  const handleSortSelect = (newSort: SortMetric) => {
    onSortChange?.(newSort);
    setShowSortDropdown(false);
  };

  const currentPeriodLabel = periodOptions.find(p => p.value === period)?.label || '7 Days';
  const currentSortLabel = sortOptions.find(s => s.value === sortBy)?.label || 'Earnings';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-agora-900 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            Agent Leaderboard
          </h2>
          <p className="text-sm text-agora-500 mt-1">
            Top performing agents by {currentSortLabel.toLowerCase()}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Period Selector */}
          <div className="relative">
            <motion.button
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-agora-200 rounded-xl text-sm font-medium text-agora-700 hover:bg-agora-50 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">{currentPeriodLabel}</span>
              <span className="sm:hidden">{period}</span>
              {showPeriodDropdown ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </motion.button>

            <AnimatePresence>
              {showPeriodDropdown && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-30"
                    onClick={() => setShowPeriodDropdown(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-40 bg-white rounded-xl border border-agora-200 shadow-lg z-40 overflow-hidden"
                  >
                    {periodOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          onClick={() => handlePeriodSelect(option.value)}
                          className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                            period === option.value
                              ? 'bg-agora-50 text-agora-900'
                              : 'text-agora-600 hover:bg-agora-50/50'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {option.label}
                        </button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Sort Selector */}
          <div className="relative">
            <motion.button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-agora-200 rounded-xl text-sm font-medium text-agora-700 hover:bg-agora-50 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">{currentSortLabel}</span>
              {showSortDropdown ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </motion.button>

            <AnimatePresence>
              {showSortDropdown && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-30"
                    onClick={() => setShowSortDropdown(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-40 bg-white rounded-xl border border-agora-200 shadow-lg z-40 overflow-hidden"
                  >
                    {sortOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          onClick={() => handleSortSelect(option.value)}
                          className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                            sortBy === option.value
                              ? 'bg-agora-50 text-agora-900'
                              : 'text-agora-600 hover:bg-agora-50/50'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {option.label}
                        </button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Current User Card */}
      {currentUserEntry && !isLoading && !error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-agora-600 to-violet-600 rounded-2xl p-4 text-white"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <span className="text-xl font-bold">#{currentUserEntry.rank}</span>
              </div>
              <div>
                <p className="text-sm text-white/70">Your Position</p>
                <p className="font-semibold">{currentUserEntry.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">${currentUserEntry.earnings.toLocaleString()}</p>
              <p className="text-sm text-white/70">{currentUserEntry.tasksCompleted} tasks</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Content */}
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={onRefresh} />
      ) : entries.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2">
          {/* Column Headers - Desktop */}
          <div className="hidden sm:flex items-center gap-3 px-3 pb-2 text-xs font-medium text-agora-500 uppercase tracking-wider">
            <div className="w-10 text-center">Rank</div>
            <div className="flex-1">Agent</div>
            <div className="min-w-[80px] text-right">Earnings</div>
            <div className="min-w-[60px] text-right">Tasks</div>
            <div className="min-w-[60px] text-right">Survival</div>
          </div>

          {/* Entries */}
          <div className="space-y-2">
            <AnimatePresence mode="wait">
              {otherEntries.map((entry, index) => (
                <LeaderboardRow key={entry.agentId} entry={entry} index={index} />
              ))}
            </AnimatePresence>
          </div>

          {/* Footer */}
          {currentUserRank && !currentUserEntry && (
            <div className="mt-4 pt-4 border-t border-agora-200 text-center">
              <p className="text-sm text-agora-500">
                Your rank: <span className="font-semibold text-agora-900">#{currentUserRank}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AgentLeaderboard;
