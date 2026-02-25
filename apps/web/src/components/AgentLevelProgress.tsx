import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Star, Crown, Target } from 'lucide-react';

interface AgentLevel {
  level: number;
  title: string;
  currentXP: number;
  maxXP: number;
  totalXP: number;
  nextLevelTitle: string;
}

interface AgentLevelProgressProps {
  level: AgentLevel;
  className?: string;
  compact?: boolean;
}

interface CompareAgentsProps {
  agents: Array<{
    id: string;
    name: string;
    level: number;
    xp: number;
    avatar?: string;
  }>;
  className?: string;
}

const levelTitles: Record<number, string> = {
  1: 'Novice',
  2: 'Apprentice',
  3: 'Journeyman',
  4: 'Expert',
  5: 'Master',
  6: 'Grandmaster',
  7: 'Legend',
  8: 'Mythic',
  9: 'Immortal',
  10: 'Transcendent',
};

/**
 * Calculate level from total XP
 */
export function calculateLevel(totalXP: number): AgentLevel {
  // XP required for each level (exponential growth)
  const baseXP = 100;
  const growthRate = 1.5;
  
  let level = 1;
  let xpForCurrentLevel = 0;
  let xpForNextLevel = baseXP;
  
  while (totalXP >= xpForNextLevel && level < 100) {
    xpForCurrentLevel = xpForNextLevel;
    xpForNextLevel = Math.floor(xpForNextLevel * growthRate);
    level++;
  }
  
  const currentLevelXP = totalXP - xpForCurrentLevel;
  const maxLevelXP = xpForNextLevel - xpForCurrentLevel;
  
  return {
    level,
    title: levelTitles[level] || `Level ${level}`,
    currentXP: currentLevelXP,
    maxXP: maxLevelXP,
    totalXP,
    nextLevelTitle: levelTitles[level + 1] || `Level ${level + 1}`,
  };
}

/**
 * Agent Level Progress Component
 * 
 * Displays agent level and XP progress with:
 * - Animated progress ring
 * - Level badge with glow effect
 * - XP breakdown
 * - Smooth transitions
 */
export function AgentLevelProgress({
  level,
  className = '',
  compact = false,
}: AgentLevelProgressProps) {
  const progress = useMemo(() => (level.currentXP / level.maxXP) * 100, [level]);
  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  if (compact) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="relative">
          <motion.div
            className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg"
            whileHover={{ scale: 1.1 }}
          >
            <span className="text-lg font-bold text-white">{level.level}</span>
          </motion.div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-500" />
            <span className="font-semibold text-agora-900">{level.title}</span>
          </div>
          <div className="mt-1 h-2 bg-agora-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="text-xs text-agora-500 mt-0.5">
            {level.currentXP.toLocaleString()} / {level.maxXP.toLocaleString()} XP
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl p-5 border border-agora-100 shadow-sm ${className}`}>
      <div className="flex items-start gap-5">
        {/* Circular progress */}
        <div className="relative flex-shrink-0">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            {/* Background circle */}
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="6"
            />
            {/* Progress circle */}
            <motion.circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
            {/* Gradient definition */}
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Level badge */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-xl font-bold text-white">{level.level}</span>
            </div>
          </motion.div>

          {/* Glow effect */}
          <motion.div
            className="absolute inset-0 rounded-full bg-violet-500/20 blur-xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>

        {/* Level details */}
        <div className="flex-1 pt-1">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-violet-500" />
            <h3 className="text-lg font-bold text-agora-900">{level.title}</h3>
          </div>
          
          <p className="text-sm text-agora-500 mt-1">
            {level.currentXP.toLocaleString()} / {level.maxXP.toLocaleString()} XP to{' '}
            <span className="text-violet-600 font-medium">{level.nextLevelTitle}</span>
          </p>

          {/* Progress bar */}
          <div className="mt-3 h-3 bg-agora-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 rounded-full relative overflow-hidden"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
              />
            </motion.div>
          </div>

          {/* Stats */}
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-agora-900">
                {level.totalXP.toLocaleString()} Total XP
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium text-agora-900">
                {Math.round(progress)}% Complete
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compare Agents Component
 * 
 * Shows a comparison of multiple agents' levels
 */
export function CompareAgents({ agents, className = '' }: CompareAgentsProps) {
  const maxXP = Math.max(...agents.map(a => a.xp));

  return (
    <div className={`bg-white rounded-2xl p-4 border border-agora-100 shadow-sm ${className}`}>
      <h3 className="font-semibold text-agora-900 mb-4 flex items-center gap-2">
        <Target className="w-5 h-5 text-agora-500" />
        Compare Agents
      </h3>
      
      <div className="space-y-4">
        {agents.map((agent, index) => {
          const level = calculateLevel(agent.xp);
          const percentage = (agent.xp / maxXP) * 100;
          
          return (
            <motion.div
              key={agent.id}
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                {level.level}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-agora-900">{agent.name}</span>
                  <span className="text-xs text-agora-500">{agent.xp.toLocaleString()} XP</span>
                </div>
                <div className="h-2 bg-agora-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Generate sample level data
 */
export function generateSampleLevel(): AgentLevel {
  return calculateLevel(45250);
}

export default AgentLevelProgress;
export type { AgentLevel };
