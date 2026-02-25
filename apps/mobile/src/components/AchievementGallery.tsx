import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: AchievementTier;
  xpReward: number;
  unlocked: boolean;
  unlockedAt?: number;
  progress: number;
  criteria: {
    type: string;
    value: number;
    description: string;
  };
}

interface AchievementGalleryProps {
  achievements: Achievement[];
}

const { width: screenWidth } = Dimensions.get('window');

const tierConfig: Record<AchievementTier, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  bronze: { color: '#b45309', bg: '#fef3c7', icon: 'trophy-outline' },
  silver: { color: '#64748b', bg: '#f1f5f9', icon: 'medal-outline' },
  gold: { color: '#eab308', bg: '#fef9c3', icon: 'ribbon-outline' },
  platinum: { color: '#06b6d4', bg: '#ecfeff', icon: 'star-outline' },
  diamond: { color: '#a855f7', bg: '#faf5ff', icon: 'diamond-outline' },
};

export const AchievementGallery: React.FC<AchievementGalleryProps> = ({ achievements }) => {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [selectedTier, setSelectedTier] = useState<AchievementTier | 'all'>('all');

  const filteredAchievements = achievements.filter((a) => {
    if (filter === 'unlocked' && !a.unlocked) return false;
    if (filter === 'locked' && a.unlocked) return false;
    if (selectedTier !== 'all' && a.tier !== selectedTier) return false;
    return true;
  });

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalXP = achievements
    .filter((a) => a.unlocked)
    .reduce((sum, a) => sum + a.xpReward, 0);

  const tierOptions: Array<AchievementTier | 'all'> = ['all', 'bronze', 'silver', 'gold', 'platinum', 'diamond'];
  const filterOptions: Array<'all' | 'unlocked' | 'locked'> = ['all', 'unlocked', 'locked'];

  return (
    <View style={styles.container}>
      {/* Stats Header */}
      <View style={styles.statsHeader}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{unlockedCount}</Text>
          <Text style={styles.statLabel}>Unlocked</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{achievements.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, styles.xpValue]}>{totalXP.toLocaleString()}</Text>
          <Text style={styles.statLabel}>XP Earned</Text>
        </View>
      </View>

      {/* Filter Buttons */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {filterOptions.map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[
              styles.filterButton,
              filter === f && styles.filterButtonActive,
            ]}
          >
            <Text style={[
              styles.filterText,
              filter === f && styles.filterTextActive,
            ]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tier Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tierScroll}
        contentContainerStyle={styles.tierContent}
      >
        {tierOptions.map((tier) => (
          <TouchableOpacity
            key={tier}
            onPress={() => setSelectedTier(tier)}
            style={[
              styles.tierButton,
              selectedTier === tier && tier !== 'all' && { 
                backgroundColor: tierConfig[tier].bg,
                borderColor: tierConfig[tier].color,
              },
              selectedTier === tier && tier === 'all' && styles.tierButtonActive,
            ]}
          >
            <Text style={[
              styles.tierText,
              selectedTier === tier && tier !== 'all' && { color: tierConfig[tier].color },
              selectedTier === tier && tier === 'all' && styles.tierTextActive,
            ]}>
              {tier.charAt(0).toUpperCase() + tier.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Achievements Grid */}
      <View style={styles.grid}>
        {filteredAchievements.map((achievement) => {
          const tier = tierConfig[achievement.tier];

          return (
            <View
              key={achievement.id}
              style={[
                styles.achievementCard,
                !achievement.unlocked && styles.achievementCardLocked,
              ]}
            >
              {/* Unlocked Badge */}
              {achievement.unlocked && (
                <View style={styles.unlockedBadge}>
                  <Ionicons name="lock-open-outline" size={14} color="#10b981" />
                </View>
              )}

              <View style={styles.cardContent}>
                {/* Icon */}
                <View style={[styles.iconContainer, { backgroundColor: tier.bg }]}>
                  <Text style={styles.iconText}>{achievement.icon}</Text>
                </View>

                {/* Content */}
                <View style={styles.content}>
                  <View style={styles.titleRow}>
                    <Text style={styles.title} numberOfLines={1}>{achievement.name}</Text>
                  </View>
                  <Text style={styles.description} numberOfLines={2}>
                    {achievement.description}
                  </Text>

                  {/* Tier Badge */}
                  <View style={styles.badgeRow}>
                    <View style={[styles.tierBadge, { backgroundColor: tier.bg }]}>
                      <Text style={[styles.tierBadgeText, { color: tier.color }]}>
                        {achievement.tier.charAt(0).toUpperCase() + achievement.tier.slice(1)}
                      </Text>
                    </View>
                    <Text style={styles.xpBadge}>+{achievement.xpReward} XP</Text>
                  </View>

                  {/* Progress Bar */}
                  {!achievement.unlocked && (
                    <View style={styles.progressContainer}>
                      <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>Progress</Text>
                        <Text style={styles.progressValue}>{achievement.progress}%</Text>
                      </View>
                      <View style={styles.progressBar}>
                        <View 
                          style={[
                            styles.progressFill,
                            { width: `${achievement.progress}%` }
                          ]} 
                        />
                      </View>
                    </View>
                  )}

                  {/* Unlocked Date */}
                  {achievement.unlocked && achievement.unlockedAt && (
                    <Text style={styles.unlockedDate}>
                      Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {filteredAchievements.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="trophy-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyText}>No achievements found</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e2e8f0',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  xpValue: {
    color: '#10b981',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  filterScroll: {
    marginBottom: 8,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  filterButtonActive: {
    backgroundColor: '#6366f1',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  tierScroll: {
    marginBottom: 16,
  },
  tierContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tierButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tierButtonActive: {
    backgroundColor: '#6366f1',
  },
  tierText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  tierTextActive: {
    color: '#ffffff',
  },
  grid: {
    paddingHorizontal: 16,
    gap: 12,
  },
  achievementCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  achievementCardLocked: {
    opacity: 0.7,
    backgroundColor: '#f8fafc',
  },
  unlockedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#d1fae5',
  },
  cardContent: {
    flexDirection: 'row',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  description: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  xpBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
  },
  progressContainer: {
    marginTop: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  progressValue: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 2,
  },
  unlockedDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 12,
  },
});

export default AchievementGallery;
