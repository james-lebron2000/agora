import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Award,
  Activity,
  Settings,
  Edit3,
  Check,
  X,
  Twitter,
  Github,
  Globe,
  Mail,
  Shield,
  Crown,
  Zap,
  Loader2,
  MapPin,
  Calendar,
} from 'lucide-react';
import { AgentAvatar } from './AgentAvatar';
import { AgentLevelProgress, calculateLevel } from './AgentLevelProgress';
import { ProfileStats } from './ProfileStats';
import { AchievementGallery, type Achievement } from './AchievementGallery';
import { ActivityHeatmap, type ActivityDay } from './ActivityHeatmap';
import { ShareProfile } from './ShareProfile';

// ============================================
// Type Definitions
// ============================================

export interface AgentProfileData {
  id: string;
  name: string;
  bio: string;
  avatarUrl?: string;
  walletAddress: string;
  level: number;
  xp: number;
  reputation: number;
  tasksCompleted: number;
  tasksPosted: number;
  totalEarned: string;
  totalSpent: string;
  memberSince: number;
  lastActive: number;
  location?: string;
  socials?: {
    twitter?: string;
    github?: string;
    website?: string;
    email?: string;
  };
  skills: string[];
  isVerified: boolean;
  isPremium: boolean;
  status: 'online' | 'offline' | 'busy' | 'unknown';
}

export interface ProfileStatsData {
  tasksCompleted: number;
  tasksCompletedThisMonth: number;
  successRate: number;
  averageRating: number;
  totalReviews: number;
  currentStreak: number;
  longestStreak: number;
  averageResponseTime: number;
  totalWorkingHours: number;
}

export type ProfileTab = 'overview' | 'achievements' | 'activity' | 'settings';

// ============================================
// Props Interface
// ============================================

export interface AgentProfileProps {
  profile: AgentProfileData;
  stats: ProfileStatsData;
  achievements: Achievement[];
  activityData: ActivityDay[];
  isLoading?: boolean;
  isEditable?: boolean;
  onProfileUpdate?: (profile: Partial<AgentProfileData>) => Promise<void>;
  className?: string;
}

// ============================================
// Helper Functions
// ============================================

function truncateAddress(address: string, chars = 6): string {
  if (!address || address.length < chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ============================================
// Loading Skeleton
// ============================================

function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header Skeleton */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-white/10" />
          <div className="flex-1 space-y-4">
            <div className="h-8 w-48 bg-white/10 rounded" />
            <div className="h-4 w-32 bg-white/10 rounded" />
            <div className="h-20 w-full max-w-md bg-white/10 rounded" />
          </div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 w-24 bg-white/10 rounded-lg" />
        ))}
      </div>

      {/* Content Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-32 bg-white/5 border border-white/10 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ============================================
// Profile Header Component
// ============================================

interface ProfileHeaderProps {
  profile: AgentProfileData;
  isEditing: boolean;
  editedProfile: Partial<AgentProfileData>;
  onEditChange: (field: string, value: any) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

function ProfileHeader({
  profile,
  isEditing,
  editedProfile,
  onEditChange,
  onSave,
  onCancel,
  isSaving,
}: ProfileHeaderProps) {
  const level = calculateLevel(profile.xp);

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 md:p-8">
      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <AgentAvatar
            agentId={profile.id}
            agentName={profile.name}
            size="xl"
            status={profile.status}
            showStatusRing
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editedProfile.name || ''}
                    onChange={(e) => onEditChange('name', e.target.value)}
                    className="w-full max-w-md px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-xl font-bold placeholder-white/40 focus:outline-none focus:border-white/40"
                    placeholder="Agent Name"
                  />
                  <textarea
                    value={editedProfile.bio || ''}
                    onChange={(e) => onEditChange('bio', e.target.value)}
                    rows={3}
                    className="w-full max-w-md px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white/80 text-sm placeholder-white/40 focus:outline-none focus:border-white/40 resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl md:text-3xl font-bold text-white">{profile.name}</h1>
                    {profile.isVerified && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
                        <Shield className="w-3 h-3" />
                        Verified
                      </div>
                    )}
                    {profile.isPremium && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-medium">
                        <Crown className="w-3 h-3" />
                        Premium
                      </div>
                    )}
                  </div>
                  <p className="text-white/60 mt-1 font-mono text-sm">{truncateAddress(profile.walletAddress)}</p>
                  <p className="text-white/80 mt-3 max-w-lg">{profile.bio || 'No bio yet.'}</p>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <motion.button
                    onClick={onSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                    whileTap={{ scale: 0.95 }}
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Save
                  </motion.button>
                  <motion.button
                    onClick={onCancel}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white/70 rounded-lg font-medium hover:bg-white/20 transition-colors"
                    whileTap={{ scale: 0.95 }}
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </motion.button>
                </>
              ) : (
                <ShareProfile agentId={profile.id} agentName={profile.name} />
              )}
            </div>
          </div>

          {/* Meta Info */}
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-white/50">
            {profile.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {profile.location}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              Member since {formatDate(profile.memberSince)}
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              Level {level.level} • {level.title}
            </div>
          </div>

          {/* Skills */}
          {!isEditing && profile.skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {profile.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 bg-white/10 text-white/70 rounded-full text-xs font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}

          {/* Social Links */}
          {isEditing ? (
            <div className="flex flex-wrap gap-3 mt-4">
              <input
                type="text"
                value={editedProfile.socials?.twitter || ''}
                onChange={(e) => onEditChange('socials', { ...editedProfile.socials, twitter: e.target.value })}
                className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-white/40 focus:outline-none focus:border-white/40"
                placeholder="Twitter URL"
              />
              <input
                type="text"
                value={editedProfile.socials?.github || ''}
                onChange={(e) => onEditChange('socials', { ...editedProfile.socials, github: e.target.value })}
                className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-white/40 focus:outline-none focus:border-white/40"
                placeholder="GitHub URL"
              />
              <input
                type="text"
                value={editedProfile.socials?.website || ''}
                onChange={(e) => onEditChange('socials', { ...editedProfile.socials, website: e.target.value })}
                className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-white/40 focus:outline-none focus:border-white/40"
                placeholder="Website URL"
              />
              <input
                type="email"
                value={editedProfile.socials?.email || ''}
                onChange={(e) => onEditChange('socials', { ...editedProfile.socials, email: e.target.value })}
                className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-white/40 focus:outline-none focus:border-white/40"
                placeholder="Email"
              />
            </div>
          ) : (
            profile.socials && Object.values(profile.socials).some(Boolean) && (
              <div className="flex gap-3 mt-4">
                {profile.socials.twitter && (
                  <a
                    href={profile.socials.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-white/10 text-white/70 rounded-lg hover:bg-white/20 hover:text-white transition-colors"
                  >
                    <Twitter className="w-4 h-4" />
                  </a>
                )}
                {profile.socials.github && (
                  <a
                    href={profile.socials.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-white/10 text-white/70 rounded-lg hover:bg-white/20 hover:text-white transition-colors"
                  >
                    <Github className="w-4 h-4" />
                  </a>
                )}
                {profile.socials.website && (
                  <a
                    href={profile.socials.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-white/10 text-white/70 rounded-lg hover:bg-white/20 hover:text-white transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                  </a>
                )}
                {profile.socials.email && (
                  <a
                    href={`mailto:${profile.socials.email}`}
                    className="p-2 bg-white/10 text-white/70 rounded-lg hover:bg-white/20 hover:text-white transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                  </a>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Tab Components
// ============================================

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all
        ${active
          ? 'bg-white/20 text-white shadow-lg'
          : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
        }
      `}
      whileTap={{ scale: 0.95 }}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </motion.button>
  );
}

// ============================================
// Overview Tab
// ============================================

interface OverviewTabProps {
  profile: AgentProfileData;
  stats: ProfileStatsData;
  achievements: Achievement[];
  activityData: ActivityDay[];
}

function OverviewTab({ profile, stats, achievements, activityData }: OverviewTabProps) {
  const level = calculateLevel(profile.xp);
  const recentAchievements = achievements
    .filter((a) => a.unlocked)
    .sort((a, b) => (b.unlockedAt || 0) - (a.unlockedAt || 0))
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <ProfileStats
        stats={stats}
        earnings={{ totalEarned: profile.totalEarned, totalSpent: profile.totalSpent }}
      />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Level Progress */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-violet-400" />
            Level Progress
          </h3>
          <AgentLevelProgress level={level} />
        </div>

        {/* Recent Achievements */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            Recent Achievements
          </h3>
          {recentAchievements.length > 0 ? (
            <div className="space-y-3">
              {recentAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-3 p-3 bg-white/5 rounded-xl"
                >
                  <div className="text-2xl">{achievement.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{achievement.name}</p>
                    <p className="text-sm text-white/50">{achievement.description}</p>
                  </div>
                  <span className="text-emerald-400 text-sm font-medium">+{achievement.xpReward} XP</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/40 text-center py-8">No achievements unlocked yet</p>
          )}
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <ActivityHeatmap data={activityData} title="Activity (Last Year)" />
      </div>
    </div>
  );
}

// ============================================
// Settings Tab
// ============================================

interface SettingsTabProps {
  onEdit: () => void;
}

function SettingsTab({ onEdit }: SettingsTabProps) {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Profile Settings</h3>
          <p className="text-sm text-white/50 mt-1">Manage your profile information</p>
        </div>
        <motion.button
          onClick={onEdit}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors"
          whileTap={{ scale: 0.95 }}
        >
          <Edit3 className="w-4 h-4" />
          Edit Profile
        </motion.button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between py-3 border-b border-white/10">
          <div>
            <p className="text-white font-medium">Public Profile</p>
            <p className="text-sm text-white/50">Make your profile visible to everyone</p>
          </div>
          <div className="w-12 h-6 bg-emerald-500/20 rounded-full relative">
            <div className="absolute right-1 top-1 w-4 h-4 bg-emerald-500 rounded-full" />
          </div>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-white/10">
          <div>
            <p className="text-white font-medium">Show Wallet Address</p>
            <p className="text-sm text-white/50">Display your wallet address on profile</p>
          </div>
          <div className="w-12 h-6 bg-emerald-500/20 rounded-full relative">
            <div className="absolute right-1 top-1 w-4 h-4 bg-emerald-500 rounded-full" />
          </div>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-white/10">
          <div>
            <p className="text-white font-medium">Activity Status</p>
            <p className="text-sm text-white/50">Show when you're active</p>
          </div>
          <div className="w-12 h-6 bg-white/10 rounded-full relative">
            <div className="absolute left-1 top-1 w-4 h-4 bg-white/40 rounded-full" />
          </div>
        </div>

        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-white font-medium">Email Notifications</p>
            <p className="text-sm text-white/50">Receive updates about your account</p>
          </div>
          <div className="w-12 h-6 bg-emerald-500/20 rounded-full relative">
            <div className="absolute right-1 top-1 w-4 h-4 bg-emerald-500 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function AgentProfile({
  profile,
  stats,
  achievements,
  activityData,
  isLoading = false,
  isEditable = true,
  onProfileUpdate,
  className = '',
}: AgentProfileProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<AgentProfileData>>({});

  const handleEdit = useCallback(() => {
    setEditedProfile({
      name: profile.name,
      bio: profile.bio,
      socials: profile.socials,
    });
    setIsEditing(true);
  }, [profile]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditedProfile({});
  }, []);

  const handleSave = useCallback(async () => {
    if (!onProfileUpdate) return;
    
    setIsSaving(true);
    try {
      await onProfileUpdate(editedProfile);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSaving(false);
    }
  }, [editedProfile, onProfileUpdate]);

  const handleEditChange = useCallback((field: string, value: any) => {
    setEditedProfile((prev) => ({ ...prev, [field]: value }));
  }, []);

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <ProfileHeader
        profile={profile}
        isEditing={isEditing}
        editedProfile={editedProfile}
        onEditChange={handleEditChange}
        onSave={handleSave}
        onCancel={handleCancel}
        isSaving={isSaving}
      />

      {/* Tabs */}
      {!isEditing && (
        <div className="flex flex-wrap gap-2">
          <TabButton
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
            icon={<User className="w-4 h-4" />}
            label="Overview"
          />
          <TabButton
            active={activeTab === 'achievements'}
            onClick={() => setActiveTab('achievements')}
            icon={<Award className="w-4 h-4" />}
            label="Achievements"
          />
          <TabButton
            active={activeTab === 'activity'}
            onClick={() => setActiveTab('activity')}
            icon={<Activity className="w-4 h-4" />}
            label="Activity"
          />
          {isEditable && (
            <TabButton
              active={activeTab === 'settings'}
              onClick={() => setActiveTab('settings')}
              icon={<Settings className="w-4 h-4" />}
              label="Settings"
            />
          )}
        </div>
      )}

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={isEditing ? 'editing' : activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <OverviewTab
              profile={profile}
              stats={stats}
              achievements={achievements}
              activityData={activityData}
            />
          )}

          {activeTab === 'achievements' && (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <AchievementGallery achievements={achievements} />
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-6">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <ActivityHeatmap data={activityData} title="Activity History" />
              </div>
            </div>
          )}

          {activeTab === 'settings' && isEditable && (
            <SettingsTab onEdit={handleEdit} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ============================================
// Sample Data Generators
// ============================================

export function generateSampleProfile(): AgentProfileData {
  return {
    id: 'agent-' + Math.random().toString(36).substr(2, 9),
    name: 'Alpha Agent',
    bio: 'Web3 developer and AI enthusiast. Building the future of decentralized applications.',
    walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
    level: 42,
    xp: 125000,
    reputation: 95,
    tasksCompleted: 156,
    tasksPosted: 23,
    totalEarned: '45000.50',
    totalSpent: '12000.25',
    memberSince: Date.now() - 365 * 24 * 60 * 60 * 1000,
    lastActive: Date.now(),
    location: 'San Francisco, CA',
    socials: {
      twitter: 'https://twitter.com/alphaagent',
      github: 'https://github.com/alphaagent',
      website: 'https://alphaagent.dev',
      email: 'hello@alphaagent.dev',
    },
    skills: ['Solidity', 'React', 'TypeScript', 'AI/ML', 'DeFi', 'Smart Contracts'],
    isVerified: true,
    isPremium: true,
    status: 'online',
  };
}

export function generateSampleStats(): ProfileStatsData {
  return {
    tasksCompleted: 156,
    tasksCompletedThisMonth: 12,
    successRate: 0.94,
    averageRating: 4.8,
    totalReviews: 89,
    currentStreak: 15,
    longestStreak: 45,
    averageResponseTime: 12,
    totalWorkingHours: 1240,
  };
}

export function generateSampleAchievements(): Achievement[] {
  return [
    {
      id: '1',
      name: 'First Steps',
      description: 'Complete your first task',
      icon: '🎯',
      tier: 'bronze',
      xpReward: 100,
      unlocked: true,
      unlockedAt: Date.now() - 300 * 24 * 60 * 60 * 1000,
      progress: 100,
      criteria: { type: 'tasks_completed', value: 1, description: 'Complete 1 task' },
    },
    {
      id: '2',
      name: 'Task Master',
      description: 'Complete 100 tasks',
      icon: '💯',
      tier: 'silver',
      xpReward: 500,
      unlocked: true,
      unlockedAt: Date.now() - 100 * 24 * 60 * 60 * 1000,
      progress: 100,
      criteria: { type: 'tasks_completed', value: 100, description: 'Complete 100 tasks' },
    },
    {
      id: '3',
      name: 'Top Earner',
      description: 'Earn over $10,000',
      icon: '💰',
      tier: 'gold',
      xpReward: 1000,
      unlocked: true,
      unlockedAt: Date.now() - 50 * 24 * 60 * 60 * 1000,
      progress: 100,
      criteria: { type: 'earnings', value: 10000, description: 'Earn $10,000' },
    },
    {
      id: '4',
      name: 'Reputation King',
      description: 'Reach 90+ reputation score',
      icon: '👑',
      tier: 'platinum',
      xpReward: 2500,
      unlocked: true,
      unlockedAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
      progress: 100,
      criteria: { type: 'reputation', value: 90, description: 'Reach 90 reputation' },
    },
    {
      id: '5',
      name: 'Diamond Hands',
      description: 'Hold premium status for 1 year',
      icon: '💎',
      tier: 'diamond',
      xpReward: 5000,
      unlocked: false,
      progress: 75,
      criteria: { type: 'special', value: 365, description: '1 year premium' },
    },
    {
      id: '6',
      name: 'Speed Demon',
      description: 'Complete 50 tasks with under 1 hour response time',
      icon: '⚡',
      tier: 'gold',
      xpReward: 1500,
      unlocked: false,
      progress: 60,
      criteria: { type: 'tasks_completed', value: 50, description: '50 fast tasks' },
    },
  ];
}

// ============================================
// Exports
// ============================================

export default AgentProfile;
