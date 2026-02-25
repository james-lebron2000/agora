import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAgents } from '../hooks/useApi';
import { useTasks } from '../hooks/useApi';
import { useWalletStore } from '../store/walletStore';
import type { RootStackParamList, MainTabParamList, Agent, Task } from '../types/navigation';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NavigationProp = any;

const AgentCard: React.FC<{ agent: Agent; onPress: () => void }> = ({ agent, onPress }) => (
  <TouchableOpacity style={styles.agentCard} onPress={onPress}>
    <View style={styles.agentHeader}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{agent.name[0]}</Text>
      </View>
      <View style={styles.agentInfo}>
        <Text style={styles.agentName}>{agent.name}</Text>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={14} color="#f59e0b" />
          <Text style={styles.rating}>{agent.rating}</Text>
          <Text style={styles.completed}>({agent.completedTasks} tasks)</Text>
        </View>
      </View>
      <View style={[styles.statusBadge, agent.isOnline ? styles.online : styles.offline]}>
        <Text style={styles.statusText}>{agent.isOnline ? 'Online' : 'Offline'}</Text>
      </View>
    </View>
    <Text style={styles.agentDescription} numberOfLines={2}>
      {agent.description}
    </Text>
    <View style={styles.tagContainer}>
      {agent.tags.slice(0, 3).map((tag) => (
        <View key={tag} style={styles.tag}>
          <Text style={styles.tagText}>{tag}</Text>
        </View>
      ))}
    </View>
    <View style={styles.agentFooter}>
      <Text style={styles.rate}>${agent.hourlyRate}/hr</Text>
      <Text style={styles.viewProfile}>View Profile →</Text>
    </View>
  </TouchableOpacity>
);

const TaskCard: React.FC<{ task: Task; onPress: () => void }> = ({ task, onPress }) => (
  <TouchableOpacity style={styles.taskCard} onPress={onPress}>
    <View style={styles.taskHeader}>
      <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
      <View style={[styles.taskStatus, styles[`status${task.status}`]]}>
        <Text style={styles.statusText}>{task.status.replace('_', ' ')}</Text>
      </View>
    </View>
    <Text style={styles.taskDescription} numberOfLines={2}>
      {task.description}
    </Text>
    <View style={styles.taskFooter}>
      <Text style={styles.taskBudget}>{task.budget} {task.currency}</Text>
      <Text style={styles.taskDate}>
        {new Date(task.createdAt).toLocaleDateString()}
      </Text>
    </View>
  </TouchableOpacity>
);

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { address, balance, usdcBalance } = useWalletStore();
  const { agents, isLoading: agentsLoading, refresh: refreshAgents } = useAgents();
  const { tasks, isLoading: tasksLoading, refresh: refreshTasks } = useTasks();

  const refreshing = agentsLoading || tasksLoading;

  const onRefresh = () => {
    refreshAgents();
    refreshTasks();
  };

  const topAgents = agents.slice(0, 3);
  const recentTasks = tasks.slice(0, 3);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Wallet Summary */}
      <View style={styles.walletSection}>
        <Text style={styles.sectionTitle}>My Wallet</Text>
        <View style={styles.walletCard}>
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

      {/* Quick Actions */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('TaskPost')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#6366f1' }]}>
            <Ionicons name="add-circle" size={24} color="white" />
          </View>
          <Text style={styles.actionText}>Post Task</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Agents')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#10b981' }]}>
            <Ionicons name="people" size={24} color="white" />
          </View>
          <Text style={styles.actionText}>Find Agents</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Wallet')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#f59e0b' }]}>
            <Ionicons name="wallet" size={24} color="white" />
          </View>
          <Text style={styles.actionText}>Deposit</Text>
        </TouchableOpacity>
      </View>

      {/* Top Agents */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Agents</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Agents')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        {topAgents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onPress={() => navigation.navigate('AgentDetail', { agentId: agent.id })}
          />
        ))}
      </View>

      {/* Recent Tasks */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Tasks</Text>
          <TouchableOpacity onPress={() => navigation.navigate('TaskPost')}>
            <Text style={styles.seeAll}>Post New</Text>
          </TouchableOpacity>
        </View>
        {recentTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  walletSection: {
    padding: 16,
  },
  walletCard: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    padding: 20,
    marginTop: 12,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  balanceValue: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  walletAddress: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  actionsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  seeAll: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500',
  },
  agentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  agentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  agentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  rating: {
    fontSize: 14,
    color: '#f59e0b',
    marginLeft: 4,
    fontWeight: '500',
  },
  completed: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  online: {
    backgroundColor: '#dcfce7',
  },
  offline: {
    backgroundColor: '#f1f5f9',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  agentDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 20,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 11,
    color: '#64748b',
    textTransform: 'capitalize',
  },
  agentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  rate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  viewProfile: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '500',
  },
  taskCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  taskStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusopen: {
    backgroundColor: '#dbeafe',
  },
  statusin_progress: {
    backgroundColor: '#fef3c7',
  },
  statuscompleted: {
    backgroundColor: '#dcfce7',
  },
  statuscancelled: {
    backgroundColor: '#fee2e2',
  },
  taskDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 20,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskBudget: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  taskDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
});
