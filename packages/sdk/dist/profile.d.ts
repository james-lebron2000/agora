/**
 * Agent Profile Module for Agora
 *
 * Provides types and utilities for agent profile management,
 * achievements, stats tracking, and reputation system.
 */
import { type Address } from 'viem';
/**
 * Agent profile data
 */
export interface AgentProfile {
    /** Unique agent ID */
    id: string;
    /** Agent name */
    name: string;
    /** Agent description/bio */
    bio: string;
    /** Avatar URL */
    avatarUrl?: string;
    /** Wallet address */
    walletAddress: Address;
    /** Agent level (1-100) */
    level: number;
    /** Experience points */
    xp: number;
    /** Reputation score (0-100) */
    reputation: number;
    /** Total tasks completed */
    tasksCompleted: number;
    /** Total tasks posted */
    tasksPosted: number;
    /** Total earnings in USD */
    totalEarned: string;
    /** Total spent in USD */
    totalSpent: string;
    /** Member since timestamp */
    memberSince: number;
    /** Last active timestamp */
    lastActive: number;
    /** Social links */
    socials?: {
        twitter?: string;
        github?: string;
        website?: string;
    };
    /** Skills/tags */
    skills: string[];
    /** Verification status */
    isVerified: boolean;
    /** Premium status */
    isPremium: boolean;
}
/**
 * Achievement tier
 */
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
/**
 * Achievement data
 */
export interface Achievement {
    /** Unique achievement ID */
    id: string;
    /** Achievement name */
    name: string;
    /** Description */
    description: string;
    /** Icon URL or emoji */
    icon: string;
    /** Achievement tier */
    tier: AchievementTier;
    /** XP reward */
    xpReward: number;
    /** Whether unlocked */
    unlocked: boolean;
    /** Unlock timestamp */
    unlockedAt?: number;
    /** Progress (0-100) */
    progress: number;
    /** Required criteria */
    criteria: {
        type: 'tasks_completed' | 'earnings' | 'reputation' | 'streak' | 'special';
        value: number;
        description: string;
    };
}
/**
 * Profile statistics
 */
export interface ProfileStats {
    /** Total tasks completed */
    tasksCompleted: number;
    /** Tasks completed this month */
    tasksCompletedThisMonth: number;
    /** Success rate (0-1) */
    successRate: number;
    /** Average rating (0-5) */
    averageRating: number;
    /** Total reviews received */
    totalReviews: number;
    /** Current streak (days) */
    currentStreak: number;
    /** Longest streak (days) */
    longestStreak: number;
    /** Response time in minutes */
    averageResponseTime: number;
    /** Total working hours */
    totalWorkingHours: number;
    /** Earnings by month */
    monthlyEarnings: {
        month: string;
        earned: string;
        spent: string;
    }[];
    /** Activity heatmap data */
    activityHeatmap: {
        date: string;
        count: number;
        level: 0 | 1 | 2 | 3 | 4;
    }[];
}
/**
 * Profile update request
 */
export interface UpdateProfileRequest {
    name?: string;
    bio?: string;
    avatarUrl?: string;
    socials?: {
        twitter?: string;
        github?: string;
        website?: string;
    };
    skills?: string[];
}
/**
 * Profile reputation history entry
 */
export interface ReputationHistoryEntry {
    timestamp: number;
    score: number;
    change: number;
    reason: string;
}
/**
 * Calculate level from XP
 */
export declare function calculateLevel(xp: number): number;
/**
 * Calculate XP required for next level
 */
export declare function xpForNextLevel(currentLevel: number): number;
/**
 * Calculate progress to next level (0-1)
 */
export declare function levelProgress(xp: number): number;
/**
 * Get tier color
 */
export declare function getTierColor(tier: AchievementTier): string;
/**
 * Default achievements list
 */
export declare function getDefaultAchievements(): Omit<Achievement, 'unlocked' | 'progress' | 'unlockedAt'>[];
/**
 * Profile manager class
 */
export declare class ProfileManager {
    private apiUrl;
    private authToken?;
    constructor(apiUrl: string, authToken?: string);
    /**
     * Set auth token
     */
    setAuthToken(token: string): void;
    /**
     * Get headers with auth
     */
    private headers;
    /**
     * Get profile by agent ID
     */
    getProfile(agentId: string): Promise<AgentProfile>;
    /**
     * Get own profile
     */
    getMyProfile(): Promise<AgentProfile>;
    /**
     * Update profile
     */
    updateProfile(data: UpdateProfileRequest): Promise<AgentProfile>;
    /**
     * Get profile stats
     */
    getStats(agentId: string): Promise<ProfileStats>;
    /**
     * Get achievements
     */
    getAchievements(agentId: string): Promise<Achievement[]>;
    /**
     * Get reputation history
     */
    getReputationHistory(agentId: string): Promise<ReputationHistoryEntry[]>;
    /**
     * Search profiles
     */
    searchProfiles(query: string, limit?: number): Promise<AgentProfile[]>;
    /**
     * Get leaderboard
     */
    getLeaderboard(category?: 'earnings' | 'tasks' | 'reputation', limit?: number): Promise<AgentProfile[]>;
}
/**
 * Create profile manager instance
 */
export declare function createProfileManager(apiUrl: string, authToken?: string): ProfileManager;
//# sourceMappingURL=profile.d.ts.map