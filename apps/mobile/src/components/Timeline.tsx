import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type TimelineStatus = 'done' | 'active' | 'pending';

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  status?: TimelineStatus;
  icon?: string;
}

interface TimelineProps {
  items: TimelineItem[];
}

const statusColor: Record<TimelineStatus, string> = {
  done: '#10b981',
  active: '#6366f1',
  pending: '#94a3b8',
};

export default function Timeline({ items }: TimelineProps) {
  return (
    <View>
      {items.map((item, index) => {
        const status = item.status || 'pending';
        const isLast = index === items.length - 1;
        const color = statusColor[status];

        return (
          <View key={item.id} style={styles.row}>
            <View style={styles.rail}>
              <View style={[styles.dot, { backgroundColor: color }]}>
                <Ionicons
                  name={(item.icon as keyof typeof Ionicons.glyphMap) || 'checkmark'}
                  size={12}
                  color="#fff"
                />
              </View>
              {!isLast && <View style={styles.line} />}
            </View>
            <View style={styles.content}>
              <View style={styles.header}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.time}>{item.timestamp}</Text>
              </View>
              {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  rail: {
    width: 26,
    alignItems: 'center',
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  line: {
    width: 2,
    flex: 1,
    marginTop: 4,
    backgroundColor: '#e2e8f0',
  },
  content: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginLeft: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 11,
    color: '#64748b',
  },
  description: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
});
