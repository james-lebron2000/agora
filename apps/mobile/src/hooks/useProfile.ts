/**
 * Profile SDK Hook for Agora Mobile
 * 
 * Provides React hooks for profile management using the Profile SDK.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ProfileManager,
  createProfileManager,
  type AgentProfile,
  type ProfileStats,
  type Achievement,
  type ReputationHistoryEntry,
  type UpdateProfileRequest,
  calculateLevel,
  levelProgress,
  xpForNextLevel,
  getDefaultAchievements,
  getTierColor,
} from '@agora/sdk/profile';

// API URL from environment
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://45.32.219.241:8789/api';

interface UseProfileOptions {
  agentId?: string;
  authToken?: string;
}

interface UseProfileReturn {
  // Profile data
  profile: AgentProfile | null;
  stats: ProfileStats | null;
  achievements: Achievement[];
  reputationHistory: ReputationHistoryEntry[];
  
  // Loading states
  isLoadingProfile: boolean;
  isLoadingStats: boolean;
  isLoadingAchievements: boolean;
  isLoadingReputation: boolean;
  isUpdating: boolean;
  
  // Errors
  error: Error | null;
  
  // Computed
  level: number;
  levelProgress: number;
  xpToNextLevel: number;
  
  // Actions
  refetch: () => Promise<void>;
  updateProfile: (data: UpdateProfileRequest) => Promise<AgentProfile | null>;
  refreshStats: () => Promise<void>;
  refreshAchievements: () => Promise<void>;
}

/**
 * Hook for managing agent profile via Profile SDK
 */
export function useProfile(options: UseProfileOptions = {}): UseProfileReturn {
  const { agentId, authToken } = options;
  
  // Create ProfileManager instance
  const profileManager = useMemo(() => {
    return createProfileManager(API_URL, authToken);
  }, [authToken]);
  
  // State
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [reputationHistory, setReputationHistory] = useState<ReputationHistoryEntry[]>([]);
  
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(false);
  const [isLoadingReputation, setIsLoadingReputation] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Computed values
  const level = useMemo(() => {
    return profile ? calculateLevel(profile.xp) : 1;
  }, [profile]);
  
  const levelProgressValue = useMemo(() => {
    return profile ? levelProgress(profile.xp) : 0;
  }, [profile]);
  
  const xpToNextLevel = useMemo(() => {
    return profile ? xpForNextLevel(level) - profile.xp : 0;
  }, [profile, level]);
  
  // Fetch profile data
  const fetchProfile = useCallback(async () => {
    if (!agentId) return;
    
    setIsLoadingProfile(true);
    setError(null);
    
    try {
      const data = await profileManager.getProfile(agentId);
      setProfile(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch profile');
      setError(error);
      console.error('[useProfile] Failed to fetch profile:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [agentId, profileManager]);
  
  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!agentId) return;
    
    setIsLoadingStats(true);
    setError(null);
    
    try {
      const data = await profileManager.getStats(agentId);
      setStats(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch stats');
      setError(error);
      console.error('[useProfile] Failed to fetch stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  }, [agentId, profileManager]);
  
  // Fetch achievements
  const fetchAchievements = useCallback(async () => {
    if (!agentId) return;
    
    setIsLoadingAchievements(true);
    setError(null);
    
    try {
      const data = await profileManager.getAchievements(agentId);
      setAchievements(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch achievements');
      setError(error);
      console.error('[useProfile] Failed to fetch achievements:', error);
    } finally {
      setIsLoadingAchievements(false);
    }
  }, [agentId, profileManager]);
  
  // Fetch reputation history
  const fetchReputationHistory = useCallback(async () => {
    if (!agentId) return;
    
    setIsLoadingReputation(true);
    setError(null);
    
    try {
      const data = await profileManager.getReputationHistory(agentId);
      setReputationHistory(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch reputation history');
      setError(error);
      console.error('[useProfile] Failed to fetch reputation history:', error);
    } finally {
      setIsLoadingReputation(false);
    }
  }, [agentId, profileManager]);
  
  // Update profile
  const updateProfile = useCallback(async (data: UpdateProfileRequest): Promise<AgentProfile | null> => {
    setIsUpdating(true);
    setError(null);
    
    try {
      const updated = await profileManager.updateProfile(data);
      setProfile(updated);
      return updated;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update profile');
      setError(error);
      console.error('[useProfile] Failed to update profile:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [profileManager]);
  
  // Refetch all data
  const refetch = useCallback(async () => {
    await Promise.all([
      fetchProfile(),
      fetchStats(),
      fetchAchievements(),
      fetchReputationHistory(),
    ]);
  }, [fetchProfile, fetchStats, fetchAchievements, fetchReputationHistory]);
  
  // Initial fetch
  useEffect(() => {
    if (agentId) {
      fetchProfile();
      fetchStats();
      fetchAchievements();
      fetchReputationHistory();
    }
  }, [agentId, fetchProfile, fetchStats, fetchAchievements, fetchReputationHistory]);
  
  return {
    profile,
    stats,
    achievements,
    reputationHistory,
    isLoadingProfile,
    isLoadingStats,
    isLoadingAchievements,
    isLoadingReputation,
    isUpdating,
    error,
    level,
    levelProgress: levelProgressValue,
    xpToNextLevel,
    refetch,
    updateProfile,
    refreshStats: fetchStats,
    refreshAchievements: fetchAchievements,
  };
}

/**
 * Hook for fetching the current user's own profile
 */
export function useMyProfile(authToken?: string) {
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const profileManager = useMemo(() => {
    return createProfileManager(API_URL, authToken);
  }, [authToken]);
  
  const fetchMyProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await profileManager.getMyProfile();
      setProfile(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch my profile');
      setError(error);
      console.error('[useMyProfile] Failed to fetch my profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, [profileManager]);
  
  useEffect(() => {
    fetchMyProfile();
  }, [fetchMyProfile]);
  
  return {
    profile,
    isLoading,
    error,
    refetch: fetchMyProfile,
  };
}

/**
 * Hook for searching profiles
 */
export function useProfileSearch(authToken?: string) {
  const [results, setResults] = useState<AgentProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const profileManager = useMemo(() => {
    return createProfileManager(API_URL, authToken);
  }, [authToken]);
  
  const search = useCallback(async (query: string, limit = 20) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    
    setIsSearching(true);
    setError(null);
    
    try {
      const data = await profileManager.searchProfiles(query, limit);
      setResults(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to search profiles');
      setError(error);
      console.error('[useProfileSearch] Failed to search:', error);
    } finally {
      setIsSearching(false);
    }
  }, [profileManager]);
  
  const clearResults = useCallback(() => {
    setResults([]);
  }, []);
  
  return {
    results,
    isSearching,
    error,
    search,
    clearResults,
  };
}

/**
 * Hook for fetching leaderboard data
 */
export function useLeaderboard(
  category: 'earnings' | 'tasks' | 'reputation' = 'reputation',
  limit = 100,
  authToken?: string
) {
  const [leaderboard, setLeaderboard] = useState<AgentProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const profileManager = useMemo(() => {
    return createProfileManager(API_URL, authToken);
  }, [authToken]);
  
  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await profileManager.getLeaderboard(category, limit);
      setLeaderboard(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch leaderboard');
      setError(error);
      console.error('[useLeaderboard] Failed to fetch leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  }, [profileManager, category, limit]);
  
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);
  
  return {
    leaderboard,
    isLoading,
    error,
    refetch: fetchLeaderboard,
  };
}

// Re-export SDK types and utilities
export type {
  AgentProfile,
  ProfileStats,
  Achievement,
  AchievementTier,
  ReputationHistoryEntry,
  UpdateProfileRequest,
  ProfileManager,
} from '@agora/sdk/profile';

export {
  createProfileManager,
  calculateLevel,
  levelProgress,
  xpForNextLevel,
  getDefaultAchievements,
  getTierColor,
};
