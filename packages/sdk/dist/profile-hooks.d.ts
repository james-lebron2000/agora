/**
 * React Hooks for Agora Agent Profile Module
 *
 * Provides React Query-based hooks for profile data fetching,
 * mutations, and caching. Separated from core SDK to avoid
 * React dependency in the base package.
 *
 * @module profile-hooks
 */
import { ProfileManager, calculateLevel, xpForNextLevel, levelProgress, getTierColor, getDefaultAchievements, type AgentProfile, type Achievement, type ProfileStats, type UpdateProfileRequest, type ReputationHistoryEntry, type ProfileCompleteness, type AvatarUploadResult } from './profile.js';
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
/** Initialize the profile manager globally */
export declare function initializeProfileManager(apiUrl: string, authToken?: string): void;
/** Get the global profile manager instance */
export declare function getGlobalManager(): ProfileManager;
/** Update auth token globally */
export declare function setGlobalAuthToken(token: string | null): void;
/** Get current auth token */
export declare function getGlobalAuthToken(): string | null;
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
export declare function useProfile(agentId: string, options?: UseProfileOptions): UseProfileResult;
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
export declare function useMyProfile(options?: UseProfileOptions): UseMyProfileResult;
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
export declare function useUpdateProfile(): UseUpdateProfileResult;
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
export declare function useProfileStats(agentId: string): UseProfileStatsResult;
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
export declare function useAchievements(agentId: string): UseAchievementsResult;
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
export declare function useReputationHistory(agentId: string): UseReputationHistoryResult;
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
export declare function useSearchProfiles(options: UseSearchProfilesOptions): UseSearchProfilesResult;
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
export declare function useLeaderboard(options?: UseLeaderboardOptions): UseLeaderboardResult;
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
export declare function useProfileCompleteness(profile: AgentProfile | null): UseProfileCompletenessResult;
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
export declare function useUploadAvatar(): UseUploadAvatarResult;
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
export declare function useLevelProgress(xp: number, tier?: string): UseLevelProgressResult;
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
export declare function useBatchProfiles(agentIds: string[]): UseBatchProfilesResult;
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
export declare function useProfileCache(): UseProfileCacheResult;
export { calculateLevel, xpForNextLevel, levelProgress, getTierColor, getDefaultAchievements, type AgentProfile, type Achievement, type ProfileStats, type UpdateProfileRequest, type ReputationHistoryEntry, type ProfileCompleteness, type AvatarUploadResult, };
declare const _default: {
    useProfile: typeof useProfile;
    useMyProfile: typeof useMyProfile;
    useUpdateProfile: typeof useUpdateProfile;
    useProfileStats: typeof useProfileStats;
    useAchievements: typeof useAchievements;
    useReputationHistory: typeof useReputationHistory;
    useSearchProfiles: typeof useSearchProfiles;
    useLeaderboard: typeof useLeaderboard;
    useProfileCompleteness: typeof useProfileCompleteness;
    useUploadAvatar: typeof useUploadAvatar;
    useLevelProgress: typeof useLevelProgress;
    useBatchProfiles: typeof useBatchProfiles;
    useProfileCache: typeof useProfileCache;
    initializeProfileManager: typeof initializeProfileManager;
    setGlobalAuthToken: typeof setGlobalAuthToken;
    getGlobalAuthToken: typeof getGlobalAuthToken;
};
export default _default;
//# sourceMappingURL=profile-hooks.d.ts.map