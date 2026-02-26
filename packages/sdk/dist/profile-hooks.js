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
import { ProfileManager, batchGetProfiles, checkProfileCompleteness, uploadAvatar, createOptimisticProfileUpdate, saveProfileToLocalStorage, loadProfileFromLocalStorage, getProfileCache, calculateLevel, xpForNextLevel, levelProgress, getTierColor, getDefaultAchievements, } from './profile.js';
// ============================================================================
// Simple Provider Pattern (without React Context API for zero-dependency)
// ============================================================================
let globalManager = null;
let globalAuthToken = null;
let globalApiUrl = '';
/** Initialize the profile manager globally */
export function initializeProfileManager(apiUrl, authToken) {
    globalApiUrl = apiUrl;
    globalAuthToken = authToken || null;
    globalManager = new ProfileManager(apiUrl, authToken);
}
/** Get the global profile manager instance */
export function getGlobalManager() {
    if (!globalManager) {
        throw new Error('Profile manager not initialized. Call initializeProfileManager first.');
    }
    return globalManager;
}
/** Update auth token globally */
export function setGlobalAuthToken(token) {
    globalAuthToken = token;
    if (globalManager) {
        globalManager.setAuthToken(token || '');
    }
}
/** Get current auth token */
export function getGlobalAuthToken() {
    return globalAuthToken;
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
export function useProfile(agentId, options = {}) {
    const { refreshInterval = 30000, enabled = true } = options;
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(enabled);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const intervalRef = useRef(null);
    const fetchProfile = useCallback(async () => {
        if (!agentId)
            return;
        try {
            setIsLoading(true);
            setError(null);
            const manager = getGlobalManager();
            const data = await manager.getProfile(agentId);
            setProfile(data);
            setLastUpdated(Date.now());
            // Cache to localStorage for offline access
            saveProfileToLocalStorage(data);
        }
        catch (err) {
            // Try to load from localStorage fallback
            const cached = loadProfileFromLocalStorage(agentId);
            if (cached) {
                setProfile(cached);
                setLastUpdated(Date.now());
            }
            else {
                setError(err instanceof Error ? err : new Error('Failed to fetch profile'));
            }
        }
        finally {
            setIsLoading(false);
        }
    }, [agentId]);
    const refetch = useCallback(async () => {
        await fetchProfile();
    }, [fetchProfile]);
    useEffect(() => {
        if (!enabled)
            return;
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
export function useMyProfile(options = {}) {
    const [profileId, setProfileId] = useState('me');
    const { profile, isLoading, error, refetch, lastUpdated } = useProfile(profileId, {
        ...options,
        enabled: options.enabled !== false && !!getGlobalAuthToken(),
    });
    const updateLocal = useCallback((updates) => {
        if (!profile)
            return;
        const optimistic = createOptimisticProfileUpdate(profile, updates);
        // Apply optimistic update immediately
        Object.assign(profile, optimistic.updated);
        // Store to localStorage
        saveProfileToLocalStorage(profile);
    }, [profile]);
    return { profile, isLoading, error, refetch, lastUpdated, updateLocal };
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
export function useUpdateProfile() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const rollbackRef = useRef(null);
    const update = useCallback(async (data) => {
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
        }
        catch (err) {
            // Rollback on error
            if (rollbackRef.current) {
                rollbackRef.current();
            }
            throw err instanceof Error ? err : new Error('Update failed');
        }
        finally {
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
export function useProfileStats(agentId) {
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const fetchStats = useCallback(async () => {
        if (!agentId)
            return;
        try {
            setIsLoading(true);
            setError(null);
            const manager = getGlobalManager();
            const data = await manager.getStats(agentId);
            setStats(data);
        }
        catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch stats'));
        }
        finally {
            setIsLoading(false);
        }
    }, [agentId]);
    useEffect(() => {
        fetchStats();
    }, [fetchStats]);
    return { stats, isLoading, error, refetch: fetchStats };
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
export function useAchievements(agentId) {
    const [achievements, setAchievements] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const fetchAchievements = useCallback(async () => {
        if (!agentId)
            return;
        try {
            setIsLoading(true);
            setError(null);
            const manager = getGlobalManager();
            const data = await manager.getAchievements(agentId);
            setAchievements(data);
        }
        catch (err) {
            // Fallback to default achievements on error
            const defaults = getDefaultAchievements().map(a => ({
                ...a,
                unlocked: false,
                progress: 0,
            }));
            setAchievements(defaults);
            setError(err instanceof Error ? err : new Error('Failed to fetch achievements'));
        }
        finally {
            setIsLoading(false);
        }
    }, [agentId]);
    useEffect(() => {
        fetchAchievements();
    }, [fetchAchievements]);
    const progressPercent = useMemo(() => {
        if (achievements.length === 0)
            return 0;
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
export function useReputationHistory(agentId) {
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const fetchHistory = useCallback(async () => {
        if (!agentId)
            return;
        try {
            setIsLoading(true);
            setError(null);
            const manager = getGlobalManager();
            const data = await manager.getReputationHistory(agentId);
            setHistory(data);
        }
        catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch reputation history'));
        }
        finally {
            setIsLoading(false);
        }
    }, [agentId]);
    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);
    const trend = useMemo(() => {
        if (history.length < 2)
            return 'stable';
        const recent = history.slice(-7);
        const first = recent[0]?.score || 0;
        const last = recent[recent.length - 1]?.score || 0;
        const diff = last - first;
        if (diff > 5)
            return 'up';
        if (diff < -5)
            return 'down';
        return 'stable';
    }, [history]);
    return { history, isLoading, error, refetch: fetchHistory, trend };
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
export function useSearchProfiles(options) {
    const { query, debounceMs = 300, limit = 20 } = options;
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const timeoutRef = useRef(null);
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
            }
            catch (err) {
                setError(err instanceof Error ? err : new Error('Search failed'));
            }
            finally {
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
export function useLeaderboard(options = {}) {
    const { category = 'reputation', limit = 100, refreshInterval = 60000 } = options;
    const [leaderboard, setLeaderboard] = useState([]);
    const [myRank, setMyRank] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const intervalRef = useRef(null);
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
        }
        catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch leaderboard'));
        }
        finally {
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
export function useProfileCompleteness(profile) {
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
export function useUploadAvatar() {
    const [progress, setProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);
    const upload = useCallback(async (file) => {
        setIsUploading(true);
        setError(null);
        setProgress(0);
        try {
            const token = getGlobalAuthToken();
            if (!token) {
                throw new Error('Authentication required');
            }
            const result = await uploadAvatar(globalApiUrl, file, token, (percent) => setProgress(percent));
            if (!result.success || !result.url) {
                throw new Error(result.error || 'Upload failed');
            }
            setProgress(100);
            return result.url;
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error('Upload failed');
            setError(error);
            throw error;
        }
        finally {
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
export function useLevelProgress(xp, tier) {
    return useMemo(() => {
        const level = calculateLevel(xp);
        const nextLevelXp = xpForNextLevel(level);
        const currentLevelBaseXp = (level - 1) * (level - 1) * 100;
        const currentLevelXp = xp - currentLevelBaseXp;
        const xpToNextLevel = nextLevelXp - currentLevelBaseXp;
        const progress = levelProgress(xp);
        const tierColor = getTierColor(tier || 'bronze');
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
export function useBatchProfiles(agentIds) {
    const [profiles, setProfiles] = useState(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
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
        }
        catch (err) {
            setError(err instanceof Error ? err : new Error('Batch fetch failed'));
        }
        finally {
            setIsLoading(false);
        }
    }, [agentIds.join(',')]);
    useEffect(() => {
        fetchBatch();
    }, [fetchBatch]);
    const getProfile = useCallback((agentId) => {
        return profiles.get(agentId);
    }, [profiles]);
    return { profiles, isLoading, error, refetch: fetchBatch, getProfile };
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
export function useProfileCache() {
    const cache = useMemo(() => getProfileCache(), []);
    const get = useCallback((key) => cache.get(key), [cache]);
    const set = useCallback((key, data, ttlMs) => {
        cache.set(key, data, ttlMs);
    }, [cache]);
    const has = useCallback((key) => cache.has(key), [cache]);
    const invalidate = useCallback((pattern) => {
        cache.invalidate(pattern);
    }, [cache]);
    const clear = useCallback(() => cache.clear(), [cache]);
    return { get, set, has, invalidate, clear };
}
// ============================================================================
// Re-exports from profile.js for convenience
// ============================================================================
export { calculateLevel, xpForNextLevel, levelProgress, getTierColor, getDefaultAchievements, };
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
    initializeProfileManager,
    setGlobalAuthToken,
    getGlobalAuthToken,
};
//# sourceMappingURL=profile-hooks.js.map