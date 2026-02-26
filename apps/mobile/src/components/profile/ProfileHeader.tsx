/**
 * ProfileHeader Component
 * Displays user avatar, name, wallet info, and sync status
 */

import React, { memo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AgentAvatar } from '../AgentAvatar';
import { ShareProfile } from '../ShareProfile';
import { spacing, SCREEN_WIDTH } from '../../utils/responsive';

export interface ProfileHeaderProps {
  displayName: string;
  nickname: string;
  address: string | null;
  avatarUri?: string;
  agentId: string;
  survivalStatus: 'healthy' | 'stable' | 'degraded' | 'critical' | 'dying';
  isOnline: boolean;
  isSyncing: boolean;
  pendingOperations: number;
  lastSyncTime: number | null;
  onEditPress: () => void;
  onForceSync: () => void;
}

export const ProfileHeader = memo(function ProfileHeader({
  displayName,
  nickname,
  address,
  avatarUri,
  agentId,
  survivalStatus,
  isOnline,
  isSyncing,
  pendingOperations,
  lastSyncTime,
  onEditPress,
  onForceSync,
}: ProfileHeaderProps) {
  const getSyncStatusBadge = () => {
    if (!isOnline) {
      return (
        <View style={styles.offlineBadge}>
          <Ionicons name="cloud-offline-outline" size={12} color="#fff" />
          <Text style={styles.offlineText}>Offline</Text>
        </View>
      );
    }
    if (isSyncing) {
      return (
        <View style={styles.syncingBadge}>
          <Ionicons name="sync" size={12} color="#fff" />
          <Text style={styles.syncingText}>Syncing...</Text>
        </View>
      );
    }
    if (pendingOperations > 0) {
      return (
        <TouchableOpacity onPress={onForceSync} style={styles.pendingBadge}>
          <Ionicons name="sync-outline" size={12} color="#fff" />
          <Text style={styles.pendingText}>{pendingOperations} pending</Text>
        </TouchableOpacity>
      );
    }
    if (lastSyncTime) {
      return (
        <View style={styles.syncedBadge}>
          <Ionicons name="checkmark-circle-outline" size={12} color="#fff" />
          <Text style={styles.syncedText}>Synced</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.header}>
      <View style={styles.syncStatusContainer}>
        {getSyncStatusBadge()}
      </View>

      <TouchableOpacity style={styles.editPill} onPress={onEditPress}>
        <Ionicons name="create-outline" size={14} color="#4f46e5" />
        <Text style={styles.editPillText}>Edit</Text>
      </TouchableOpacity>

      <View style={styles.avatarWrapper}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
        ) : (
          <AgentAvatar
            agentId={agentId}
            agentName={displayName}
            size="lg"
            status={survivalStatus === 'healthy' ? 'online' : 'busy'}
          />
        )}
      </View>

      <Text style={styles.userName}>{displayName}</Text>
      <Text style={styles.nickname}>@{nickname}</Text>
      
      <Text style={styles.walletLabel}>Connected Wallet</Text>
      <Text style={styles.walletAddress}>
        {address ? `${address.slice(0, 8)}...${address.slice(-8)}` : 'Not connected'}
      </Text>

      {address && (
        <ShareProfile
          agentId={agentId}
          agentName={displayName}
          style={styles.shareButton}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  syncStatusContainer: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6b7280',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  offlineText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  syncingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  syncingText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  pendingText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  syncedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  syncedText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  editPill: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  editPillText: {
    color: '#4f46e5',
    fontSize: 12,
    fontWeight: '600',
  },
  avatarWrapper: {
    marginTop: spacing.lg,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: '#eef2ff',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: spacing.md,
  },
  nickname: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  walletLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  walletAddress: {
    fontSize: 13,
    color: '#4b5563',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  shareButton: {
    marginTop: spacing.md,
  },
});

export default ProfileHeader;
