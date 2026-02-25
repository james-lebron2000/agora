import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface AgentLevel {
  level: number;
  title: string;
  currentXP: number;
  maxXP: number;
  totalXP: number;
  nextLevelTitle: string;
}

interface AgentLevelProgressProps {
  level: AgentLevel;
  style?: any;
  compact?: boolean;
}

interface CompareAgentsProps {
  agents: Array<{
    id: string;
    name: string;
    level: number;
    xp: number;
    avatar?: string;
  }>;
  style?: any;
}

const levelTitles: Record<number, string> = {
  1: 'Novice',
  2: 'Apprentice',
  3: 'Journeyman',
  4: 'Expert',
  5: 'Master',
  6: 'Grandmaster',
  7: 'Legend',
  8: 'Mythic',
  9: 'Immortal',
  10: 'Transcendent',
};

/**
 * Calculate level from total XP
 */
export function calculateLevel(totalXP: number): AgentLevel {
  // XP required for each level (exponential growth)
  const baseXP = 100;
  const growthRate = 1.5;

  let level = 1;
  let xpForCurrentLevel = 0;
  let xpForNextLevel = baseXP;

  while (totalXP >= xpForNextLevel && level < 100) {
    xpForCurrentLevel = xpForNextLevel;
    xpForNextLevel = Math.floor(xpForNextLevel * growthRate);
    level++;
  }

  const currentLevelXP = totalXP - xpForCurrentLevel;
  const maxLevelXP = xpForNextLevel - xpForCurrentLevel;

  return {
    level,
    title: levelTitles[level] || `Level ${level}`,
    currentXP: currentLevelXP,
    maxXP: maxLevelXP,
    totalXP,
    nextLevelTitle: levelTitles[level + 1] || `Level ${level + 1}`,
  };
}

/**
 * Agent Level Progress Component
 *
 * Displays agent level and XP progress with:
 * - Circular progress ring
 * - Level badge
 * - XP breakdown
 */
export function AgentLevelProgress({
  level,
  style,
  compact = false,
}: AgentLevelProgressProps) {
  const progress = useMemo(() => (level.currentXP / level.maxXP) * 100, [level]);
  const circumference = 2 * Math.PI * 36;

  const progressAnim = useSharedValue(0);

  React.useEffect(() => {
    progressAnim.value = withTiming(progress, { duration: 1000 });
  }, [progress]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference - (progressAnim.value / 100) * circumference;
    return { strokeDashoffset };
  });

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <View style={styles.compactBadge}>
          <Text style={styles.compactBadgeText}>{level.level}</Text>
        </View>
        <View style={styles.compactInfo}>
          <View style={styles.compactTitleRow}>
            <Ionicons name="sparkles" size={16} color="#8b5cf6" />
            <Text style={styles.compactTitle}>{level.title}</Text>
          </View>
          <View style={styles.compactProgressTrack}>
            <Animated.View
              style={[
                styles.compactProgressFill,
                { width: `${progress}%` },
              ]}
            />
          </View>
          <Text style={styles.compactXPText}>
            {level.currentXP.toLocaleString()} / {level.maxXP.toLocaleString()} XP
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        {/* Circular progress */}
        <View style={styles.progressContainer}>
          <Svg width={80} height={80} viewBox="0 0 80 80">
            <Defs>
              <LinearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#8b5cf6" />
                <Stop offset="100%" stopColor="#a855f7" />
              </LinearGradient>
            </Defs>
            {/* Background circle */}
            <Circle
              cx={40}
              cy={40}
              r={36}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={6}
            />
            {/* Progress circle */}
            <AnimatedCircle
              cx={40}
              cy={40}
              r={36}
              fill="none"
              stroke="url(#gradient)"
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray={circumference}
              animatedProps={animatedProps}
              transform="rotate(-90 40 40)"
            />
          </Svg>

          {/* Level badge */}
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>{level.level}</Text>
          </View>
        </View>

        {/* Level details */}
        <View style={styles.detailsContainer}>
          <View style={styles.titleRow}>
            <Ionicons name="trophy" size={20} color="#8b5cf6" />
            <Text style={styles.levelTitle}>{level.title}</Text>
          </View>

          <Text style={styles.xpText}>
            {level.currentXP.toLocaleString()} / {level.maxXP.toLocaleString()} XP to{' '}
            <Text style={styles.nextLevelText}>{level.nextLevelTitle}</Text>
          </Text>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: `${progress}%` },
              ]}
            />
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="star" size={16} color="#f59e0b" />
              <Text style={styles.statText}>
                {level.totalXP.toLocaleString()} Total XP
              </Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="trending-up" size={16} color="#10b981" />
              <Text style={styles.statText}>
                {Math.round(progress)}% Complete
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * Compare Agents Component
 *
 * Shows a comparison of multiple agents' levels
 */
export function CompareAgents({ agents, style }: CompareAgentsProps) {
  const maxXP = Math.max(...agents.map(a => a.xp));

  return (
    <View style={[styles.compareContainer, style]}>
      <View style={styles.compareHeader}>
        <Ionicons name="git-compare" size={20} color="#64748b" />
        <Text style={styles.compareTitle}>Compare Agents</Text>
      </View>

      <View style={styles.compareList}>
        {agents.map((agent, index) => {
          const level = calculateLevel(agent.xp);
          const percentage = (agent.xp / maxXP) * 100;

          return (
            <View key={agent.id} style={styles.compareRow}>
              <View style={styles.compareBadge}>
                <Text style={styles.compareBadgeText}>{level.level}</Text>
              </View>
              <View style={styles.compareInfo}>
                <View style={styles.compareNameRow}>
                  <Text style={styles.compareName}>{agent.name}</Text>
                  <Text style={styles.compareXP}>{agent.xp.toLocaleString()} XP</Text>
                </View>
                <View style={styles.compareProgressTrack}>
                  <Animated.View
                    style={[
                      styles.compareProgressFill,
                      { width: `${percentage}%` },
                    ]}
                  />
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Generate sample level data
 */
export function generateSampleLevel(): AgentLevel {
  return calculateLevel(45250);
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  progressContainer: {
    position: 'relative',
    marginRight: 16,
  },
  levelBadge: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  levelBadgeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  detailsContainer: {
    flex: 1,
    paddingTop: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  xpText: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  nextLevelText: {
    color: '#8b5cf6',
    fontWeight: '600',
  },
  progressTrack: {
    height: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8b5cf6',
    borderRadius: 5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compactBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  compactBadgeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  compactInfo: {
    flex: 1,
  },
  compactTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  compactProgressTrack: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  compactProgressFill: {
    height: '100%',
    backgroundColor: '#8b5cf6',
    borderRadius: 3,
  },
  compactXPText: {
    fontSize: 12,
    color: '#64748b',
  },
  compareContainer: {
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
  compareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  compareTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  compareList: {
    gap: 16,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compareBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compareBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  compareInfo: {
    flex: 1,
  },
  compareNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  compareName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  compareXP: {
    fontSize: 12,
    color: '#64748b',
  },
  compareProgressTrack: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  compareProgressFill: {
    height: '100%',
    backgroundColor: '#8b5cf6',
    borderRadius: 3,
  },
});

export default AgentLevelProgress;
