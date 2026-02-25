import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vectoricons';

import { taskApi } from '../services/api';
import type { Task } from '../types/navigation';

export default function TaskDetailScreen() {
  const route = useRoute();
  const { taskId } = route.params as { taskId: string };
  const [task, setTask] = React.useState<Task | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    loadTask();
  }, [taskId]);

  const loadTask = async () => {
    setIsLoading(true);
    try {
      const data = await taskApi.getTaskById(taskId);
      setTask(data);
    } catch (error) {
      console.error('Failed to load task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return '#3b82f6';
      case 'in_progress':
        return '#f59e0b';
      case 'completed':
        return '#10b981';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return 'radio-button-on';
      case 'in_progress':
        return 'time';
      case 'completed':
        return 'checkmark-circle';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text style={styles.errorText}>Task not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Status Banner */}
      <View style={[styles.statusBanner, { backgroundColor: getStatusColor(task.status) + '20' }]}>
        <Ionicons
          name={getStatusIcon(task.status)}
          size={24}
          color={getStatusColor(task.status)}
        />
        <Text style={[styles.statusText, { color: getStatusColor(task.status) }]}>
          {task.status.replace('_', ' ').toUpperCase()}
        </Text>
      </View>

      {/* Task Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{task.title}</Text>
        <View style={styles.budgetBadge}>
          <Text style={styles.budgetText}>
            {task.budget} {task.currency}
          </Text>
        </View>
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{task.description}</Text>
      </View>

      {/* Creator Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Posted By</Text>
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>{task.creator.name[0]}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{task.creator.name}</Text>
            <Text style={styles.userAddress}>
              {task.creator.walletAddress.slice(0, 6)}...
              {task.creator.walletAddress.slice(-4)}
            </Text>
          </View>
        </View>
      </View>

      {/* Assignee Info (if assigned) */}
      {task.assignee && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assigned To</Text>
          <View style={styles.userCard}>
            <View style={[styles.userAvatar, { backgroundColor: '#10b981' }]}>
              <Text style={styles.userAvatarText}>{task.assignee.name[0]}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{task.assignee.name}</Text>
              <Text style={styles.userAddress}>
                {task.assignee.walletAddress.slice(0, 6)}...
                {task.assignee.walletAddress.slice(-4)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Deliverables */}
      {task.deliverables.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deliverables</Text>
          {task.deliverables.map((item, index) => (
            <View key={index} style={styles.deliverable}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#6366f1" />
              <Text style={styles.deliverableText}>{item}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Timeline */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Timeline</Text>
        <View style={styles.timelineItem}>
          <Ionicons name="calendar-outline" size={20} color="#64748b" />
          <View style={styles.timelineContent}>
            <Text style={styles.timelineLabel}>Created</Text>
            <Text style={styles.timelineValue}>
              {new Date(task.createdAt).toLocaleString()}
            </Text>
          </View>
        </View>
        <View style={styles.timelineItem}>
          <Ionicons name="refresh-outline" size={20} color="#64748b" />
          <View style={styles.timelineContent}>
            <Text style={styles.timelineLabel}>Last Updated</Text>
            <Text style={styles.timelineValue}>
              {new Date(task.updatedAt).toLocaleString()}
            </Text>
          </View>
        </View>
        {task.deadline && (
          <View style={styles.timelineItem}>
            <Ionicons name="flag-outline" size={20} color="#ef4444" />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineLabel}>Deadline</Text>
              <Text style={[styles.timelineValue, { color: '#ef4444' }]}>
                {new Date(task.deadline).toLocaleString()}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Escrow Info */}
      {task.escrowId && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Escrow</Text>
          <View style={styles.escrowCard}>
            <Ionicons name="shield-checkmark" size={24} color="#10b981" />
            <View style={styles.escrowInfo}>
              <Text style={styles.escrowTitle}>Funds in Escrow</Text>
              <Text style={styles.escrowDescription}>
                Payment is secured and will be released upon task completion
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        {task.status === 'open' && !task.assignee && (
          <TouchableOpacity style={styles.acceptButton}>
            <Text style={styles.acceptButtonText}>Accept Task</Text>
          </TouchableOpacity>
        )}
        {task.status === 'in_progress' && (
          <TouchableOpacity style={styles.completeButton}>
            <Text style={styles.completeButtonText}>Mark as Complete</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.messageButton}>
          <Ionicons name="chatbubble-outline" size={20} color="#6366f1" />
          <Text style={styles.messageButtonText}>Message</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#64748b',
    marginTop: 16,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginRight: 16,
  },
  budgetBadge: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  budgetText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 24,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userInfo: {
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  userAddress: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  deliverable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  deliverableText: {
    fontSize: 15,
    color: '#475569',
    marginLeft: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  timelineContent: {
    marginLeft: 12,
    flex: 1,
  },
  timelineLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  timelineValue: {
    fontSize: 15,
    color: '#1e293b',
    marginTop: 2,
  },
  escrowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 12,
  },
  escrowInfo: {
    flex: 1,
    marginLeft: 12,
  },
  escrowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  escrowDescription: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  actions: {
    padding: 16,
    paddingTop: 0,
    marginBottom: 32,
  },
  acceptButton: {
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  completeButton: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  messageButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
