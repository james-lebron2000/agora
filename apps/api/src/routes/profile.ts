/**
 * Profile API Routes
 * 
 * REST API endpoints for agent profile management
 */

import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Validation schemas
const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  bio: z.string().max(1000).optional(),
  avatarUrl: z.string().url().optional(),
  socials: z.object({
    twitter: z.string().optional(),
    github: z.string().optional(),
    website: z.string().url().optional(),
  }).optional(),
  skills: z.array(z.string()).max(20).optional(),
});

// Mock database - replace with real DB
const profiles = new Map();
const stats = new Map();
const achievements = new Map();

/**
 * Get profile by ID
 * GET /api/profiles/:agentId
 */
router.get('/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    // Mock profile data
    const profile = {
      id: agentId,
      name: `Agent ${agentId.slice(0, 8)}`,
      bio: 'Elite AI agent specializing in complex tasks',
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${agentId}`,
      walletAddress: '0x1234567890abcdef',
      level: 15,
      xp: 23450,
      reputation: 87,
      tasksCompleted: 42,
      tasksPosted: 12,
      totalEarned: '12500.50',
      totalSpent: '3200.00',
      memberSince: Date.now() - 86400000 * 90,
      lastActive: Date.now(),
      socials: {
        twitter: '@agent',
        github: 'agent',
        website: 'https://agent.dev',
      },
      skills: ['AI', 'Coding', 'Design', 'Analysis'],
      isVerified: true,
      isPremium: true,
    };
    
    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * Get own profile
 * GET /api/profiles/me
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const agentId = req.agentId;
    
    const profile = {
      id: agentId,
      name: 'My Agent',
      bio: 'Your personal AI agent',
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${agentId}`,
      walletAddress: req.walletAddress || '0x1234567890abcdef',
      level: 20,
      xp: 45600,
      reputation: 92,
      tasksCompleted: 78,
      tasksPosted: 25,
      totalEarned: '28500.75',
      totalSpent: '8900.00',
      memberSince: Date.now() - 86400000 * 180,
      lastActive: Date.now(),
      socials: {
        twitter: '@myagent',
        github: 'myagent',
        website: 'https://myagent.dev',
      },
      skills: ['AI', 'Coding', 'Design', 'Analysis', 'Writing'],
      isVerified: true,
      isPremium: true,
    };
    
    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * Update profile
 * PATCH /api/profiles/me
 */
router.patch('/me', authMiddleware, async (req, res) => {
  try {
    const result = updateProfileSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: result.error.issues 
      });
    }
    
    const agentId = req.agentId;
    
    // Mock update
    const updatedProfile = {
      id: agentId,
      ...result.data,
      updatedAt: Date.now(),
    };
    
    res.json(updatedProfile);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * Get profile stats
 * GET /api/profiles/:agentId/stats
 */
router.get('/:agentId/stats', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    // Generate mock stats
    const stats = {
      tasksCompleted: 42,
      tasksCompletedThisMonth: 8,
      successRate: 0.94,
      averageRating: 4.8,
      totalReviews: 36,
      currentStreak: 5,
      longestStreak: 21,
      averageResponseTime: 15,
      totalWorkingHours: 450,
      monthlyEarnings: [
        { month: '2024-01', earned: '2500.00', spent: '800.00' },
        { month: '2024-02', earned: '3200.50', spent: '900.00' },
        { month: '2024-03', earned: '2800.00', spent: '750.00' },
        { month: '2024-04', earned: '4000.00', spent: '750.00' },
      ],
      activityHeatmap: generateMockHeatmap(),
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * Get achievements
 * GET /api/profiles/:agentId/achievements
 */
router.get('/:agentId/achievements', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    const achievements = [
      {
        id: 'first_task',
        name: 'First Steps',
        description: 'Complete your first task',
        icon: '🎯',
        tier: 'bronze',
        xpReward: 50,
        unlocked: true,
        unlockedAt: Date.now() - 86400000 * 80,
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
        unlockedAt: Date.now() - 86400000 * 60,
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
        progress: 42,
        criteria: { type: 'tasks_completed', value: 100, description: 'Complete 100 tasks' },
      },
      {
        id: 'earnings_1k',
        name: 'First $1K',
        description: 'Earn $1,000 total',
        icon: '💰',
        tier: 'silver',
        xpReward: 300,
        unlocked: true,
        unlockedAt: Date.now() - 86400000 * 70,
        progress: 100,
        criteria: { type: 'earnings', value: 1000, description: 'Earn $1,000' },
      },
      {
        id: 'earnings_10k',
        name: 'High Earner',
        description: 'Earn $10,000 total',
        icon: '💎',
        tier: 'gold',
        xpReward: 1000,
        unlocked: true,
        unlockedAt: Date.now() - 86400000 * 30,
        progress: 100,
        criteria: { type: 'earnings', value: 10000, description: 'Earn $10,000' },
      },
      {
        id: 'reputation_50',
        name: 'Trusted Agent',
        description: 'Reach 50 reputation score',
        icon: '🤝',
        tier: 'silver',
        xpReward: 250,
        unlocked: true,
        unlockedAt: Date.now() - 86400000 * 45,
        progress: 100,
        criteria: { type: 'reputation', value: 50, description: '50 reputation' },
      },
      {
        id: 'reputation_90',
        name: 'Elite Agent',
        description: 'Reach 90 reputation score',
        icon: '⭐',
        tier: 'platinum',
        xpReward: 1000,
        unlocked: true,
        unlockedAt: Date.now() - 86400000 * 10,
        progress: 100,
        criteria: { type: 'reputation', value: 90, description: '90 reputation' },
      },
      {
        id: 'streak_7',
        name: 'Week Warrior',
        description: '7-day activity streak',
        icon: '🔥',
        tier: 'bronze',
        xpReward: 100,
        unlocked: true,
        unlockedAt: Date.now() - 86400000 * 20,
        progress: 100,
        criteria: { type: 'streak', value: 7, description: '7-day streak' },
      },
      {
        id: 'streak_30',
        name: 'Monthly Master',
        description: '30-day activity streak',
        icon: '📅',
        tier: 'gold',
        xpReward: 500,
        unlocked: false,
        progress: 67,
        criteria: { type: 'streak', value: 30, description: '30-day streak' },
      },
      {
        id: 'early_adopter',
        name: 'Early Adopter',
        description: 'Joined during beta phase',
        icon: '🚀',
        tier: 'platinum',
        xpReward: 500,
        unlocked: true,
        unlockedAt: Date.now() - 86400000 * 90,
        progress: 100,
        criteria: { type: 'special', value: 1, description: 'Beta participant' },
      },
    ];
    
    res.json(achievements);
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

/**
 * Get reputation history
 * GET /api/profiles/:agentId/reputation
 */
router.get('/:agentId/reputation', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    // Mock reputation history
    const history = [
      { timestamp: Date.now() - 86400000 * 30, score: 75, change: 5, reason: 'Task completed' },
      { timestamp: Date.now() - 86400000 * 25, score: 78, change: 3, reason: 'Positive review' },
      { timestamp: Date.now() - 86400000 * 20, score: 80, change: 2, reason: 'On-time delivery' },
      { timestamp: Date.now() - 86400000 * 15, score: 85, change: 5, reason: '5-star rating' },
      { timestamp: Date.now() - 86400000 * 10, score: 90, change: 5, reason: 'Milestone reached' },
      { timestamp: Date.now() - 86400000 * 5, score: 92, change: 2, reason: 'Community contribution' },
    ];
    
    res.json(history);
  } catch (error) {
    console.error('Error fetching reputation:', error);
    res.status(500).json({ error: 'Failed to fetch reputation' });
  }
});

/**
 * Search profiles
 * GET /api/profiles/search?q=query&limit=20
 */
router.get('/search', async (req, res) => {
  try {
    const { q, limit = '20' } = req.query;
    
    // Mock search results
    const results = [
      {
        id: 'agent1',
        name: 'Elite Coder',
        bio: 'Full-stack developer',
        level: 25,
        xp: 65400,
        reputation: 95,
        tasksCompleted: 156,
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=agent1',
      },
      {
        id: 'agent2',
        name: 'Design Pro',
        bio: 'UI/UX specialist',
        level: 20,
        xp: 42000,
        reputation: 88,
        tasksCompleted: 89,
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=agent2',
      },
    ];
    
    res.json(results);
  } catch (error) {
    console.error('Error searching profiles:', error);
    res.status(500).json({ error: 'Failed to search profiles' });
  }
});

/**
 * Get leaderboard
 * GET /api/profiles/leaderboard?category=reputation&limit=100
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { category = 'reputation', limit = '100' } = req.query;
    
    // Mock leaderboard
    const leaderboard = [
      { id: 'top1', name: 'Alpha Agent', level: 50, xp: 250000, reputation: 99, tasksCompleted: 500, totalEarned: '150000.00', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=top1' },
      { id: 'top2', name: 'Beta Master', level: 45, xp: 210000, reputation: 97, tasksCompleted: 420, totalEarned: '125000.00', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=top2' },
      { id: 'top3', name: 'Gamma Pro', level: 42, xp: 185000, reputation: 95, tasksCompleted: 380, totalEarned: '110000.00', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=top3' },
      { id: 'top4', name: 'Delta Elite', level: 38, xp: 160000, reputation: 93, tasksCompleted: 320, totalEarned: '95000.00', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=top4' },
      { id: 'top5', name: 'Epsilon Star', level: 35, xp: 140000, reputation: 91, tasksCompleted: 280, totalEarned: '82000.00', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=top5' },
    ];
    
    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Helper function to generate mock heatmap data
function generateMockHeatmap() {
  const data = [];
  const today = new Date();
  for (let i = 180; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const count = Math.floor(Math.random() * 10);
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (count > 0) level = 1;
    if (count > 3) level = 2;
    if (count > 6) level = 3;
    if (count > 8) level = 4;
    data.push({
      date: date.toISOString().split('T')[0],
      count,
      level,
    });
  }
  return data;
}

export default router;
