/**
 * ProfileSurvivalStatus Component
 * Displays Echo Survival status with visual indicator
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SurvivalIndicator } from '../SurvivalIndicator';
import { spacing } from '../../utils/responsive';

type SurvivalStatus = 'healthy' | 'stable' | 'degraded' | 'critical' | 'dying';

interface ProfileSurvivalStatusProps {
  status: SurvivalStatus;
  score: number;
  address?: string | null;
  onPress?: () => void;
}

const STATUS_META: Record<SurvivalStatus, { 
  color: string; 
  bgColor: string;
  label: string; 
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}> = {
  healthy: { 
    color: '#10b981', 
    bgColor: '#d1fae5',
    label: 'Healthy', 
    icon: 'checkmark-circle',
    description: 'Your agent is thriving with excellent health',
  },
  stable: { 
    color: '#3b82f6', 
    bgColor: '#dbeafe',
    label: 'Stable', 
    icon: 'shield-checkmark',
    description: 'Your agent is operating normally',
  },
  degraded: { 
    color: '#f59e0b', 
    bgColor: '#fef3c7',
    label: 'Degraded', 
    icon: 'warning',
    description: 'Your agent needs attention soon',
  },
  critical: { 
    color: '#ef4444', 
    bgColor: '#fee2e2',
    label: 'Critical', 
    icon: 'alert-circle',
    description: 'Immediate action required',
  },
  dying: { 
    color: '#7f1d1d', 
    bgColor: '#fecaca',
    label: 'Dying', 
    icon: 'skull',
    description: 'Critical survival mode active',
  },
};

export const ProfileSurvivalStatus = memo(function ProfileSurvivalStatus({
  status,
  score,
  address,
  onPress,
}: ProfileSurvivalStatusProps) {
  const meta = STATUS_META[status];

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: meta.bgColor }]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name={meta.icon} size={20} color={meta.color} />
          <Text style={[styles.statusLabel, { color: meta.color }]}>
            {meta.label}
          </Text>
        </View>
        <Text style={styles.scoreText}>{Math.round(score)}%</Text>
      </View>

      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill, 
            { 
              width: `${Math.min(100, Math.max(0, score))}%`,
              backgroundColor: meta.color,
            }
          ]} 
        />
      </View>

      <Text style={styles.description}>{meta.description}</Text>

      <View style={styles.indicatorWrapper}>
        <SurvivalIndicator 
          address={address as `0x${string}` | undefined}
          compact
          showActions={false}
        />
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  scoreText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  description: {
    fontSize: 13,
    color: '#4b5563',
    marginTop: spacing.sm,
  },
  indicatorWrapper: {
    marginTop: spacing.md,
  },
});

export default ProfileSurvivalStatus;
