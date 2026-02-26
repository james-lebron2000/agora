import React, { useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  scale,
  verticalScale,
  moderateScale,
  responsiveFontSize,
  spacing,
} from '../utils/responsive';
import { useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAgents } from '../hooks/useApi';
import { useTasks } from '../hooks/useApi';
import { useWalletStore } from '../store/walletStore';
import { useIsOffline } from '../hooks/useNetwork';
import { SurvivalMonitor, PerformanceMonitor } from '../components';
import { createTheme } from '../constants/theme';
import type { RootStackParamList, MainTabParamList, Agent, Task } from '../types/navigation';

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

// Memoized AgentCard component to prevent unnecessary re-renders
const AgentCard = memo(function AgentCard({ 
  agent, 
  onPress 
}: { 
  agent: Agent; 
  onPress: () => void;
}) {
  const colorScheme = useColorScheme();
  const theme = createTheme(colorScheme);
  const { colors } = theme;

  return (
    <TouchableOpacity 
      style={[
        styles.agentCard, 
        { backgroundColor: colors.surface, borderColor: colors.border }
      ]} 
      onPress={onPress}
    >
      <View style={styles.agentHeader}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.textInverse }]}>
            {agent.name[0]}
          </Text>
        </View>
        <View style={styles.agentInfo}>
          <Text style={[styles.agentName, { color: colors.text }]}>{agent.name}</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color={colors.warning} />
            <Text style={[styles.rating, { color: colors.warning }]}>{agent.rating}</Text>
            <Text style={[styles.completed, { color: colors.textTertiary }]}>
              ({agent.completedTasks} tasks)
            </Text>
          </View>
        </View>
        <View style={[
          styles.statusBadge, 
          agent.isOnline 
            ? [styles.online, { backgroundColor: colors.success + '20' }] 
            : [styles.offline, { backgroundColor: colors.backgroundSecondary }]
        ]}>
          <Text style={[
            styles.statusText, 
            { color: agent.isOnline ? colors.success : colors.textTertiary }
          ]}>
            {agent.isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>
      <Text style={[styles.agentDescription, { color: colors.textSecondary }]} numberOfLines={2}>
        {agent.description}
      </Text>
      <View style={styles.tagContainer}>
        {agent.tags.slice(0, 3).map((tag) => (
          <View key={tag} style={[styles.tag, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.tagText, { color: colors.textSecondary }]}>{tag}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.agentFooter, { borderTopColor: colors.border }]}>
        <Text style={[styles.rate, { color: colors.primary }]}>${agent.hourlyRate}/hr</Text>
        <Text style={[styles.viewProfile, { color: colors.primary }]}>View Profile →</Text>
      </View>
    </TouchableOpacity>
  );
});

// Memoized TaskCard component
const TaskCard = memo(function TaskCard({ 
  task, 
  onPress 
}: { 
  task: Task; 
  onPress: () => void;
}) {
  const colorScheme = useColorScheme();
  const theme = createTheme(colorScheme);
  const { colors } = theme;

  const getStatusStyle = useCallback((status: string) => {
    switch (status) {
      case 'open': return { backgroundColor: colors.info + '20' };
      case 'in_progress': return { backgroundColor: colors.warning + '20' };
      case 'completed': return { backgroundColor: colors.success + '20' };
      case 'cancelled': return { backgroundColor: colors.error + '20' };
      default: return { backgroundColor: colors.backgroundSecondary };
    }
  }, [colors]);

  return (
    <TouchableOpacity 
      style={[
        styles.taskCard, 
        { backgroundColor: colors.surface, borderColor: colors.border }
      ]} 
      onPress={onPress}
    >
      <View style={styles.taskHeader}>
        <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={1}>
          {task.title}
        </Text>
        <View style={[styles.taskStatus, getStatusStyle(task.status)]}>
          <Text style={styles.statusText}>{task.status.replace('_', ' ')}</Text>
        </View>
      </View>
      <Text style={[styles.taskDescription, { color: colors.textSecondary }]} numberOfLines={2}>
        {task.description}
      </Text>
      <View style={[styles.taskFooter, { borderTopColor: colors.border }]}>
        <Text style={[styles.taskBudget, { color: colors.primary }]}>
          {task.budget} {task.currency}
        </Text>
        <Text style={[styles.taskDate, { color: colors.textTertiary }]}>
          {new Date(task.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

// Offline indicator component
const OfflineIndicator = memo(function OfflineIndicator() {
  const colorScheme = useColorScheme();
  const theme = createTheme(colorScheme);
  const { colors } = theme;

  return (
    <View style={[styles.offlineBanner, { backgroundColor: colors.error + '10' }]}>
      <Ionicons name="cloud-offline" size={16} color={colors.error} />
      <Text style={[styles.offlineText, { color: colors.error }]}>
        You are offline. Some features may be limited.
      </Text>
    </View>
  );
});

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const colorScheme = useColorScheme();
  const theme = createTheme(colorScheme);
  const { colors } = theme;
  const { address, balance, usdcBalance } = useWalletStore();
  const { agents, isLoading: agentsLoading, refresh: refreshAgents } = useAgents();
  const { tasks, isLoading: tasksLoading, refresh: refreshTasks } = useTasks();
  const isOffline = useIsOffline();

  const refreshing = agentsLoading || tasksLoading;

  const onRefresh = useCallback(() => {
    refreshAgents();
    refreshTasks();
  }, [refreshAgents, refreshTasks]);

  // Memoized navigation callbacks
  const navigateToEcho = useCallback(() => {
    navigation.navigate('Echo', { agentId: address || undefined });
  }, [navigation, address]);

  const navigateToAgents = useCallback(() => {
    navigation.navigate('Agents');
  }, [navigation]);

  const navigateToWallet = useCallback(() => {
    navigation.navigate('Wallet');
  }, [navigation]);

  const navigateToTaskPost = useCallback(() => {
    navigation.navigate({ name: 'TaskPost', params: {} });
  }, [navigation]);

  const navigateToAgentDetail = useCallback((agentId: string) => {
    navigation.navigate('AgentDetail', { agentId });
  }, [navigation]);

  const navigateToTaskDetail = useCallback((taskId: string) => {
    navigation.navigate('TaskDetail', { taskId });
  }, [navigation]);

  // Memoized data slices
  const topAgents = React.useMemo(() => agents.slice(0, 3), [agents]);
  const recentTasks = React.useMemo(() => tasks.slice(0, 3), [tasks]);

  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {isOffline && <OfflineIndicator />}
      <ScrollView
        style={[styles.scrollView, { paddingBottom: insets.bottom }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Wallet Summary */}
        <View style={styles.walletSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>My Wallet</Text>
          <View style={[styles.walletCard, { backgroundColor: colors.primary }]}>
            <View style={styles.balanceRow}>
              <View>
                <Text style={styles.balanceLabel}>USDC Balance</Text>
                <Text style={styles.balanceValue}>${usdcBalance}</Text>
              </View>
              <View>
                <Text style={styles.balanceLabel}>Native</Text>
                <Text style={styles.balanceValue}>{balance} ETH</Text>
              </View>
            </View>
            <Text style={styles.walletAddress}>
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
            </Text>
          </View>
        </View>

        {/* Echo Survival Monitor */}
        <View style={styles.survivalSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Agent Health</Text>
            <TouchableOpacity onPress={navigateToEcho}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>View Details →</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={navigateToEcho} activeOpacity={0.8}>
            <SurvivalMonitor 
              agentId={address || null}
              showHeader={false}
              compact={true}
            />
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={navigateToTaskPost}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name="add-circle" size={24} color={colors.textInverse} />
            </View>
            <Text style={[styles.actionText, { color: colors.textSecondary }]}>Post Task</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={navigateToAgents}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.success }]}>
              <Ionicons name="people" size={24} color={colors.textInverse} />
            </View>
            <Text style={[styles.actionText, { color: colors.textSecondary }]}>Find Agents</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={navigateToWallet}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.warning }]}>
              <Ionicons name="wallet" size={24} color={colors.textInverse} />
            </View>
            <Text style={[styles.actionText, { color: colors.textSecondary }]}>Deposit</Text>
          </TouchableOpacity>
        </View>

        {/* Top Agents */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Agents</Text>
            <TouchableOpacity onPress={navigateToAgents}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>
          {topAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onPress={() => navigateToAgentDetail(agent.id)}
            />
          ))}
        </View>

        {/* Recent Tasks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Tasks</Text>
            <TouchableOpacity onPress={navigateToTaskPost}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>Post New</Text>
            </TouchableOpacity>
          </View>
          {recentTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onPress={() => navigateToTaskDetail(task.id)}
            />
          ))}
        </View>

        {/* Performance Monitor Widget */}
        <PerformanceMonitor position="bottom-right" compact={true} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    gap: 8,
  },
  offlineText: {
    fontSize: 13,
    fontWeight: '500',
  },
  walletSection: {
    padding: spacing.md,
  },
  survivalSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  walletCard: {
    borderRadius: moderateScale(16),
    padding: scale(20),
    marginTop: verticalScale(12),
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(16),
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: responsiveFontSize(12),
    textTransform: 'uppercase',
    marginBottom: verticalScale(4),
  },
  balanceValue: {
    color: 'white',
    fontSize: responsiveFontSize(24),
    fontWeight: 'bold',
  },
  walletAddress: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: responsiveFontSize(12),
  },
  actionsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.md,
    marginBottom: verticalScale(24),
  },
  actionButton: {
    alignItems: 'center',
    minWidth: scale(60),
    minHeight: scale(44),
  },
  actionIcon: {
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: moderateScale(28),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  actionText: {
    fontSize: responsiveFontSize(12),
    fontWeight: '500',
  },
  section: {
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  sectionTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: 'bold',
  },
  seeAll: {
    fontSize: responsiveFontSize(14),
    fontWeight: '500',
  },
  agentCard: {
    borderRadius: moderateScale(12),
    padding: spacing.md,
    marginBottom: verticalScale(12),
    borderWidth: 1,
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: responsiveFontSize(20),
    fontWeight: 'bold',
  },
  agentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  agentName: {
    fontSize: 16,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  rating: {
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '500',
  },
  completed: {
    fontSize: 12,
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  online: {},
  offline: {},
  statusText: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  agentDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 11,
    textTransform: 'capitalize',
  },
  agentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  rate: {
    fontSize: 16,
    fontWeight: '600',
  },
  viewProfile: {
    fontSize: 12,
    fontWeight: '500',
  },
  taskCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  taskStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  taskDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  taskBudget: {
    fontSize: 14,
    fontWeight: '600',
  },
  taskDate: {
    fontSize: 12,
  },
});