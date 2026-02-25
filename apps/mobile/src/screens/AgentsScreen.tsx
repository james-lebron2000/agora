import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vectoricons';

import { useAgents } from '../hooks/useApi';
import type { RootStackParamList, Agent } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AGENT_TAGS = ['All', 'trading', 'content', 'data', 'coding', 'legal', 'marketing'];

const AgentCard: React.FC<{ agent: Agent; onPress: () => void }> = ({ agent, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <View style={styles.header}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{agent.name[0]}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{agent.name}</Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={14} color="#f59e0b" />
          <Text style={styles.rating}>{agent.rating}</Text>
          <Text style={styles.tasks}>({agent.completedTasks} tasks)</Text>
        </View>
      </View>
      <View style={[styles.status, agent.isOnline ? styles.online : styles.offline]}>
        <View style={[styles.dot, agent.isOnline ? styles.dotOnline : styles.dotOffline]} />
      </View>
    </View>
    
    <Text style={styles.description} numberOfLines={2}>
      {agent.description}
    </Text>
    
    <View style={styles.tags}>
      {agent.tags.map((tag) => (
        <View key={tag} style={styles.tag}>
          <Text style={styles.tagText}>{tag}</Text>
        </View>
      ))}
    </View>
    
    <View style={styles.footer}>
      <View style={styles.rate}>
        <Text style={styles.rateLabel}>Hourly Rate</Text>
        <Text style={styles.rateValue}>${agent.hourlyRate}</Text>
      </View>
      <View style={styles.capabilities}>
        <Text style={styles.capLabel}>Capabilities</Text>
        <Text style={styles.capValue}>{agent.capabilities.length} skills</Text>
      </View>
    </View>
  </TouchableOpacity>
);

export default function AgentsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { agents, isLoading, refresh, getAgentsByTag } = useAgents();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>(agents);

  React.useEffect(() => {
    let result = agents;
    
    if (selectedTag !== 'All') {
      result = result.filter((a) => a.tags.includes(selectedTag));
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.description.toLowerCase().includes(query) ||
          a.tags.some((t) => t.toLowerCase().includes(query))
      );
    }
    
    setFilteredAgents(result);
  }, [agents, selectedTag, searchQuery]);

  const handleTagSelect = async (tag: string) => {
    setSelectedTag(tag);
    if (tag !== 'All') {
      const filtered = await getAgentsByTag(tag);
      setFilteredAgents(filtered);
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search agents..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tag Filter */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={AGENT_TAGS}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.tagList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterTag, selectedTag === item && styles.filterTagActive]}
            onPress={() => handleTagSelect(item)}
          >
            <Text
              style={[
                styles.filterTagText,
                selectedTag === item && styles.filterTagTextActive,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Agent List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={filteredAgents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#cbd5e1" />
              <Text style={styles.emptyText}>No agents found</Text>
              <Text style={styles.emptySubtext}>
                Try adjusting your search or filters
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <AgentCard
              agent={item}
              onPress={() => navigation.navigate('AgentDetail', { agentId: item.id })}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  tagList: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterTagActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  filterTagText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  filterTagTextActive: {
    color: 'white',
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  info: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rating: {
    fontSize: 14,
    color: '#f59e0b',
    marginLeft: 4,
    fontWeight: '500',
  },
  tasks: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 4,
  },
  status: {
    width: 12,
    height: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  online: {
    backgroundColor: '#dcfce7',
  },
  offline: {
    backgroundColor: '#f1f5f9',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotOnline: {
    backgroundColor: '#10b981',
  },
  dotOffline: {
    backgroundColor: '#94a3b8',
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 12,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'capitalize',
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  rate: {
    flex: 1,
  },
  rateLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 2,
  },
  rateValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6366f1',
  },
  capabilities: {
    flex: 1,
    alignItems: 'flex-end',
  },
  capLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 2,
  },
  capValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
  },
});
