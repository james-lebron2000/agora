/**
 * ProfileCard Component
 * 
 * Displays agent profile information with survival score,
 * stats summary, and action buttons.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Edit3,
  Share2,
  MessageCircle,
  Shield,
  Crown,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  Clock,
  MapPin,
  CheckCircle2,
  Star,
  Wallet,
  BarChart3,
  Activity,
} from 'lucide-react';
import { useProfileTheme } from '../../contexts/ProfileThemeContext';
import type { ProfileCardProps, SurvivalScore } from './types';
import { calculateLevel } from '@agora/sdk';

// ============================================================================
// Helper Functions
// ============================================================================

function truncateAddress(address: string, chars = 6): string {
  if (!address || address.length < chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getActivityLevelColor(level: number): string {
  if (level >= 80) return 'text-green-500';
  if (level >= 60) return 'text-blue-500';
  if (level >= 40) return 'text-yellow-500';
  return 'text-gray-500';
}

// ============================================================================
// Survival Score Ring Component
// ============================================================================

interface SurvivalScoreRingProps {
  score: SurvivalScore;
  size?: number;
}

const SurvivalScoreRing: React.FC<SurvivalScoreRingProps> = ({ score, size = 80 }) => {
  const { themeConfig } = useProfileTheme();
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score.overall / 100) * circumference;

  const scoreColor = useMemo(() => {
    if (score.overall >= 80) return '#10b981';
    if (score.overall >= 60) return '#3b82f6';
    if (score.overall >= 40) return '#f59e0b';
    return '#ef4444';
  }, [score.overall]);

  const TrendIcon = score.trend === 'up' ? TrendingUp : score.trend === 'down' ? TrendingDown : Minus;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Background ring */}
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className={themeConfig.textMuted}
          opacity={0.2}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={scoreColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      
      {/* Score text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-xl font-bold ${themeConfig.text}`} style={{ color: scoreColor }}>
          {score.overall}
        </span>
        <span className={`text-[10px] ${themeConfig.textMuted}`}>Score</span>
      </div>

      {/* Trend indicator */}
      <div 
        className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ${
          score.trend === 'up' ? 'bg-green-100 text-green-600' :
          score.trend === 'down' ? 'bg-red-100 text-red-600' :
          'bg-gray-100 text-gray-600'
        }`}
      >
        <TrendIcon size={14} />
      </div>
    </div>
  );
};

// ============================================================================
// Stat Badge Component
// ============================================================================

interface StatBadgeProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  trend?: 'up' | 'down' | 'neutral' | 'stable';
}

const StatBadge: React.FC<StatBadgeProps> = ({ icon, value, label, trend }) => {
  const { themeConfig } = useProfileTheme();
  
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg ${themeConfig.surface} ${themeConfig.border} border`}>
      <div className={`p-1.5 rounded-md ${themeConfig.background}`}>
        {icon}
      </div>
      <div>
        <div className={`flex items-center gap-1 text-sm font-semibold ${themeConfig.text}`}>
          {value}
          {trend === 'up' && <TrendingUp size={12} className="text-green-500" />}
          {trend === 'down' && <TrendingDown size={12} className="text-red-500" />}
          {trend === 'stable' && <Minus size={12} className="text-gray-500" />}
        </div>
        <div className={`text-xs ${themeConfig.textMuted}`}>{label}</div>
      </div>
    </div>
  );
};

// ============================================================================
// Main Profile Card Component
// ============================================================================

export const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  survivalScore,
  stats,
  isLoading = false,
  compact = false,
  isOwnProfile = false,
  onEdit,
  onShare,
  onMessage,
  className = '',
}) => {
  const { themeConfig } = useProfileTheme();
  const level = calculateLevel(profile.xp);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3, ease: 'easeOut' as const }
    },
  };

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className={`rounded-2xl p-6 ${themeConfig.surface} ${themeConfig.border} border`}>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1 space-y-2">
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`
        relative overflow-hidden rounded-2xl 
        ${themeConfig.surface} 
        ${themeConfig.border} 
        border
        ${themeConfig.shadowStyle}
        ${className}
      `}
    >
      {/* Background gradient decoration */}
      <div className={`absolute inset-0 bg-gradient-to-br ${themeConfig.background} opacity-50 pointer-events-none`} />
      
      {/* Header Section */}
      <div className="relative p-6">
        <div className={`flex ${compact ? 'flex-col items-center text-center' : 'flex-col md:flex-row md:items-start'} gap-6`}>
          {/* Avatar Section */}
          <div className="relative shrink-0">
            <div className={`
              relative rounded-full overflow-hidden
              ${profile.isPremium ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}
            `}>
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="w-24 h-24 md:w-28 md:h-28 object-cover"
                />
              ) : (
                <div className={`
                  w-24 h-24 md:w-28 md:h-28 
                  flex items-center justify-center
                  ${themeConfig.background}
                  ${themeConfig.textMuted}
                `}>
                  <User size={48} />
                </div>
              )}
            </div>
            
            {/* Status indicator */}
            <div className={`
              absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-white dark:border-gray-900
              ${profile.isVerified ? 'bg-green-500' : 'bg-gray-400'}
            `}>
              {profile.isVerified && <CheckCircle2 size={12} className="text-white m-0.5" />}
            </div>

            {/* Level badge */}
            <div className={`
              absolute -bottom-1 -left-1
              px-2 py-0.5 rounded-full text-xs font-bold
              bg-gradient-to-r ${themeConfig.gradientPrimary}
              text-white shadow-lg
            `}>
              Lv.{level}
            </div>
          </div>

          {/* Info Section */}
          <div className="flex-1 min-w-0">
            {/* Name and badges */}
            <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
              <h2 className={`text-2xl font-bold ${themeConfig.text}`}>
                {profile.name}
              </h2>
              {profile.isVerified && (
                <span title="Verified">
                  <Shield size={20} className="text-blue-500" />
                </span>
              )}
              {profile.isPremium && (
                <span title="Premium">
                  <Crown size={20} className="text-yellow-500" />
                </span>
              )}
            </div>

            {/* Wallet address */}
            <div className={`mt-1 flex items-center gap-2 justify-center md:justify-start ${themeConfig.textMuted}`}>
              <Wallet size={14} />
              <span className="font-mono text-sm">{truncateAddress(profile.walletAddress)}</span>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className={`mt-3 text-sm ${themeConfig.textMuted} line-clamp-3`}>
                {profile.bio}
              </p>
            )}

            {/* Skills */}
            {profile.skills && profile.skills.length > 0 && (
              <div className={`mt-3 flex flex-wrap gap-1.5 justify-center md:justify-start`}>
                {profile.skills.slice(0, compact ? 3 : 6).map((skill) => (
                  <span
                    key={skill}
                    className={`
                      px-2 py-0.5 rounded-full text-xs
                      ${themeConfig.background} ${themeConfig.textMuted}
                      border ${themeConfig.border}
                    `}
                  >
                    {skill}
                  </span>
                ))}
                {profile.skills.length > (compact ? 3 : 6) && (
                  <span className={`text-xs ${themeConfig.textMuted}`}>
                    +{profile.skills.length - (compact ? 3 : 6)}
                  </span>
                )}
              </div>
            )}

            {/* Meta info */}
            <div className={`mt-4 flex items-center gap-4 text-xs ${themeConfig.textMuted} justify-center md:justify-start`}>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                Joined {formatDate(profile.memberSince)}
              </span>
              <span className="flex items-center gap-1">
                <Activity size={12} />
                Active {formatDate(profile.lastActive)}
              </span>
            </div>
          </div>

          {/* Survival Score (if provided) */}
          {survivalScore && !compact && (
            <div className="shrink-0 flex flex-col items-center">
              <SurvivalScoreRing score={survivalScore} size={90} />
              <span className={`mt-2 text-xs font-medium ${themeConfig.textMuted}`}>
                Survival Score
              </span>
            </div>
          )}
        </div>

        {/* Stats Row */}
        {(stats || survivalScore) && (
          <div className={`
            mt-6 pt-6 border-t ${themeConfig.border}
            grid grid-cols-2 md:grid-cols-4 gap-3
          `}>
            <StatBadge
              icon={<Award size={16} className="text-purple-500" />}
              value={formatNumber(profile.tasksCompleted)}
              label="Tasks Done"
              trend={stats && stats.tasksCompletedThisMonth > 0 ? 'up' : 'neutral'}
            />
            <StatBadge
              icon={<Star size={16} className="text-yellow-500" />}
              value={profile.reputation.toFixed(1)}
              label="Reputation"
              trend={survivalScore?.trend}
            />
            <StatBadge
              icon={<Zap size={16} className="text-blue-500" />}
              value={formatNumber(profile.xp)}
              label="XP Earned"
            />
            <StatBadge
              icon={<BarChart3 size={16} className="text-green-500" />}
              value={`$${formatNumber(parseFloat(profile.totalEarned))}`}
              label="Total Earned"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className={`
          mt-6 flex gap-2 
          ${compact ? 'flex-col' : 'flex-row justify-end'}
        `}>
          {isOwnProfile ? (
            <button
              onClick={onEdit}
              className={`
                flex items-center justify-center gap-2 px-4 py-2 rounded-lg
                bg-gradient-to-r ${themeConfig.gradientPrimary}
                text-white font-medium
                hover:opacity-90 transition-opacity
              `}
            >
              <Edit3 size={16} />
              Edit Profile
            </button>
          ) : (
            <>
              <button
                onClick={onMessage}
                className={`
                  flex items-center justify-center gap-2 px-4 py-2 rounded-lg
                  ${themeConfig.surface} ${themeConfig.border} border
                  ${themeConfig.text}
                  hover:opacity-80 transition-opacity
                `}
              >
                <MessageCircle size={16} />
                Message
              </button>
              <button
                onClick={onShare}
                className={`
                  flex items-center justify-center gap-2 px-4 py-2 rounded-lg
                  ${themeConfig.surface} ${themeConfig.border} border
                  ${themeConfig.text}
                  hover:opacity-80 transition-opacity
                `}
              >
                <Share2 size={16} />
                Share
              </button>
            </>
          )}
        </div>
      </div>

      {/* Compact Survival Score */}
      {survivalScore && compact && (
        <div className={`px-6 pb-6 border-t ${themeConfig.border} pt-4`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${themeConfig.text}`}>Survival Score</span>
            <div className="flex items-center gap-3">
              <div className={`text-2xl font-bold ${getActivityLevelColor(survivalScore.overall)}`}>
                {survivalScore.overall}
              </div>
              {survivalScore.trend === 'up' && <TrendingUp size={20} className="text-green-500" />}
              {survivalScore.trend === 'down' && <TrendingDown size={20} className="text-red-500" />}
            </div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div className={`p-2 rounded-lg ${themeConfig.background}`}>
              <div className={`text-sm font-semibold ${themeConfig.text}`}>{survivalScore.economic}</div>
              <div className={`text-xs ${themeConfig.textMuted}`}>Economic</div>
            </div>
            <div className={`p-2 rounded-lg ${themeConfig.background}`}>
              <div className={`text-sm font-semibold ${themeConfig.text}`}>{survivalScore.reputation}</div>
              <div className={`text-xs ${themeConfig.textMuted}`}>Reputation</div>
            </div>
            <div className={`p-2 rounded-lg ${themeConfig.background}`}>
              <div className={`text-sm font-semibold ${themeConfig.text}`}>{survivalScore.activity}</div>
              <div className={`text-xs ${themeConfig.textMuted}`}>Activity</div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ProfileCard;
