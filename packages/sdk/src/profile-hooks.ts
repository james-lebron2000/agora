/**
 * React Hooks for Agora Agent Profile Module
 * 
 * Provides React Query-based hooks for profile data fetching,
 * mutations, and caching. Separated from core SDK to avoid
 * React dependency in the base package.
 * 
 * @module profile-hooks
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ProfileManager,
  ProfileCache,
  batchGetProfiles,
  checkProfileCompleteness,
  uploadAvatar,
  createOptimisticProfileUpdate,
  saveProfileToLocalStorage,
  loadProfileFromLocalStorage,
  getProfileCache,
  calculateLevel,
  xpForNextLevel,
  levelProgress,
  getTierColor,
  getDefaultAchievements,
  type AgentProfile,
  type Achievement,
  type ProfileStats,
  type UpdateProfileRequest,
  type ReputationHistoryEntry,
  type ProfileCompleteness,
  type AvatarUploadResult,
} from './profile.js';

// ============================================================================
// Context Types
// ============================================================================

export interface ProfileContextValue {
  /** Profile manager instance */
  manager: ProfileManager | null;
  /** Current auth token */
  authToken: string | null;
  /** Set auth token */
  setAuthToken: (token: string | null) => void;
  /** API URL */
  apiUrl: string;
}

export interface ProfileProviderProps {
  /** API base URL */
  apiUrl: string;
  /** Initial auth token */
  authToken?: string;
  /** React children */
  children: React.ReactNode;
}

// ============================================================================
// Simple Provider Pattern (without React Context API for zero-dependency)
// ============================================================================

let globalManager: ProfileManager | null = null;
let globalAuthToken: string | null = null;
let globalApiUrl: string = '';

/** Initialize the profile manager globally */
export function initializeProfileManager(apiUrl: string, authToken?: string): void {
  globalApiUrl = apiUrl;
  globalAuthToken = authToken || null;
  globalManager = new ProfileManager(apiUrl, authToken);
}

/** Get the global profile manager instance */
export function getGlobalManager(): ProfileManager {
  if (!globalManager) {
    throw new Error('Profile manager not initialized. Call initializeProfileManager first.');
  }
  return globalManager;
}

/** Update auth token globally */
export function setGlobalAuthToken(token: string | null): void {
  globalAuthToken = token;
  if (globalManager) {
    globalManager.setAuthToken(token || '');
  }
}

/** Get current auth token */
export function getGlobalAuthToken(): string | null {
  return globalAuthToken;
}

// ============================================================================
// Hook: useProfile
// ============================================================================

export interface UseProfileOptions {
  /** Auto-refresh interval in ms (default: 30000) */
  refreshInterval?: number;
  /** Enable initial fetch (default: true) */
  enabled?: boolean;
}

export interface UseProfileResult {
  /** Profile data */
  profile: AgentProfile | null;
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Refetch function */
  refetch: () => Promise<void>;
  /** Last updated timestamp */
  lastUpdated: number | null;
}

/**
 * Hook to fetch and cache a single profile
 * 
 * @example
 * ```tsx
 * const { profile, isLoading, error } = useProfile('agent-123');
 * 
 * if (isLoading) return <Spinner />;
 * if (error) return <Error message={error.message} />;
 * return <ProfileCard profile={profile} />;
 * ```
 */
export function useProfile(agentId: string, options: UseProfileOptions = {}): UseProfileResult {
  const { refreshInterval = 30000, enabled = true } = options;
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!agentId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const manager = getGlobalManager();
      const data = await manager.getProfile(agentId);
      
      setProfile(data);
      setLastUpdated(Date.now());
      
      // Cache to localStorage for offline access
      saveProfileToLocalStorage(data);
    } catch (err) {
      // Try to load from localStorage fallback
      const cached = loadProfileFromLocalStorage(agentId);
      if (cached) {
        setProfile(cached);
        setLastUpdated(Date.now());
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch profile'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  const refetch = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!enabled) return;
    
    fetchProfile();
    
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchProfile, refreshInterval);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchProfile, enabled, refreshInterval]);

  return { profile, isLoading, error, refetch, lastUpdated };
}

// ============================================================================
// Hook: useMyProfile
// ============================================================================

export interface UseMyProfileResult extends UseProfileResult {
  /** Update local profile state optimistically */
  updateLocal: (updates: Partial<AgentProfile>) => void;
}

/**
 * Hook to fetch and manage current user's profile
 * 
 * @example
 * ```tsx
 * const { profile, isLoading, updateLocal } = useMyProfile();
 * 
 * const handleAvatarUpdate = (url: string) => {
 *   updateLocal({ avatarUrl: url });
 * };
 * ```
 */
export function useMyProfile(options: UseProfileOptions = {}): UseMyProfileResult {
  const [profileId, setProfileId] = useState<string>('me');
  const { profile, isLoading, error, refetch, lastUpdated } = useProfile(profileId, {
    ...options,
    enabled: options.enabled !== false && !!getGlobalAuthToken(),
  });

  const updateLocal = useCallback((updates: Partial<AgentProfile>) => {
    if (!profile) return;
    
    const optimistic = createOptimisticProfileUpdate(profile, updates);
    // Apply optimistic update immediately
    Object.assign(profile, optimistic.updated);
    
    // Store to localStorage
    saveProfileToLocalStorage(profile);
  }, [profile]);

  return { profile, isLoading, error, refetch, lastUpdated, updateLocal };
}

// ============================================================================
// Hook: useUpdateProfile
// ============================================================================

export interface UseUpdateProfileResult {
  /** Update profile function */
  update: (data: UpdateProfileRequest) => Promise<AgentProfile>;
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Success state */
  isSuccess: boolean;
  /** Reset state */
  reset: () => void;
}

/**
 * Hook to update profile with optimistic updates
 * 
 * @example
 * ```tsx
 * const { update, isLoading, isSuccess } = useUpdateProfile();
 * 
 * const handleSubmit = async (data) => {
 *   await update(data);
 *   if (isSuccess) {
 *     toast.success('Profile updated!');
 *   }
 * };
 * ```
 */
export function useUpdateProfile(): UseUpdateProfileResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const rollbackRef = useRef<(() => void) | null>(null);

  const update = useCallback(async (data: UpdateProfileRequest): Promise<AgentProfile> => {
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);
    
    try {
      const manager = getGlobalManager();
      
      // Get current profile for optimistic update
      const currentProfile = await manager.getMyProfile();
      const optimistic = createOptimisticProfileUpdate(currentProfile, data);
      
      // Store rollback function
      rollbackRef.current = optimistic.rollback;
      
      // Optimistically update localStorage
      saveProfileToLocalStorage(optimistic.updated);
      
      // Perform actual update
      const result = await manager.updateProfile(data);
      
      // Update localStorage with server response
      saveProfileToLocalStorage(result);
      
      setIsSuccess(true);
      return result;
    } catch (err) {
      // Rollback on error
      if (rollbackRef.current) {
        rollbackRef.current();
      }
      throw err instanceof Error ? err : new Error('Update failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setIsSuccess(false);
    rollbackRef.current = null;
  }, []);

  return { update, isLoading, error, isSuccess, reset };
}

// ============================================================================
// Hook: useProfileStats
// ============================================================================

export interface UseProfileStatsResult {
  /** Profile statistics */
  stats: ProfileStats | null;
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Refetch function */
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch profile statistics
 * 
 * @example
 * ```tsx
 * const { stats, isLoading } = useProfileStats('agent-123');
 * 
 * return (
 *   <StatsCard 
 *     tasksCompleted={stats?.tasksCompleted}
 *     reputation={stats?.reputation}
 *   />
 * );
 * ```
 */
export function useProfileStats(agentId: string): UseProfileStatsResult {
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    if (!agentId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const manager = getGlobalManager();
      const data = await manager.getStats(agentId);
      
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch stats'));
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, error, refetch: fetchStats };
}

// ============================================================================
// Hook: useAchievements
// ============================================================================

export interface UseAchievementsResult {
  /** Achievements list */
  achievements: Achievement[];
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Refetch function */
  refetch: () => Promise<void>;
  /** Progress percentage */
  progressPercent: number;
  /** Completed count */
  completedCount: number;
}

/**
 * Hook to fetch and track achievements
 * 
 * @example
 * ```tsx
 * const { achievements, progressPercent, completedCount } = useAchievements('agent-123');
 * 
 * return (
 *   <div>
 *     <ProgressBar value={progressPercent} />
 *     <span>{completedCount}/{achievements.length} completed</span>
 *   </div>
 * );
 * ```
 */
export function useAchievements(agentId: string): UseAchievementsResult {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAchievements = useCallback(async () => {
    if (!agentId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const manager = getGlobalManager();
      const data = await manager.getAchievements(agentId);
      
      setAchievements(data);
    } catch (err) {
      // Fallback to default achievements on error
      const defaults = getDefaultAchievements().map(a => ({
        ...a,
        unlocked: false,
        progress: 0,
      }));
      setAchievements(defaults);
      setError(err instanceof Error ? err : new Error('Failed to fetch achievements'));
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  const progressPercent = useMemo(() => {
    if (achievements.length === 0) return 0;
    const completed = achievements.filter(a => a.completedAt).length;
    return Math.round((completed / achievements.length) * 100);
  }, [achievements]);

  const completedCount = useMemo(() => {
    return achievements.filter(a => a.completedAt).length;
  }, [achievements]);

  return { 
    achievements, 
    isLoading, 
    error, 
    refetch: fetchAchievements,
    progressPercent,
    completedCount
  };
}

// ============================================================================
// Hook: useReputationHistory
// ============================================================================

export interface UseReputationHistoryResult {
  /** Reputation history entries */
  history: ReputationHistoryEntry[];
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Refetch function */
  refetch: () => Promise<void>;
  /** Calculate trend */
  trend: 'up' | 'down' | 'stable';
}

/**
 * Hook to fetch reputation history
 * 
 * @example
 * ```tsx
 * const { history, trend } = useReputationHistory('agent-123');
 * 
 * return (
 *   <ReputationChart data={history} trend={trend} />
 * );
 * ```
 */
export function useReputationHistory(agentId: string): UseReputationHistoryResult {
  const [history, setHistory] = useState<ReputationHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!agentId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const manager = getGlobalManager();
      const data = await manager.getReputationHistory(agentId);
      
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch reputation history'));
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const trend = useMemo<'up' | 'down' | 'stable'>(() => {
    if (history.length < 2) return 'stable';
    
    const recent = history.slice(-7);
    const first = recent[0]?.score || 0;
    const last = recent[recent.length - 1]?.score || 0;
    
    const diff = last - first;
    if (diff > 5) return 'up';
    if (diff < -5) return 'down';
    return 'stable';
  }, [history]);

  return { history, isLoading, error, refetch: fetchHistory, trend };
}

// ============================================================================
// Hook: useSearchProfiles
// ============================================================================

export interface UseSearchProfilesOptions {
  /** Search query */
  query: string;
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number;
  /** Results limit (default: 20) */
  limit?: number;
}

export interface UseSearchProfilesResult {
  /** Search results */
  results: AgentProfile[];
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Whether search is active */
  hasQuery: boolean;
}

/**
 * Hook to search profiles with debouncing
 * 
 * @example
 * ```tsx
 * const [query, setQuery] = useState('');
 * const { results, isLoading } = useSearchProfiles({ query });
 * 
 * return (
 *   <>
 *     <SearchInput value={query} onChange={setQuery} />
 *     <SearchResults results={results} loading={isLoading} />
 *   </>
 * );
 * ```
 */
export function useSearchProfiles(options: UseSearchProfilesOptions): UseSearchProfilesResult {
  const { query, debounceMs = 300, limit = 20 } = options;
  const [results, setResults] = useState<AgentProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const manager = getGlobalManager();
        const data = await manager.searchProfiles(query, limit);
        
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Search failed'));
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, debounceMs, limit]);

  return { 
    results, 
    isLoading, 
    error, 
    hasQuery: query.trim().length > 0 
  };
}

// ============================================================================
// Hook: useLeaderboard
// ============================================================================

export type LeaderboardCategory = 'reputation' | 'earnings' | 'tasks';

export interface UseLeaderboardOptions {
  /** Leaderboard category */
  category?: LeaderboardCategory;
  /** Results limit (default: 100) */
  limit?: number;
  /** Refresh interval in ms (default: 60000) */
  refreshInterval?: number;
}

export interface UseLeaderboardResult {
  /** Leaderboard entries */
  leaderboard: AgentProfile[];
  /** Current user's rank */
  myRank: number | null;
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Refetch function */
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch leaderboard data
 * 
 * @example
 * ```tsx
 * const { leaderboard, myRank, isLoading } = useLeaderboard({ 
 *   category: 'reputation',
 *   limit: 50 
 * });
 * 
 * return (
 *   <LeaderboardTable 
 *     data={leaderboard}
 *     myRank={myRank}
 *   />
 * );
 * ```
 */
export function useLeaderboard(options: UseLeaderboardOptions = {}): UseLeaderboardResult {
  const { category = 'reputation', limit = 100, refreshInterval = 60000 } = options;
  const [leaderboard, setLeaderboard] = useState<AgentProfile[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const manager = getGlobalManager();
      const data = await manager.getLeaderboard(category, limit);
      
      setLeaderboard(data);
      
      // Calculate my rank if logged in
      const myProfile = await manager.getMyProfile().catch(() => null);
      if (myProfile) {
        const rank = data.findIndex(p => p.id === myProfile.id) + 1;
        setMyRank(rank > 0 ? rank : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch leaderboard'));
    } finally {
      setIsLoading(false);
    }
  }, [category, limit]);

  useEffect(() => {
    fetchLeaderboard();
    
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchLeaderboard, refreshInterval);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchLeaderboard, refreshInterval]);

  return { leaderboard, myRank, isLoading, error, refetch: fetchLeaderboard };
}

// ============================================================================
// Hook: useProfileCompleteness
// ============================================================================

export interface UseProfileCompletenessResult {
  /** Completeness score (0-100) */
  score: number;
  /** Missing fields */
  missing: string[];
  /** Improvement suggestions */
  suggestions: string[];
  /** Whether profile is complete (score >= 75) */
  isComplete: boolean;
}

/**
 * Hook to check profile completeness
 * 
 * @example
 * ```tsx
 * const { score, suggestions, isComplete } = useProfileCompleteness(profile);
 * 
 * if (!isComplete) {
 *   return <CompletenessAlert suggestions={suggestions} />;
 * }
 * ```
 */
export function useProfileCompleteness(profile: AgentProfile | null): UseProfileCompletenessResult {
  return useMemo(() => {
    if (!profile) {
      return { score: 0, missing: [], suggestions: [], isComplete: false };
    }
    
    const result = checkProfileCompleteness(profile);
    
    return {
      score: result.score,
      missing: result.missing,
      suggestions: result.suggestions,
      isComplete: result.score >= 75
    };
  }, [profile]);
}

// ============================================================================
// Hook: useUploadAvatar
// ============================================================================

export interface UseUploadAvatarResult {
  /** Upload function */
  upload: (file: File) => Promise<string>;
  /** Upload progress (0-100) */
  progress: number;
  /** Loading state */
  isUploading: boolean;
  /** Error if any */
  error: Error | null;
  /** Reset state */
  reset: () => void;
}

/**
 * Hook to upload avatar with progress tracking
 * 
 * @example
 * ```tsx
 * const { upload, progress, isUploading } = useUploadAvatar();
 * 
 * const handleFileSelect = async (file) => {
 *   const url = await upload(file);
 *   updateProfile({ avatarUrl: url });
 * };
 * 
 * return (
 *   <UploadProgress 
 *     progress={progress} 
 *     isUploading={isUploading}
 *   />
 * );
 * ```
 */
export function useUploadAvatar(): UseUploadAvatarResult {
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const upload = useCallback(async (file: File): Promise<string> => {
    setIsUploading(true);
    setError(null);
    setProgress(0);
    
    try {
      const token = getGlobalAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const result = await uploadAvatar(
        globalApiUrl,
        file,
        token,
        (percent) => setProgress(percent)
      );
      
      if (!result.success || !result.url) {
        throw new Error(result.error || 'Upload failed');
      }
      
      setProgress(100);
      return result.url;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Upload failed');
      setError(error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setProgress(0);
    setIsUploading(false);
    setError(null);
  }, []);

  return { upload, progress, isUploading, error, reset };
}

// ============================================================================
// Hook: useLevelProgress
// ============================================================================

export interface UseLevelProgressResult {
  /** Current level */
  level: number;
  /** XP for next level */
  nextLevelXp: number;
  /** Current XP in level */
  currentLevelXp: number;
  /** XP needed to level up */
  xpToNextLevel: number;
  /** Progress percentage (0-1) */
  progress: number;
  /** Tier color */
  tierColor: string;
}

/**
 * Hook to calculate level progress from XP
 * 
 * @example
 * ```tsx
 * const { level, progress, xpToNextLevel } = useLevelProgress(profile?.xp || 0);
 * 
 * return (
 *   <LevelBadge 
 *     level={level}
 *     progress={progress}
 *     xpToNext={xpToNextLevel}
 *   />
 * );
 * ```
 */
export function useLevelProgress(xp: number, tier?: string): UseLevelProgressResult {
  return useMemo(() => {
    const level = calculateLevel(xp);
    const nextLevelXp = xpForNextLevel(level);
    const currentLevelBaseXp = (level - 1) * (level - 1) * 100;
    const currentLevelXp = xp - currentLevelBaseXp;
    const xpToNextLevel = nextLevelXp - currentLevelBaseXp;
    const progress = levelProgress(xp);
    const tierColor = getTierColor(tier as any || 'bronze');
    
    return {
      level,
      nextLevelXp,
      currentLevelXp,
      xpToNextLevel,
      progress,
      tierColor
    };
  }, [xp, tier]);
}

// ============================================================================
// Hook: useBatchProfiles
// ============================================================================

export interface UseBatchProfilesResult {
  /** Profiles map by ID */
  profiles: Map<string, AgentProfile>;
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Refetch function */
  refetch: () => Promise<void>;
  /** Get single profile from cache */
  getProfile: (agentId: string) => AgentProfile | undefined;
}

/**
 * Hook to fetch multiple profiles efficiently in batch
 * 
 * @example
 * ```tsx
 * const agentIds = ['agent-1', 'agent-2', 'agent-3'];
 * const { profiles, getProfile } = useBatchProfiles(agentIds);
 * 
 * return (
 *   <AgentList>
 *     {agentIds.map(id => (
 *       <AgentCard profile={getProfile(id)} />
 *     ))}
 *   </AgentList>
 * );
 * ```
 */
export function useBatchProfiles(agentIds: string[]): UseBatchProfilesResult {
  const [profiles, setProfiles] = useState<Map<string, AgentProfile>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBatch = useCallback(async () => {
    if (agentIds.length === 0) {
      setProfiles(new Map());
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const token = getGlobalAuthToken();
      const result = await batchGetProfiles(globalApiUrl, agentIds, token || undefined);
      
      setProfiles(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Batch fetch failed'));
    } finally {
      setIsLoading(false);
    }
  }, [agentIds.join(',')]);

  useEffect(() => {
    fetchBatch();
  }, [fetchBatch]);

  const getProfile = useCallback((agentId: string) => {
    return profiles.get(agentId);
  }, [profiles]);

  return { profiles, isLoading, error, refetch: fetchBatch, getProfile };
}

// ============================================================================
// Hook: useProfileCache
// ============================================================================

export interface UseProfileCacheResult {
  /** Get cached profile */
  get: (key: string) => any;
  /** Set cached value */
  set: (key: string, data: any, ttlMs?: number) => void;
  /** Check if key exists */
  has: (key: string) => boolean;
  /** Invalidate cache by pattern */
  invalidate: (pattern: string) => void;
  /** Clear all cache */
  clear: () => void;
}

/**
 * Hook to interact with profile cache
 * 
 * @example
 * ```tsx
 * const { set, get, invalidate } = useProfileCache();
 * 
 * // Cache custom data
 * set('custom-key', data, 60000);
 * 
 * // Invalidate profile cache
 * invalidate('profile:');
 * ```
 */
export function useProfileCache(): UseProfileCacheResult {
  const cache = useMemo(() => getProfileCache(), []);
  
  const get = useCallback((key: string) => cache.get(key), [cache]);
  const set = useCallback((key: string, data: any, ttlMs?: number) => {
    cache.set(key, data, ttlMs);
  }, [cache]);
  const has = useCallback((key: string) => cache.has(key), [cache]);
  const invalidate = useCallback((pattern: string) => {
    cache.invalidate(pattern);
  }, [cache]);
  const clear = useCallback(() => cache.clear(), [cache]);
  
  return { get, set, has, invalidate, clear };
}

// ============================================================================
// Hook: useProfileRealtime
// ============================================================================

export interface UseProfileRealtimeOptions {
  /** Agent ID to watch */
  agentId: string;
  /** WebSocket URL (optional, defaults to API URL with ws://) */
  wsUrl?: string;
  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Reconnect delay in ms (default: 5000) */
  reconnectDelay?: number;
}

export interface UseProfileRealtimeResult {
  /** Real-time profile data */
  profile: AgentProfile | null;
  /** Connection status */
  isConnected: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Last update timestamp */
  lastUpdateAt: number | null;
  /** Manual reconnect function */
  reconnect: () => void;
  /** Disconnect function */
  disconnect: () => void;
}

/**
 * Hook to subscribe to real-time profile updates via WebSocket
 * 
 * @example
 * ```tsx
 * const { profile, isConnected } = useProfileRealtime({ agentId: 'agent-123' });
 * 
 * return (
 *   <div>
 *     <ConnectionStatus connected={isConnected} />
 *     <ProfileCard profile={profile} />
 *   </div>
 * );
 * ```
 */
export function useProfileRealtime(options: UseProfileRealtimeOptions): UseProfileRealtimeResult {
  const { agentId, wsUrl, autoReconnect = true, reconnectDelay = 5000 } = options;
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdateAt, setLastUpdateAt] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!agentId) return;
    
    try {
      const url = wsUrl || globalApiUrl.replace(/^http/, 'ws');
      const ws = new WebSocket(`${url}/profiles/${agentId}/realtime`);
      
      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        setIsLoading(false);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'profile_update' && data.profile) {
            setProfile(data.profile);
            setLastUpdateAt(Date.now());
            // Cache to localStorage
            saveProfileToLocalStorage(data.profile);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };
      
      ws.onerror = (err) => {
        setError(new Error('WebSocket connection error'));
        setIsConnected(false);
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        if (autoReconnect) {
          reconnectTimeoutRef.current = setTimeout(connect, reconnectDelay);
        }
      };
      
      wsRef.current = ws;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to connect'));
      setIsLoading(false);
    }
  }, [agentId, wsUrl, autoReconnect, reconnectDelay]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setIsLoading(true);
    connect();
  }, [disconnect, connect]);

  useEffect(() => {
    // Load initial data from cache
    const cached = loadProfileFromLocalStorage(agentId);
    if (cached) {
      setProfile(cached);
      setIsLoading(false);
    }
    
    connect();
    
    return () => {
      disconnect();
    };
  }, [agentId, connect, disconnect]);

  return { profile, isConnected, isLoading, error, lastUpdateAt, reconnect, disconnect };
}

// ============================================================================
// Hook: useAchievementProgress
// ============================================================================

export interface UseAchievementProgressOptions {
  /** Agent ID */
  agentId: string;
  /** Polling interval in ms (default: 10000) */
  pollInterval?: number;
}

export interface UseAchievementProgressResult {
  /** All achievements with progress */
  achievements: Achievement[];
  /** Recently unlocked achievements */
  recentlyUnlocked: Achievement[];
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Total XP from unlocked achievements */
  totalXpEarned: number;
  /** Refetch function */
  refetch: () => Promise<void>;
  /** Acknowledge an achievement (mark as seen) */
  acknowledge: (achievementId: string) => void;
}

/**
 * Hook to track achievement progress with notifications for new unlocks
 * 
 * @example
 * ```tsx
 * const { achievements, recentlyUnlocked, acknowledge } = useAchievementProgress({ 
 *   agentId: 'agent-123' 
 * });
 * 
 * useEffect(() => {
 *   if (recentlyUnlocked.length > 0) {
 *     toast.success(`Unlocked: ${recentlyUnlocked[0].name}!`);
 *     acknowledge(recentlyUnlocked[0].id);
 *   }
 * }, [recentlyUnlocked]);
 * ```
 */
export function useAchievementProgress(options: UseAchievementProgressOptions): UseAchievementProgressResult {
  const { agentId, pollInterval = 10000 } = options;
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [seenUnlocks, setSeenUnlocks] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const lastFetchRef = useRef<Achievement[]>([]);

  const fetchAchievements = useCallback(async () => {
    if (!agentId) return;
    
    try {
      const manager = getGlobalManager();
      const data = await manager.getAchievements(agentId);
      
      // Detect newly unlocked achievements
      const previouslyUnlocked = new Set(
        lastFetchRef.current.filter(a => a.unlockedAt || a.completedAt).map(a => a.id)
      );
      
      lastFetchRef.current = data;
      setAchievements(data);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch achievements'));
      setIsLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchAchievements();
    
    const interval = setInterval(fetchAchievements, pollInterval);
    return () => clearInterval(interval);
  }, [fetchAchievements, pollInterval]);

  const recentlyUnlocked = useMemo(() => {
    return achievements.filter(a => 
      (a.unlockedAt || a.completedAt) && !seenUnlocks.has(a.id)
    );
  }, [achievements, seenUnlocks]);

  const totalXpEarned = useMemo(() => {
    return achievements
      .filter(a => a.unlockedAt || a.completedAt)
      .reduce((sum, a) => sum + (a.xpReward || 0), 0);
  }, [achievements]);

  const acknowledge = useCallback((achievementId: string) => {
    setSeenUnlocks(prev => new Set([...prev, achievementId]));
  }, []);

  return {
    achievements,
    recentlyUnlocked,
    isLoading,
    error,
    totalXpEarned,
    refetch: fetchAchievements,
    acknowledge,
  };
}

// ============================================================================
// Hook: useProfileSearch
// ============================================================================

export interface UseProfileSearchFilters {
  /** Minimum reputation score */
  minReputation?: number;
  /** Minimum level */
  minLevel?: number;
  /** Required skills */
  skills?: string[];
  /** Skill match mode */
  skillMatchMode?: 'all' | 'any';
  /** Verification status */
  isVerified?: boolean;
  /** Premium status */
  isPremium?: boolean;
  /** Member since (timestamp) */
  memberSinceAfter?: number;
  /** Maximum tasks completed */
  maxTasks?: number;
  /** Minimum tasks completed */
  minTasks?: number;
}

export interface UseProfileSearchOptions {
  /** Search query */
  query: string;
  /** Filters */
  filters?: UseProfileSearchFilters;
  /** Sort field */
  sortBy?: 'reputation' | 'level' | 'tasksCompleted' | 'memberSince' | 'relevance';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
  /** Results limit (default: 20) */
  limit?: number;
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number;
  /** Enabled state */
  enabled?: boolean;
}

export interface UseProfileSearchResult {
  /** Search results */
  results: AgentProfile[];
  /** Total count (before limit) */
  totalCount: number;
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Whether search is active */
  hasQuery: boolean;
  /** Current page */
  page: number;
  /** Set page */
  setPage: (page: number) => void;
  /** Total pages */
  totalPages: number;
  /** Update filters */
  setFilters: (filters: UseProfileSearchFilters) => void;
}

/**
 * Hook to search profiles with advanced filtering and sorting
 * 
 * @example
 * ```tsx
 * const { results, isLoading, setFilters } = useProfileSearch({ 
 *   query: 'developer',
 *   filters: { minReputation: 70, skills: ['react', 'typescript'] },
 *   sortBy: 'reputation',
 *   sortOrder: 'desc'
 * });
 * ```
 */
export function useProfileSearch(options: UseProfileSearchOptions): UseProfileSearchResult {
  const { 
    query, 
    filters = {}, 
    sortBy = 'relevance', 
    sortOrder = 'desc',
    limit = 20, 
    debounceMs = 300,
    enabled = true 
  } = options;
  
  const [results, setResults] = useState<AgentProfile[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [activeFilters, setActiveFilters] = useState(filters);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const search = useCallback(async () => {
    if (!enabled || (!query.trim() && Object.keys(activeFilters).length === 0)) {
      setResults([]);
      setTotalCount(0);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const manager = getGlobalManager();
      const offset = (page - 1) * limit;
      
      // Use the manager's searchProfiles with additional filtering
      const searchResults = await manager.searchProfiles(query, limit * 5);
      
      // Apply client-side filtering
      let filtered = searchResults.filter(profile => {
        if (activeFilters.minReputation !== undefined && profile.reputation < activeFilters.minReputation) return false;
        if (activeFilters.minLevel !== undefined && profile.level < activeFilters.minLevel) return false;
        if (activeFilters.isVerified !== undefined && profile.isVerified !== activeFilters.isVerified) return false;
        if (activeFilters.isPremium !== undefined && profile.isPremium !== activeFilters.isPremium) return false;
        if (activeFilters.minTasks !== undefined && profile.tasksCompleted < activeFilters.minTasks) return false;
        if (activeFilters.maxTasks !== undefined && profile.tasksCompleted > activeFilters.maxTasks) return false;
        if (activeFilters.memberSinceAfter !== undefined && profile.memberSince < activeFilters.memberSinceAfter) return false;
        if (activeFilters.skills?.length) {
          const profileSkills = profile.skills || [];
          const matchMode = activeFilters.skillMatchMode || 'any';
          if (matchMode === 'all') {
            if (!activeFilters.skills.every(s => profileSkills.includes(s))) return false;
          } else {
            if (!activeFilters.skills.some(s => profileSkills.includes(s))) return false;
          }
        }
        return true;
      });
      
      // Apply sorting
      filtered.sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'reputation':
            comparison = a.reputation - b.reputation;
            break;
          case 'level':
            comparison = a.level - b.level;
            break;
          case 'tasksCompleted':
            comparison = a.tasksCompleted - b.tasksCompleted;
            break;
          case 'memberSince':
            comparison = a.memberSince - b.memberSince;
            break;
          default:
            comparison = 0;
        }
        return sortOrder === 'desc' ? -comparison : comparison;
      });
      
      setTotalCount(filtered.length);
      setResults(filtered.slice(offset, offset + limit));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Search failed'));
    } finally {
      setIsLoading(false);
    }
  }, [query, activeFilters, sortBy, sortOrder, limit, page, enabled]);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(search, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [search, debounceMs]);

  const totalPages = Math.ceil(totalCount / limit);

  return {
    results,
    totalCount,
    isLoading,
    error,
    hasQuery: query.trim().length > 0 || Object.keys(activeFilters).length > 0,
    page,
    setPage,
    totalPages,
    setFilters: setActiveFilters,
  };
}

// ============================================================================
// Hook: useProfileComparison
// ============================================================================

export interface UseProfileComparisonResult {
  /** Profiles being compared */
  profiles: AgentProfile[];
  /** Comparison metrics */
  metrics: {
    /** Best performer per metric */
    best: Record<string, string>;
    /** Percentage differences */
    differences: Record<string, Record<string, number>>;
    /** Rankings per metric */
    rankings: Record<string, string[]>;
  };
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Add profile to comparison */
  addProfile: (agentId: string) => void;
  /** Remove profile from comparison */
  removeProfile: (agentId: string) => void;
  /** Clear all profiles */
  clearProfiles: () => void;
}

/**
 * Hook to compare multiple agent profiles side by side
 * 
 * @example
 * ```tsx
 * const { profiles, metrics, addProfile, removeProfile } = useProfileComparison();
 * 
 * return (
 *   <ComparisonTable 
 *     profiles={profiles}
 *     metrics={metrics}
 *     onRemove={removeProfile}
 *   />
 * );
 * ```
 */
export function useProfileComparison(): UseProfileComparisonResult {
  const [profileIds, setProfileIds] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<AgentProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfiles = useCallback(async () => {
    if (profileIds.length < 2) {
      setProfiles([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const token = getGlobalAuthToken();
      const result = await batchGetProfiles(globalApiUrl, profileIds, token || undefined);
      
      const fetchedProfiles = profileIds.map(id => result.get(id)).filter(Boolean) as AgentProfile[];
      setProfiles(fetchedProfiles);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch profiles'));
    } finally {
      setIsLoading(false);
    }
  }, [profileIds]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const metrics = useMemo(() => {
    if (profiles.length < 2) {
      return { best: {}, differences: {}, rankings: {} };
    }

    const metricKeys = ['reputation', 'level', 'tasksCompleted', 'totalEarned'];
    const best: Record<string, string> = {};
    const differences: Record<string, Record<string, number>> = {};
    const rankings: Record<string, string[]> = {};

    metricKeys.forEach(key => {
      const sorted = [...profiles].sort((a, b) => {
        const valA = key === 'totalEarned' ? parseFloat(a[key] || '0') : (a as any)[key] || 0;
        const valB = key === 'totalEarned' ? parseFloat(b[key] || '0') : (b as any)[key] || 0;
        return valB - valA;
      });
      
      best[key] = sorted[0]?.id || '';
      rankings[key] = sorted.map(p => p.id);
      
      const baseValue = key === 'totalEarned' 
        ? parseFloat(sorted[0]?.[key] || '0') 
        : (sorted[0] as any)[key] || 0;
      
      differences[key] = {};
      sorted.forEach(p => {
        const value = key === 'totalEarned' ? parseFloat(p[key] || '0') : (p as any)[key] || 0;
        differences[key][p.id] = baseValue > 0 ? ((value - baseValue) / baseValue) * 100 : 0;
      });
    });

    return { best, differences, rankings };
  }, [profiles]);

  const addProfile = useCallback((agentId: string) => {
    setProfileIds(prev => {
      if (prev.includes(agentId)) return prev;
      if (prev.length >= 4) return [...prev.slice(1), agentId]; // Max 4 profiles
      return [...prev, agentId];
    });
  }, []);

  const removeProfile = useCallback((agentId: string) => {
    setProfileIds(prev => prev.filter(id => id !== agentId));
  }, []);

  const clearProfiles = useCallback(() => {
    setProfileIds([]);
  }, []);

  return {
    profiles,
    metrics,
    isLoading,
    error,
    addProfile,
    removeProfile,
    clearProfiles,
  };
}

// ============================================================================
// Hook: useProfileRecommendations
// ============================================================================

export interface UseProfileRecommendationsOptions {
  /** Agent ID to base recommendations on (defaults to current user) */
  agentId?: string;
  /** Number of recommendations (default: 5) */
  limit?: number;
  /** Recommendation type */
  type?: 'similar' | 'complementary' | 'trending';
  /** Include skills filter */
  skills?: string[];
}

export interface ProfileRecommendation {
  /** Recommended profile */
  profile: AgentProfile;
  /** Recommendation score (0-100) */
  score: number;
  /** Reason for recommendation */
  reason: string;
  /** Common skills */
  commonSkills: string[];
  /** Similarity factors */
  factors: {
    skillMatch: number;
    reputationSimilarity: number;
    activitySimilarity: number;
  };
}

export interface UseProfileRecommendationsResult {
  /** Recommendations list */
  recommendations: ProfileRecommendation[];
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Refetch function */
  refetch: () => Promise<void>;
  /** Refresh recommendations (clears cache) */
  refresh: () => Promise<void>;
}

/**
 * Hook to get agent profile recommendations
 * 
 * @example
 * ```tsx
 * const { recommendations } = useProfileRecommendations({ 
 *   limit: 10, 
 *   type: 'similar' 
 * });
 * 
 * return (
 *   <RecommendationList items={recommendations} />
 * );
 * ```
 */
export function useProfileRecommendations(options: UseProfileRecommendationsOptions = {}): UseProfileRecommendationsResult {
  const { agentId, limit = 5, type = 'similar', skills } = options;
  const [recommendations, setRecommendations] = useState<ProfileRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const cacheRef = useRef<Map<string, ProfileRecommendation[]>>(new Map());

  const fetchRecommendations = useCallback(async (skipCache = false) => {
    try {
      setIsLoading(true);
      setError(null);

      const targetAgentId = agentId || 'me';
      const cacheKey = `${targetAgentId}:${type}:${limit}`;
      
      // Check cache
      if (!skipCache && cacheRef.current.has(cacheKey)) {
        setRecommendations(cacheRef.current.get(cacheKey)!);
        setIsLoading(false);
        return;
      }

      const manager = getGlobalManager();
      
      // Get base profile
      const baseProfile = targetAgentId === 'me' 
        ? await manager.getMyProfile()
        : await manager.getProfile(targetAgentId);

      // Search for candidates based on skills
      const searchQuery = skills?.join(' ') || baseProfile.skills?.slice(0, 3).join(' ') || '';
      const candidates = await manager.searchProfiles(searchQuery, limit * 3);
      
      // Filter out self and calculate scores
      const scored = candidates
        .filter(p => p.id !== baseProfile.id)
        .slice(0, limit * 2)
        .map(profile => {
          const baseSkills = new Set(baseProfile.skills || []);
          const profileSkills = new Set(profile.skills || []);
          const commonSkills = [...baseSkills].filter(s => profileSkills.has(s));
          
          const skillMatch = commonSkills.length / Math.max(baseSkills.size, profileSkills.size, 1);
          const reputationDiff = Math.abs(baseProfile.reputation - profile.reputation);
          const reputationSimilarity = Math.max(0, 1 - reputationDiff / 100);
          
          const baseActivity = baseProfile.tasksCompleted;
          const profileActivity = profile.tasksCompleted;
          const activityDiff = Math.abs(baseActivity - profileActivity);
          const activitySimilarity = Math.max(0, 1 - activityDiff / Math.max(baseActivity, profileActivity, 1));
          
          let score = 0;
          let reason = '';
          
          switch (type) {
            case 'similar':
              score = (skillMatch * 0.5 + reputationSimilarity * 0.3 + activitySimilarity * 0.2) * 100;
              reason = commonSkills.length > 0 
                ? `Similar skills: ${commonSkills.slice(0, 3).join(', ')}`
                : 'Similar activity level';
              break;
            case 'complementary':
              score = ((1 - skillMatch) * 0.5 + reputationSimilarity * 0.3 + activitySimilarity * 0.2) * 100;
              reason = 'Complementary skill set';
              break;
            case 'trending':
              score = (profile.reputation + profile.tasksCompleted / 10) / 2;
              score = Math.min(100, score);
              reason = 'Trending agent this week';
              break;
          }
          
          return {
            profile,
            score,
            reason,
            commonSkills,
            factors: {
              skillMatch: skillMatch * 100,
              reputationSimilarity: reputationSimilarity * 100,
              activitySimilarity: activitySimilarity * 100,
            },
          };
        });
      
      // Sort by score and take top limit
      const sorted = scored.sort((a, b) => b.score - a.score).slice(0, limit);
      
      // Cache results
      cacheRef.current.set(cacheKey, sorted);
      setRecommendations(sorted);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to get recommendations'));
    } finally {
      setIsLoading(false);
    }
  }, [agentId, limit, type, skills]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const refetch = useCallback(() => fetchRecommendations(false), [fetchRecommendations]);
  const refresh = useCallback(() => fetchRecommendations(true), [fetchRecommendations]);

  return {
    recommendations,
    isLoading,
    error,
    refetch,
    refresh,
  };
}

// ============================================================================
// Re-exports from profile.js for convenience
// ============================================================================

export {
  calculateLevel,
  xpForNextLevel,
  levelProgress,
  getTierColor,
  getDefaultAchievements,
  type AgentProfile,
  type Achievement,
  type ProfileStats,
  type UpdateProfileRequest,
  type ReputationHistoryEntry,
  type ProfileCompleteness,
  type AvatarUploadResult,
};

// Default export
export default {
  useProfile,
  useMyProfile,
  useUpdateProfile,
  useProfileStats,
  useAchievements,
  useReputationHistory,
  useSearchProfiles,
  useLeaderboard,
  useProfileCompleteness,
  useUploadAvatar,
  useLevelProgress,
  useBatchProfiles,
  useProfileCache,
  useProfileRealtime,
  useAchievementProgress,
  useProfileSearch,
  useProfileComparison,
  useProfileRecommendations,
  initializeProfileManager,
  setGlobalAuthToken,
  getGlobalAuthToken,
};
