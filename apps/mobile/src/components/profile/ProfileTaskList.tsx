/**
 * ProfileTaskList Component
 * Displays user's tasks with filtering and navigation
 */

import React, { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../../utils/responsive';
import type { Task } from '../../types/navigation';

export interface ProfileTaskListProps {
  tasks: Task[];
  maxDisplay?: number;
  onTaskPress: (task: Task) => void;
  onViewAllPress?: () => void;
}

const TaskRow = memo(function TaskRow({ 
  task, 
  onPress 
}: { 
  task: Task; 
  onPress: () => void;
}) {
  const statusColors: Record<string, { bg: string; text: string }> = {
    open: { bg: '#dbeafe', text: '#1e40af' },
    in_progress: { bg: '#fef3c7', text: '#92400e' },
    completed: { bg: '#d1fae5', text: '#065f46' },
    cancelled: { bg: '#fee2e2', text: '#991b1b' },
  };

  const statusStyle = statusColors[task.status] || statusColors.open;

  return (
    <TouchableOpacity style={styles.taskRow} onPress={onPress}>
      <View style={styles.taskInfo}>
        <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
        <Text style={styles.taskDate}>{new Date(task.createdAt).toLocaleDateString()}</Text>
      </View>
      <View style={styles.taskMeta}>
        <Text style={styles.taskBudget}>{task.budget} {task.currency}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.text }]}>
            {task.status.replace('_', ' ')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export const ProfileTaskList = memo(function ProfileTaskList({
  tasks,
  maxDisplay = 5,
  onTaskPress,
  onViewAllPress,
}: ProfileTaskListProps) {
  const displayTasks = useMemo(() => {
    return tasks.slice(0, maxDisplay);
  }, [tasks, maxDisplay]);

  const hasMore = tasks.length > maxDisplay;

  if (tasks.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>My Tasks</Text>
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>No tasks yet</Text>
          <Text style={styles.emptySubtext}>Create or accept tasks to see them here</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>My Tasks</Text>
      
      {displayTasks.map(task => (
        <TaskRow 
          key={task.id} 
          task={task} 
          onPress={() => onTaskPress(task)} 
        />
      ))}

      {hasMore && onViewAllPress && (
        <TouchableOpacity style={styles.viewAllButton} onPress={onViewAllPress}>
          <Text style={styles.viewAllText}>
            View all {tasks.length} tasks
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#4f46e5" />
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
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
  taskRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  taskDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  taskMeta: {
    alignItems: 'flex-end',
  },
  taskBudget: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4f46e5',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: spacing.xs,
  },
});

export default ProfileTaskList;
