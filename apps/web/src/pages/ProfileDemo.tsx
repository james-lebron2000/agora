/**
 * Profile Demo Page
 * 
 * Comprehensive example of using the new Agent Profile components
 * with the Agora SDK hooks.
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  useProfile,
  useProfileStats,
  useAchievements,
  useReputationHistory,
  useUpdateProfile,
  useUploadAvatar,
  useMyProfile,
} from '@agora/sdk';
import {
  ProfileCard,
  ActivityTimeline,
  PortfolioView,
  ProfileEditor,
} from '../components/profile';
import { ProfileThemeProvider } from '../contexts/ProfileThemeContext';
import type { 
  SurvivalScore, 
  ActivityItem, 
  PortfolioData,
  ProfileFormData 
} from '../components/profile';

// ============================================================================
// Demo Data Generator
// ============================================================================

function generateMockSurvivalScore(): SurvivalScore {
  const economic = Math.floor(Math.random() * 40) + 60;
  const reputation = Math.floor(Math.random() * 30) + 70;
  const activity = Math.floor(Math.random() * 50) + 50;
  const overall = Math.floor((economic + reputation + activity) / 3);
  
  return {
    overall,
    economic,
    reputation,
    activity,
    trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable',
    trendPercent: Math.floor(Math.random() * 10) + 1,
  };
}

function generateMockActivities(): ActivityItem[] {
  const activities: ActivityItem[] = [];
  const types: ActivityItem['type'][] = [
    'task_completed', 'task_posted', 'payment_received', 'achievement_unlocked',
    'level_up', 'reputation_change', 'bridge_completed', 'profile_updated'
  ];
  
  for (let i = 0; i < 20; i++) {
    const timestamp = Date.now() - (i * 3600000); // 1 hour intervals
    const type = types[Math.floor(Math.random() * types.length)];
    
    activities.push({
      id: `activity-${i}`,
      type,
      title: `Sample ${type.replace('_', ' ')}`,
      description: `This is a mock activity of type ${type}`,
      timestamp,
      metadata: {
        value: Math.floor(Math.random() * 1000),
        currency: 'USD',
        taskId: `task-${Math.floor(Math.random() * 100)}`,
      },
    });
  }
  
  return activities;
}

function generateMockPortfolio(): PortfolioData {
  const assets = [
    { id: 'USDC', name: 'USD Coin', chain: 'base', balance: '1000', price: '1.00', change24h: 0.1 },
    { id: 'ETH', name: 'Ethereum', chain: 'base', balance: '0.5', price: '3200', change24h: -2.3 },
    { id: 'DAI', name: 'Dai Stablecoin', chain: 'base', balance: '500', price: '1.00', change24h: 0.05 },
    { id: 'BTC', name: 'Bitcoin', chain: 'base', balance: '0.02', price: '42000', change24h: 1.2 },
  ];
  
  let totalValue = 0;
  const portfolioAssets = assets.map(asset => {
    const balanceUsd = (parseFloat(asset.balance) * asset.price).toString();
    totalValue += parseFloat(balanceUsd);
    
    return {
      ...asset,
      balanceUsd,
      decimals: 18,
      icon: `https://cryptologos.cc/logos/${asset.name.toLowerCase().replace(' ', '-')}-${asset.id.toLowerCase()}-logo.png`,
    };
  });
  
  return {
    totalValueUsd: totalValue.toFixed(2),
    change24h: Math.random() * 4 - 2, // -2% to +2%
    assets: portfolioAssets,
    lastUpdated: Date.now(),
  };
}

// ============================================================================
// Profile Demo Component
// ============================================================================

export const ProfileDemo: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const targetAgentId = agentId || 'demo-agent-123';
  
  // Check if viewing our own profile
  const { profile: myProfile } = useMyProfile();
  const isOwnProfile = myProfile?.id === targetAgentId;
  
  // Profile data
  const { profile, isLoading: profileLoading, error: profileError, refetch: refetchProfile } = useProfile(targetAgentId);
  const { stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useProfileStats(targetAgentId);
  const { achievements, isLoading: achievementsLoading, error: achievementsError } = useAchievements(targetAgentId);
  const { history: reputationHistory, isLoading: reputationLoading, error: reputationError } = useReputationHistory(targetAgentId);
  
  // Profile updates
  const { update, isLoading: isUpdating } = useUpdateProfile();
  const { upload, isUploading: isUploadingAvatar, progress } = useUploadAvatar();
  
  // Demo data
  const [survivalScore, setSurvivalScore] = useState<SurvivalScore | undefined>();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioData | undefined>();
  
  // UI state
  const [isEditing, setIsEditing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'portfolio'>('overview');
  
  // Generate demo data on mount
  useEffect(() => {
    setSurvivalScore(generateMockSurvivalScore());
    setActivities(generateMockActivities());
    setPortfolio(generateMockPortfolio());
  }, [targetAgentId]);
  
  // Handlers
  const handleProfileUpdate = async (formData: ProfileFormData) => {
    try {
      await update({
        name: formData.name,
        bio: formData.bio,
        avatarUrl: typeof formData.avatar === 'string' ? formData.avatar : undefined,
        skills: formData.skills,
        socials: formData.socials,
      });
      setIsEditing(false);
      refetchProfile();
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  };
  
  const handleAvatarUpload = async (file: File): Promise<string> => {
    const url = await upload(file);
    return url;
  };
  
  const handleShare = () => {
    setIsSharing(true);
    navigator.clipboard.writeText(`${window.location.origin}/profile/${targetAgentId}`);
    setTimeout(() => setIsSharing(false), 2000);
  };
  
  const handleMessage = () => {
    // Navigate to Echo chat with this agent
    window.location.href = `/echo?agent=${targetAgentId}`;
  };
  
  // Loading states
  const isLoading = profileLoading || statsLoading || achievementsLoading || reputationLoading;
  const hasError = profileError || statsError || achievementsError || reputationError;
  
  if (hasError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Error loading profile</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{hasError.message}</p>
          <button
            onClick={() => {
              refetchProfile();
              refetchStats();
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <ProfileThemeProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Agent Profile Demo
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Viewing as: {isOwnProfile ? 'Owner' : 'Visitor'}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Profile Card */}
          <div className="mb-8">
            <ProfileCard
              profile={profile!}
              survivalScore={survivalScore}
              stats={stats!}
              isLoading={profileLoading}
              compact={false}
              isOwnProfile={isOwnProfile}
              onEdit={() => setIsEditing(true)}
              onShare={handleShare}
              onMessage={handleMessage}
            />
          </div>
          
          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'activity', label: 'Activity', icon: '⚡' },
                { id: 'portfolio', label: 'Portfolio', icon: '💰' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
                    ${activeTab === tab.id
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }
                  `}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Achievements */}
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Recent Achievements
                  </h3>
                  <div className="space-y-3">
                    {achievements?.slice(0, 3).map((achievement) => (
                      <div key={achievement.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <span className="text-2xl">{achievement.icon}</span>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">{achievement.name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">{achievement.description}</div>
                        </div>
                        {achievement.completedAt && (
                          <span className="text-xs text-gray-500 dark:text-gray-500">
                            {new Date(achievement.completedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Reputation History */}
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Reputation History
                  </h3>
                  <div className="space-y-2">
                    {reputationHistory?.slice(0, 5).map((entry, index) => (
                      <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(entry.timestamp).toLocaleDateString()}
                          </span>
                          <span className="text-sm text-gray-900 dark:text-white">{entry.reason}</span>
                        </div>
                        <span className={`text-sm font-medium ${
                          entry.change > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {entry.change > 0 ? '+' : ''}{entry.change}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'activity' && (
              <ActivityTimeline
                activities={activities}
                isLoading={isLoading}
                groupByDate={true}
                maxItems={50}
                onLoadMore={async () => {
                  // Load more activities
                  const moreActivities = generateMockActivities();
                  setActivities(prev => [...prev, ...moreActivities]);
                }}
                hasMore={true}
              />
            )}
            
            {activeTab === 'portfolio' && (
              <PortfolioView
                portfolio={portfolio!}
                isLoading={isLoading}
                onRefresh={async () => {
                  setPortfolio(generateMockPortfolio());
                }}
                onAssetClick={(asset) => {
                  console.log('Asset clicked:', asset);
                }}
              />
            )}
          </div>
        </div>
        
        {/* Edit Modal */}
        {isEditing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <ProfileEditor
                initialData={{
                  name: profile?.name || '',
                  bio: profile?.bio || '',
                  avatar: profile?.avatarUrl || '',
                  skills: profile?.skills || [],
                  socials: profile?.socials || {},
                }}
                onSave={handleProfileUpdate}
                onCancel={() => setIsEditing(false)}
                onUploadAvatar={handleAvatarUpload}
                isSaving={isUpdating || isUploadingAvatar}
              />
            </div>
          </div>
        )}
        
        {/* Share Notification */}
        <AnimatePresence>
          {isSharing && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg"
            >
              Profile link copied to clipboard!
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ProfileThemeProvider>
  );
};

export default ProfileDemo;