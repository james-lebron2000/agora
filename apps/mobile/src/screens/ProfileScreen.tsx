import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useWalletStore } from '../store/walletStore';
import { useTasks } from '../hooks/useApi';
import type { Task } from '../types/navigation';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NavigationProp = any;

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

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { address, disconnect } = useWalletStore();
  const { tasks } = useTasks();
  
  // Filter tasks for current user
  const myTasks = tasks.filter((t: Task) => t.creator?.walletAddress === address);

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

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>?</Text>
        </View>
        <Text style={styles.walletLabel}>Connected Wallet</Text>
        <Text style={styles.walletAddress}>
          {address ? `${address.slice(0, 8)}...${address.slice(-8)}` : 'Not connected'}
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{myTasks.length}</Text>
          <Text style={styles.statLabel}>Posted</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {myTasks.filter((t) => t.status === 'completed').length}
          </Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {myTasks.filter((t) => t.status === 'in_progress').length}
          </Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
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
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('TaskPost')}
            >
              <Text style={styles.createButtonText}>Create Your First Task</Text>
            </TouchableOpacity>
          </View>
        ) : (
          myTasks.slice(0, 5).map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
            />
          ))
        )}
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <TouchableOpacity style={styles.settingRow}>
          <Ionicons name="notifications-outline" size={24} color="#64748b" />
          <Text style={styles.settingText}>Notifications</Text>
          <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingRow}>
          <Ionicons name="shield-outline" size={24} color="#64748b" />
          <Text style={styles.settingText}>Security</Text>
          <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingRow}>
          <Ionicons name="help-circle-outline" size={24} color="#64748b" />
          <Text style={styles.settingText}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
        </TouchableOpacity>
      </View>

      {/* Disconnect */}
      <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
        <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        <Text style={styles.disconnectText}>Disconnect Wallet</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Agora Mobile v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'white',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  walletLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  walletAddress: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'monospace',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 16,
    padding: 20,
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
    fontSize: 24,
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
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  seeAll: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyTasks: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 12,
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 12,
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
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    marginLeft: 12,
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  disconnectText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 32,
  },
});
