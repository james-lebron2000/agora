import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface AgentAvatarProps {
  agentId: string;
  agentName: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'busy' | 'unknown';
  showStatusRing?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { container: 'w-10 h-10', text: 'text-sm', ring: 'w-3 h-3', ringOffset: '-bottom-0.5 -right-0.5' },
  md: { container: 'w-16 h-16', text: 'text-2xl', ring: 'w-4 h-4', ringOffset: '-bottom-0.5 -right-0.5' },
  lg: { container: 'w-24 h-24', text: 'text-3xl', ring: 'w-5 h-5', ringOffset: '-bottom-1 -right-1' },
  xl: { container: 'w-32 h-32', text: 'text-4xl', ring: 'w-6 h-6', ringOffset: '-bottom-1 -right-1' },
};

const statusColors = {
  online: 'bg-success',
  offline: 'bg-gray-400',
  busy: 'bg-warning',
  unknown: 'bg-agora-400',
};

/**
 * Generate a deterministic gradient based on agent ID
 */
function generateGradient(agentId: string): string {
  let hash = 0;
  for (let i = 0; i < agentId.length; i++) {
    const char = agentId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const gradients = [
    'from-violet-500 via-purple-500 to-fuchsia-500',
    'from-blue-500 via-indigo-500 to-purple-500',
    'from-emerald-500 via-teal-500 to-cyan-500',
    'from-orange-500 via-amber-500 to-yellow-500',
    'from-rose-500 via-pink-500 to-fuchsia-500',
    'from-cyan-500 via-blue-500 to-indigo-500',
    'from-lime-500 via-green-500 to-emerald-500',
    'from-red-500 via-orange-500 to-amber-500',
  ];
  
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

/**
 * Generate initials from agent name
 */
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return name.slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/**
 * AgentAvatar Component
 * 
 * Displays a beautiful avatar for an agent with:
 * - Deterministic gradient background based on agent ID
 * - Smooth hover animations
 * - Status indicator ring
 * - Glassmorphism effect
 */
export function AgentAvatar({
  agentId,
  agentName,
  size = 'md',
  status = 'unknown',
  showStatusRing = true,
  className = '',
}: AgentAvatarProps) {
  const gradient = useMemo(() => generateGradient(agentId), [agentId]);
  const initials = useMemo(() => getInitials(agentName), [agentName]);
  const sizeConfig = sizeMap[size];

  return (
    <motion.div
      className={`relative ${className}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {/* Avatar container with glassmorphism */}
      <motion.div
        className={`
          ${sizeConfig.container}
          rounded-2xl
          bg-gradient-to-br ${gradient}
          flex items-center justify-center
          shadow-lg
          relative
          overflow-hidden
        `}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Glassmorphism overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]" />
        
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent" />
        
        {/* Initials */}
        <span className={`${sizeConfig.text} font-bold text-white relative z-10 drop-shadow-md`}>
          {initials}
        </span>

        {/* Animated border glow on hover */}
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-white/30"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        />
      </motion.div>

      {/* Status indicator ring */}
      {showStatusRing && (
        <motion.div
          className={`
            absolute ${sizeConfig.ringOffset}
            ${sizeConfig.ring}
            ${statusColors[status]}
            rounded-full
            border-2 border-white
            shadow-md
          `}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 500 }}
        >
          {status === 'online' && (
            <motion.div
              className="absolute inset-0 rounded-full bg-success"
              animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * Skeleton loading state for AgentAvatar
 */
export function AgentAvatarSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizeConfig = sizeMap[size];
  
  return (
    <div className={`${sizeConfig.container} rounded-2xl bg-agora-200 animate-pulse`} />
  );
}

export default AgentAvatar;
