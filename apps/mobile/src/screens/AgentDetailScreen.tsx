import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { agentApi } from '../services/api';
import { useSurvival } from '../hooks/useApi';
import { SkillRadar, Timeline } from '../components';
import type { RootStackParamList, Agent } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface RatingRecord {
  id: string;
  reviewer: string;
  score: number;
  comment: string;
  date: string;
}

const CHAIN_META = [
  { key: 'ethereum', name: 'Ethereum', icon: '🔷', color: '#627EEA' },
  { key: 'base', name: 'Base', icon: '🔵', color: '#0052FF' },
  { key: 'optimism', name: 'Optimism', icon: '🔴', color: '#FF0420' },
  { key: 'arbitrum', name: 'Arbitrum', icon: '💠', color: '#28A0F0' },
];

export default function AgentDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation<NavigationProp>();
  const { agentId } = route.params as { agentId: string };

  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { snapshot, economics, isLoading: isSurvivalLoading } = useSurvival(agentId);

  useEffect(() => {
    loadAgent();
  }, [agentId]);

  const loadAgent = async () => {
    setIsLoading(true);
    try {
      const data = await agentApi.getAgentById(agentId);
      setAgent(data);
    } catch (error) {
      console.error('Failed to load agent:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const ratingHistory = useMemo<RatingRecord[]>(() => {
    if (!agent) return [];

    return [
      {
        id: 'r1',
        reviewer: 'DAO Operations',
        score: Number(Math.min(5, agent.rating + 0.1).toFixed(1)),
        comment: 'Excellent delivery quality and clear communication.',
        date: '2026-02-18',
      },
      {
        id: 'r2',
        reviewer: 'Protocol Treasury',
        score: Number(Math.max(4.2, agent.rating - 0.2).toFixed(1)),
        comment: 'Handled cross-chain execution with strong stability.',
        date: '2026-02-08',
      },
      {
        id: 'r3',
        reviewer: 'Growth Team',
        score: Number(Math.max(4, agent.rating - 0.1).toFixed(1)),
        comment: 'Fast response time and useful optimization suggestions.',
        date: '2026-01-27',
      },
    ];
  }, [agent]);

  const timelineItems = useMemo(() => {
    if (!agent) return [];

    return [
      {
        id: 't1',
        title: 'Agent onboarded',
        description: `${agent.name} completed identity and wallet setup.`,
        timestamp: new Date(agent.createdAt).toLocaleDateString(),
        status: 'done' as const,
        icon: 'rocket-outline',
      },
      {
        id: 't2',
        title: `${agent.completedTasks} tasks delivered`,
        description: 'Consistent service output across client requests.',
        timestamp: 'Recent',
        status: 'done' as const,
        icon: 'checkmark-done-outline',
      },
      {
        id: 't3',
        title: 'Echo Survival monitoring active',
        description: 'Health and runway continuously tracked for resilience.',
        timestamp: snapshot?.health?.lastCheck
          ? new Date(snapshot.health.lastCheck).toLocaleTimeString()
          : 'Pending',
        status: snapshot ? 'active' as const : 'pending' as const,
        icon: 'pulse-outline',
      },
    ];
  }, [agent, snapshot]);

  const skillData = useMemo(() => {
    if (!agent) return [];

    return [
      { label: 'Quality', value: Math.min(100, agent.rating * 20) },
      { label: 'Delivery', value: Math.min(100, 35 + agent.completedTasks * 2) },
      { label: 'Speed', value: agent.isOnline ? 92 : 65 },
      { label: 'ChainOps', value: Math.min(96, 60 + agent.capabilities.length * 6) },
      { label: 'Economics', value: snapshot?.health?.economic ?? 72 },
      { label: 'Reliability', value: Math.min(100, 50 + agent.completedTasks * 1.5) },
    ];
  }, [agent, snapshot]);

  const supportedChains = useMemo(() => {
    if (!agent) return CHAIN_META;

    const text = `${agent.tags.join(' ')} ${agent.capabilities.join(' ')}`.toLowerCase();
    const matched = CHAIN_META.filter((chain) => text.includes(chain.key));
    return matched.length > 0 ? matched : CHAIN_META;
  }, [agent]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!agent) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text style={styles.errorText}>Agent not found</Text>
      </View>
    );
  }

  const healthScore = snapshot?.health?.overall ?? Math.max(50, Math.round(agent.rating * 18));
  const healthStatus = snapshot?.health?.status ?? (healthScore > 80 ? 'healthy' : healthScore > 60 ? 'stable' : 'degraded');

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{agent.name[0]}</Text>
        </View>
        <Text style={styles.name}>{agent.name}</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, agent.isOnline ? styles.online : styles.offline]}>
            <View style={[styles.dot, agent.isOnline ? styles.dotOnline : styles.dotOffline]} />
            <Text style={styles.statusText}>{agent.isOnline ? 'Available Now' : 'Offline'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Ionicons name="star" size={24} color="#f59e0b" />
          <Text style={styles.statValue}>{agent.rating}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Ionicons name="checkmark-done" size={24} color="#10b981" />
          <Text style={styles.statValue}>{agent.completedTasks}</Text>
          <Text style={styles.statLabel}>Tasks Done</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Ionicons name="cash" size={24} color="#6366f1" />
          <Text style={styles.statValue}>${agent.hourlyRate}</Text>
          <Text style={styles.statLabel}>Hourly Rate</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeadRow}>
          <Text style={styles.sectionTitle}>Agent Survival Health</Text>
          {isSurvivalLoading ? <ActivityIndicator size="small" color="#6366f1" /> : null}
        </View>
        <View style={styles.healthCard}>
          <View>
            <Text style={styles.healthScore}>{healthScore}/100</Text>
            <Text style={styles.healthStatus}>{String(healthStatus).toUpperCase()}</Text>
          </View>
          <View style={styles.healthMeta}>
            <Text style={styles.healthMetaText}>Economic: {snapshot?.health?.economic ?? '--'}</Text>
            <Text style={styles.healthMetaText}>Runway: {economics?.runwayDays ?? '--'} days</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Skill Radar</Text>
        <SkillRadar skills={skillData} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Supported Networks</Text>
        <View style={styles.chainWrap}>
          {supportedChains.map((chain) => (
            <View key={chain.key} style={[styles.chainChip, { borderColor: `${chain.color}55` }]}>
              <Text style={styles.chainIcon}>{chain.icon}</Text>
              <Text style={styles.chainText}>{chain.name}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.description}>{agent.description}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Specialties</Text>
        <View style={styles.tagsContainer}>
          {agent.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Capabilities</Text>
        {agent.capabilities.map((cap, index) => (
          <View key={index} style={styles.capability}>
            <Ionicons name="checkmark-circle" size={20} color="#6366f1" />
            <Text style={styles.capabilityText}>
              {cap.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rating History</Text>
        {ratingHistory.map((record) => (
          <View key={record.id} style={styles.ratingRow}>
            <View style={styles.ratingHead}>
              <Text style={styles.reviewer}>{record.reviewer}</Text>
              <View style={styles.ratingScoreWrap}>
                <Ionicons name="star" size={14} color="#f59e0b" />
                <Text style={styles.ratingScore}>{record.score.toFixed(1)}</Text>
              </View>
            </View>
            <Text style={styles.ratingComment}>{record.comment}</Text>
            <Text style={styles.ratingDate}>{record.date}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Service Timeline</Text>
        <Timeline items={timelineItems} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Wallet Address</Text>
        <View style={styles.walletContainer}>
          <Ionicons name="wallet-outline" size={20} color="#64748b" />
          <Text style={styles.walletAddress}>
            {agent.walletAddress.slice(0, 8)}...{agent.walletAddress.slice(-8)}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.hireButton}
          onPress={() => navigation.navigate('TaskPost', { agentId })}
          disabled={!agent.isOnline}
        >
          <Text style={styles.hireButtonText}>Hire Agent</Text>
          <Ionicons name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>

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
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'white',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: 'white',
    fontSize: 40,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  online: {
    backgroundColor: '#dcfce7',
  },
  offline: {
    backgroundColor: '#f1f5f9',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotOnline: {
    backgroundColor: '#10b981',
  },
  dotOffline: {
    backgroundColor: '#94a3b8',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 8,
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
    padding: 18,
  },
  sectionHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  healthCard: {
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  healthScore: {
    fontSize: 30,
    fontWeight: '700',
    color: '#312e81',
  },
  healthStatus: {
    fontSize: 12,
    color: '#4338ca',
    fontWeight: '700',
  },
  healthMeta: {
    alignItems: 'flex-end',
  },
  healthMetaText: {
    fontSize: 12,
    color: '#4f46e5',
    marginBottom: 4,
  },
  chainWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chainChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
  },
  chainIcon: {
    fontSize: 15,
    marginRight: 6,
  },
  chainText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: '#64748b',
    textTransform: 'capitalize',
  },
  capability: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  capabilityText: {
    fontSize: 15,
    color: '#475569',
    marginLeft: 12,
  },
  ratingRow: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    marginBottom: 10,
  },
  ratingHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewer: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  ratingScoreWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingScore: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  ratingComment: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 4,
  },
  ratingDate: {
    fontSize: 11,
    color: '#94a3b8',
  },
  walletContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
  },
  walletAddress: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 8,
    fontFamily: 'monospace',
  },
  actions: {
    padding: 16,
    paddingTop: 0,
  },
  hireButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  hireButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
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
