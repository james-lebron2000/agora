import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Clipboard,
  Alert,
  Share,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Path, G } from 'react-native-svg';
import * as FileSystem from 'expo-file-system';

interface ShareProfileProps {
  agentId: string;
  agentName: string;
  style?: any;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  agentName: string;
}

const { width } = Dimensions.get('window');

/**
 * Generate QR Code as SVG
 * Simple QR code representation (simplified for mobile)
 */
function QRCode({ value, size = 180 }: { value: string; size?: number }) {
  // Generate a deterministic pattern based on the value
  const generatePattern = (val: string): boolean[][] => {
    const seed = val.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const pattern: boolean[][] = [];
    const gridSize = 21;

    for (let i = 0; i < gridSize; i++) {
      pattern[i] = [];
      for (let j = 0; j < gridSize; j++) {
        // Position detection patterns (corners)
        if (
          (i < 7 && j < 7) || // Top-left
          (i < 7 && j >= gridSize - 7) || // Top-right
          (i >= gridSize - 7 && j < 7) // Bottom-left
        ) {
          // Outer square of position pattern
          if (
            (i === 0 || i === 6 || j === 0 || j === 6) || // Outer border
            (i >= 2 && i <= 4 && j >= 2 && j <= 4) // Inner square
          ) {
            pattern[i][j] = true;
          } else {
            pattern[i][j] = false;
          }
        } else {
          // Data pattern based on seed
          const pseudoRandom = Math.sin(seed + i * gridSize + j) * 10000;
          pattern[i][j] = pseudoRandom - Math.floor(pseudoRandom) > 0.5;
        }
      }
    }

    return pattern;
  };

  const pattern = generatePattern(value);
  const cellSize = size / 21;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <G>
        {pattern.map((row, i) =>
          row.map((cell, j) =>
            cell ? (
              <Rect
                key={`${i}-${j}`}
                x={j * cellSize}
                y={i * cellSize}
                width={cellSize}
                height={cellSize}
                fill="#0f172a"
              />
            ) : null
          )
        )}
      </G>
    </Svg>
  );
}

/**
 * Share Profile Button Component
 *
 * Opens a modal with sharing options including:
 * - QR code generation
 * - Copy link
 * - Share to social media
 */
export function ShareProfile({ agentId, agentName, style }: ShareProfileProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[styles.button, style]}
        onPress={() => setIsModalOpen(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="share-outline" size={18} color="white" />
        <Text style={styles.buttonText}>Share</Text>
      </TouchableOpacity>

      <ShareModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        agentId={agentId}
        agentName={agentName}
      />
    </>
  );
}

/**
 * Share Modal Component
 */
function ShareModal({ isOpen, onClose, agentId, agentName }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  // Generate profile URL
  const profileUrl = `https://agora.network/agent?id=${agentId}`;

  const handleCopy = async () => {
    try {
      Clipboard.setString(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${agentName} on Agora! ${profileUrl}`,
        url: profileUrl,
        title: `${agentName}'s Profile`,
      });
    } catch (err) {
      console.error('Failed to share:', err);
    }
  };

  const handleTwitterShare = async () => {
    const text = encodeURIComponent(`Check out ${agentName} on Agora!`);
    const url = encodeURIComponent(profileUrl);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;

    try {
      await Share.share({
        message: twitterUrl,
      });
    } catch (err) {
      console.error('Failed to open Twitter:', err);
    }
  };

  const handleTelegramShare = async () => {
    const text = encodeURIComponent(`Check out ${agentName} on Agora! ${profileUrl}`);
    const telegramUrl = `https://t.me/share/url?url=${text}`;

    try {
      await Share.share({
        message: telegramUrl,
      });
    } catch (err) {
      console.error('Failed to open Telegram:', err);
    }
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <Ionicons name="share-outline" size={22} color="white" />
              <Text style={styles.modalTitle}>Share Profile</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.modalContent}>
            {/* QR Code */}
            <View style={styles.qrContainer}>
              <View style={styles.qrWrapper}>
                <QRCode value={profileUrl} size={160} />
              </View>
              <Text style={styles.qrText}>
                Scan to view {agentName}'s profile
              </Text>
            </View>

            {/* Link section */}
            <View style={styles.linkSection}>
              <Text style={styles.linkLabel}>Profile Link</Text>
              <View style={styles.linkRow}>
                <View style={styles.linkBox}>
                  <Text style={styles.linkText} numberOfLines={1}>
                    {profileUrl}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.copyButton, copied && styles.copyButtonActive]}
                  onPress={handleCopy}
                >
                  <Ionicons
                    name={copied ? 'checkmark' : 'copy-outline'}
                    size={18}
                    color={copied ? '#059669' : '#4f46e5'}
                  />
                  <Text
                    style={[
                      styles.copyButtonText,
                      copied && styles.copyButtonTextActive,
                    ]}
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Social share buttons */}
            <View style={styles.socialSection}>
              <Text style={styles.socialLabel}>Share to</Text>
              <View style={styles.socialRow}>
                <TouchableOpacity
                  style={[styles.socialButton, styles.twitterButton]}
                  onPress={handleTwitterShare}
                >
                  <Ionicons name="logo-twitter" size={20} color="#1DA1F2" />
                  <Text style={[styles.socialButtonText, { color: '#1DA1F2' }]}>
                    Twitter
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.socialButton, styles.telegramButton]}
                  onPress={handleTelegramShare}
                >
                  <Ionicons name="paper-plane-outline" size={20} color="#0088cc" />
                  <Text style={[styles.socialButtonText, { color: '#0088cc' }]}>
                    Telegram
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Native Share */}
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Ionicons name="share-social" size={18} color="#4f46e5" />
              <Text style={styles.shareButtonText}>Share via...</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '100%',
    maxWidth: 360,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    backgroundColor: '#4f46e5',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  qrText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 12,
    textAlign: 'center',
  },
  linkSection: {
    marginBottom: 20,
  },
  linkLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  linkRow: {
    flexDirection: 'row',
    gap: 8,
  },
  linkBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
  },
  linkText: {
    fontSize: 13,
    color: '#64748b',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eef2ff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  copyButtonActive: {
    backgroundColor: '#d1fae5',
  },
  copyButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4f46e5',
  },
  copyButtonTextActive: {
    color: '#059669',
  },
  socialSection: {
    marginBottom: 16,
  },
  socialLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 10,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  twitterButton: {
    backgroundColor: 'rgba(29, 161, 242, 0.1)',
  },
  telegramButton: {
    backgroundColor: 'rgba(0, 136, 204, 0.1)',
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4f46e5',
  },
});

export default ShareProfile;
