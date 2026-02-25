import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface AgentAvatarProps {
  agentId: string;
  agentName: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'busy' | 'unknown';
  showStatusRing?: boolean;
  style?: any;
}

const sizeMap = {
  sm: { container: 40, text: 14, ring: 12 },
  md: { container: 64, text: 24, ring: 16 },
  lg: { container: 96, text: 32, ring: 20 },
  xl: { container: 128, text: 40, ring: 24 },
};

const statusColors = {
  online: '#10b981',
  offline: '#9ca3af',
  busy: '#f59e0b',
  unknown: '#64748b',
};

const gradients = [
  ['#8b5cf6', '#a855f7', '#d946ef'], // violet-purple-fuchsia
  ['#3b82f6', '#6366f1', '#a855f7'], // blue-indigo-purple
  ['#10b981', '#14b8a6', '#06b6d4'], // emerald-teal-cyan
  ['#f97316', '#f59e0b', '#eab308'], // orange-amber-yellow
  ['#f43f5e', '#ec4899', '#d946ef'], // rose-pink-fuchsia
  ['#06b6d4', '#3b82f6', '#6366f1'], // cyan-blue-indigo
  ['#84cc16', '#22c55e', '#10b981'], // lime-green-emerald
  ['#ef4444', '#f97316', '#f59e0b'], // red-orange-amber
];

/**
 * Generate a deterministic gradient based on agent ID
 */
function generateGradient(agentId: string): string[] {
  let hash = 0;
  for (let i = 0; i < agentId.length; i++) {
    const char = agentId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

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
 * - Status indicator ring
 */
export function AgentAvatar({
  agentId,
  agentName,
  size = 'md',
  status = 'unknown',
  showStatusRing = true,
  style,
}: AgentAvatarProps) {
  const gradientColors = useMemo(() => generateGradient(agentId), [agentId]);
  const initials = useMemo(() => getInitials(agentName), [agentName]);
  const sizeConfig = sizeMap[size];

  return (
    <View style={[styles.container, { width: sizeConfig.container, height: sizeConfig.container }, style]}>
      {/* Avatar container with gradient */}
      <View
        style={[
          styles.avatar,
          {
            width: sizeConfig.container,
            height: sizeConfig.container,
            borderRadius: sizeConfig.container * 0.25,
            backgroundColor: gradientColors[0],
          },
        ]}
      >
        {/* Gradient overlay using second color */}
        <View style={[styles.gradientOverlay, { backgroundColor: gradientColors[1], opacity: 0.7 }]} />
        <View style={[styles.gradientOverlay2, { backgroundColor: gradientColors[2], opacity: 0.5 }]} />

        {/* Glassmorphism overlay */}
        <View style={styles.glassOverlay} />

        {/* Initials */}
        <Text style={[styles.initials, { fontSize: sizeConfig.text }]}>
          {initials}
        </Text>
      </View>

      {/* Status indicator ring */}
      {showStatusRing && (
        <View
          style={[
            styles.statusRing,
            {
              backgroundColor: statusColors[status],
              width: sizeConfig.ring,
              height: sizeConfig.ring,
              borderRadius: sizeConfig.ring / 2,
              bottom: -2,
              right: -2,
            },
          ]}
        >
          {status === 'online' && (
            <View style={styles.pulse} />
          )}
        </View>
      )}
    </View>
  );
}

/**
 * Skeleton loading state for AgentAvatar
 */
export function AgentAvatarSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizeConfig = sizeMap[size];

  return (
    <View
      style={[
        styles.skeleton,
        {
          width: sizeConfig.container,
          height: sizeConfig.container,
          borderRadius: sizeConfig.container * 0.25,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  gradientOverlay2: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  initials: {
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  statusRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  pulse: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#10b981',
    opacity: 0.5,
  },
  skeleton: {
    backgroundColor: '#e2e8f0',
  },
});

export default AgentAvatar;
