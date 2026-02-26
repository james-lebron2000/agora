/**
 * ProfileScreen - Optimized Version
 * Uses modular components for better maintainability and performance
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import {
  ProfileHeader,
  ProfileStatsCard,
  ProfileSurvivalStatus,
  ProfileTaskList,
  ProfileTaskChart,
} from '../components/profile';
import {
  MultiChainBalance,
  ProfileEditModal,
  AchievementBadge,
  ActivityHeatmap,
  AgentLeaderboard,
  generateActivityData,
  calculateLevel,
} from '../components';
import { useWalletStore } from '../store/walletStore';
import { useTasks, useSurvival, useProfileApi } from '../hooks/useApi';
import { useProfile } from '../hooks/useProfile';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { spacing } from '../utils/responsive';
import type { Task } from '../types/navigation';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NavigationProp = any;
type SurvivalStatus = 'healthy' | 'stable' | 'degraded' | 'critical' | 'dying';

// Generate mock leaderboard data
const generateMockLeaderboard = (currentUserId?: string) => {
  const mockAgents = [
    { id: 'agent-alpha-001', name: 'Alpha Trader', level: 42 },
    { id: 'agent-beta-002', name: 'Beta Scout', level: 38 },
    { id: 'agent-gamma-003', name: 'Gamma Analyst', level: 35 },
  ];

  const entries = mockAgents.map((agent, index) => ({
    id: agent.id,
    name: agent.name,
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.id}`,
    level: agent.level,
    xp: agent.level * 1000 + Math.floor(Math.random() * 1000),
    tasksCompleted: Math.floor(Math.random() * 100) + 50,
    earnings: (Math.random() * 5 + 1).toFixed(2),
    streak: Math.floor(Math.random() * 30),
    rank: index + 1,
  }));

  // Add current user
  if (currentUserId) {
    entries.push({
      id: currentUserId,
      name: 'You',
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUserId}`,
      level: 25,
      xp: 25000,
      tasksCompleted: 45,
      earnings: '2.5',
      streak: 7,
      rank: entries.length + 1,
    });
  }

  return entries.sort((a, b) => b.xp - a.xp).map((e, i) => ({ ...e, rank: i + 1 }));
};

export default function ProfileScreen(): React.ReactElement {
  const navigation = useNavigation<NavigationProp>();
  const { address, disconnect } = useWalletStore();
  const { isOnline, isSyncing, pendingCount, forceSync, lastSyncTime } = useOfflineSync();
  
  // Data fetching
  const { data: tasksData, isLoading: isLoadingTasks } = useTasks(address || undefined);
  const { data: survivalData, isLoading: isLoadingSurvival } = useSurvival(address || undefined);
  const { data: profileData, isLoading: isLoadingProfile } = useProfileApi(address || undefined);
  
  // Local profile state
  const { 
    profile, 
    isEditModalVisible, 
    setEditModalVisible, 
    updateProfile, 
    generateShareUrl,
  } = useProfile(address);

  // Memoized values
  const displayName = useMemo(() => 
    profile.displayName || address?.slice(0, 12) || 'Anonymous',
  [profile.displayName, address]);

  const nickname = useMemo(() => 
    profile.nickname || address?.slice(0, 8) || 'anon',
  [profile.nickname, address]);

  const survivalStatus = useMemo((): SurvivalStatus => {
    if (!survivalData?.status) return 'stable';
    const status = survivalData.status.toLowerCase();
    if (['healthy', 'stable', 'degraded', 'critical', 'dying'].includes(status)) {
      return status as SurvivalStatus;
    }
    return 'stable';
  }, [survivalData]);

  const survivalScore = useMemo(() => 
    survivalData?.health?.overall || 75,
  [survivalData]);

  const levelInfo = useMemo(() => 
    calculateLevel(profileData?.xp || 0),
  [profileData?.xp]);

  const taskStats = useMemo(() => {
    const tasks = tasksData || [];
    const posted = tasks.filter((t: Task) => t.creator === address).length;
    const completed = tasks.filter((t: Task) => t.status === 'completed').length;
    const inProgress = tasks.filter((t: Task) => t.status === 'in_progress').length;
    const cancelled = tasks.filter((t: Task) => t.status === 'cancelled').length;
    const completionRate = posted > 0 ? Math.round((completed / posted) * 100) : 0;
    
    return { posted, completed, inProgress, cancelled, completionRate };
  }, [tasksData, address]);

  const leaderboardData = useMemo(() => 
    generateMockLeaderboard(address || undefined),
  [address]);

  const activityData = useMemo(() => 
    generateActivityData(180),
  []);

  // Callbacks
  const handleEditPress = useCallback(() => {
    setEditModalVisible(true);
  }, [setEditModalVisible]);

  const handleTaskPress = useCallback((task: Task) => {
    navigation.navigate('TaskDetail', { taskId: task.id });
  }, [navigation]);

  const handleDisconnect = useCallback(() => {
    Alert.alert(
      'Disconnect Wallet',
      'Are you sure you want to disconnect?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Disconnect', 
          style: 'destructive',
          onPress: () => disconnect(),
        },
      ]
    );
  }, [disconnect]);

  const handleSurvivalPress = useCallback(() => {
    navigation.navigate('SurvivalDetail');
  }, [navigation]);

  const handleShare = useCallback(async () => {
    const url = await generateShareUrl();
    // Share implementation
    Alert.alert('Profile Shared', `URL: ${url}`);
  }, [generateShareUrl]);

  if (!address) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="wallet-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>Connect Wallet</Text>
          <Text style={styles.emptySubtitle}>
            Connect your wallet to view your profile
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <ProfileHeader
            displayName={displayName}
            nickname={nickname}
            address={address}
            avatarUri={profile.avatarUri}
            agentId={address}
            survivalStatus={survivalStatus}
            isOnline={isOnline}
            isSyncing={isSyncing}
            pendingOperations={pendingCount}
            lastSyncTime={lastSyncTime}
            onEditPress={handleEditPress}
            onForceSync={forceSync}
          />

          {/* Survival Status */}
          <ProfileSurvivalStatus
            status={survivalStatus}
            score={survivalScore}
            address={address}
            onPress={handleSurvivalPress}
          />

          {/* Stats Card */}
          <ProfileStatsCard
            postedCount={taskStats.posted}
            completedCount={taskStats.completed}
            inProgressCount={taskStats.inProgress}
            cancelledCount={taskStats.cancelled}
            completionRate={taskStats.completionRate}
            level={levelInfo.level}
            levelProgress={levelInfo.progress}
            tasksCompleted={profileData?.tasksCompleted}
            successRate={profileData?.successRate}
            currentStreak={profileData?.currentStreak}
            totalEarned={profileData?.totalEarned}
            totalSpent={profileData?.totalSpent}
            isLoadingProfile={isLoadingProfile}
            isLoadingStats={isLoadingTasks}
          />

          {/* Task Chart */}
          <ProfileTaskChart
            posted={taskStats.posted}
            completed={taskStats.completed}
            inProgress={taskStats.inProgress}
            cancelled={taskStats.cancelled}
          />

          {/* Activity Heatmap */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Activity</Text>
            <ActivityHeatmap data={activityData} />
          </View>

          {/* Achievements */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            <View style={styles.achievementsRow}>
              <AchievementBadge
                icon="🎯"
                name="Task Master"
                description="Complete 50 tasks"
                unlocked={taskStats.completed >= 50}
                rarity="rare"
              />
              <AchievementBadge
                icon="🔥"
                name="On Fire"
                description="7 day streak"
                unlocked={(profileData?.currentStreak || 0) >= 7}
                rarity="epic"
              />
              <AchievementBadge
                icon="💎"
                name="Big Spender"
                description="Spend 10 ETH"
                unlocked={parseFloat(profileData?.totalSpent || '0') >= 10}
                rarity="legendary"
              />
            </View>
          </View>

          {/* Multi-Chain Balance */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Wallet</Text>
            <MultiChainBalance address={address} />
          </View>

          {/* Task List */}
          <ProfileTaskList
            tasks={tasksData || []}
            maxDisplay={3}
            onTaskPress={handleTaskPress}
            onViewAllPress={() => navigation.navigate('MyTasks')}
          />

          {/* Leaderboard */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Leaderboard</Text>
            <AgentLeaderboard
              entries={leaderboardData}
              currentUserId={address}
              sortBy="earnings"
            />
          </View>

          {/* Actions */}
          <View style={styles.actionsSection}>
            <TouchableOpacity 
              style={styles.disconnectButton}
              onPress={handleDisconnect}
            >
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={styles.disconnectText}>Disconnect Wallet</Text>
            </TouchableOpacity>

            <Text style={styles.versionText}>
              Agora Agent v1.0.0
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Edit Modal */}
      <ProfileEditModal
        visible={isEditModalVisible}
        onClose={() => setEditModalVisible(false)}
        onSave={updateProfile}
        initialData={{
          displayName: profile.displayName,
          bio: profile.bio,
          avatarUri: profile.avatarUri,
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  flex: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  section: {
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
  achievementsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionsSection: {
    marginTop: spacing.xl,
    marginHorizontal: spacing.md,
    alignItems: 'center',
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  disconnectText: {
    color: '#ef4444',
    fontWeight: '600',
  },
  versionText: {
    marginTop: 16,
    fontSize: 12,
    color: '#9ca3af',
  },
});
