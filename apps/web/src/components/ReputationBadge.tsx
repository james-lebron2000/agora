import React from 'react';
import { useProfileTheme } from '../contexts/ProfileThemeContext';

export type ReputationTier = 'unrated' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

interface ReputationBadgeProps {
  score: number;
  tier: ReputationTier;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const tierConfig: Record<ReputationTier, { label: string; color: string; bgColor: string; icon: string }> = {
  unrated: {
    label: '未评级',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    icon: '○',
  },
  bronze: {
    label: '青铜',
    color: 'text-amber-600',
    bgColor: 'bg-amber-600/20',
    icon: '🥉',
  },
  silver: {
    label: '白银',
    color: 'text-slate-400',
    bgColor: 'bg-slate-400/20',
    icon: '🥈',
  },
  gold: {
    label: '黄金',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/20',
    icon: '🥇',
  },
  platinum: {
    label: '铂金',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/20',
    icon: '💎',
  },
  diamond: {
    label: '钻石',
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/20',
    icon: '👑',
  },
};

const sizeConfig = {
  sm: {
    container: 'px-2 py-0.5 text-xs',
    icon: 'text-sm',
    score: 'text-xs',
  },
  md: {
    container: 'px-3 py-1 text-sm',
    icon: 'text-base',
    score: 'text-sm',
  },
  lg: {
    container: 'px-4 py-2 text-base',
    icon: 'text-lg',
    score: 'text-base',
  },
};

export const ReputationBadge: React.FC<ReputationBadgeProps> = ({
  score,
  tier,
  showScore = true,
  size = 'md',
}) => {
  const { theme } = useProfileTheme();
  const config = tierConfig[tier];
  const sizes = sizeConfig[size];

  return (
    <div
      className={`
        inline-flex items-center gap-2 rounded-full border
        ${config.bgColor} ${config.color}
        ${sizes.container}
        transition-all duration-200 hover:scale-105
      `}
      style={{ borderColor: 'currentColor', borderOpacity: 0.3 }}
    >
      <span className={sizes.icon}>{config.icon}</span>
      <span className="font-medium">{config.label}</span>
      {showScore && (
        <span className={`${sizes.score} opacity-80`}>
          {score.toFixed(1)}
        </span>
      )}
    </div>
  );
};

interface ReputationScoreBarProps {
  score: number;
  maxScore?: number;
}

export const ReputationScoreBar: React.FC<ReputationScoreBarProps> = ({
  score,
  maxScore = 100,
}) => {
  const { theme } = useProfileTheme();
  const percentage = Math.min((score / maxScore) * 100, 100);

  let barColor = 'bg-gray-500';
  if (score >= 80) barColor = 'bg-purple-500';
  else if (score >= 60) barColor = 'bg-cyan-500';
  else if (score >= 40) barColor = 'bg-yellow-500';
  else if (score >= 20) barColor = 'bg-slate-400';
  else if (score >= 10) barColor = 'bg-amber-600';

  return (
    <div className="w-full">
      <div className={`h-2 rounded-full ${theme.background} overflow-hidden`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className={`flex justify-between mt-1 text-xs ${theme.textMuted}`}>
        <span>0</span>
        <span className={theme.text}>{score.toFixed(1)}</span>
        <span>{maxScore}</span>
      </div>
    </div>
  );
};

export default ReputationBadge;
