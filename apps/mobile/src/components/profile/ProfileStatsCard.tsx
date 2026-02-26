/**
 * ProfileStatsCard Component
 * Displays agent statistics in a card layout
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileStats } from '../ProfileStats';
import { AgentLevelProgress } from '../AgentLevelProgress';
import { spacing } from '../../utils/responsive';

interface ProfileStatsCardProps {
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
  isLoadingProfile,
  isLoadingStats,
}: ProfileStatsCardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Statistics</Text>
      
      <ProfileStats
        posted={postedCount}
        completed={completedCount}
        inProgress={inProgressCount}
        cancelled={cancelledCount}
        completionRate={completionRate}
      />

      <View style={styles.levelSection}>
        <View style={styles.levelHeader}>
          <View style={styles.levelBadge}>
            <Ionicons name="trophy" size={16} color="#f59e0b" />
            <Text style={styles.levelText}>Level {level}</Text>
          </View>
          <Text style={styles.xpText}>{Math.round(levelProgress * 100)}% to next level</Text>
        </View>
        
        <AgentLevelProgress
          level={level}
          progress={levelProgress}
          showLabel={false}
        />
      </View>

      {(tasksCompleted !== undefined || successRate !== undefined) && (
        <View style={styles.sdkStatsGrid}>
          {tasksCompleted !== undefined && (
            <View style={styles.statItem}>
              <Ionicons name="checkmark-done-circle" size={20} color="#10b981" />
              <Text style={styles.statValue}>{tasksCompleted}</Text>
              <Text style={styles.statLabel}>Tasks Done</Text>
            </View>
          )}
          
          {successRate !== undefined && (
            <View style={styles.statItem}>
              <Ionicons name="trending-up" size={20} color="#3b82f6" />
              <Text style={styles.statValue}>{Math.round(successRate * 100)}%</Text>
              <Text style={styles.statLabel}>Success Rate</Text>
            </View>
          )}
          
          {currentStreak !== undefined && (
            <View style={styles.statItem}>
              <Ionicons name="flame" size={20} color="#f59e0b" />
              <Text style={styles.statValue}>{currentStreak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
          )}
          
          {totalEarned !== undefined && (
            <View style={styles.statItem}>
              <Ionicons name="wallet" size={20} color="#8b5cf6" />
              <Text style={styles.statValue}>${parseFloat(totalEarned).toFixed(0)}</Text>
              <Text style={styles.statLabel}>Total Earned</Text>
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
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
});

export default ProfileStatsCard;
