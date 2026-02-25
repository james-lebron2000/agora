import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';

import {
  MultiChainBalance,
  ProfileEditModal,
  AchievementBadge,
  AgentAvatar,
  ActivityHeatmap,
  ActivityHeatmapCompact,
  AgentLevelProgress,
  AgentLeaderboard,
  ShareProfile,
  ProfileStats,
  AchievementGallery,
  generateActivityData,
  calculateLevel,
  type TimePeriod,
  type SortMetric,
  type LeaderboardEntry,
  type Achievement,
} from '../components';
import { useWalletStore } from '../store/walletStore';
import { useTasks, useSurvival, useProfileApi } from '../hooks/useApi';
import { useProfile } from '../hooks/useProfile';
import type { Task } from '../types/navigation';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
 type NavigationProp = any;

type SurvivalStatus = 'healthy' | 'stable' | 'degraded' | 'critical' | 'dying';

const { width: screenWidth } = Dimensions.get('window');

const statusMeta: Record<SurvivalStatus, { color: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  healthy: { color: '#10b981', label: 'Healthy', icon: 'checkmark-circle' },
  stable: { color: '#3b82f6', label: 'Stable', icon: 'shield-checkmark' },
  degraded: { color: '#f59e0b', label: 'Degraded', icon: 'warning' },
  critical: { color: '#ef4444', label: 'Critical', icon: 'alert-circle' },
  dying: { color: '#7f1d1d', label: 'Dying', icon: 'skull' },
};

const TaskRow: React.FC<{ task: Task; onPress: () => void }> = ({ task, onPress }) => (
  <TouchableOpacity style={styles.taskRow} onPress={onPress}>
    <View style={styles.taskInfo}>
      <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
      <Text style={styles.taskDate}>{new Date(task.createdAt).toLocaleDateString()}</Text>
    </View>
    <View style={styles.taskMeta}>
      <Text style={styles.taskBudget}>{task.budget} {task.currency}</Text>
      <View style={[styles.statusBadge, styles[`status_${task.status}`]]}>
        <Text style={styles.statusText}>{task.status.replace('_', ' ')}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

const MiniTaskChart: React.FC<{ posted: number; completed: number; inProgress: number; cancelled: number }> = ({
  posted,
  completed,
  inProgress,
  cancelled,
}) => {
  const width = screenWidth - 80;
  const height = 170;
  const chartHeight = 110;
  const maxValue = Math.max(posted, completed, inProgress, cancelled, 1);
  const data = [
    { label: 'Posted', value: posted, color: '#6366f1' },
    { label: 'Done', value: completed, color: '#10b981' },
    { label: 'Progress', value: inProgress, color: '#f59e0b' },
    { label: 'Canceled', value: cancelled, color: '#ef4444' },
  ];

  return (
    <View style={styles.chartContainer}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Line x1={18} y1={chartHeight + 18} x2={width - 10} y2={chartHeight + 18} stroke="#cbd5e1" strokeWidth={1} />

        {data.map((item, index) => {
          const barWidth = (width - 60) / data.length - 10;
          const gap = 10;
          const x = 28 + index * (barWidth + gap);
          const barHeight = (item.value / maxValue) * chartHeight;
          const y = chartHeight + 18 - barHeight;

          return (
            <React.Fragment key={item.label}>
              <Rect x={x} y={y} width={barWidth} height={barHeight} rx={6} fill={item.color} />
              <SvgText x={x + barWidth / 2} y={y - 6} fontSize={11} fill="#334155" textAnchor="middle">
                {item.value}
              </SvgText>
              <SvgText x={x + barWidth / 2} y={height - 8} fontSize={10} fill="#64748b" textAnchor="middle">
                {item.label}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
};

/**
 * Generate mock leaderboard data
 */
function generateMockLeaderboard(
  period: TimePeriod,
  sortBy: SortMetric,
  currentUserId?: string
): LeaderboardEntry[] {
  const mockAgents = [
    { id: 'agent-alpha-001', name: 'Alpha Trader', level: 42 },
    { id: 'agent-beta-002', name: 'Beta Scout', level: 38 },
    { id: 'agent-gamma-003', name: 'Gamma Analyst', level: 35 },
    { id: 'agent-delta-004', name: 'Delta Guardian', level: 33 },
    { id: 'agent-echo-001', name: 'Echo Sentinel', level: 28 },
    { id: 'agent-zeta-005', name: 'Zeta Explorer', level: 25 },
    { id: 'agent-eta-006', name: 'Eta Collector', level: 22 },
    { id: 'agent-theta-007', name: 'Theta Pioneer', level: 20 },
  ];

  const periodMultiplier = {
    '24h': 0.1,
    '7d': 0.3,
    '30d': 0.7,
    'all-time': 1.0,
  }[period];

  let entries: LeaderboardEntry[] = mockAgents.map((agent, index) => {
    const baseEarnings = (mockAgents.length - index) * 1000 + Math.random() * 500;
    const baseTasks = Math.floor((mockAgents.length - index) * 50 + Math.random() * 25);
    const baseSurvival = Math.min(100, 95 - index * 3 + Math.random() * 10);

    return {
      rank: index + 1,
      agentId: agent.id,
      name: agent.name,
      level: agent.level,
      earnings: Math.floor(baseEarnings * periodMultiplier),
      tasksCompleted: Math.floor(baseTasks * periodMultiplier),
      survivalScore: Math.round(baseSurvival),
      isCurrentUser: agent.id === currentUserId,
    };
  });

  entries.sort((a, b) => {
    switch (sortBy) {
      case 'earnings':
        return b.earnings - a.earnings;
      case 'tasks':
        return b.tasksCompleted - a.tasksCompleted;
      case 'survival':
        return b.survivalScore - a.survivalScore;
      case 'level':
        return b.level - a.level;
      default:
        return b.earnings - a.earnings;
    }
  });

  entries = entries.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));

  return entries;
}

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { address, disconnect } = useWalletStore();
  const { tasks } = useTasks();
  const { snapshot } = useSurvival(address);
  const {
    profile: legacyProfile,
    stats: legacyStats,
    isSavingProfile,
    isUploadingAvatar,
    saveProfile,
    uploadUserAvatar,
  } = useProfileApi(address);

  // Profile SDK Integration
  const {
    profile,
    stats,
    achievements: sdkAchievements,
    isLoadingProfile,
    isLoadingStats,
    isLoadingAchievements,
    level,
    levelProgress: levelProgressValue,
  } = useProfile({ agentId: address || undefined });

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<TimePeriod>('all-time');
  const [leaderboardSort, setLeaderboardSort] = useState<SortMetric>('earnings');

  // Generate activity data
  const activityData = useMemo(() => generateActivityData(90), []);

  // Calculate agent level from stats
  const agentLevel = useMemo(() => {
    const totalXP = (stats?.completedTasks ?? 0) * 100 + (stats?.totalEarnings ?? 0);
    return calculateLevel(totalXP);
  }, [stats]);

  // Generate leaderboard entries
  const leaderboardEntries = useMemo(() => {
    return generateMockLeaderboard(leaderboardPeriod, leaderboardSort, address ?? undefined);
  }, [leaderboardPeriod, leaderboardSort, address]);

  const myTasks = useMemo(
    () => tasks.filter((t: Task) => t.creator?.walletAddress === address),
    [tasks, address]
  );

  const postedCount = legacyStats?.postedTasks ?? myTasks.length;
  const completedCount = legacyStats?.completedTasks ?? myTasks.filter((t) => t.status === 'completed').length;
  const inProgressCount = legacyStats?.inProgressTasks ?? myTasks.filter((t) => t.status === 'in_progress').length;
  const cancelledCount = legacyStats?.cancelledTasks ?? myTasks.filter((t) => t.status === 'cancelled').length;
  const completionRate = legacyStats?.completionRate ?? (postedCount > 0 ? (completedCount / postedCount) * 100 : 0);

  const survivalStatus = (snapshot?.health?.status || 'stable') as SurvivalStatus;
  const survivalScore = snapshot?.health?.overall ?? legacyStats?.survivalHealth ?? 72;

  const achievements = legacyStats?.achievements ?? [];

  // Convert SDK achievements to component format
  const formattedAchievements: Achievement[] = useMemo(() => {
    if (sdkAchievements.length > 0) {
      return sdkAchievements.map(a => ({
        id: a.id,
        name: a.name,
        description: a.description,
        icon: a.icon,
        tier: a.tier,
        xpReward: a.xpReward,
        unlocked: a.unlocked,
        unlockedAt: a.unlockedAt,
        progress: a.progress,
        criteria: a.criteria,
      }));
    }
    return [];
  }, [sdkAchievements]);

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Wallet',
      'Are you sure you want to disconnect your wallet?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => disconnect(),
        },
      ]
    );
  };

  const handleProfileSave = async (payload: { username: string; nickname: string }) => {
    if (!address) return;

    await saveProfile(payload);
    setIsEditOpen(false);
  };

  const handleAvatarPick = async () => {
    if (!address) return;

    try {
      const moduleName = 'expo-image-picker';
      const picker: any = await import(moduleName);

      const permission = await picker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Needed', 'Please allow photo library access to update avatar.');
        return;
      }

      const result = await picker.launchImageLibraryAsync({
        mediaTypes: picker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      const localUri = result.assets[0].uri;
      const uploadedAvatar = await uploadUserAvatar(localUri);
      if (uploadedAvatar) {
        await saveProfile({ avatarUrl: uploadedAvatar });
      }
    } catch {
      Alert.alert(
        'Album Picker Unavailable',
        'expo-image-picker is not installed in this environment. Install it to enable album selection.'
      );
    }
  };

  // Use SDK profile data when available, fallback to legacy
  const displayName = profile?.name || legacyProfile?.username || (address ? `User ${address.slice(0, 6)}` : 'Guest');
  const nickname = profile?.name || legacyProfile?.nickname || 'Echo Agent';
  const avatarUri = profile?.avatarUrl || legacyProfile?.avatarUrl;
  const agentId = address || 'unknown-agent';

  // SDK stats data (when available)
  const sdkStatsData = stats ? {
    tasksCompleted: stats.tasksCompleted,
    tasksCompletedThisMonth: stats.tasksCompletedThisMonth,
    successRate: stats.successRate,
    averageRating: stats.averageRating,
    totalReviews: stats.totalReviews,
    currentStreak: stats.currentStreak,
    longestStreak: stats.longestStreak,
    averageResponseTime: stats.averageResponseTime,
    totalWorkingHours: stats.totalWorkingHours,
  } : null;

  const sdkEarningsData = profile ? {
    totalEarned: profile.totalEarned,
    totalSpent: profile.totalSpent,
  } : { totalEarned: '0', totalSpent: '0' };

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Enhanced Header with AgentAvatar */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.editPill} onPress={() => setIsEditOpen(true)}>
            <Ionicons name="create-outline" size={14} color="#4f46e5" />
            <Text style={styles.editPillText}>Edit</Text>
          </TouchableOpacity>

          <View style={styles.avatarWrapper}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <AgentAvatar
                agentId={agentId}
                agentName={displayName}
                size="lg"
                status={survivalStatus === 'healthy' ? 'online' : 'busy'}
              />
            )}
          </View>

          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.nickname}>@{nickname}</Text>
          <Text style={styles.walletLabel}>Connected Wallet</Text>
          <Text style={styles.walletAddress}>
            {address ? `${address.slice(0, 8)}...${address.slice(-8)}` : 'Not connected'}
          </Text>

          {/* Share Button */}
          {address && (
            <ShareProfile
              agentId={agentId}
              agentName={displayName}
              style={styles.shareButton}
            />
          )}
        </View>

        {/* Agent Level Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agent Level</Text>
          <AgentLevelProgress level={agentLevel} compact />
        </View>

        {/* Survival Card */}
        <View style={styles.survivalCard}>
          <View style={styles.survivalHeader}>
            <View>
              <Text style={styles.cardTitle}>Echo Survival</Text>
              <Text style={styles.cardSubTitle}>Real-time economic self-preservation</Text>
            </View>
            <View style={[styles.survivalStatus, { backgroundColor: `${statusMeta[survivalStatus].color}20` }]}>
              <Ionicons name={statusMeta[survivalStatus].icon} size={16} color={statusMeta[survivalStatus].color} />
              <Text style={[styles.survivalStatusText, { color: statusMeta[survivalStatus].color }]}>
                {statusMeta[survivalStatus].label}
              </Text>
            </View>
          </View>
          <Text style={styles.survivalScore}>{survivalScore}/100</Text>
        </View>

        {/* Stats Container */}
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{postedCount}</Text>
            <Text style={styles.statLabel}>Posted</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{completedCount}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{Math.round(completionRate)}%</Text>
            <Text style={styles.statLabel}>Completion</Text>
          </View>
        </View>

        {/* Activity Heatmap */}
        <View style={styles.section}>
          <ActivityHeatmap data={activityData} title="Contribution Activity" />
        </View>

        {/* SDK Profile Stats - New! */}
        {(isLoadingProfile || isLoadingStats) ? (
          <View style={[styles.section, styles.loadingSection]}>
            <ActivityIndicator size="small" color="#6366f1" />
            <Text style={styles.loadingText}>Loading profile stats...</Text>
          </View>
        ) : sdkStatsData ? (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Performance Stats</Text>
              <View style={styles.sdkBadge}>
                <Text style={styles.sdkBadgeText}>SDK</Text>
              </View>
            </View>
            <ProfileStats stats={sdkStatsData} earnings={sdkEarningsData} />
          </View>
        ) : null}

        {/* SDK Achievement Gallery - New! */}
        {isLoadingAchievements ? (
          <View style={[styles.section, styles.loadingSection]}>
            <ActivityIndicator size="small" color="#6366f1" />
            <Text style={styles.loadingText}>Loading achievements...</Text>
          </View>
        ) : formattedAchievements.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Achievements</Text>
              <View style={styles.sdkBadge}>
                <Text style={styles.sdkBadgeText}>SDK</Text>
              </View>
            </View>
            <AchievementGallery achievements={formattedAchievements} />
          </View>
        ) : null}

        {/* Task Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Task Statistics</Text>
          <MiniTaskChart
            posted={postedCount}
            completed={completedCount}
            inProgress={inProgressCount}
            cancelled={cancelledCount}
          />
        </View>

        {/* Leaderboard */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Leaderboard</Text>
          <AgentLeaderboard
            entries={leaderboardEntries}
            period={leaderboardPeriod}
            sortBy={leaderboardSort}
            onPeriodChange={setLeaderboardPeriod}
            onSortChange={setLeaderboardSort}
          />
        </View>

        {/* Multi-Chain Wallet */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Multi-Chain Wallet</Text>
          <Text style={styles.sectionHint}>Track balances across Ethereum, Base, Optimism, and Arbitrum</Text>
          <View style={styles.balanceWrapper}>
            <MultiChainBalance address={address} />
          </View>
        </View>

        {/* Achievement Badges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Achievement Badges</Text>
          {achievements.length === 0 ? (
            <Text style={styles.emptyText}>No achievements yet. Complete tasks to unlock badges.</Text>
          ) : (
            achievements.map((badge) => (
              <AchievementBadge
                key={badge.id}
                title={badge.title}
                description={badge.description}
                icon={badge.icon}
                rarity={badge.rarity}
                unlocked={badge.unlocked}
                progress={badge.progress}
              />
            ))
          )}
        </View>

        {/* My Tasks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Tasks</Text>
            <TouchableOpacity onPress={() => navigation.navigate('TaskPost')}>
              <Text style={styles.seeAll}>+ New</Text>
            </TouchableOpacity>
          </View>

          {myTasks.length === 0 ? (
            <View style={styles.emptyTasks}>
              <Ionicons name="document-text-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No tasks yet</Text>
              <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate('TaskPost')}>
                <Text style={styles.createButtonText}>Create Your First Task</Text>
              </TouchableOpacity>
            </View>
          ) : (
            myTasks.slice(0, 4).map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
              />
            ))
          )}
        </View>

        {/* Disconnect Button */}
        <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
          <Ionicons name="log-out-outline" size={22} color="#ef4444" />
          <Text style={styles.disconnectText}>Disconnect Wallet</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Agora Mobile v1.2.0</Text>
      </ScrollView>

      <ProfileEditModal
        visible={isEditOpen}
        initialUsername={displayName}
        initialNickname={nickname}
        initialAvatarUri={avatarUri}
        isSaving={isSavingProfile}
        isUploading={isUploadingAvatar}
        onClose={() => setIsEditOpen(false)}
        onSave={handleProfileSave}
        onPickAvatar={handleAvatarPick}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sdkBadge: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sdkBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  loadingSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 8,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'white',
    position: 'relative',
  },
  editPill: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  editPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4f46e5',
  },
  avatarWrapper: {
    marginBottom: 12,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#e2e8f0',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  nickname: {
    fontSize: 13,
    color: '#6366f1',
    marginTop: 2,
    marginBottom: 10,
  },
  walletLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 3,
  },
  walletAddress: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'monospace',
  },
  shareButton: {
    marginTop: 16,
  },
  survivalCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  survivalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '700',
  },
  cardSubTitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 3,
  },
  survivalStatus: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  survivalStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  survivalScore: {
    marginTop: 10,
    fontSize: 26,
    fontWeight: '700',
    color: '#0f172a',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    margin: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  sectionHint: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
  },
  seeAll: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
  },
  chartContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  balanceWrapper: {
    maxHeight: 520,
  },
  emptyTasks: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    marginBottom: 12,
  },
  createButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  taskRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 4,
  },
  taskDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  taskMeta: {
    alignItems: 'flex-end',
  },
  taskBudget: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  status_open: {
    backgroundColor: '#dbeafe',
  },
  status_in_progress: {
    backgroundColor: '#fef3c7',
  },
  status_completed: {
    backgroundColor: '#dcfce7',
  },
  status_cancelled: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    margin: 16,
    marginTop: 2,
    padding: 14,
    borderRadius: 12,
  },
  disconnectText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 26,
  },
});
