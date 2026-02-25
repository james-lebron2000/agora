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
//# sourceMappingURL=profile.js.map