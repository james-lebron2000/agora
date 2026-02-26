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
  /** Completion timestamp (alias for unlockedAt) */
  completedAt?: number;
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
  if (xp < 0) return 1;
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
  if (xp < 0) return 0;
  const currentLevel = calculateLevel(xp);
  const currentLevelBaseXp = (currentLevel - 1) * (currentLevel - 1) * 100;
  const nextLevelXp = currentLevel * currentLevel * 100;
  const xpInLevel = xp - currentLevelBaseXp;
  const xpNeeded = nextLevelXp - currentLevelBaseXp;
  if (xpNeeded <= 0) return 1;
  return Math.min(1, Math.max(0, xpInLevel / xpNeeded));
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
    return response.json() as Promise<AgentProfile>;
  }

  /**
   * Get own profile
   */
  async getMyProfile(): Promise<AgentProfile> {
    const response = await fetch(`${this.apiUrl}/profiles/me`, {
      headers: this.headers(),
    });
    if (!response.ok) throw new Error(`Failed to get profile: ${response.statusText}`);
    return response.json() as Promise<AgentProfile>;
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
    return response.json() as Promise<AgentProfile>;
  }

  /**
   * Get profile stats
   */
  async getStats(agentId: string): Promise<ProfileStats> {
    const response = await fetch(`${this.apiUrl}/profiles/${agentId}/stats`, {
      headers: this.headers(),
    });
    if (!response.ok) throw new Error(`Failed to get stats: ${response.statusText}`);
    return response.json() as Promise<ProfileStats>;
  }

  /**
   * Get achievements
   */
  async getAchievements(agentId: string): Promise<Achievement[]> {
    const response = await fetch(`${this.apiUrl}/profiles/${agentId}/achievements`, {
      headers: this.headers(),
    });
    if (!response.ok) throw new Error(`Failed to get achievements: ${response.statusText}`);
    return response.json() as Promise<Achievement[]>;
  }

  /**
   * Get reputation history
   */
  async getReputationHistory(agentId: string): Promise<ReputationHistoryEntry[]> {
    const response = await fetch(`${this.apiUrl}/profiles/${agentId}/reputation`, {
      headers: this.headers(),
    });
    if (!response.ok) throw new Error(`Failed to get reputation: ${response.statusText}`);
    return response.json() as Promise<ReputationHistoryEntry[]>;
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
    return response.json() as Promise<AgentProfile[]>;
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
    return response.json() as Promise<AgentProfile[]>;
  }
}

/**
 * Create profile manager instance
 */
export function createProfileManager(apiUrl: string, authToken?: string): ProfileManager {
  return new ProfileManager(apiUrl, authToken);
}

// ============================================================================
// Frontend Optimizations - Added in v1.1
// ============================================================================

/**
 * Cache entry with TTL
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Simple client-side cache manager for profile data
 */
export class ProfileCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private static instance: ProfileCache;

  static getInstance(): ProfileCache {
    if (!ProfileCache.instance) {
      ProfileCache.instance = new ProfileCache();
    }
    return ProfileCache.instance;
  }

  /**
   * Set cached data with TTL (default: 5 minutes)
   */
  set<T>(key: string, data: T, ttlMs = 5 * 60 * 1000): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
  }

  /**
   * Get cached data if not expired
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.data as T;
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Invalidate cache by pattern
   */
  invalidate(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) this.cache.delete(key);
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }
}

/**
 * Get singleton cache instance
 */
export function getProfileCache(): ProfileCache {
  return ProfileCache.getInstance();
}

/**
 * Batch fetch multiple profiles efficiently
 */
export async function batchGetProfiles(
  apiUrl: string,
  agentIds: string[],
  authToken?: string
): Promise<Map<string, AgentProfile>> {
  const cache = ProfileCache.getInstance();
  const result = new Map<string, AgentProfile>();
  const toFetch: string[] = [];

  // Check cache first
  for (const id of agentIds) {
    const cached = cache.get<AgentProfile>(`profile:${id}`);
    if (cached) {
      result.set(id, cached);
    } else {
      toFetch.push(id);
    }
  }

  if (toFetch.length === 0) return result;

  // Fetch missing profiles in batch
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const response = await fetch(`${apiUrl}/profiles/batch`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ids: toFetch }),
  });

  if (!response.ok) throw new Error(`Batch fetch failed: ${response.statusText}`);

  const profiles = await response.json() as AgentProfile[];
  for (const profile of profiles) {
    cache.set(`profile:${profile.id}`, profile);
    result.set(profile.id, profile);
  }

  return result;
}

/**
 * Profile completeness check result
 */
export interface ProfileCompleteness {
  score: number; // 0-100
  missing: string[];
  suggestions: string[];
}

/**
 * Check profile completeness and provide suggestions
 */
export function checkProfileCompleteness(profile: AgentProfile): ProfileCompleteness {
  const missing: string[] = [];
  const suggestions: string[] = [];

  if (!profile.bio || profile.bio.length < 20) {
    missing.push('bio');
    suggestions.push('Add a detailed bio (at least 20 characters)');
  }
  if (!profile.avatarUrl) {
    missing.push('avatar');
    suggestions.push('Upload a profile avatar');
  }
  if (!profile.skills || profile.skills.length === 0) {
    missing.push('skills');
    suggestions.push('Add at least 3 skills');
  }
  if (!profile.socials?.twitter && !profile.socials?.github) {
    missing.push('socials');
    suggestions.push('Connect at least one social account');
  }

  const totalFields = 4;
  const completedFields = totalFields - missing.length;
  const score = Math.round((completedFields / totalFields) * 100);

  return { score, missing, suggestions };
}

/**
 * Save profile to localStorage for offline access
 */
export function saveProfileToLocalStorage(profile: AgentProfile): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(`agora:profile:${profile.id}`, JSON.stringify({
    profile,
    savedAt: Date.now(),
  }));
}

// DOM type declarations for non-DOM environments
interface Storage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
declare const localStorage: Storage | undefined;

/**
 * Load profile from localStorage
 */
export function loadProfileFromLocalStorage(agentId: string): AgentProfile | null {
  if (typeof localStorage === 'undefined') return null;
  const data = localStorage.getItem(`agora:profile:${agentId}`);
  if (!data) return null;
  try {
    const parsed = JSON.parse(data);
    // Check if data is not too old (7 days)
    if (Date.now() - parsed.savedAt > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(`agora:profile:${agentId}`);
      return null;
    }
    return parsed.profile as AgentProfile;
  } catch {
    return null;
  }
}

/**
 * Clear cached profile from localStorage
 */
export function clearProfileFromLocalStorage(agentId: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(`agora:profile:${agentId}`);
}

/**
 * Profile update with optimistic update support
 */
export interface OptimisticUpdate<T> {
  previous: T;
  updated: T;
  rollback: () => void;
}

/**
 * Create optimistic update for profile
 */
export function createOptimisticProfileUpdate(
  profile: AgentProfile,
  updates: Partial<AgentProfile>
): OptimisticUpdate<AgentProfile> {
  const previous = { ...profile };
  const updated = { ...profile, ...updates };

  return {
    previous,
    updated,
    rollback: () => Object.assign(profile, previous),
  };
}

/**
 * Avatar upload result
 */
export interface AvatarUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload avatar with progress tracking
 */
export async function uploadAvatar(
  apiUrl: string,
  file: File,
  authToken: string,
  onProgress?: (percent: number) => void
): Promise<AvatarUploadResult> {
  // Use native fetch with a workaround for progress tracking
  // In browser environments, XMLHttpRequest is available
  if (typeof XMLHttpRequest === 'undefined') {
    // Fallback for Node.js - just use fetch without progress
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await fetch(`${apiUrl}/profiles/avatar`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` },
      body: formData,
    });
    
    if (!response.ok) {
      return { success: false, error: response.statusText };
    }
    
    const data = await response.json() as { url: string };
    return { success: true, url: data.url };
  }

  // Browser environment with XMLHttpRequest
  const formData = new FormData();
  formData.append('avatar', file);

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event: ProgressEvent) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        resolve({ success: true, url: response.url });
      } else {
        resolve({ success: false, error: xhr.statusText });
      }
    };

    xhr.onerror = () => resolve({ success: false, error: 'Upload failed' });

    xhr.open('POST', `${apiUrl}/profiles/avatar`);
    xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
    xhr.send(formData);
  });
}

// XMLHttpRequest type declaration for TypeScript
declare const XMLHttpRequest: {
  new (): {
    upload: { onprogress: ((event: ProgressEvent) => void) | null };
    onload: (() => void) | null;
    onerror: (() => void) | null;
    status: number;
    responseText: string;
    statusText: string;
    open(method: string, url: string): void;
    setRequestHeader(header: string, value: string): void;
    send(body: FormData): void;
  };
};

interface ProgressEvent {
  lengthComputable: boolean;
  loaded: number;
  total: number;
}

/**
 * React Hook types for profile management
 */
export interface UseProfileOptions {
  cache?: boolean;
  cacheTtl?: number;
  refreshInterval?: number;
}

// Note: React hooks implementation should be in a separate file (profile-hooks.ts)
// to avoid React dependency in the core SDK
