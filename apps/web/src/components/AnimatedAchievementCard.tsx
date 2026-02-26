import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
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
  Sparkles,
  X,
} from 'lucide-react';

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'special';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  tier: BadgeTier;
  rarity: AchievementRarity;
  icon: string;
  earnedAt?: string;
  progress?: number;
  maxProgress?: number;
  xpReward: number;
  unlocked: boolean;
}

interface AnimatedAchievementCardProps {
  achievement: Achievement;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showProgress?: boolean;
  onUnlock?: () => void;
  className?: string;
}

interface AchievementDetailModalProps {
  achievement: Achievement;
  isOpen: boolean;
  onClose: () => void;
}

// Rarity configuration with colors and effects
const rarityConfig: Record<AchievementRarity, { 
  color: string; 
  bg: string; 
  border: string; 
  glow: string;
  label: string;
  particleColors: string[];
}> = {
  common: {
    color: 'text-slate-400',
    bg: 'from-slate-400/10 to-slate-600/10',
    border: 'border-slate-400/40',
    glow: 'shadow-slate-400/20',
    label: 'Common',
    particleColors: ['#94a3b8', '#64748b'],
  },
  rare: {
    color: 'text-blue-400',
    bg: 'from-blue-400/10 to-blue-600/10',
    border: 'border-blue-400/40',
    glow: 'shadow-blue-400/30',
    label: 'Rare',
    particleColors: ['#60a5fa', '#3b82f6'],
  },
  epic: {
    color: 'text-purple-400',
    bg: 'from-purple-400/10 via-pink-400/10 to-purple-600/10',
    border: 'border-purple-400/40',
    glow: 'shadow-purple-400/40',
    label: 'Epic',
    particleColors: ['#c084fc', '#e879f9', '#a855f7'],
  },
  legendary: {
    color: 'text-amber-400',
    bg: 'from-amber-400/20 via-orange-400/20 to-yellow-600/20',
    border: 'border-amber-400/50',
    glow: 'shadow-amber-400/50',
    label: 'Legendary',
    particleColors: ['#fbbf24', '#f59e0b', '#f97316', '#fcd34d'],
  },
};

// Tier configuration
const tierConfig: Record<BadgeTier, { color: string; bg: string; border: string }> = {
  bronze: {
    color: 'text-amber-700',
    bg: 'from-amber-700/20 to-amber-900/20',
    border: 'border-amber-700/50',
  },
  silver: {
    color: 'text-slate-400',
    bg: 'from-slate-400/20 to-slate-600/20',
    border: 'border-slate-400/50',
  },
  gold: {
    color: 'text-yellow-400',
    bg: 'from-yellow-400/20 to-yellow-600/20',
    border: 'border-yellow-400/50',
  },
  platinum: {
    color: 'text-cyan-400',
    bg: 'from-cyan-400/20 to-blue-600/20',
    border: 'border-cyan-400/50',
  },
  diamond: {
    color: 'text-purple-400',
    bg: 'from-purple-400/20 via-pink-400/20 to-cyan-400/20',
    border: 'border-purple-400/50',
  },
  special: {
    color: 'text-rose-400',
    bg: 'from-rose-400/20 via-amber-400/20 to-emerald-400/20',
    border: 'border-rose-400/50',
  },
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

const sizeMap = {
  sm: { container: 'w-14 h-14', icon: 'w-5 h-5', ring: 20 },
  md: { container: 'w-20 h-20', icon: 'w-7 h-7', ring: 28 },
  lg: { container: 'w-28 h-28', icon: 'w-10 h-10', ring: 40 },
  xl: { container: 'w-36 h-36', icon: 'w-14 h-14', ring: 52 },
};

/**
 * Circular Progress Ring Component
 */
function ProgressRing({ 
  progress, 
  max, 
  size, 
  strokeWidth = 3, 
  color 
}: { 
  progress: number; 
  max: number; 
  size: number; 
  strokeWidth?: number;
  color: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min(100, Math.max(0, (progress / max) * 100));
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="absolute inset-0" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-200"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
    </div>
  );
}

/**
 * Animated Achievement Card Component
 * 
 * Features:
 * - Confetti effect on unlock
 * - Progress ring animation
 * - Rarity badges with unique effects
 * - Smooth hover animations
 * - Click to view details
 */
export function AnimatedAchievementCard({
  achievement,
  size = 'md',
  showProgress = true,
  onUnlock,
  className = '',
}: AnimatedAchievementCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [hasUnlocked, setHasUnlocked] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const rarity = rarityConfig[achievement.rarity];
  const tier = tierConfig[achievement.tier];
  const sizeConfig = sizeMap[size];
  const Icon = iconMap[achievement.icon] || Trophy;
  const isLocked = !achievement.unlocked;

  // Trigger confetti on unlock
  const triggerConfetti = useCallback(() => {
    if (!cardRef.current || hasUnlocked) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    // Main burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x, y },
      colors: rarity.particleColors,
      disableForReducedMotion: true,
    });

    // Secondary bursts for legendary/epic
    if (achievement.rarity === 'legendary' || achievement.rarity === 'epic') {
      setTimeout(() => {
        confetti({
          particleCount: 50,
          spread: 100,
          origin: { x, y },
          colors: rarity.particleColors,
          disableForReducedMotion: true,
        });
      }, 200);
    }

    setHasUnlocked(true);
    onUnlock?.();
  }, [achievement.rarity, rarity.particleColors, hasUnlocked, onUnlock]);

  // Handle click to show details
  const handleClick = () => {
    setShowModal(true);
    if (!isLocked && !hasUnlocked) {
      triggerConfetti();
    }
  };

  return (
    <>
      <motion.div
        ref={cardRef}
        className={`relative group cursor-pointer ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        whileHover={{ scale: isLocked ? 1 : 1.05, y: isLocked ? 0 : -8 }}
        whileTap={{ scale: isLocked ? 1 : 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        {/* Rarity Glow Effect */}
        {!isLocked && (
          <motion.div
            className={`absolute inset-0 rounded-3xl ${rarity.glow} blur-xl`}
            animate={{ 
              opacity: isHovered ? 0.8 : 0.4,
              scale: isHovered ? 1.1 : 1,
            }}
            transition={{ duration: 0.3 }}
          />
        )}

        {/* Main Card Container */}
        <div className={`relative ${sizeConfig.container}`}>
          {/* Progress Ring (for in-progress achievements) */}
          {showProgress && achievement.progress !== undefined && achievement.maxProgress !== undefined && isLocked && (
            <ProgressRing
              progress={achievement.progress}
              max={achievement.maxProgress}
              size={sizeConfig.ring}
              color={rarity.color.replace('text-', '').replace('-400', '') === 'purple' ? '#c084fc' : '#60a5fa'}
            />
          )}

          {/* Badge Container */}
          <motion.div
            className={`
              w-full h-full
              rounded-2xl
              bg-gradient-to-br ${isLocked ? 'from-gray-100 to-gray-200' : tier.bg}
              border-2 ${isLocked ? 'border-gray-300' : tier.border}
              flex items-center justify-center
              relative
              overflow-hidden
              ${!isLocked && achievement.rarity === 'legendary' ? 'animate-pulse-slow' : ''}
            `}
            animate={!isLocked ? {
              boxShadow: isHovered 
                ? `0 0 30px ${rarity.particleColors[0]}40`
                : `0 0 0px transparent`
            } : {}}
          >
            {/* Shine Effect */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-transparent"
              animate={{ x: isHovered ? '100%' : '-100%' }}
              transition={{ duration: 0.6 }}
            />

            {/* Animated Background for Legendary/Epic */}
            {!isLocked && (achievement.rarity === 'legendary' || achievement.rarity === 'epic') && (
              <motion.div
                className="absolute inset-0 opacity-30"
                style={{
                  background: `linear-gradient(45deg, ${rarity.particleColors.join(', ')})`,
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
              />
            )}

            {/* Icon */}
            <Icon className={`${sizeConfig.icon} ${isLocked ? 'text-gray-400' : tier.color} relative z-10`} />

            {/* Locked Overlay */}
            {isLocked && (
              <div className="absolute inset-0 bg-gray-900/10 flex items-center justify-center backdrop-blur-[1px]">
                <Lock className="w-5 h-5 text-gray-500" />
              </div>
            )}

            {/* Sparkle Effects for Unlocked */}
            {!isLocked && (
              <motion.div
                className="absolute top-1 right-1"
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className={`w-3 h-3 ${rarity.color}`} />
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Rarity Badge */}
        <div className="absolute -top-2 -right-2 z-20">
          <motion.div
            className={`
              px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider
              ${rarity.bg} ${rarity.color} border ${rarity.border}
            `}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
          >
            {rarity.label}
          </motion.div>
        </div>

        {/* Tooltip */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              className="absolute -top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <div className={`bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-xl`}>
                <p className="font-semibold">{achievement.name}</p>
                <p className="text-gray-400 text-[10px]">{achievement.description}</p>
                {isLocked && achievement.progress !== undefined && (
                  <p className="text-blue-400 text-[10px] mt-1">
                    Progress: {achievement.progress}/{achievement.maxProgress}
                  </p>
                )}
              </div>
              <div className="w-2 h-2 bg-gray-900 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Indicator (below badge) */}
        {showProgress && isLocked && achievement.progress !== undefined && achievement.maxProgress !== undefined && (
          <div className="mt-2 w-full">
            <div className="flex justify-between text-[9px] text-gray-500 mb-0.5">
              <span>{achievement.progress}/{achievement.maxProgress}</span>
            </div>
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${rarity.color.replace('text-', 'bg-')}`}
                initial={{ width: 0 }}
                animate={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}
      </motion.div>

      {/* Detail Modal */}
      <AchievementDetailModal
        achievement={achievement}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}

/**
 * Achievement Detail Modal
 */
function AchievementDetailModal({ achievement, isOpen, onClose }: AchievementDetailModalProps) {
  const rarity = rarityConfig[achievement.rarity];
  const tier = tierConfig[achievement.tier];
  const Icon = iconMap[achievement.icon] || Trophy;
  const isLocked = !achievement.unlocked;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={`bg-white rounded-3xl shadow-2xl w-full max-w-sm pointer-events-auto overflow-hidden`}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with gradient */}
              <div className={`bg-gradient-to-br ${tier.bg} p-6 relative`}>
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>

                <div className="flex flex-col items-center">
                  {/* Large Badge */}
                  <motion.div
                    className={`
                      w-24 h-24 rounded-2xl
                      bg-gradient-to-br ${isLocked ? 'from-gray-100 to-gray-200' : tier.bg}
                      border-2 ${isLocked ? 'border-gray-300' : tier.border}
                      flex items-center justify-center
                      shadow-lg
                    `}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: 'spring' }}
                  >
                    <Icon className={`w-12 h-12 ${isLocked ? 'text-gray-400' : tier.color}`} />
                  </motion.div>

                  {/* Rarity Badge */}
                  <div className={`mt-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${rarity.bg} ${rarity.color} border ${rarity.border}`}>
                    {rarity.label}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900">{achievement.name}</h3>
                  <p className="text-gray-500 mt-1">{achievement.description}</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Tier</p>
                    <p className={`font-semibold capitalize ${tier.color}`}>{achievement.tier}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">XP Reward</p>
                    <p className="font-semibold text-emerald-600">+{achievement.xpReward}</p>
                  </div>
                </div>

                {/* Progress Section */}
                {isLocked && achievement.progress !== undefined && achievement.maxProgress !== undefined ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Progress</span>
                      <span className="font-medium">
                        {Math.round((achievement.progress / achievement.maxProgress) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${rarity.color.replace('text-', 'bg-')}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 text-center">
                      {achievement.progress} / {achievement.maxProgress}
                    </p>
                  </div>
                ) : achievement.earnedAt ? (
                  <div className="bg-emerald-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-emerald-600 uppercase tracking-wider">Unlocked</p>
                    <p className="font-medium text-emerald-700">
                      {new Date(achievement.earnedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                ) : null}

                {/* Status Badge */}
                <div className={`text-center py-2 rounded-xl ${isLocked ? 'bg-gray-100' : 'bg-emerald-50'}`}>
                  <span className={`font-medium ${isLocked ? 'text-gray-500' : 'text-emerald-600'}`}>
                    {isLocked ? '🔒 Locked' : '✨ Unlocked'}
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Achievement Grid Component
 */
interface AnimatedAchievementGridProps {
  achievements: Achievement[];
  title?: string;
  className?: string;
  columns?: 2 | 3 | 4 | 5;
}

export function AnimatedAchievementGrid({
  achievements,
  title = 'Achievements',
  className = '',
  columns = 4,
}: AnimatedAchievementGridProps) {
  const columnClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
  };

  return (
    <div className={`bg-white rounded-2xl p-5 border border-gray-100 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-gray-500" />
          {title}
        </h3>
        <span className="text-sm text-gray-500">
          {achievements.filter(a => a.unlocked).length} / {achievements.length}
        </span>
      </div>
      
      <div className={`grid ${columnClasses[columns]} gap-4 justify-items-center`}>
        {achievements.map((achievement, index) => (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <AnimatedAchievementCard
              achievement={achievement}
              size="md"
              showProgress
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default AnimatedAchievementCard;
