import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Star,
  Zap,
  Target,
  Crown,
  Diamond,
  Award,
  Medal,
  Flame,
  Rocket,
  Shield,
  Heart,
  Lock,
} from 'lucide-react';

type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'special';
type BadgeSize = 'sm' | 'md' | 'lg';

interface Badge {
  id: string;
  name: string;
  description: string;
  tier: BadgeTier;
  icon: string;
  earnedAt?: string;
  progress?: number;
  maxProgress?: number;
}

interface AchievementBadgeProps {
  badge: Badge;
  size?: BadgeSize;
  showProgress?: boolean;
  isLocked?: boolean;
  className?: string;
  onClick?: () => void;
}

interface AchievementBadgeGridProps {
  badges: Badge[];
  title?: string;
  className?: string;
}

const tierColors: Record<BadgeTier, { bg: string; border: string; glow: string; text: string }> = {
  bronze: {
    bg: 'from-amber-700/20 to-amber-900/20',
    border: 'border-amber-700/50',
    glow: 'shadow-amber-700/30',
    text: 'text-amber-600',
  },
  silver: {
    bg: 'from-slate-400/20 to-slate-600/20',
    border: 'border-slate-400/50',
    glow: 'shadow-slate-400/30',
    text: 'text-slate-500',
  },
  gold: {
    bg: 'from-yellow-400/20 to-yellow-600/20',
    border: 'border-yellow-400/50',
    glow: 'shadow-yellow-400/30',
    text: 'text-yellow-500',
  },
  platinum: {
    bg: 'from-cyan-400/20 to-blue-600/20',
    border: 'border-cyan-400/50',
    glow: 'shadow-cyan-400/30',
    text: 'text-cyan-500',
  },
  diamond: {
    bg: 'from-purple-400/20 via-pink-400/20 to-cyan-400/20',
    border: 'border-purple-400/50',
    glow: 'shadow-purple-400/30',
    text: 'text-purple-500',
  },
  special: {
    bg: 'from-rose-400/20 via-amber-400/20 to-emerald-400/20',
    border: 'border-rose-400/50',
    glow: 'shadow-rose-400/30',
    text: 'text-rose-500',
  },
};

const sizeMap = {
  sm: { container: 'w-10 h-10 sm:w-12 sm:h-12', icon: 'w-4 h-4 sm:w-5 sm:h-5', progress: 'h-1' },
  md: { container: 'w-14 h-14 sm:w-16 sm:h-16', icon: 'w-5 h-5 sm:w-6 sm:h-6', progress: 'h-1.5' },
  lg: { container: 'w-16 h-16 sm:w-20 sm:h-20', icon: 'w-6 h-6 sm:w-8 sm:h-8', progress: 'h-2' },
};

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  trophy: Trophy,
  star: Star,
  zap: Zap,
  target: Target,
  crown: Crown,
  diamond: Diamond,
  award: Award,
  medal: Medal,
  flame: Flame,
  rocket: Rocket,
  shield: Shield,
  heart: Heart,
};

/**
 * Achievement Badge Component
 * 
 * Displays a single achievement badge with:
 * - Tier-based gradient colors
 * - Smooth animations
 * - Progress indicator (for in-progress badges)
 * - Locked state styling
 * - Glow effects for higher tiers
 */
export function AchievementBadge({
  badge,
  size = 'md',
  showProgress = false,
  isLocked = false,
  className = '',
  onClick,
}: AchievementBadgeProps) {
  const colors = tierColors[badge.tier];
  const sizeConfig = sizeMap[size];
  const Icon = iconMap[badge.icon] || Trophy;
  const progressPercent = badge.progress && badge.maxProgress
    ? (badge.progress / badge.maxProgress) * 100
    : 0;

  return (
    <motion.div
      className={`relative group cursor-pointer ${className}`}
      onClick={onClick}
      whileHover={{ scale: isLocked ? 1 : 1.1, y: isLocked ? 0 : -4 }}
      whileTap={{ scale: isLocked ? 1 : 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {/* Tooltip */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
        <div className="bg-agora-900 text-white text-xs rounded-lg py-1.5 px-3 whitespace-nowrap shadow-lg">
          <p className="font-semibold">{badge.name}</p>
          <p className="text-agora-300 text-[10px]">{badge.description}</p>
        </div>
        <div className="w-2 h-2 bg-agora-900 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1" />
      </div>

      {/* Badge container */}
      <motion.div
        className={`
          ${sizeConfig.container}
          rounded-2xl
          bg-gradient-to-br ${colors.bg}
          border-2 ${colors.border}
          flex items-center justify-center
          relative
          overflow-hidden
          ${!isLocked && badge.tier === 'diamond' ? `shadow-lg ${colors.glow}` : ''}
          ${isLocked ? 'opacity-50 grayscale' : ''}
        `}
        initial={{ opacity: 0, rotateY: -90 }}
        animate={{ opacity: 1, rotateY: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent" />
        
        {/* Icon */}
        <Icon className={`${sizeConfig.icon} ${colors.text} relative z-10`} />

        {/* Locked overlay */}
        {isLocked && (
          <div className="absolute inset-0 bg-agora-900/30 flex items-center justify-center">
            <Lock className="w-4 h-4 text-white" />
          </div>
        )}

        {/* Animated glow for diamond/special tiers */}
        {(badge.tier === 'diamond' || badge.tier === 'special') && !isLocked && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </motion.div>

      {/* Progress bar */}
      {showProgress && badge.progress !== undefined && badge.maxProgress !== undefined && (
        <div className={`mt-2 w-full ${sizeConfig.progress} bg-agora-200 rounded-full overflow-hidden`}>
          <motion.div
            className={`h-full rounded-full ${colors.text.replace('text-', 'bg-')}`}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, delay: 0.2 }}
          />
        </div>
      )}
    </motion.div>
  );
}

/**
 * Achievement Badge Grid Component
 * 
 * Displays a grid of achievement badges with a title
 */
export function AchievementBadgeGrid({
  badges,
  title = 'Achievements',
  className = '',
}: AchievementBadgeGridProps) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    show: { opacity: 1, scale: 1, y: 0 },
  };

  return (
    <div className={`bg-white rounded-2xl p-4 border border-agora-100 shadow-sm ${className}`}>
      <h3 className="font-semibold text-agora-900 mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-agora-500" />
        {title}
      </h3>
      
      <motion.div
        className="flex flex-wrap gap-3"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {badges.map((badge) => (
          <motion.div key={badge.id} variants={item}>
            <AchievementBadge
              badge={badge}
              size="md"
              showProgress={badge.progress !== undefined && badge.maxProgress !== undefined}
              isLocked={!badge.earnedAt}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

/**
 * Generate sample badges for demonstration
 */
export function generateSampleBadges(): Badge[] {
  return [
    { id: '1', name: 'First Task', description: 'Complete your first task', tier: 'bronze', icon: 'star', earnedAt: '2024-01-01' },
    { id: '2', name: 'Task Master', description: 'Complete 100 tasks', tier: 'silver', icon: 'trophy', earnedAt: '2024-01-15', progress: 75, maxProgress: 100 },
    { id: '3', name: 'Speed Demon', description: 'Complete 10 tasks in one day', tier: 'gold', icon: 'zap', earnedAt: '2024-02-01' },
    { id: '4', name: 'Elite Agent', description: 'Reach Platinum tier', tier: 'platinum', icon: 'crown', earnedAt: '2024-02-15' },
    { id: '5', name: 'Legendary', description: 'Reach Diamond tier', tier: 'diamond', icon: 'diamond' },
    { id: '6', name: 'Community Hero', description: 'Help 50 other agents', tier: 'gold', icon: 'heart', progress: 30, maxProgress: 50 },
    { id: '7', name: 'Early Adopter', description: 'Joined during beta', tier: 'special', icon: 'rocket', earnedAt: '2024-01-01' },
    { id: '8', name: 'Guardian', description: 'Maintain 99% uptime', tier: 'platinum', icon: 'shield', progress: 95, maxProgress: 99 },
  ];
}

export default AchievementBadge;
export type { Badge, BadgeTier };
