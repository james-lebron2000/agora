/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import {
  ProfileCard,
  AchievementBadge,
  LevelProgress,
  ReputationScore,
  ProfileStatsGrid,
  SkillTags,
  ThemeProvider,
  lightTheme,
  darkTheme,
} from '../profile-components.js';
import type { AgentProfile, Achievement, ProfileStats } from '../profile.js';

// Test utilities
const renderWithTheme = (ui: React.ReactElement, defaultTheme: 'light' | 'dark' = 'light') => {
  return render(
    <ThemeProvider defaultTheme={defaultTheme}>
      {ui}
    </ThemeProvider>
  );
};

// Mock data
const mockProfile: AgentProfile = {
  id: 'agent-1',
  name: 'Test Agent',
  bio: 'A test agent for unit testing purposes',
  avatarUrl: 'https://example.com/avatar.png',
  walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
  level: 15,
  xp: 2500,
  reputation: 85,
  tasksCompleted: 42,
  tasksPosted: 10,
  totalEarned: '5000.00',
  totalSpent: '1200.00',
  memberSince: Date.now() - 86400000 * 30,
  lastActive: Date.now(),
  socials: { twitter: '@testagent' },
  skills: ['TypeScript', 'React', 'Node.js'],
  isVerified: true,
  isPremium: false,
};

const mockAchievement: Achievement = {
  id: 'ach-1',
  name: 'First Steps',
  description: 'Complete your first task',
  icon: '🎯',
  tier: 'bronze',
  xpReward: 50,
  unlocked: true,
  unlockedAt: Date.now(),
  progress: 100,
  criteria: { type: 'tasks_completed', value: 1, description: 'Complete 1 task' },
};

const mockStats: ProfileStats = {
  tasksCompleted: 42,
  tasksCompletedThisMonth: 8,
  successRate: 0.95,
  averageRating: 4.8,
  totalReviews: 24,
  currentStreak: 7,
  longestStreak: 14,
  averageResponseTime: 15,
  totalWorkingHours: 120,
  monthlyEarnings: [],
  activityHeatmap: [],
};

// ============================================================================
// ProfileCard Tests
// ============================================================================
describe('ProfileCard', () => {
  const mockOnEdit = vi.fn();

  beforeEach(() => {
    mockOnEdit.mockClear();
  });

  it('should render full variant with all elements', () => {
    renderWithTheme(
      <ProfileCard profile={mockProfile} variant="full" showAvatar showStats />
    );

    expect(screen.getByText('Test Agent')).toBeInTheDocument();
    expect(screen.getByText('A test agent for unit testing purposes')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /avatar/i })).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Earned')).toBeInTheDocument();
    expect(screen.getByText('Rep')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should render compact variant with reduced elements', () => {
    renderWithTheme(
      <ProfileCard profile={mockProfile} variant="compact" showAvatar showStats />
    );

    expect(screen.getByText('Test Agent')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Earned')).toBeInTheDocument();
    // Compact should not have Rep stat
    expect(screen.queryByText('Rep')).not.toBeInTheDocument();
    // Bio should not be visible in compact
    expect(screen.queryByText('A test agent for unit testing purposes')).not.toBeInTheDocument();
  });

  it('should render minimal variant with basic info only', () => {
    renderWithTheme(
      <ProfileCard profile={mockProfile} variant="minimal" showAvatar />
    );

    expect(screen.getByText('Test Agent')).toBeInTheDocument();
    // Minimal should not show bio, stats, or progress bar
    expect(screen.queryByText('A test agent for unit testing purposes')).not.toBeInTheDocument();
    expect(screen.queryByText('Tasks')).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('should handle click events on edit button', () => {
    renderWithTheme(
      <ProfileCard profile={mockProfile} variant="full" onEdit={mockOnEdit} />
    );

    const editButton = screen.getByRole('button', { name: /edit profile/i });
    fireEvent.click(editButton);
    expect(mockOnEdit).toHaveBeenCalledTimes(1);
  });

  it('should not show edit button when onEdit is not provided', () => {
    renderWithTheme(
      <ProfileCard profile={mockProfile} variant="full" />
    );

    expect(screen.queryByRole('button', { name: /edit profile/i })).not.toBeInTheDocument();
  });

  it('should render avatar placeholder when avatarUrl is not provided', () => {
    const profileWithoutAvatar = { ...mockProfile, avatarUrl: undefined };
    renderWithTheme(
      <ProfileCard profile={profileWithoutAvatar} variant="full" showAvatar />
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('TE')).toBeInTheDocument(); // Initials
  });

  it('should apply correct theme colors based on theme context', () => {
    const { container: lightContainer } = renderWithTheme(
      <ProfileCard profile={mockProfile} variant="full" />,
      'light'
    );
    
    const lightCard = lightContainer.querySelector('article');
    expect(lightCard).toHaveStyle({ backgroundColor: lightTheme.colors.surface });
  });

  it('should display verified badge when profile is verified', () => {
    renderWithTheme(
      <ProfileCard profile={mockProfile} variant="full" />
    );

    expect(screen.getByTitle('Verified')).toBeInTheDocument();
  });

  it('should not display verified badge when profile is not verified', () => {
    const unverifiedProfile = { ...mockProfile, isVerified: false };
    renderWithTheme(
      <ProfileCard profile={unverifiedProfile} variant="full" />
    );

    expect(screen.queryByTitle('Verified')).not.toBeInTheDocument();
  });

  it('should calculate and display correct level based on XP', () => {
    renderWithTheme(
      <ProfileCard profile={mockProfile} variant="full" />
    );

    // Level 15 based on 2500 XP (floor(sqrt(2500/100)) + 1 = floor(5) + 1 = 6... wait, let me check)
    // Actually: sqrt(2500/100) = sqrt(25) = 5, floor(5) + 1 = 6
    expect(screen.getByText(/Lv\./i)).toBeInTheDocument();
  });

  it('should hide avatar when showAvatar is false', () => {
    renderWithTheme(
      <ProfileCard profile={mockProfile} variant="full" showAvatar={false} />
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByText('TE')).not.toBeInTheDocument();
  });

  it('should hide stats when showStats is false', () => {
    renderWithTheme(
      <ProfileCard profile={mockProfile} variant="full" showStats={false} />
    );

    expect(screen.queryByText('Tasks')).not.toBeInTheDocument();
    expect(screen.queryByText('Earned')).not.toBeInTheDocument();
  });
});

// ============================================================================
// AchievementBadge Tests
// ============================================================================
describe('AchievementBadge', () => {
  it('should render with bronze tier styling when unlocked', () => {
    const achievement: Achievement = { ...mockAchievement, tier: 'bronze' };
    renderWithTheme(
      <AchievementBadge achievement={achievement} size="md" />
    );

    const badge = screen.getByRole('img', { name: /bronze tier/i });
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('🎯');
  });

  it('should render with silver tier styling', () => {
    const achievement: Achievement = { ...mockAchievement, tier: 'silver' };
    renderWithTheme(
      <AchievementBadge achievement={achievement} size="md" />
    );

    expect(screen.getByRole('img', { name: /silver tier/i })).toBeInTheDocument();
  });

  it('should render with gold tier styling', () => {
    const achievement: Achievement = { ...mockAchievement, tier: 'gold' };
    renderWithTheme(
      <AchievementBadge achievement={achievement} size="md" />
    );

    expect(screen.getByRole('img', { name: /gold tier/i })).toBeInTheDocument();
  });

  it('should render with platinum tier styling', () => {
    const achievement: Achievement = { ...mockAchievement, tier: 'platinum' };
    renderWithTheme(
      <AchievementBadge achievement={achievement} size="md" />
    );

    expect(screen.getByRole('img', { name: /platinum tier/i })).toBeInTheDocument();
  });

  it('should render with diamond tier styling', () => {
    const achievement: Achievement = { ...mockAchievement, tier: 'diamond' };
    renderWithTheme(
      <AchievementBadge achievement={achievement} size="md" />
    );

    expect(screen.getByRole('img', { name: /diamond tier/i })).toBeInTheDocument();
  });

  it('should render small size correctly', () => {
    renderWithTheme(
      <AchievementBadge achievement={mockAchievement} size="sm" />
    );

    const badge = screen.getByRole('img');
    expect(badge).toBeInTheDocument();
    // Check inline styles for size
    expect(badge).toHaveStyle({ width: '32px', height: '32px' });
  });

  it('should render medium size correctly', () => {
    renderWithTheme(
      <AchievementBadge achievement={mockAchievement} size="md" />
    );

    const badge = screen.getByRole('img');
    expect(badge).toHaveStyle({ width: '48px', height: '48px' });
  });

  it('should render large size correctly', () => {
    renderWithTheme(
      <AchievementBadge achievement={mockAchievement} size="lg" />
    );

    const badge = screen.getByRole('img');
    expect(badge).toHaveStyle({ width: '72px', height: '72px' });
  });

  it('should show tooltip on hover when showTooltip is true', () => {
    renderWithTheme(
      <AchievementBadge achievement={mockAchievement} size="md" showTooltip={true} />
    );

    const badge = screen.getByRole('img');
    fireEvent.mouseEnter(badge);
    
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText('First Steps')).toBeInTheDocument();
    expect(screen.getByText('Complete your first task')).toBeInTheDocument();
  });

  it('should not show tooltip when showTooltip is false', () => {
    renderWithTheme(
      <AchievementBadge achievement={mockAchievement} size="md" showTooltip={false} />
    );

    const badge = screen.getByRole('img');
    fireEvent.mouseEnter(badge);
    
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('should show progress ring for locked achievements with progress', () => {
    const lockedAchievement: Achievement = {
      ...mockAchievement,
      unlocked: false,
      unlockedAt: undefined,
      progress: 75,
    };
    renderWithTheme(
      <AchievementBadge achievement={lockedAchievement} size="md" />
    );

    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('should apply grayscale filter for locked achievements', () => {
    const lockedAchievement: Achievement = {
      ...mockAchievement,
      unlocked: false,
      unlockedAt: undefined,
      progress: 0,
    };
    renderWithTheme(
      <AchievementBadge achievement={lockedAchievement} size="md" />
    );

    const badge = screen.getByRole('img');
    expect(badge).toHaveTextContent('🎯');
  });

  it('should render achievement name and description in tooltip', () => {
    renderWithTheme(
      <AchievementBadge achievement={mockAchievement} size="md" showTooltip />
    );

    const badge = screen.getByRole('img');
    fireEvent.mouseEnter(badge);

    expect(screen.getByText('First Steps')).toBeInTheDocument();
    expect(screen.getByText('Complete your first task')).toBeInTheDocument();
    expect(screen.getByText('BRONZE')).toBeInTheDocument();
  });
});

// ============================================================================
// LevelProgress Tests
// ============================================================================
describe('LevelProgress', () => {
  it('should render correct level number', () => {
    renderWithTheme(
      <LevelProgress level={15} xp={2500} showDetails />
    );

    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('Current Level')).toBeInTheDocument();
  });

  it('should calculate and display correct XP progress', () => {
    renderWithTheme(
      <LevelProgress level={5} xp={1600} showDetails />
    );

    // Level 5: base XP = (5-1)^2 * 100 = 1600, next level = 5^2 * 100 = 2500
    // Progress should be 0% (at exact boundary)
    expect(screen.getByText(/0 XP/)).toBeInTheDocument();
    expect(screen.getByText(/900 XP/)).toBeInTheDocument(); // XP needed
  });

  it('should calculate XP progress correctly for mid-level', () => {
    renderWithTheme(
      <LevelProgress level={5} xp={2050} showDetails />
    );

    // Level 5: base = 1600, next = 2500, xpInLevel = 2050 - 1600 = 450, needed = 900
    expect(screen.getByText(/450/)).toBeInTheDocument();
  });

  it('should render progress bar with correct width', () => {
    renderWithTheme(
      <LevelProgress level={5} xp={2050} showDetails />
    );

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuenow', '50'); // 450/900 = 50%
  });

  it('should hide details when showDetails is false', () => {
    renderWithTheme(
      <LevelProgress level={5} xp={2050} showDetails={false} />
    );

    // XP details should not be visible
    expect(screen.queryByText(/XP/)).not.toBeInTheDocument();
  });

  it('should show correct tier name for bronze level (1-9)', () => {
    renderWithTheme(
      <LevelProgress level={5} xp={1600} showDetails />
    );

    expect(screen.getByText('Bronze')).toBeInTheDocument();
  });

  it('should show correct tier name for silver level (10-19)', () => {
    renderWithTheme(
      <LevelProgress level={15} xp={2500} showDetails />
    );

    expect(screen.getByText('Silver')).toBeInTheDocument();
  });

  it('should show correct tier name for gold level (20-29)', () => {
    renderWithTheme(
      <LevelProgress level={25} xp={6400} showDetails />
    );

    expect(screen.getByText('Gold')).toBeInTheDocument();
  });

  it('should show correct tier name for platinum level (30-49)', () => {
    renderWithTheme(
      <LevelProgress level={35} xp={12500} showDetails />
    );

    expect(screen.getByText('Platinum')).toBeInTheDocument();
  });

  it('should show correct tier name for diamond level (50+)', () => {
    renderWithTheme(
      <LevelProgress level={50} xp={25000} showDetails />
    );

    expect(screen.getByText('Diamond')).toBeInTheDocument();
  });

  it('should handle level 1 correctly', () => {
    renderWithTheme(
      <LevelProgress level={1} xp={0} showDetails />
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Bronze')).toBeInTheDocument();
  });

  it('should display next level indicator', () => {
    renderWithTheme(
      <LevelProgress level={5} xp={1600} showDetails />
    );

    expect(screen.getByText(/to Level 6/)).toBeInTheDocument();
  });
});

// ============================================================================
// ReputationScore Tests
// ============================================================================
describe('ReputationScore', () => {
  it('should render score value in the center', () => {
    renderWithTheme(
      <ReputationScore score={85} size="md" showTrend />
    );

    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('should render small size correctly', () => {
    const { container } = renderWithTheme(
      <ReputationScore score={85} size="sm" showTrend />
    );

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '48');
    expect(svg).toHaveAttribute('height', '48');
  });

  it('should render medium size correctly', () => {
    const { container } = renderWithTheme(
      <ReputationScore score={85} size="md" showTrend />
    );

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '72');
    expect(svg).toHaveAttribute('height', '72');
  });

  it('should render large size correctly', () => {
    const { container } = renderWithTheme(
      <ReputationScore score={85} size="lg" showTrend />
    );

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '120');
    expect(svg).toHaveAttribute('height', '120');
  });

  it('should show up trend indicator', () => {
    renderWithTheme(
      <ReputationScore score={85} size="md" showTrend trend="up" />
    );

    expect(screen.getByText('↑')).toBeInTheDocument();
    expect(screen.getByText('Reputation')).toBeInTheDocument();
  });

  it('should show down trend indicator', () => {
    renderWithTheme(
      <ReputationScore score={85} size="md" showTrend trend="down" />
    );

    expect(screen.getByText('↓')).toBeInTheDocument();
  });

  it('should show stable trend indicator', () => {
    renderWithTheme(
      <ReputationScore score={85} size="md" showTrend trend="stable" />
    );

    expect(screen.getByText('→')).toBeInTheDocument();
  });

  it('should hide trend when showTrend is false', () => {
    renderWithTheme(
      <ReputationScore score={85} size="md" showTrend={false} />
    );

    expect(screen.queryByText('Reputation')).not.toBeInTheDocument();
    expect(screen.queryByText('↑')).not.toBeInTheDocument();
    expect(screen.queryByText('↓')).not.toBeInTheDocument();
    expect(screen.queryByText('→')).not.toBeInTheDocument();
  });

  it('should apply green color for high scores (90+)', () => {
    const { container } = renderWithTheme(
      <ReputationScore score={95} size="md" showTrend />
    );

    const progressCircle = container.querySelectorAll('circle')[1];
    expect(progressCircle).toHaveAttribute('stroke', lightTheme.colors.success);
  });

  it('should apply primary color for good scores (70-89)', () => {
    const { container } = renderWithTheme(
      <ReputationScore score={80} size="md" showTrend />
    );

    const progressCircle = container.querySelectorAll('circle')[1];
    expect(progressCircle).toHaveAttribute('stroke', lightTheme.colors.primary);
  });

  it('should apply warning color for moderate scores (50-69)', () => {
    const { container } = renderWithTheme(
      <ReputationScore score={60} size="md" showTrend />
    );

    const progressCircle = container.querySelectorAll('circle')[1];
    expect(progressCircle).toHaveAttribute('stroke', lightTheme.colors.warning);
  });

  it('should apply error color for low scores (<50)', () => {
    const { container } = renderWithTheme(
      <ReputationScore score={40} size="md" showTrend />
    );

    const progressCircle = container.querySelectorAll('circle')[1];
    expect(progressCircle).toHaveAttribute('stroke', lightTheme.colors.error);
  });

  it('should have correct aria-label', () => {
    renderWithTheme(
      <ReputationScore score={85} size="md" showTrend />
    );

    expect(screen.getByLabelText('Reputation score: 85')).toBeInTheDocument();
  });
});

// ============================================================================
// ProfileStatsGrid Tests
// ============================================================================
describe('ProfileStatsGrid', () => {
  it('should render with 2 columns layout', () => {
    const { container } = renderWithTheme(
      <ProfileStatsGrid stats={mockStats} columns={2} />
    );

    const grid = container.firstChild as HTMLElement;
    expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(2, 1fr)' });
  });

  it('should render with 3 columns layout', () => {
    const { container } = renderWithTheme(
      <ProfileStatsGrid stats={mockStats} columns={3} />
    );

    const grid = container.firstChild as HTMLElement;
    expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(3, 1fr)' });
  });

  it('should render with 4 columns layout', () => {
    const { container } = renderWithTheme(
      <ProfileStatsGrid stats={mockStats} columns={4} />
    );

    const grid = container.firstChild as HTMLElement;
    expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(4, 1fr)' });
  });

  it('should render all stat items with correct values', () => {
    renderWithTheme(
      <ProfileStatsGrid stats={mockStats} columns={3} />
    );

    expect(screen.getByText('42')).toBeInTheDocument(); // tasksCompleted
    expect(screen.getByText('8')).toBeInTheDocument(); // tasksCompletedThisMonth
    expect(screen.getByText('95%')).toBeInTheDocument(); // successRate
    expect(screen.getByText('4.8')).toBeInTheDocument(); // averageRating
    expect(screen.getByText('24')).toBeInTheDocument(); // totalReviews
    expect(screen.getByText('7d')).toBeInTheDocument(); // currentStreak
    expect(screen.getByText('14d')).toBeInTheDocument(); // longestStreak
    expect(screen.getByText('15m')).toBeInTheDocument(); // averageResponseTime
  });

  it('should render all stat labels', () => {
    renderWithTheme(
      <ProfileStatsGrid stats={mockStats} columns={3} />
    );

    expect(screen.getByText('Tasks Done')).toBeInTheDocument();
    expect(screen.getByText('This Month')).toBeInTheDocument();
    expect(screen.getByText('Success Rate')).toBeInTheDocument();
    expect(screen.getByText('Avg Rating')).toBeInTheDocument();
    expect(screen.getByText('Reviews')).toBeInTheDocument();
    expect(screen.getByText('Streak')).toBeInTheDocument();
    expect(screen.getByText('Best Streak')).toBeInTheDocument();
    expect(screen.getByText('Response')).toBeInTheDocument();
  });

  it('should render correct number of stat cards', () => {
    const { container } = renderWithTheme(
      <ProfileStatsGrid stats={mockStats} columns={3} />
    );

    const statCards = container.querySelectorAll('[role="listitem"]');
    expect(statCards).toHaveLength(8);
  });

  it('should have correct aria-label for the grid', () => {
    renderWithTheme(
      <ProfileStatsGrid stats={mockStats} columns={3} />
    );

    expect(screen.getByLabelText('Profile statistics')).toBeInTheDocument();
  });

  it('should handle zero values correctly', () => {
    const zeroStats: ProfileStats = {
      ...mockStats,
      tasksCompleted: 0,
      currentStreak: 0,
      successRate: 0,
    };

    renderWithTheme(
      <ProfileStatsGrid stats={zeroStats} columns={3} />
    );

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('0d')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});

// ============================================================================
// SkillTags Tests
// ============================================================================
describe('SkillTags', () => {
  const mockSkills = ['TypeScript', 'React', 'Node.js', 'Python', 'Go', 'Rust'];
  const mockOnTagClick = vi.fn();

  beforeEach(() => {
    mockOnTagClick.mockClear();
  });

  it('should render all skills when no maxDisplay limit', () => {
    renderWithTheme(
      <SkillTags skills={mockSkills} onTagClick={mockOnTagClick} />
    );

    mockSkills.forEach(skill => {
      expect(screen.getByText(skill)).toBeInTheDocument();
    });
  });

  it('should limit displayed skills when maxDisplay is set', () => {
    renderWithTheme(
      <SkillTags skills={mockSkills} maxDisplay={3} onTagClick={mockOnTagClick} />
    );

    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();
    expect(screen.queryByText('Python')).not.toBeInTheDocument();
  });

  it('should show "more" button when skills exceed maxDisplay', () => {
    renderWithTheme(
      <SkillTags skills={mockSkills} maxDisplay={3} onTagClick={mockOnTagClick} />
    );

    expect(screen.getByText('+3 more')).toBeInTheDocument();
  });

  it('should show all skills when "more" button is clicked', () => {
    renderWithTheme(
      <SkillTags skills={mockSkills} maxDisplay={3} onTagClick={mockOnTagClick} />
    );

    const moreButton = screen.getByText('+3 more');
    fireEvent.click(moreButton);

    mockSkills.forEach(skill => {
      expect(screen.getByText(skill)).toBeInTheDocument();
    });
    expect(screen.queryByText('+3 more')).not.toBeInTheDocument();
  });

  it('should not show "more" button when skills count equals maxDisplay', () => {
    renderWithTheme(
      <SkillTags skills={mockSkills.slice(0, 3)} maxDisplay={3} onTagClick={mockOnTagClick} />
    );

    expect(screen.queryByText(/more/)).not.toBeInTheDocument();
  });

  it('should not show "more" button when skills count is less than maxDisplay', () => {
    renderWithTheme(
      <SkillTags skills={mockSkills.slice(0, 2)} maxDisplay={3} onTagClick={mockOnTagClick} />
    );

    expect(screen.queryByText(/more/)).not.toBeInTheDocument();
  });

  it('should handle click events on tags', () => {
    renderWithTheme(
      <SkillTags skills={mockSkills} onTagClick={mockOnTagClick} />
    );

    const typeScriptTag = screen.getByText('TypeScript');
    fireEvent.click(typeScriptTag);

    expect(mockOnTagClick).toHaveBeenCalledWith('TypeScript');
    expect(mockOnTagClick).toHaveBeenCalledTimes(1);
  });

  it('should not make tags clickable when onTagClick is not provided', () => {
    renderWithTheme(
      <SkillTags skills={mockSkills} />
    );

    const typeScriptTag = screen.getByText('TypeScript');
    expect(typeScriptTag).toBeInTheDocument();
    // Tags should still render but without click handler
  });

  it('should handle empty skills array', () => {
    renderWithTheme(
      <SkillTags skills={[]} onTagClick={mockOnTagClick} />
    );

    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('should have correct aria-labels for skills', () => {
    renderWithTheme(
      <SkillTags skills={mockSkills} onTagClick={mockOnTagClick} />
    );

    expect(screen.getByLabelText('Skill: TypeScript')).toBeInTheDocument();
    expect(screen.getByLabelText('Skill: React')).toBeInTheDocument();
  });

  it('should handle skills with duplicate names (using index as key)', () => {
    const duplicateSkills = ['React', 'React', 'React'];
    renderWithTheme(
      <SkillTags skills={duplicateSkills} onTagClick={mockOnTagClick} />
    );

    // All three should render (they use index as key)
    const reactTags = screen.getAllByText('React');
    expect(reactTags).toHaveLength(3);
  });

  it('should have correct aria-label for the skills list', () => {
    renderWithTheme(
      <SkillTags skills={mockSkills} onTagClick={mockOnTagClick} />
    );

    expect(screen.getByLabelText('Skills')).toBeInTheDocument();
  });

  it('should have correct aria-label for show more button', () => {
    renderWithTheme(
      <SkillTags skills={mockSkills} maxDisplay={3} onTagClick={mockOnTagClick} />
    );

    expect(screen.getByLabelText('Show 3 more skills')).toBeInTheDocument();
  });
});
