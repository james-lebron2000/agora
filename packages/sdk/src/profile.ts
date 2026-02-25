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
export function calculateLevel(xp: number): number {
  // Level formula: level = floor(sqrt(xp / 100)) + 1
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

/**
 * Calculate XP required for next level
 */
export function xpForNextLevel(currentLevel: number): number {
  return currentLevel * currentLevel * 100;
}

/**
 * Calculate progress to next level (0-1)
 */
export function levelProgress(xp: number): number {
  const currentLevel = calculateLevel(xp);
  const currentLevelBaseXp = (currentLevel - 1) * (currentLevel - 1) * 100;
  const nextLevelXp = currentLevel * currentLevel * 100;
  const xpInLevel = xp - currentLevelBaseXp;
  const xpNeeded = nextLevelXp - currentLevelBaseXp;
  return Math.min(1, xpInLevel / xpNeeded);
}

/**
 * Get tier color
 */
export function getTierColor(tier: AchievementTier): string {
  const colors: Record<AchievementTier, string> = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2',
    diamond: '#B9F2FF',
  };
  return colors[tier];
}

/**
 * Default achievements list
 */
export function getDefaultAchievements(): Omit<Achievement, 'unlocked' | 'progress' | 'unlockedAt'>[] {
  return [
    {
      id: 'first_task',
      name: 'First Steps',
      description: 'Complete your first task',
      icon: '🎯',
      tier: 'bronze',
      xpReward: 50,
      criteria: { type: 'tasks_completed', value: 1, description: 'Complete 1 task' },
    },
    {
      id: 'task_master_10',
      name: 'Task Master',
      description: 'Complete 10 tasks',
      icon: '🏆',
      tier: 'silver',
      xpReward: 200,
      criteria: { type: 'tasks_completed', value: 10, description: 'Complete 10 tasks' },
    },
    {
      id: 'task_legend_100',
      name: 'Task Legend',
      description: 'Complete 100 tasks',
      icon: '👑',
      tier: 'gold',
      xpReward: 1000,
      criteria: { type: 'tasks_completed', value: 100, description: 'Complete 100 tasks' },
    },
    {
      id: 'earnings_1k',
      name: 'First $1K',
      description: 'Earn $1,000 total',
      icon: '💰',
      tier: 'silver',
      xpReward: 300,
      criteria: { type: 'earnings', value: 1000, description: 'Earn $1,000' },
    },
    {
      id: 'earnings_10k',
      name: 'High Earner',
      description: 'Earn $10,000 total',
      icon: '💎',
      tier: 'gold',
      xpReward: 1000,
      criteria: { type: 'earnings', value: 10000, description: 'Earn $10,000' },
    },
    {
      id: 'reputation_50',
      name: 'Trusted Agent',
      description: 'Reach 50 reputation score',
      icon: '🤝',
      tier: 'silver',
      xpReward: 250,
      criteria: { type: 'reputation', value: 50, description: '50 reputation' },
    },
    {
      id: 'reputation_90',
      name: 'Elite Agent',
      description: 'Reach 90 reputation score',
      icon: '⭐',
      tier: 'platinum',
      xpReward: 1000,
      criteria: { type: 'reputation', value: 90, description: '90 reputation' },
    },
    {
      id: 'streak_7',
      name: 'Week Warrior',
      description: '7-day activity streak',
      icon: '🔥',
      tier: 'bronze',
      xpReward: 100,
      criteria: { type: 'streak', value: 7, description: '7-day streak' },
    },
    {
      id: 'streak_30',
      name: 'Monthly Master',
      description: '30-day activity streak',
      icon: '📅',
      tier: 'gold',
      xpReward: 500,
      criteria: { type: 'streak', value: 30, description: '30-day streak' },
    },
    {
      id: 'early_adopter',
      name: 'Early Adopter',
      description: 'Joined during beta phase',
      icon: '🚀',
      tier: 'platinum',
      xpReward: 500,
      criteria: { type: 'special', value: 1, description: 'Beta participant' },
    },
  ];
}

/**
 * Profile manager class
 */
export class ProfileManager {
  private apiUrl: string;
  private authToken?: string;

  constructor(apiUrl: string, authToken?: string) {
    this.apiUrl = apiUrl;
    this.authToken = authToken;
  }

  /**
   * Set auth token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Get headers with auth
   */
  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    return headers;
  }

  /**
   * Get profile by agent ID
   */
  async getProfile(agentId: string): Promise<AgentProfile> {
    const response = await fetch(`${this.apiUrl}/profiles/${agentId}`, {
      headers: this.headers(),
    });
    if (!response.ok) throw new Error(`Failed to get profile: ${response.statusText}`);
    return response.json();
  }

  /**
   * Get own profile
   */
  async getMyProfile(): Promise<AgentProfile> {
    const response = await fetch(`${this.apiUrl}/profiles/me`, {
      headers: this.headers(),
    });
    if (!response.ok) throw new Error(`Failed to get profile: ${response.statusText}`);
    return response.json();
  }

  /**
   * Update profile
   */
  async updateProfile(data: UpdateProfileRequest): Promise<AgentProfile> {
    const response = await fetch(`${this.apiUrl}/profiles/me`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`Failed to update profile: ${response.statusText}`);
    return response.json();
  }

  /**
   * Get profile stats
   */
  async getStats(agentId: string): Promise<ProfileStats> {
    const response = await fetch(`${this.apiUrl}/profiles/${agentId}/stats`, {
      headers: this.headers(),
    });
    if (!response.ok) throw new Error(`Failed to get stats: ${response.statusText}`);
    return response.json();
  }

  /**
   * Get achievements
   */
  async getAchievements(agentId: string): Promise<Achievement[]> {
    const response = await fetch(`${this.apiUrl}/profiles/${agentId}/achievements`, {
      headers: this.headers(),
    });
    if (!response.ok) throw new Error(`Failed to get achievements: ${response.statusText}`);
    return response.json();
  }

  /**
   * Get reputation history
   */
  async getReputationHistory(agentId: string): Promise<ReputationHistoryEntry[]> {
    const response = await fetch(`${this.apiUrl}/profiles/${agentId}/reputation`, {
      headers: this.headers(),
    });
    if (!response.ok) throw new Error(`Failed to get reputation: ${response.statusText}`);
    return response.json();
  }

  /**
   * Search profiles
   */
  async searchProfiles(query: string, limit = 20): Promise<AgentProfile[]> {
    const response = await fetch(
      `${this.apiUrl}/profiles/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      { headers: this.headers() }
    );
    if (!response.ok) throw new Error(`Failed to search profiles: ${response.statusText}`);
    return response.json();
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(category: 'earnings' | 'tasks' | 'reputation' = 'reputation', limit = 100): Promise<AgentProfile[]> {
    const response = await fetch(
      `${this.apiUrl}/profiles/leaderboard?category=${category}&limit=${limit}`,
      { headers: this.headers() }
    );
    if (!response.ok) throw new Error(`Failed to get leaderboard: ${response.statusText}`);
    return response.json();
  }
}

/**
 * Create profile manager instance
 */
export function createProfileManager(apiUrl: string, authToken?: string): ProfileManager {
  return new ProfileManager(apiUrl, authToken);
}
