/**
 * Profile Module Unit Tests
 * Tests for ProfileManager, profile utilities, and achievement system
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProfileManager, createProfileManager, calculateLevel, xpForNextLevel, levelProgress, getTierColor, getDefaultAchievements, } from '../profile.js';
// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;
const TEST_API_URL = 'https://api.agora.network';
const TEST_AUTH_TOKEN = 'test-token-123';
const TEST_AGENT_ID = 'agent-123';
const TEST_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
// Helper to create mock profile
function createMockProfile(overrides = {}) {
    return {
        id: TEST_AGENT_ID,
        name: 'Test Agent',
        bio: 'A test agent for unit tests',
        avatarUrl: 'https://example.com/avatar.png',
        walletAddress: TEST_ADDRESS,
        level: 5,
        xp: 2500,
        reputation: 85,
        tasksCompleted: 50,
        tasksPosted: 10,
        totalEarned: '5000.00',
        totalSpent: '1000.00',
        memberSince: Date.now() - 86400000 * 30, // 30 days ago
        lastActive: Date.now(),
        socials: {
            twitter: '@testagent',
            github: 'testagent',
            website: 'https://testagent.com',
        },
        skills: ['typescript', 'solidity', 'react'],
        isVerified: true,
        isPremium: false,
        ...overrides,
    };
}
// Helper to create mock achievements
function createMockAchievements() {
    return [
        {
            id: 'first_task',
            name: 'First Steps',
            description: 'Complete your first task',
            icon: '🎯',
            tier: 'bronze',
            xpReward: 50,
            unlocked: true,
            unlockedAt: Date.now() - 86400000 * 20,
            progress: 100,
            criteria: { type: 'tasks_completed', value: 1, description: 'Complete 1 task' },
        },
        {
            id: 'task_master_10',
            name: 'Task Master',
            description: 'Complete 10 tasks',
            icon: '🏆',
            tier: 'silver',
            xpReward: 200,
            unlocked: true,
            unlockedAt: Date.now() - 86400000 * 10,
            progress: 100,
            criteria: { type: 'tasks_completed', value: 10, description: 'Complete 10 tasks' },
        },
        {
            id: 'task_legend_100',
            name: 'Task Legend',
            description: 'Complete 100 tasks',
            icon: '👑',
            tier: 'gold',
            xpReward: 1000,
            unlocked: false,
            progress: 50,
            criteria: { type: 'tasks_completed', value: 100, description: 'Complete 100 tasks' },
        },
    ];
}
// Helper to create mock stats
function createMockStats() {
    return {
        tasksCompleted: 50,
        tasksCompletedThisMonth: 15,
        successRate: 0.95,
        averageRating: 4.8,
        totalReviews: 42,
        currentStreak: 7,
        longestStreak: 14,
        averageResponseTime: 120,
        totalWorkingHours: 320,
        monthlyEarnings: [
            { month: '2024-01', earned: '1500.00', spent: '300.00' },
            { month: '2024-02', earned: '2000.00', spent: '400.00' },
        ],
        activityHeatmap: [
            { date: '2024-01-01', count: 5, level: 2 },
            { date: '2024-01-02', count: 8, level: 3 },
            { date: '2024-01-03', count: 2, level: 1 },
        ],
    };
}
describe('calculateLevel', () => {
    it('should return level 1 for 0 XP', () => {
        expect(calculateLevel(0)).toBe(1);
    });
    it('should return level 1 for 99 XP', () => {
        expect(calculateLevel(99)).toBe(1);
    });
    it('should return level 2 at 100 XP', () => {
        expect(calculateLevel(100)).toBe(2);
    });
    it('should calculate level correctly for various XP values', () => {
        expect(calculateLevel(400)).toBe(3); // sqrt(400/100) + 1 = 3
        expect(calculateLevel(900)).toBe(4); // sqrt(900/100) + 1 = 4
        expect(calculateLevel(1600)).toBe(5); // sqrt(1600/100) + 1 = 5
        expect(calculateLevel(10000)).toBe(11); // sqrt(10000/100) + 1 = 11
    });
    it('should handle large XP values', () => {
        expect(calculateLevel(1000000)).toBe(101); // sqrt(1000000/100) + 1 = 101
    });
});
describe('xpForNextLevel', () => {
    it('should return 100 XP for level 1', () => {
        expect(xpForNextLevel(1)).toBe(100);
    });
    it('should return 400 XP for level 2', () => {
        expect(xpForNextLevel(2)).toBe(400);
    });
    it('should return 900 XP for level 3', () => {
        expect(xpForNextLevel(3)).toBe(900);
    });
    it('should calculate correctly for higher levels', () => {
        expect(xpForNextLevel(10)).toBe(10000);
        expect(xpForNextLevel(50)).toBe(250000);
        expect(xpForNextLevel(100)).toBe(1000000);
    });
});
describe('levelProgress', () => {
    it('should return 0 at start of level', () => {
        expect(levelProgress(0)).toBe(0);
        expect(levelProgress(100)).toBe(0);
        expect(levelProgress(400)).toBe(0);
    });
    it('should return 1 at end of level', () => {
        // Just before next level
        expect(levelProgress(99)).toBeCloseTo(0.99, 2);
        expect(levelProgress(399)).toBeCloseTo(0.9975, 2);
    });
    it('should calculate progress correctly at halfway point', () => {
        // Level 2: 100-400 XP, halfway is 250
        expect(levelProgress(250)).toBe(0.5);
    });
    it('should return correct progress for various values', () => {
        // Level 3: 400-900 XP
        expect(levelProgress(400)).toBe(0); // Start of level 3
        expect(levelProgress(650)).toBe(0.5); // Middle of level 3
        expect(levelProgress(900)).toBe(0); // Start of level 4
    });
    it('should cap at 1 for edge cases', () => {
        // Very close to next level
        const progress = levelProgress(399.99);
        expect(progress).toBeLessThanOrEqual(1);
    });
});
describe('getTierColor', () => {
    it('should return correct color for bronze tier', () => {
        expect(getTierColor('bronze')).toBe('#CD7F32');
    });
    it('should return correct color for silver tier', () => {
        expect(getTierColor('silver')).toBe('#C0C0C0');
    });
    it('should return correct color for gold tier', () => {
        expect(getTierColor('gold')).toBe('#FFD700');
    });
    it('should return correct color for platinum tier', () => {
        expect(getTierColor('platinum')).toBe('#E5E4E2');
    });
    it('should return correct color for diamond tier', () => {
        expect(getTierColor('diamond')).toBe('#B9F2FF');
    });
});
describe('getDefaultAchievements', () => {
    it('should return array of default achievements', () => {
        const achievements = getDefaultAchievements();
        expect(Array.isArray(achievements)).toBe(true);
        expect(achievements.length).toBeGreaterThan(0);
    });
    it('should include first_task achievement', () => {
        const achievements = getDefaultAchievements();
        const firstTask = achievements.find(a => a.id === 'first_task');
        expect(firstTask).toBeDefined();
        expect(firstTask?.name).toBe('First Steps');
        expect(firstTask?.tier).toBe('bronze');
        expect(firstTask?.xpReward).toBe(50);
    });
    it('should include task_master_10 achievement', () => {
        const achievements = getDefaultAchievements();
        const taskMaster = achievements.find(a => a.id === 'task_master_10');
        expect(taskMaster).toBeDefined();
        expect(taskMaster?.tier).toBe('silver');
        expect(taskMaster?.xpReward).toBe(200);
    });
    it('should include task_legend_100 achievement', () => {
        const achievements = getDefaultAchievements();
        const taskLegend = achievements.find(a => a.id === 'task_legend_100');
        expect(taskLegend).toBeDefined();
        expect(taskLegend?.tier).toBe('gold');
        expect(taskLegend?.xpReward).toBe(1000);
    });
    it('should include earnings achievements', () => {
        const achievements = getDefaultAchievements();
        const earnings1k = achievements.find(a => a.id === 'earnings_1k');
        const earnings10k = achievements.find(a => a.id === 'earnings_10k');
        expect(earnings1k).toBeDefined();
        expect(earnings10k).toBeDefined();
        expect(earnings1k?.tier).toBe('silver');
        expect(earnings10k?.tier).toBe('gold');
    });
    it('should include reputation achievements', () => {
        const achievements = getDefaultAchievements();
        const rep50 = achievements.find(a => a.id === 'reputation_50');
        const rep90 = achievements.find(a => a.id === 'reputation_90');
        expect(rep50).toBeDefined();
        expect(rep90).toBeDefined();
        expect(rep50?.tier).toBe('silver');
        expect(rep90?.tier).toBe('platinum');
    });
    it('should include streak achievements', () => {
        const achievements = getDefaultAchievements();
        const streak7 = achievements.find(a => a.id === 'streak_7');
        const streak30 = achievements.find(a => a.id === 'streak_30');
        expect(streak7).toBeDefined();
        expect(streak30).toBeDefined();
        expect(streak7?.tier).toBe('bronze');
        expect(streak30?.tier).toBe('gold');
    });
    it('should include early_adopter achievement', () => {
        const achievements = getDefaultAchievements();
        const earlyAdopter = achievements.find(a => a.id === 'early_adopter');
        expect(earlyAdopter).toBeDefined();
        expect(earlyAdopter?.tier).toBe('platinum');
    });
    it('should return achievements without unlocked/progress fields', () => {
        const achievements = getDefaultAchievements();
        const firstTask = achievements[0];
        expect(firstTask).not.toHaveProperty('unlocked');
        expect(firstTask).not.toHaveProperty('progress');
        expect(firstTask).not.toHaveProperty('unlockedAt');
    });
});
describe('ProfileManager', () => {
    let manager;
    beforeEach(() => {
        manager = new ProfileManager(TEST_API_URL, TEST_AUTH_TOKEN);
        mockFetch.mockClear();
    });
    afterEach(() => {
        vi.clearAllMocks();
    });
    describe('initialization', () => {
        it('should create manager with apiUrl and authToken', () => {
            expect(manager).toBeDefined();
        });
        it('should create manager without auth token', () => {
            const noAuthManager = new ProfileManager(TEST_API_URL);
            expect(noAuthManager).toBeDefined();
        });
        it('should create manager using factory function', () => {
            const factoryManager = createProfileManager(TEST_API_URL, TEST_AUTH_TOKEN);
            expect(factoryManager).toBeInstanceOf(ProfileManager);
        });
    });
    describe('setAuthToken', () => {
        it('should set auth token after creation', () => {
            const noAuthManager = new ProfileManager(TEST_API_URL);
            noAuthManager.setAuthToken('new-token');
            expect(noAuthManager).toBeDefined();
        });
    });
    describe('getProfile', () => {
        it('should fetch profile by agent ID', async () => {
            const mockProfile = createMockProfile();
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockProfile,
            });
            const profile = await manager.getProfile(TEST_AGENT_ID);
            expect(mockFetch).toHaveBeenCalledWith(`${TEST_API_URL}/profiles/${TEST_AGENT_ID}`, expect.objectContaining({
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${TEST_AUTH_TOKEN}`,
                }),
            }));
            expect(profile).toEqual(mockProfile);
        });
        it('should throw error when fetch fails', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                statusText: 'Not Found',
            });
            await expect(manager.getProfile('non-existent')).rejects.toThrow('Failed to get profile: Not Found');
        });
        it('should throw error on network failure', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));
            await expect(manager.getProfile(TEST_AGENT_ID)).rejects.toThrow('Network error');
        });
    });
    describe('getMyProfile', () => {
        it('should fetch own profile', async () => {
            const mockProfile = createMockProfile();
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockProfile,
            });
            const profile = await manager.getMyProfile();
            expect(mockFetch).toHaveBeenCalledWith(`${TEST_API_URL}/profiles/me`, expect.objectContaining({
                headers: expect.objectContaining({
                    'Authorization': `Bearer ${TEST_AUTH_TOKEN}`,
                }),
            }));
            expect(profile).toEqual(mockProfile);
        });
        it('should throw error when not authenticated', async () => {
            const noAuthManager = new ProfileManager(TEST_API_URL);
            mockFetch.mockResolvedValueOnce({
                ok: false,
                statusText: 'Unauthorized',
            });
            await expect(noAuthManager.getMyProfile()).rejects.toThrow('Failed to get profile: Unauthorized');
        });
    });
    describe('updateProfile', () => {
        it('should update profile with provided data', async () => {
            const updateData = {
                name: 'Updated Name',
                bio: 'Updated bio',
                skills: ['typescript', 'solidity'],
            };
            const updatedProfile = createMockProfile({ ...updateData });
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => updatedProfile,
            });
            const result = await manager.updateProfile(updateData);
            expect(mockFetch).toHaveBeenCalledWith(`${TEST_API_URL}/profiles/me`, expect.objectContaining({
                method: 'PATCH',
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${TEST_AUTH_TOKEN}`,
                }),
                body: JSON.stringify(updateData),
            }));
            expect(result.name).toBe('Updated Name');
            expect(result.bio).toBe('Updated bio');
        });
        it('should update partial profile data', async () => {
            const updateData = {
                name: 'New Name Only',
            };
            const updatedProfile = createMockProfile({ name: 'New Name Only' });
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => updatedProfile,
            });
            const result = await manager.updateProfile(updateData);
            expect(result.name).toBe('New Name Only');
        });
        it('should update social links', async () => {
            const updateData = {
                socials: {
                    twitter: '@newhandle',
                    github: 'newgithub',
                    website: 'https://newsite.com',
                },
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => createMockProfile(updateData),
            });
            const result = await manager.updateProfile(updateData);
            expect(result.socials?.twitter).toBe('@newhandle');
        });
        it('should throw error when update fails', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                statusText: 'Bad Request',
            });
            await expect(manager.updateProfile({ name: 'Test' })).rejects.toThrow('Failed to update profile: Bad Request');
        });
    });
    describe('getStats', () => {
        it('should fetch profile stats', async () => {
            const mockStats = createMockStats();
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockStats,
            });
            const stats = await manager.getStats(TEST_AGENT_ID);
            expect(mockFetch).toHaveBeenCalledWith(`${TEST_API_URL}/profiles/${TEST_AGENT_ID}/stats`, expect.any(Object));
            expect(stats).toEqual(mockStats);
            expect(stats.tasksCompleted).toBe(50);
            expect(stats.successRate).toBe(0.95);
        });
        it('should include monthly earnings', async () => {
            const mockStats = createMockStats();
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockStats,
            });
            const stats = await manager.getStats(TEST_AGENT_ID);
            expect(stats.monthlyEarnings).toHaveLength(2);
            expect(stats.monthlyEarnings[0].month).toBe('2024-01');
        });
        it('should include activity heatmap', async () => {
            const mockStats = createMockStats();
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockStats,
            });
            const stats = await manager.getStats(TEST_AGENT_ID);
            expect(stats.activityHeatmap).toHaveLength(3);
            expect(stats.activityHeatmap[0].level).toBeGreaterThanOrEqual(0);
            expect(stats.activityHeatmap[0].level).toBeLessThanOrEqual(4);
        });
        it('should throw error when stats fetch fails', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                statusText: 'Not Found',
            });
            await expect(manager.getStats('invalid-id')).rejects.toThrow('Failed to get stats: Not Found');
        });
    });
    describe('getAchievements', () => {
        it('should fetch achievements', async () => {
            const mockAchievements = createMockAchievements();
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockAchievements,
            });
            const achievements = await manager.getAchievements(TEST_AGENT_ID);
            expect(mockFetch).toHaveBeenCalledWith(`${TEST_API_URL}/profiles/${TEST_AGENT_ID}/achievements`, expect.any(Object));
            expect(achievements).toHaveLength(3);
        });
        it('should include unlocked and locked achievements', async () => {
            const mockAchievements = createMockAchievements();
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockAchievements,
            });
            const achievements = await manager.getAchievements(TEST_AGENT_ID);
            const unlocked = achievements.filter(a => a.unlocked);
            const locked = achievements.filter(a => !a.unlocked);
            expect(unlocked).toHaveLength(2);
            expect(locked).toHaveLength(1);
        });
        it('should include achievement criteria', async () => {
            const mockAchievements = createMockAchievements();
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockAchievements,
            });
            const achievements = await manager.getAchievements(TEST_AGENT_ID);
            expect(achievements[0].criteria).toBeDefined();
            expect(achievements[0].criteria.type).toBe('tasks_completed');
        });
        it('should throw error when achievements fetch fails', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                statusText: 'Server Error',
            });
            await expect(manager.getAchievements(TEST_AGENT_ID)).rejects.toThrow('Failed to get achievements: Server Error');
        });
    });
    describe('getReputationHistory', () => {
        it('should fetch reputation history', async () => {
            const mockHistory = [
                { timestamp: Date.now() - 86400000, score: 80, change: 5, reason: 'Task completed' },
                { timestamp: Date.now() - 172800000, score: 75, change: 3, reason: 'Positive review' },
            ];
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockHistory,
            });
            const history = await manager.getReputationHistory(TEST_AGENT_ID);
            expect(mockFetch).toHaveBeenCalledWith(`${TEST_API_URL}/profiles/${TEST_AGENT_ID}/reputation`, expect.any(Object));
            expect(history).toHaveLength(2);
            expect(history[0].score).toBe(80);
            expect(history[0].change).toBe(5);
        });
        it('should handle empty reputation history', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [],
            });
            const history = await manager.getReputationHistory(TEST_AGENT_ID);
            expect(history).toEqual([]);
        });
        it('should throw error when reputation fetch fails', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                statusText: 'Forbidden',
            });
            await expect(manager.getReputationHistory(TEST_AGENT_ID)).rejects.toThrow('Failed to get reputation: Forbidden');
        });
    });
    describe('searchProfiles', () => {
        it('should search profiles with query', async () => {
            const mockProfiles = [
                createMockProfile({ id: 'agent-1', name: 'Developer One' }),
                createMockProfile({ id: 'agent-2', name: 'Developer Two' }),
            ];
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockProfiles,
            });
            const results = await manager.searchProfiles('developer');
            expect(mockFetch).toHaveBeenCalledWith(`${TEST_API_URL}/profiles/search?q=developer&limit=20`, expect.any(Object));
            expect(results).toHaveLength(2);
        });
        it('should respect custom limit', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [],
            });
            await manager.searchProfiles('test', 50);
            expect(mockFetch).toHaveBeenCalledWith(`${TEST_API_URL}/profiles/search?q=test&limit=50`, expect.any(Object));
        });
        it('should URL encode query parameters', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [],
            });
            await manager.searchProfiles('test query & more');
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining(encodeURIComponent('test query & more')), expect.any(Object));
        });
        it('should throw error when search fails', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                statusText: 'Bad Request',
            });
            await expect(manager.searchProfiles('')).rejects.toThrow('Failed to search profiles: Bad Request');
        });
    });
    describe('getLeaderboard', () => {
        it('should fetch leaderboard with default category', async () => {
            const mockProfiles = [
                createMockProfile({ id: 'agent-1', reputation: 95 }),
                createMockProfile({ id: 'agent-2', reputation: 90 }),
            ];
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockProfiles,
            });
            const results = await manager.getLeaderboard();
            expect(mockFetch).toHaveBeenCalledWith(`${TEST_API_URL}/profiles/leaderboard?category=reputation&limit=100`, expect.any(Object));
            expect(results).toHaveLength(2);
        });
        it('should fetch leaderboard by earnings', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [],
            });
            await manager.getLeaderboard('earnings');
            expect(mockFetch).toHaveBeenCalledWith(`${TEST_API_URL}/profiles/leaderboard?category=earnings&limit=100`, expect.any(Object));
        });
        it('should fetch leaderboard by tasks', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [],
            });
            await manager.getLeaderboard('tasks', 50);
            expect(mockFetch).toHaveBeenCalledWith(`${TEST_API_URL}/profiles/leaderboard?category=tasks&limit=50`, expect.any(Object));
        });
        it('should throw error when leaderboard fetch fails', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                statusText: 'Service Unavailable',
            });
            await expect(manager.getLeaderboard()).rejects.toThrow('Failed to get leaderboard: Service Unavailable');
        });
    });
    describe('headers without auth', () => {
        it('should not include auth header when no token provided', async () => {
            const noAuthManager = new ProfileManager(TEST_API_URL);
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => createMockProfile(),
            });
            await noAuthManager.getProfile(TEST_AGENT_ID);
            expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
                headers: {
                    'Content-Type': 'application/json',
                },
            }));
        });
    });
});
describe('Type Exports', () => {
    it('should properly export all types (compile-time check)', () => {
        const _profile = {
            id: 'test',
            name: 'Test',
            bio: 'Bio',
            walletAddress: TEST_ADDRESS,
            level: 1,
            xp: 0,
            reputation: 50,
            tasksCompleted: 0,
            tasksPosted: 0,
            totalEarned: '0',
            totalSpent: '0',
            memberSince: Date.now(),
            lastActive: Date.now(),
            skills: [],
            isVerified: false,
            isPremium: false,
        };
        const _achievement = {
            id: 'test',
            name: 'Test',
            description: 'Test description',
            icon: '🎯',
            tier: 'gold',
            xpReward: 100,
            unlocked: true,
            unlockedAt: Date.now(),
            progress: 100,
            criteria: { type: 'tasks_completed', value: 10, description: 'Complete 10 tasks' },
        };
        const _tier = 'platinum';
        const _stats = {
            tasksCompleted: 10,
            tasksCompletedThisMonth: 5,
            successRate: 0.9,
            averageRating: 4.5,
            totalReviews: 20,
            currentStreak: 3,
            longestStreak: 7,
            averageResponseTime: 60,
            totalWorkingHours: 100,
            monthlyEarnings: [],
            activityHeatmap: [],
        };
        const _updateRequest = {
            name: 'New Name',
            bio: 'New Bio',
        };
        const _reputationEntry = {
            timestamp: Date.now(),
            score: 80,
            change: 5,
            reason: 'Task completed',
        };
        expect(true).toBe(true);
    });
});
console.log('[Unit Tests] Profile module test suite loaded');
//# sourceMappingURL=profile.test.js.map