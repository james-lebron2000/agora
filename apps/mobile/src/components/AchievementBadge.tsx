import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type BadgeRarity = 'common' | 'rare' | 'epic';

export interface AchievementBadgeProps {
  title: string;
  description: string;
  icon: string;
  rarity?: BadgeRarity;
  unlocked: boolean;
  progress?: number;
}

const rarityTheme: Record<BadgeRarity, { bg: string; border: string; text: string }> = {
  common: { bg: '#f8fafc', border: '#cbd5e1', text: '#334155' },
  rare: { bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8' },
  epic: { bg: '#fff7ed', border: '#fdba74', text: '#c2410c' },
};

const clamp = (value: number) => Math.max(0, Math.min(100, value));

export default function AchievementBadge({
  title,
  description,
  icon,
  rarity = 'common',
  unlocked,
  progress = 0,
}: AchievementBadgeProps) {
  const theme = rarityTheme[rarity];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: unlocked ? theme.bg : '#f1f5f9',
          borderColor: unlocked ? theme.border : '#e2e8f0',
          opacity: unlocked ? 1 : 0.82,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: unlocked ? `${theme.border}30` : '#e2e8f0' }]}>
        <Ionicons
          name={(icon as keyof typeof Ionicons.glyphMap) || 'medal-outline'}
          size={20}
          color={unlocked ? theme.text : '#64748b'}
        />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          <Text style={[styles.rarity, { color: unlocked ? theme.text : '#94a3b8' }]}>{rarity.toUpperCase()}</Text>
        </View>
        <Text style={styles.description}>{description}</Text>
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${clamp(progress)}%`,
                  backgroundColor: unlocked ? theme.text : '#94a3b8',
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{unlocked ? 'Unlocked' : `${Math.round(clamp(progress))}%`}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  rarity: {
    fontSize: 10,
    fontWeight: '700',
  },
  description: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
    width: 56,
    textAlign: 'right',
  },
});
