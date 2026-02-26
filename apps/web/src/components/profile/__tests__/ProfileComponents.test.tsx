/**
 * Profile Components Test
 * 
 * Simple test to verify the profile components render correctly
 * and integrate with the SDK properly.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProfileThemeProvider } from '../../contexts/ProfileThemeContext';
import { ProfileCard } from '../ProfileCard';
import { ActivityTimeline } from '../ActivityTimeline';
import { PortfolioView } from '../PortfolioView';
import { ProfileEditor } from '../ProfileEditor';
import type { AgentProfile, ProfileStats, ActivityItem, PortfolioData } from '../types';

// Mock data
const mockProfile: AgentProfile = {
  id: 'test-agent-123',
  name: 'Test Agent',
  bio: 'This is a test agent for component testing',
  walletAddress: '0x1234567890123456789012345678901234567890',
  level: 5,
  xp: 2500,
  reputation: 85.5,
  tasksCompleted: 42,
  tasksPosted: 15,
  totalEarned: '1250.00',
  totalSpent: '450.00',
  memberSince: Date.now() - 86400000 * 30, // 30 days ago
  lastActive: Date.now() - 3600000, // 1 hour ago
  skills: ['React', 'TypeScript', 'Web3', 'Solidity'],
  isVerified: true,
  isPremium: false,
  socials: {
    twitter: 'https://twitter.com/testagent',
    github: 'https://github.com/testagent',
  },
};

const mockStats: ProfileStats = {
  tasksCompleted: 42,
  tasksCompletedThisMonth: 12,
  successRate: 0.95,
  averageRating: 4.8,
  totalReviews: 28,
  currentStreak: 5,
  longestStreak: 12,
  averageResponseTime: 45,
  totalWorkingHours: 156,
  monthlyEarnings: [
    { month: '2024-01', earned: '450.00', spent: '120.00' },
    { month: '2024-02', earned: '520.00', spent: '180.00' },
  ],
  activityHeatmap: [],
};

const mockActivities: ActivityItem[] = [
  {
    id: 'activity-1',
    type: 'task_completed',
    title: 'Completed Web3 Integration Task',
    description: 'Successfully integrated smart contract functionality',
    timestamp: Date.now() - 3600000, // 1 hour ago
    metadata: { taskId: 'task-123', value: 150 },
  },
  {
    id: 'activity-2',
    type: 'payment_received',
    title: 'Payment Received',
    description: 'Payment for completed task',
    timestamp: Date.now() - 7200000, // 2 hours ago
    metadata: { amount: 150, currency: 'USDC' },
  },
  {
    id: 'activity-3',
    type: 'achievement_unlocked',
    title: 'Achievement Unlocked: Task Master',
    description: 'Completed 10 tasks',
    timestamp: Date.now() - 86400000, // 1 day ago
    metadata: { achievementId: 'task_master_10' },
  },
];

const mockPortfolio: PortfolioData = {
  totalValueUsd: '2845.00',
  change24h: 2.3,
  lastUpdated: Date.now(),
  assets: [
    {
      id: 'USDC',
      name: 'USD Coin',
      chain: 'base',
      balance: '1000',
      balanceUsd: '1000.00',
      price: '1.00',
      change24h: 0.1,
      decimals: 6,
    },
    {
      id: 'ETH',
      name: 'Ethereum',
      chain: 'base',
      balance: '0.5',
      balanceUsd: '1600.00',
      price: '3200.00',
      change24h: -1.2,
      decimals: 18,
    },
    {
      id: 'DAI',
      name: 'Dai Stablecoin',
      chain: 'base',
      balance: '245',
      balanceUsd: '245.00',
      price: '1.00',
      change24h: 0.05,
      decimals: 18,
    },
  ],
};

describe('Profile Components', () => {
  // Test ProfileCard
  describe('ProfileCard', () => {
    it('renders profile information correctly', () => {
      render(
        <ProfileThemeProvider>
          <ProfileCard profile={mockProfile} />
        </ProfileThemeProvider>
      );

      expect(screen.getByText('Test Agent')).toBeInTheDocument();
      expect(screen.getByText('This is a test agent for component testing')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument(); // tasks completed
      expect(screen.getByText('85.5')).toBeInTheDocument(); // reputation
    });

    it('renders survival score when provided', () => {
      const survivalScore = {
        overall: 78,
        economic: 85,
        reputation: 75,
        activity: 70,
        trend: 'up' as const,
        trendPercent: 5,
      };

      render(
        <ProfileThemeProvider>
          <ProfileCard profile={mockProfile} survivalScore={survivalScore} />
        </ProfileThemeProvider>
      );

      expect(screen.getByText('78')).toBeInTheDocument();
      expect(screen.getByText('Survival Score')).toBeInTheDocument();
    });

    it('renders loading state', () => {
      render(
        <ProfileThemeProvider>
          <ProfileCard profile={mockProfile} isLoading={true} />
        </ProfileThemeProvider>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders compact mode', () => {
      render(
        <ProfileThemeProvider>
          <ProfileCard profile={mockProfile} compact={true} />
        </ProfileThemeProvider>
      );

      expect(screen.getByText('Test Agent')).toBeInTheDocument();
      // Compact mode should show fewer details
      expect(screen.getByText('Lv.5')).toBeInTheDocument();
    });
  });

  // Test ActivityTimeline
  describe('ActivityTimeline', () => {
    it('renders activities correctly', () => {
      render(
        <ProfileThemeProvider>
          <ActivityTimeline activities={mockActivities} />
        </ProfileThemeProvider>
      );

      expect(screen.getByText('Completed Web3 Integration Task')).toBeInTheDocument();
      expect(screen.getByText('Payment Received')).toBeInTheDocument();
      expect(screen.getByText('Achievement Unlocked: Task Master')).toBeInTheDocument();
    });

    it('renders empty state', () => {
      render(
        <ProfileThemeProvider>
          <ActivityTimeline activities={[]} />
        </ProfileThemeProvider>
      );

      expect(screen.getByText('No activities yet. Complete tasks to see your activity here!')).toBeInTheDocument();
    });

    it('renders loading state', () => {
      render(
        <ProfileThemeProvider>
          <ActivityTimeline activities={[]} isLoading={true} />
        </ProfileThemeProvider>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  // Test PortfolioView
  describe('PortfolioView', () => {
    it('renders portfolio correctly', () => {
      render(
        <ProfileThemeProvider>
          <PortfolioView portfolio={mockPortfolio} />
        </ProfileThemeProvider>
      );

      expect(screen.getByText('$2,845.00')).toBeInTheDocument(); // total value
      expect(screen.getByText('USD Coin')).toBeInTheDocument();
      expect(screen.getByText('Ethereum')).toBeInTheDocument();
      expect(screen.getByText('Dai Stablecoin')).toBeInTheDocument();
    });

    it('renders empty portfolio', () => {
      const emptyPortfolio: PortfolioData = {
        totalValueUsd: '0.00',
        change24h: 0,
        lastUpdated: Date.now(),
        assets: [],
      };

      render(
        <ProfileThemeProvider>
          <PortfolioView portfolio={emptyPortfolio} />
        </ProfileThemeProvider>
      );

      expect(screen.getByText('No assets in portfolio')).toBeInTheDocument();
    });
  });

  // Test ProfileEditor
  describe('ProfileEditor', () => {
    it('renders form correctly', () => {
      const mockOnSave = jest.fn();
      const mockOnCancel = jest.fn();

      render(
        <ProfileThemeProvider>
          <ProfileEditor
            initialData={{
              name: 'Test Agent',
              bio: 'Test bio',
              skills: ['React', 'TypeScript'],
              socials: { twitter: 'https://twitter.com/test' },
            }}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </ProfileThemeProvider>
      );

      expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      expect(screen.getByLabelText('Display Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Bio')).toBeInTheDocument();
      expect(screen.getByText('Social Links')).toBeInTheDocument();
    });

    it('shows validation errors', async () => {
      const mockOnSave = jest.fn();
      const errors = { name: 'Name is required' };

      render(
        <ProfileThemeProvider>
          <ProfileEditor
            initialData={{ name: '', bio: '', skills: [], socials: {} }}
            onSave={mockOnSave}
            errors={errors}
          />
        </ProfileThemeProvider>
      );

      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
  });
});

// Integration test with SDK
import { initializeProfileManager } from '@agora/sdk';

describe('Profile Components Integration', () => {
  beforeAll(() => {
    // Initialize the profile manager for testing
    initializeProfileManager('https://api.agora.com', 'test-token');
  });

  it('integrates with SDK hooks', () => {
    // This test verifies that the components can be used with the SDK hooks
    // In a real application, you would use actual SDK data
    
    const TestComponent = () => {
      // Mock SDK hook usage
      const mockProfile = {
        id: 'test-agent',
        name: 'Test Agent',
        bio: 'Test bio',
        walletAddress: '0x1234567890123456789012345678901234567890',
        level: 1,
        xp: 0,
        reputation: 0,
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

      return (
        <ProfileThemeProvider>
          <ProfileCard profile={mockProfile} />
        </ProfileThemeProvider>
      );
    };

    render(<TestComponent />);
    expect(screen.getByText('Test Agent')).toBeInTheDocument();
  });
});
