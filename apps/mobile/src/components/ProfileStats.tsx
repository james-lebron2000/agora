import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProfileStatsProps {
  stats: {
    tasksCompleted: number;
    tasksCompletedThisMonth: number;
    successRate: number;
    averageRating: number;
    totalReviews: number;
    currentStreak: number;
    longestStreak: number;
    averageResponseTime: number;
    totalWorkingHours: number;
  };
  earnings: {
    totalEarned: string;
    totalSpent: string;
  };
}

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  subtext: string;
  color: string;
  bgColor: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, subtext, color, bgColor }) => (
  <View style={[styles.card, { backgroundColor: bgColor }]}>
    <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={[styles.value, { color }]}>{value}</Text>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.subtext}>{subtext}</Text>
  </View>
);

export const ProfileStats: React.FC<ProfileStatsProps> = ({ stats, earnings }) => {
  const cards: StatCardProps[] = [
    {
      icon: 'checkmark-circle-outline',
      label: 'Tasks Done',
      value: stats.tasksCompleted.toString(),
      subtext: `${stats.tasksCompletedThisMonth} this month`,
      color: '#10b981',
      bgColor: '#f0fdf4',
    },
    {
      icon: 'star-outline',
      label: 'Success Rate',
      value: `${Math.round(stats.successRate * 100)}%`,
      subtext: `${stats.averageRating.toFixed(1)} avg rating`,
      color: '#f59e0b',
      bgColor: '#fffbeb',
    },
    {
      icon: 'cash-outline',
      label: 'Earned',
      value: `$${parseFloat(earnings.totalEarned).toLocaleString()}`,
      subtext: `Spent $${parseFloat(earnings.totalSpent).toLocaleString()}`,
      color: '#059669',
      bgColor: '#ecfdf5',
    },
    {
      icon: 'flash-outline',
      label: 'Response Time',
      value: `${stats.averageResponseTime}m`,
      subtext: 'Average response',
      color: '#3b82f6',
      bgColor: '#eff6ff',
    },
    {
      icon: 'flame-outline',
      label: 'Streak',
      value: `${stats.currentStreak}d`,
      subtext: `Best: ${stats.longestStreak}d`,
      color: '#f97316',
      bgColor: '#fff7ed',
    },
    {
      icon: 'time-outline',
      label: 'Work Hours',
      value: `${stats.totalWorkingHours}h`,
      subtext: 'Total hours',
      color: '#8b5cf6',
      bgColor: '#f5f3ff',
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {cards.map((card, index) => (
          <StatCard key={index} {...card} />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    width: 140,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  subtext: {
    fontSize: 11,
    color: '#94a3b8',
  },
});

export default ProfileStats;
