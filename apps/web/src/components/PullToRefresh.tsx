import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowDown } from 'lucide-react';
import { usePullToRefresh } from '../hooks/useMobile';

interface PullToRefreshProps {
  /** Content to be wrapped */
  children: React.ReactNode;
  /** Callback when refresh is triggered */
  onRefresh: () => Promise<void>;
  /** Threshold distance in pixels to trigger refresh (default: 80) */
  threshold?: number;
  /** Maximum pull distance in pixels (default: 150) */
  maxDistance?: number;
  /** Custom refresh indicator component */
  indicator?: React.ReactNode;
  /** Whether pull-to-refresh is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * PullToRefresh Component
 * 
 * Wraps content and enables native-like pull-to-refresh functionality
 * on mobile devices.
 * 
 * @example
 * ```tsx
 * function MyPage() {
 *   const handleRefresh = async () => {
 *     await refetchData();
 *   };
 * 
 *   return (
 *     <PullToRefresh onRefresh={handleRefresh}>
 *       <MyContent />
 *     </PullToRefresh>
 *   );
 * }
 * ```
 */
export function PullToRefresh({
  children,
  onRefresh,
  threshold = 80,
  maxDistance = 150,
  indicator,
  disabled = false,
  className = '',
}: PullToRefreshProps) {
  const { containerRef, isPulling, isRefreshing, pullDistance, progress, canRefresh } = 
    usePullToRefresh(onRefresh, { threshold, maxDistance, disabled });

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Refresh Indicator */}
      <AnimatePresence>
        {(isPulling || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ 
              opacity: 1, 
              y: Math.min(pullDistance, maxDistance) - (isRefreshing ? 0 : 60)
            }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none"
            style={{ top: 0 }}
          >
            {indicator || (
              <div className="flex flex-col items-center gap-2">
                <motion.div
                  className={`
                    w-10 h-10 rounded-full bg-white shadow-lg 
                    flex items-center justify-center
                    border border-agora-100
                    ${canRefresh ? 'ring-2 ring-agora-500 ring-offset-2' : ''}
                  `}
                  animate={{
                    rotate: isRefreshing ? 360 : progress * 180,
                    scale: canRefresh && !isRefreshing ? 1.1 : 1,
                  }}
                  transition={{
                    rotate: isRefreshing 
                      ? { duration: 1, repeat: Infinity, ease: 'linear' }
                      : { type: 'spring', stiffness: 300 }
                  }}
                >
                  {isRefreshing ? (
                    <Loader2 className="w-5 h-5 text-agora-600" />
                  ) : (
                    <ArrowDown 
                      className={`w-5 h-5 transition-colors ${
                        canRefresh ? 'text-agora-600' : 'text-agora-400'
                      }`}
                      style={{ transform: `rotate(${progress * 180}deg)` }}
                    />
                  )}
                </motion.div>
                <span className="text-xs font-medium text-agora-600 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded-full">
                  {isRefreshing 
                    ? 'Refreshing...' 
                    : canRefresh 
                      ? 'Release to refresh' 
                      : 'Pull to refresh'}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <motion.div
        animate={{
          y: isPulling && !isRefreshing ? Math.min(pullDistance, maxDistance) : 0,
        }}
        transition={{
          type: isPulling ? 'tween' : 'spring',
          stiffness: 300,
          damping: 30,
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

interface RefreshIndicatorProps {
  /** Progress from 0 to 1 */
  progress: number;
  /** Whether currently refreshing */
  isRefreshing: boolean;
  /** Size of the indicator */
  size?: 'sm' | 'md' | 'lg';
  /** Custom color */
  color?: string;
}

/**
 * Standalone refresh indicator component
 */
export function RefreshIndicator({ 
  progress, 
  isRefreshing, 
  size = 'md',
  color = '#0052FF'
}: RefreshIndicatorProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div 
      className={`
        ${sizeClasses[size]} rounded-full bg-white shadow-lg 
        flex items-center justify-center border border-agora-100
      `}
    >
      {isRefreshing ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className={iconSizes[size]} style={{ color }} />
        </motion.div>
      ) : (
        <motion.div
          animate={{ rotate: progress * 180 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <ArrowDown className={iconSizes[size]} style={{ color }} />
        </motion.div>
      )}
    </div>
  );
}

export default PullToRefresh;
