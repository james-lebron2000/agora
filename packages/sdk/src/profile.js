/**
 * Agent Profile Module for Agora
 *
 * Provides types and utilities for agent profile management,
 * achievements, stats tracking, and reputation system.
 */
/**
 * Calculate level from XP
 */
export function calculateLevel(xp) {
    if (xp < 0)
        return 1;
    // Level formula: level = floor(sqrt(xp / 100)) + 1
    return Math.floor(Math.sqrt(xp / 100)) + 1;
}
/**
 * Calculate XP required for next level
 */
export function xpForNextLevel(currentLevel) {
    return currentLevel * currentLevel * 100;
}
/**
 * Calculate progress to next level (0-1)
 */
export function levelProgress(xp) {
    if (xp < 0)
        return 0;
    const currentLevel = calculateLevel(xp);
    const currentLevelBaseXp = (currentLevel - 1) * (currentLevel - 1) * 100;
    const nextLevelXp = currentLevel * currentLevel * 100;
    const xpInLevel = xp - currentLevelBaseXp;
    const xpNeeded = nextLevelXp - currentLevelBaseXp;
    if (xpNeeded <= 0)
        return 1;
    return Math.min(1, Math.max(0, xpInLevel / xpNeeded));
}
/**
 * Get tier color
 */
export function getTierColor(tier) {
    const colors = {
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
export function getDefaultAchievements() {
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
    apiUrl;
    authToken;
    constructor(apiUrl, authToken) {
        this.apiUrl = apiUrl;
        this.authToken = authToken;
    }
    /**
     * Set auth token
     */
    setAuthToken(token) {
        this.authToken = token;
    }
    /**
     * Get headers with auth
     */
    headers() {
        const headers = {
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
    async getProfile(agentId) {
        const response = await fetch(`${this.apiUrl}/profiles/${agentId}`, {
            headers: this.headers(),
        });
        if (!response.ok)
            throw new Error(`Failed to get profile: ${response.statusText}`);
        return response.json();
    }
    /**
     * Get own profile
     */
    async getMyProfile() {
        const response = await fetch(`${this.apiUrl}/profiles/me`, {
            headers: this.headers(),
        });
        if (!response.ok)
            throw new Error(`Failed to get profile: ${response.statusText}`);
        return response.json();
    }
    /**
     * Update profile
     */
    async updateProfile(data) {
        const response = await fetch(`${this.apiUrl}/profiles/me`, {
            method: 'PATCH',
            headers: this.headers(),
            body: JSON.stringify(data),
        });
        if (!response.ok)
            throw new Error(`Failed to update profile: ${response.statusText}`);
        return response.json();
    }
    /**
     * Get profile stats
     */
    async getStats(agentId) {
        const response = await fetch(`${this.apiUrl}/profiles/${agentId}/stats`, {
            headers: this.headers(),
        });
        if (!response.ok)
            throw new Error(`Failed to get stats: ${response.statusText}`);
        return response.json();
    }
    /**
     * Get achievements
     */
    async getAchievements(agentId) {
        const response = await fetch(`${this.apiUrl}/profiles/${agentId}/achievements`, {
            headers: this.headers(),
        });
        if (!response.ok)
            throw new Error(`Failed to get achievements: ${response.statusText}`);
        return response.json();
    }
    /**
     * Get reputation history
     */
    async getReputationHistory(agentId) {
        const response = await fetch(`${this.apiUrl}/profiles/${agentId}/reputation`, {
            headers: this.headers(),
        });
        if (!response.ok)
            throw new Error(`Failed to get reputation: ${response.statusText}`);
        return response.json();
    }
    /**
     * Search profiles
     */
    async searchProfiles(query, limit = 20) {
        const response = await fetch(`${this.apiUrl}/profiles/search?q=${encodeURIComponent(query)}&limit=${limit}`, { headers: this.headers() });
        if (!response.ok)
            throw new Error(`Failed to search profiles: ${response.statusText}`);
        return response.json();
    }
    /**
     * Get leaderboard
     */
    async getLeaderboard(category = 'reputation', limit = 100) {
        const response = await fetch(`${this.apiUrl}/profiles/leaderboard?category=${category}&limit=${limit}`, { headers: this.headers() });
        if (!response.ok)
            throw new Error(`Failed to get leaderboard: ${response.statusText}`);
        return response.json();
    }
}
/**
 * Create profile manager instance
 */
export function createProfileManager(apiUrl, authToken) {
    return new ProfileManager(apiUrl, authToken);
}
/**
 * Simple client-side cache manager for profile data
 */
export class ProfileCache {
    cache = new Map();
    static instance;
    static getInstance() {
        if (!ProfileCache.instance) {
            ProfileCache.instance = new ProfileCache();
        }
        return ProfileCache.instance;
    }
    /**
     * Set cached data with TTL (default: 5 minutes)
     */
    set(key, data, ttlMs = 5 * 60 * 1000) {
        this.cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
    }
    /**
     * Get cached data if not expired
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return undefined;
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return undefined;
        }
        return entry.data;
    }
    /**
     * Check if key exists and is valid
     */
    has(key) {
        return this.get(key) !== undefined;
    }
    /**
     * Invalidate cache by pattern
     */
    invalidate(pattern) {
        const regex = new RegExp(pattern);
        for (const key of this.cache.keys()) {
            if (regex.test(key))
                this.cache.delete(key);
        }
    }
    /**
     * Clear all cache
     */
    clear() {
        this.cache.clear();
    }
}
/**
 * Get singleton cache instance
 */
export function getProfileCache() {
    return ProfileCache.getInstance();
}
/**
 * Batch fetch multiple profiles efficiently
 */
export async function batchGetProfiles(apiUrl, agentIds, authToken) {
    const cache = ProfileCache.getInstance();
    const result = new Map();
    const toFetch = [];
    // Check cache first
    for (const id of agentIds) {
        const cached = cache.get(`profile:${id}`);
        if (cached) {
            result.set(id, cached);
        }
        else {
            toFetch.push(id);
        }
    }
    if (toFetch.length === 0)
        return result;
    // Fetch missing profiles in batch
    const headers = { 'Content-Type': 'application/json' };
    if (authToken)
        headers['Authorization'] = `Bearer ${authToken}`;
    const response = await fetch(`${apiUrl}/profiles/batch`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ids: toFetch }),
    });
    if (!response.ok)
        throw new Error(`Batch fetch failed: ${response.statusText}`);
    const profiles = await response.json();
    for (const profile of profiles) {
        cache.set(`profile:${profile.id}`, profile);
        result.set(profile.id, profile);
    }
    return result;
}
/**
 * Check profile completeness and provide suggestions
 */
export function checkProfileCompleteness(profile) {
    const missing = [];
    const suggestions = [];
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
export function saveProfileToLocalStorage(profile) {
    if (typeof localStorage === 'undefined')
        return;
    localStorage.setItem(`agora:profile:${profile.id}`, JSON.stringify({
        profile,
        savedAt: Date.now(),
    }));
}
/**
 * Load profile from localStorage
 */
export function loadProfileFromLocalStorage(agentId) {
    if (typeof localStorage === 'undefined')
        return null;
    const data = localStorage.getItem(`agora:profile:${agentId}`);
    if (!data)
        return null;
    try {
        const parsed = JSON.parse(data);
        // Check if data is not too old (7 days)
        if (Date.now() - parsed.savedAt > 7 * 24 * 60 * 60 * 1000) {
            localStorage.removeItem(`agora:profile:${agentId}`);
            return null;
        }
        return parsed.profile;
    }
    catch {
        return null;
    }
}
/**
 * Clear cached profile from localStorage
 */
export function clearProfileFromLocalStorage(agentId) {
    if (typeof localStorage === 'undefined')
        return;
    localStorage.removeItem(`agora:profile:${agentId}`);
}
/**
 * Create optimistic update for profile
 */
export function createOptimisticProfileUpdate(profile, updates) {
    const previous = { ...profile };
    const updated = { ...profile, ...updates };
    return {
        previous,
        updated,
        rollback: () => Object.assign(profile, previous),
    };
}
/**
 * Upload avatar with progress tracking
 */
export async function uploadAvatar(apiUrl, file, authToken, onProgress) {
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
        const data = await response.json();
        return { success: true, url: data.url };
    }
    // Browser environment with XMLHttpRequest
    const formData = new FormData();
    formData.append('avatar', file);
    return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && onProgress) {
                const percent = Math.round((event.loaded / event.total) * 100);
                onProgress(percent);
            }
        };
        xhr.onload = () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                resolve({ success: true, url: response.url });
            }
            else {
                resolve({ success: false, error: xhr.statusText });
            }
        };
        xhr.onerror = () => resolve({ success: false, error: 'Upload failed' });
        xhr.open('POST', `${apiUrl}/profiles/avatar`);
        xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
        xhr.send(formData);
    });
}
// Note: React hooks implementation should be in a separate file (profile-hooks.ts)
// to avoid React dependency in the core SDK
//# sourceMappingURL=profile.js.map