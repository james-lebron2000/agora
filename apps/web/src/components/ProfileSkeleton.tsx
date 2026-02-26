import React from 'react';
import { motion } from 'framer-motion';

interface ProfileSkeletonProps {
  variant?: 'full' | 'compact' | 'card';
  className?: string;
}

/**
 * Profile Skeleton Component
 * 
 * Provides loading state with staggered animations:
 * - Avatar loads first
 * - Stats load second with stagger
 * - Achievements load third
 * - Smooth pulse animations
 */
export function ProfileSkeleton({ variant = 'full', className = '' }: ProfileSkeletonProps) {
  if (variant === 'compact') {
    return <CompactSkeleton className={className} />;
  }

  if (variant === 'card') {
    return <CardSkeleton className={className} />;
  }

  return <FullSkeleton className={className} />;
}

/**
 * Full Profile Skeleton with staggered loading simulation
 */
function FullSkeleton({ className = '' }: { className?: string }) {
  // Animation variants for staggered children
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.4,
        ease: 'easeOut',
      },
    },
  };

  const pulseVariants = {
    initial: { opacity: 0.4 },
    animate: {
      opacity: [0.4, 0.8, 0.4],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  return (
    <motion.div 
      className={`min-h-screen bg-gradient-to-br from-agora-50 to-agora-100/50 pt-20 lg:pt-6 pb-24 ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <div className="max-w-3xl mx-auto px-3 sm:px-4">
        {/* Header Skeleton - Loads First */}
        <motion.div 
          className="bg-white rounded-2xl p-4 sm:p-5 border border-agora-100 shadow-sm mb-4"
          variants={itemVariants}
        >
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Avatar Skeleton */}
            <motion.div 
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-gray-200 to-gray-300"
              variants={pulseVariants}
              initial="initial"
              animate="animate"
            />
            
            <div className="flex-1 space-y-3">
              {/* Name Skeleton */}
              <motion.div 
                className="h-6 sm:h-8 w-40 sm:w-56 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg"
                variants={pulseVariants}
                initial="initial"
                animate="animate"
              />
              {/* ID Skeleton */}
              <motion.div 
                className="h-4 w-28 sm:w-36 bg-gradient-to-r from-gray-200 to-gray-300 rounded"
                variants={pulseVariants}
                initial="initial"
                animate="animate"
              />
              {/* Badges Skeleton */}
              <div className="flex gap-3 mt-3">
                {[1, 2, 3].map((i) => (
                  <motion.div 
                    key={i}
                    className="h-5 w-16 sm:w-20 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full"
                    variants={pulseVariants}
                    initial="initial"
                    animate="animate"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation Skeleton - Loads Second */}
        <motion.div 
          className="bg-white rounded-2xl p-1.5 border border-agora-100 shadow-sm mb-4"
          variants={itemVariants}
        >
          <div className="flex gap-1.5 overflow-x-auto">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <motion.div
                key={i}
                className="flex-shrink-0 h-14 sm:h-16 w-16 sm:w-20 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl"
                variants={pulseVariants}
                initial="initial"
                animate="animate"
                style={{ animationDelay: `${i * 0.05}s` }}
              />
            ))}
          </div>
        </motion.div>

        {/* Overview Content Skeleton - Loads Third with Progressive Stagger */}
        <motion.div className="space-y-4" variants={itemVariants}>
          {/* Health Score Card */}
          <motion.div 
            className="bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl p-6 h-32"
            variants={pulseVariants}
            initial="initial"
            animate="animate"
          />

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {[1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                className="bg-white rounded-xl p-3 sm:p-4 border border-gray-100"
                variants={itemVariants}
                custom={i}
              >
                <motion.div 
                  className="h-10 w-10 rounded-lg bg-gradient-to-r from-gray-200 to-gray-300 mb-2"
                  variants={pulseVariants}
                  initial="initial"
                  animate="animate"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
                <motion.div 
                  className="h-5 w-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded mb-1"
                  variants={pulseVariants}
                  initial="initial"
                  animate="animate"
                  style={{ animationDelay: `${i * 0.1 + 0.05}s` }}
                />
                <motion.div 
                  className="h-3 w-16 bg-gradient-to-r from-gray-200 to-gray-300 rounded"
                  variants={pulseVariants}
                  initial="initial"
                  animate="animate"
                  style={{ animationDelay: `${i * 0.1 + 0.1}s` }}
                />
              </motion.div>
            ))}
          </div>

          {/* Activity Heatmap Skeleton */}
          <motion.div 
            className="bg-white rounded-2xl p-4 border border-gray-100"
            variants={itemVariants}
          >
            <motion.div 
              className="h-5 w-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded mb-4"
              variants={pulseVariants}
              initial="initial"
              animate="animate"
            />
            <div className="grid grid-cols-12 sm:grid-cols-20 gap-1">
              {Array.from({ length: 24 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="aspect-square rounded-sm bg-gradient-to-br from-gray-200 to-gray-300"
                  variants={pulseVariants}
                  initial="initial"
                  animate="animate"
                  style={{ 
                    animationDelay: `${i * 0.02}s`,
                    opacity: 0.3 + (i % 4) * 0.15,
                  }}
                />
              ))}
            </div>
          </motion.div>

          {/* Quick Stats Skeleton */}
          <motion.div 
            className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100"
            variants={itemVariants}
          >
            <motion.div 
              className="h-5 w-28 bg-gradient-to-r from-gray-200 to-gray-300 rounded mb-4"
              variants={pulseVariants}
              initial="initial"
              animate="animate"
            />
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {[1, 2, 3].map((i) => (
                <motion.div 
                  key={i}
                  className="h-16 sm:h-20 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl"
                  variants={pulseVariants}
                  initial="initial"
                  animate="animate"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          </motion.div>

          {/* Achievements Skeleton - Loads Last */}
          <motion.div 
            className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100"
            variants={itemVariants}
          >
            <motion.div 
              className="h-5 w-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded mb-4"
              variants={pulseVariants}
              initial="initial"
              animate="animate"
            />
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300"
                  variants={pulseVariants}
                  initial="initial"
                  animate="animate"
                  style={{ animationDelay: `${i * 0.05 + 0.5}s` }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

/**
 * Compact Skeleton for inline/profile card usage
 */
function CompactSkeleton({ className = '' }: { className?: string }) {
  const pulseVariants = {
    initial: { opacity: 0.4 },
    animate: {
      opacity: [0.4, 0.7, 0.4],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  return (
    <div className={`bg-white rounded-2xl p-4 border border-gray-100 shadow-sm ${className}`}>
      <div className="flex items-center gap-4">
        <motion.div 
          className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-200 to-gray-300"
          variants={pulseVariants}
          initial="initial"
          animate="animate"
        />
        <div className="flex-1 space-y-2">
          <motion.div 
            className="h-5 w-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded"
            variants={pulseVariants}
            initial="initial"
            animate="animate"
          />
          <motion.div 
            className="h-4 w-24 bg-gradient-to-r from-gray-200 to-gray-300 rounded"
            variants={pulseVariants}
            initial="initial"
            animate="animate"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Card Skeleton for grid layouts
 */
function CardSkeleton({ className = '' }: { className?: string }) {
  const pulseVariants = {
    initial: { opacity: 0.4 },
    animate: {
      opacity: [0.4, 0.7, 0.4],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  return (
    <div className={`bg-white rounded-2xl p-5 border border-gray-100 shadow-sm ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-200 to-gray-300"
              variants={pulseVariants}
              initial="initial"
              animate="animate"
            />
            <div className="space-y-2">
              <motion.div 
                className="h-4 w-24 bg-gradient-to-r from-gray-200 to-gray-300 rounded"
                variants={pulseVariants}
                initial="initial"
                animate="animate"
              />
              <motion.div 
                className="h-3 w-16 bg-gradient-to-r from-gray-200 to-gray-300 rounded"
                variants={pulseVariants}
                initial="initial"
                animate="animate"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <motion.div 
            className="h-3 w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded"
            variants={pulseVariants}
            initial="initial"
            animate="animate"
          />
          <motion.div 
            className="h-3 w-3/4 bg-gradient-to-r from-gray-200 to-gray-300 rounded"
            variants={pulseVariants}
            initial="initial"
            animate="animate"
          />
        </div>

        {/* Footer */}
        <div className="flex gap-2 pt-2">
          <motion.div 
            className="h-6 w-16 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full"
            variants={pulseVariants}
            initial="initial"
            animate="animate"
          />
          <motion.div 
            className="h-6 w-16 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full"
            variants={pulseVariants}
            initial="initial"
            animate="animate"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Progressive Loading Wrapper
 * 
 * Simulates progressive loading of different sections
 */
interface ProgressiveLoadingProps {
  children: React.ReactNode;
  loading: boolean;
  stages?: ('avatar' | 'stats' | 'achievements' | 'activity')[];
}

export function ProgressiveLoading({ 
  children, 
  loading, 
  stages = ['avatar', 'stats', 'activity', 'achievements'] 
}: ProgressiveLoadingProps) {
  const [loadedStages, setLoadedStages] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (!loading) {
      setLoadedStages(new Set(stages));
      return;
    }

    // Simulate progressive loading
    const timeouts: NodeJS.Timeout[] = [];
    
    stages.forEach((stage, index) => {
      const timeout = setTimeout(() => {
        setLoadedStages(prev => new Set([...prev, stage]));
      }, index * 300);
      timeouts.push(timeout);
    });

    return () => timeouts.forEach(clearTimeout);
  }, [loading, stages]);

  if (!loading) return <>{children}</>;

  return (
    <div className="relative">
      {/* Avatar loading state */}
      {!loadedStages.has('avatar') && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10"
          exit={{ opacity: 0 }}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full border-4 border-agora-200 border-t-agora-600 animate-spin" />
            <span className="text-sm text-agora-600">Loading profile...</span>
          </div>
        </motion.div>
      )}
      
      {/* Fade in children as stages load */}
      <motion.div
        animate={{ 
          opacity: loadedStages.size / stages.length,
          filter: `blur(${(1 - loadedStages.size / stages.length) * 4}px)`,
        }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/**
 * Stats Skeleton for stat cards
 */
export function StatsSkeleton({ count = 6 }: { count?: number }) {
  const pulseVariants = {
    initial: { opacity: 0.4 },
    animate: {
      opacity: [0.4, 0.7, 0.4],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <motion.div 
            className="w-10 h-10 rounded-lg bg-gradient-to-r from-gray-700 to-gray-600 mb-3"
            variants={pulseVariants}
            initial="initial"
            animate="animate"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
          <motion.div 
            className="h-6 w-16 bg-gradient-to-r from-gray-700 to-gray-600 rounded mb-1"
            variants={pulseVariants}
            initial="initial"
            animate="animate"
            style={{ animationDelay: `${i * 0.1 + 0.05}s` }}
          />
          <motion.div 
            className="h-4 w-20 bg-gradient-to-r from-gray-700 to-gray-600 rounded"
            variants={pulseVariants}
            initial="initial"
            animate="animate"
            style={{ animationDelay: `${i * 0.1 + 0.1}s` }}
          />
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Achievement Skeleton
 */
export function AchievementSkeleton({ count = 8 }: { count?: number }) {
  const pulseVariants = {
    initial: { opacity: 0.4 },
    animate: {
      opacity: [0.4, 0.7, 0.4],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  return (
    <div className="flex flex-wrap gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300"
          variants={pulseVariants}
          initial="initial"
          animate="animate"
          style={{ animationDelay: `${i * 0.05}s` }}
        />
      ))}
    </div>
  );
}

export default ProfileSkeleton;
