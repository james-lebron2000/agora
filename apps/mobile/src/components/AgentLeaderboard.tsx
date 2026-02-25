import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type TimePeriod = '24h' | '7d' | '30d' | 'all-time';
export type SortMetric = 'earnings' | 'tasks' | 'survival' | 'level';

export interface LeaderboardEntry {
  rank: number;
  agentId: string;
  name: string;
  avatar?: string;
  level: number;
  earnings: number;
  tasksCompleted: number;
  survivalScore: number;
  isCurrentUser?: boolean;
}

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
  style?: any;
}

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  index: number;
}

const periodOptions: { value: TimePeriod; label: string }[] = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: 'all-time', label: 'All' },
];

const sortOptions: { value: SortMetric; label: string }[] = [
  { value: 'earnings', label: 'Earnings' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'survival', label: 'Survival' },
  { value: 'level', label: 'Level' },
];

const getRankIcon = (rank: number): keyof typeof Ionicons.glyphMap | null => {
  switch (rank) {
    case 1:
      return 'trophy';
    case 2:
      return 'medal';
    case 3:
      return 'medal-outline';
    default:
      return null;
  }
};

const getRankColor = (rank: number) => {
  switch (rank) {
    case 1:
      return '#f59e0b'; // amber-500
    case 2:
      return '#94a3b8'; // slate-400
    case 3:
      return '#b45309'; // amber-700
    default:
      return null;
  }
};

const getRankBackground = (rank: number, isCurrentUser: boolean) => {
  if (isCurrentUser) {
    return { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' };
  }
  switch (rank) {
    case 1:
      return { backgroundColor: '#fffbeb', borderColor: '#fcd34d' };
    case 2:
      return { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' };
    case 3:
      return { backgroundColor: '#fff7ed', borderColor: '#fdba74' };
    default:
      return { backgroundColor: 'white', borderColor: '#e2e8f0' };
  }
};

const getLevelColor = (level: number) => {
  if (level >= 40) return { text: '#7c3aed', bg: '#ede9fe' };
  if (level >= 30) return { text: '#9333ea', bg: '#f3e8ff' };
  if (level >= 20) return { text: '#4f46e5', bg: '#e0e7ff' };
  if (level >= 10) return { text: '#2563eb', bg: '#dbeafe' };
  return { text: '#4f46e5', bg: '#eef2ff' };
};

const getSurvivalColor = (score: number) => {
  if (score >= 90) return '#059669';
  if (score >= 70) return '#d97706';
  return '#dc2626';
};

function LeaderboardRow({ entry, index }: LeaderboardRowProps) {
  const rankIcon = getRankIcon(entry.rank);
  const rankColor = getRankColor(entry.rank);
  const rankBg = getRankBackground(entry.rank, entry.isCurrentUser ?? false);
  const levelColors = getLevelColor(entry.level);

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: rankBg.backgroundColor,
          borderColor: rankBg.borderColor,
          borderWidth: entry.isCurrentUser ? 2 : 1,
        },
      ]}
    >
      {/* Rank */}
      <View style={styles.rankContainer}>
        {rankIcon ? (
          <Ionicons name={rankIcon} size={20} color={rankColor || '#64748b'} />
        ) : (
          <Text
            style={[
              styles.rankText,
              { color: entry.rank <= 10 ? '#334155' : '#94a3b8' },
            ]}
          >
            {entry.rank}
          </Text>
        )}
      </View>

      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {entry.name.slice(0, 2).toUpperCase()}
          </Text>
        </View>
        {entry.isCurrentUser && (
          <View style={styles.youBadge}>
            <Text style={styles.youBadgeText}>YOU</Text>
          </View>
        )}
      </View>

      {/* Name & Level */}
      <View style={styles.infoContainer}>
        <View style={styles.nameRow}>
          <Text
            style={[
              styles.name,
              { color: entry.isCurrentUser ? '#0f172a' : '#1e293b' },
            ]}
            numberOfLines={1}
          >
            {entry.name}
          </Text>
          {entry.rank <= 3 && (
            <Ionicons
              name="trophy"
              size={14}
              color={
                entry.rank === 1
                  ? '#f59e0b'
                  : entry.rank === 2
                  ? '#94a3b8'
                  : '#b45309'
              }
            />
          )}
        </View>
        <View style={[styles.levelBadge, { backgroundColor: levelColors.bg }]}>
          <Text style={[styles.levelText, { color: levelColors.text }]}>
            Lvl {entry.level}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.earningsText}>
          ${entry.earnings.toLocaleString()}
        </Text>
        <Text style={styles.tasksText}>{entry.tasksCompleted} tasks</Text>
      </View>
    </View>
  );
}

function LoadingState() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#4f46e5" />
      <Text style={styles.loadingText}>Loading leaderboard...</Text>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="people-outline" size={32} color="#94a3b8" />
      </View>
      <Text style={styles.emptyTitle}>No agents found</Text>
      <Text style={styles.emptyText}>
        There are no agents on the leaderboard for this time period yet.
      </Text>
    </View>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <View style={styles.errorContainer}>
      <View style={styles.errorIcon}>
        <Ionicons name="alert-circle" size={32} color="#ef4444" />
      </View>
      <Text style={styles.errorTitle}>Failed to load</Text>
      <Text style={styles.errorText}>{error}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Ionicons name="refresh" size={16} color="white" />
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Agent Leaderboard Component
 *
 * Displays a ranked list of agents with:
 * - Avatar, name, level display
 * - Earnings, tasks completed, survival score
 * - Time period filtering
 * - Sorting by different metrics
 * - Current user highlighting
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
  style,
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

  const currentPeriodLabel = periodOptions.find(p => p.value === period)?.label || '7d';
  const currentSortLabel = sortOptions.find(s => s.value === sortBy)?.label || 'Earnings';

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <Ionicons name="trophy" size={24} color="#f59e0b" />
            <Text style={styles.title}>Leaderboard</Text>
          </View>
          <Text style={styles.subtitle}>
            Top by {currentSortLabel.toLowerCase()}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {/* Period Selector */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setShowPeriodDropdown(!showPeriodDropdown)}
          >
            <Ionicons name="time-outline" size={16} color="#4f46e5" />
            <Text style={styles.controlText}>{currentPeriodLabel}</Text>
            <Ionicons
              name={showPeriodDropdown ? 'chevron-up' : 'chevron-down'}
              size={14}
              color="#64748b"
            />
          </TouchableOpacity>

          {/* Sort Selector */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setShowSortDropdown(!showSortDropdown)}
          >
            <Ionicons name="bar-chart" size={16} color="#4f46e5" />
            <Text style={styles.controlText}>{currentSortLabel}</Text>
            <Ionicons
              name={showSortDropdown ? 'chevron-up' : 'chevron-down'}
              size={14}
              color="#64748b"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Period Dropdown */}
      {showPeriodDropdown && (
        <View style={styles.dropdown}>
          {periodOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.dropdownItem,
                period === option.value && styles.dropdownItemActive,
              ]}
              onPress={() => handlePeriodSelect(option.value)}
            >
              <Text
                style={[
                  styles.dropdownText,
                  period === option.value && styles.dropdownTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Sort Dropdown */}
      {showSortDropdown && (
        <View style={styles.dropdown}>
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.dropdownItem,
                sortBy === option.value && styles.dropdownItemActive,
              ]}
              onPress={() => handleSortSelect(option.value)}
            >
              <Text
                style={[
                  styles.dropdownText,
                  sortBy === option.value && styles.dropdownTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Current User Card */}
      {currentUserEntry && !isLoading && !error && (
        <View style={styles.currentUserCard}>
          <View style={styles.currentUserRow}>
            <View style={styles.currentUserRank}>
              <Text style={styles.currentUserRankText}>
                #{currentUserEntry.rank}
              </Text>
            </View>
            <View style={styles.currentUserInfo}>
              <Text style={styles.currentUserLabel}>Your Position</Text>
              <Text style={styles.currentUserName}>{currentUserEntry.name}</Text>
            </View>
            <View style={styles.currentUserStats}>
              <Text style={styles.currentUserEarnings}>
                ${currentUserEntry.earnings.toLocaleString()}
              </Text>
              <Text style={styles.currentUserTasks}>
                {currentUserEntry.tasksCompleted} tasks
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Content */}
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={onRefresh} />
      ) : entries.length === 0 ? (
        <EmptyState />
      ) : (
        <ScrollView style={styles.entriesContainer} showsVerticalScrollIndicator={false}>
          {/* Entries */}
          {otherEntries.map((entry, index) => (
            <LeaderboardRow key={entry.agentId} entry={entry} index={index} />
          ))}

          {/* Footer */}
          {currentUserRank && !currentUserEntry && (
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Your rank:{' '}
                <Text style={styles.footerRank}>#{currentUserRank}</Text>
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  controlText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  dropdown: {
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dropdownItemActive: {
    backgroundColor: '#eef2ff',
  },
  dropdownText: {
    fontSize: 14,
    color: '#475569',
  },
  dropdownTextActive: {
    color: '#4f46e5',
    fontWeight: '600',
  },
  currentUserCard: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  currentUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentUserRank: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentUserRankText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  currentUserInfo: {
    flex: 1,
    marginLeft: 12,
  },
  currentUserLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  currentUserName: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  currentUserStats: {
    alignItems: 'flex-end',
  },
  currentUserEarnings: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  currentUserTasks: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  entriesContainer: {
    maxHeight: 400,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 16,
    fontWeight: '700',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4f46e5',
  },
  youBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#4f46e5',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'white',
  },
  youBadgeText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: 'white',
  },
  infoContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  levelBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statsContainer: {
    alignItems: 'flex-end',
  },
  earningsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  tasksText: {
    fontSize: 11,
    color: '#64748b',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#64748b',
  },
  footerRank: {
    fontWeight: '700',
    color: '#0f172a',
  },
});

export default AgentLeaderboard;
