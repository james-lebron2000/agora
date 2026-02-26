/**
 * ProfileStatsCard Component
 * Displays agent statistics in a card layout
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileStats } from '../ProfileStats';
import { AgentLevelProgress, type AgentLevel } from '../AgentLevelProgress';
import { spacing } from '../../utils/responsive';

export interface ProfileStatsCardProps {
  // Task stats
  postedCount: number;
  completedCount: number;
  inProgressCount: number;
  cancelledCount: number;
  completionRate: number;
  // Level stats
  level: number;
  levelProgress: number;
  // SDK stats
  tasksCompleted?: number;
  successRate?: number;
  currentStreak?: number;
  totalEarned?: string;
  totalSpent?: string;
  // Loading states
  isLoadingProfile?: boolean;
  isLoadingStats?: boolean;
}

// Build AgentLevel object from level and progress
const buildAgentLevel = (level: number, progress: number): AgentLevel => ({
  level,
  title: `Level ${level}`,
  currentXP: Math.round(progress * 1000),
  maxXP: 1000,
  totalXP: level * 1000 + Math.round(progress * 1000),
  nextLevelTitle: `Level ${level + 1}`,
});

export const ProfileStatsCard = memo(function ProfileStatsCard({
  postedCount,
  completedCount,
  inProgressCount,
  cancelledCount,
  completionRate,
  level,
  levelProgress,
  tasksCompleted,
  successRate,
  currentStreak,
  totalEarned,
  totalSpent,
}: ProfileStatsCardProps) {
  const agentLevel = buildAgentLevel(level, levelProgress);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Statistics</Text>
      
      {/* Task Stats Summary */}
      <View style={styles.taskStatsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{postedCount}</Text>
          <Text style={styles.statLabel}>Posted</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{completedCount}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{completionRate}%</Text>
          <Text style={styles.statLabel}>Success Rate</Text>
        </View>
      </View>

      {/* Level Progress */}
      <View style={styles.levelSection}>
        <View style={styles.levelHeader}>
          <View style={styles.levelBadge}>
            <Ionicons name="trophy" size={16} color="#f59e0b" />
            <Text style={styles.levelText}>Level {level}</Text>
          </View>
          <Text style={styles.xpText}>{Math.round(levelProgress * 100)}% to next level</Text>
        </View>
        
        <AgentLevelProgress
          level={agentLevel}
          compact
        />
      </View>

      {/* SDK Stats */}
      {(tasksCompleted !== undefined || successRate !== undefined) && (
        <View style={styles.sdkStatsGrid}>
          {tasksCompleted !== undefined && (
            <View style={styles.statItem}>
              <Ionicons name="checkmark-done-circle" size={20} color="#10b981" />
              <Text style={styles.sdkStatValue}>{tasksCompleted}</Text>
              <Text style={styles.sdkStatLabel}>Tasks Done</Text>
            </View>
          )}
          
          {successRate !== undefined && (
            <View style={styles.statItem}>
              <Ionicons name="trending-up" size={20} color="#3b82f6" />
              <Text style={styles.sdkStatValue}>{Math.round(successRate * 100)}%</Text>
              <Text style={styles.sdkStatLabel}>Success Rate</Text>
            </View>
          )}
          
          {currentStreak !== undefined && (
            <View style={styles.statItem}>
              <Ionicons name="flame" size={20} color="#f59e0b" />
              <Text style={styles.sdkStatValue}>{currentStreak}</Text>
              <Text style={styles.sdkStatLabel}>Day Streak</Text>
            </View>
          )}
          
          {totalEarned !== undefined && (
            <View style={styles.statItem}>
              <Ionicons name="wallet" size={20} color="#8b5cf6" />
              <Text style={styles.sdkStatValue}>${parseFloat(totalEarned).toFixed(0)}</Text>
              <Text style={styles.sdkStatLabel}>Total Earned</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: spacing.md,
  },
  taskStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  levelSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  levelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  xpText: {
    fontSize: 12,
    color: '#6b7280',
  },
  sdkStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: spacing.md,
  },
  statItem: {
    flex: 1,
    minWidth: 70,
    alignItems: 'center',
    padding: spacing.sm,
  },
  sdkStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  sdkStatLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
});

export default ProfileStatsCard;
