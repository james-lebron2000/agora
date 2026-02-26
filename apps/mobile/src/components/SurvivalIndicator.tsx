/**
 * SurvivalIndicator Component for Agora Mobile
 * Visual indicator for Echo Survival status
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSurvival } from '../hooks/useSurvival';
import type { SurvivalIndicatorProps } from '../types/survival';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  BORDER_RADIUS,
} from '../constants/theme';

export function SurvivalIndicator({
  agentId,
  address,
  compact = false,
  showActions = true,
  onStatusChange,
  onActionPress,
  testID,
}: SurvivalIndicatorProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const {
    snapshot,
    health,
    economics,
    actions,
    isLoading,
    isInSurvivalMode,
    needsEmergencyFunding,
    daysOfRunway,
    survivalScore,
    refresh,
  } = useSurvival({
    agentId: agentId || null,
    address: address || null,
    autoRefresh: true,
    refreshInterval: 60000,
  });

  const theme = {
    background: isDark ? COLORS.gray900 : COLORS.gray50,
    card: isDark ? COLORS.gray800 : COLORS.white,
    text: isDark ? COLORS.gray100 : COLORS.gray900,
    textSecondary: isDark ? COLORS.gray400 : COLORS.gray600,
    border: isDark ? COLORS.gray700 : COLORS.gray200,
  };

  // Get status color
  const getStatusColor = (status?: string): string => {
    switch (status) {
      case 'healthy':
      case 'stable':
        return COLORS.success;
      case 'degraded':
        return COLORS.warning;
      case 'critical':
      case 'dying':
        return COLORS.error;
      case 'dead':
        return '#7f1d1d';
      default:
        return COLORS.gray500;
    }
  };

  // Get status icon
  const getStatusIcon = (status?: string): keyof typeof Ionicons.glyphMap => {
    switch (status) {
      case 'healthy':
        return 'checkmark-circle';
      case 'stable':
        return 'shield-checkmark';
      case 'degraded':
        return 'warning';
      case 'critical':
        return 'alert-circle';
      case 'dying':
      case 'dead':
        return 'skull';
      default:
        return 'help-circle';
    }
  };

  // Compact view for headers/navbars
  if (compact) {
    return (
      <TouchableOpacity
        testID={testID}
        onPress={refresh}
        style={[
          styles.compactContainer,
          {
            backgroundColor: isInSurvivalMode
              ? `${COLORS.error}20`
              : `${getStatusColor(health?.status)}20`,
            borderColor: isInSurvivalMode ? COLORS.error : getStatusColor(health?.status),
          },
        ]}
      >
        <Animated.View style={styles.pulseAnimation}>
          <Ionicons
            name={getStatusIcon(health?.status)}
            size={16}
            color={isInSurvivalMode ? COLORS.error : getStatusColor(health?.status)}
          />
        </Animated.View>
        <Text
          style={[
            styles.compactText,
            {
              color: isInSurvivalMode ? COLORS.error : getStatusColor(health?.status),
            },
          ]}
        >
          {isInSurvivalMode ? 'SURVIVAL' : `${survivalScore}`}
        </Text>
      </TouchableOpacity>
    );
  }

  // Full card view
  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: isInSurvivalMode ? COLORS.error : theme.border,
        },
      ]}
    >
      {/* Survival Mode Banner */}
      {isInSurvivalMode && (
        <View style={styles.survivalBanner}>
          <Ionicons name="warning" size={20} color={COLORS.white} />
          <Text style={styles.survivalBannerText}>SURVIVAL MODE ACTIVE</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.statusRow}>
          <Ionicons
            name={getStatusIcon(health?.status)}
            size={32}
            color={getStatusColor(health?.status)}
          />
          <View style={styles.statusText}>
            <Text
              style={[
                styles.statusLabel,
                { color: getStatusColor(health?.status) },
              ]}
            >
              {(health?.status || 'unknown').toUpperCase()}
            </Text>
            <Text style={[styles.scoreText, { color: theme.text }]}>
              Score: {survivalScore}/100
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={refresh} style={styles.refreshButton}>
          <Ionicons
            name="refresh"
            size={20}
            color={theme.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressBar,
            {
              backgroundColor:
                survivalScore > 70
                  ? COLORS.success
                  : survivalScore > 40
                  ? COLORS.warning
                  : COLORS.error,
              width: `${survivalScore}%`,
            },
          ]}
        />
      </View>

      {/* Metrics Grid */}
      <View style={styles.metricsGrid}>
        <View style={[styles.metricBox, { backgroundColor: theme.background }]}>
          <Ionicons name="time-outline" size={20} color={COLORS.primary} />
          <Text style={[styles.metricValue, { color: theme.text }]}>
            {daysOfRunway}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
            Days Runway
          </Text>
        </View>
        <View style={[styles.metricBox, { backgroundColor: theme.background }]}>
          <Ionicons name="wallet-outline" size={20} color={COLORS.success} />
          <Text style={[styles.metricValue, { color: theme.text }]}>
            ${economics?.totalUSDC?.toFixed(2) || '0.00'}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
            Balance
          </Text>
        </View>
        <View style={[styles.metricBox, { backgroundColor: theme.background }]}>
          <Ionicons name="trending-up-outline" size={20} color={COLORS.info} />
          <Text style={[styles.metricValue, { color: theme.text }]}>
            {((health?.successRate || 0) * 100).toFixed(0)}%
          </Text>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
            Success Rate
          </Text>
        </View>
      </View>

      {/* Emergency Warning */}
      {needsEmergencyFunding && (
        <View style={styles.emergencyWarning}>
          <Ionicons name="alert-circle" size={20} color={COLORS.error} />
          <Text style={styles.emergencyText}>
            Emergency funding needed! Runway below 3 days.
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      {showActions && actions.length > 0 && (
        <View style={styles.actionsContainer}>
          <Text style={[styles.actionsTitle, { color: theme.textSecondary }]}>
            Recommended Actions
          </Text>
          {actions.slice(0, 3).map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.actionButton,
                {
                  backgroundColor:
                    action.priority === 'critical'
                      ? `${COLORS.error}15`
                      : action.priority === 'high'
                      ? `${COLORS.warning}15`
                      : `${COLORS.info}15`,
                  borderColor:
                    action.priority === 'critical'
                      ? COLORS.error
                      : action.priority === 'high'
                      ? COLORS.warning
                      : COLORS.info,
                },
              ]}
              onPress={() => onActionPress?.(action)}
            >
              <Ionicons
                name={(action.icon as any) || 'alert-circle'}
                size={18}
                color={
                  action.priority === 'critical'
                    ? COLORS.error
                    : action.priority === 'high'
                    ? COLORS.warning
                    : COLORS.info
                }
              />
              <View style={styles.actionTextContainer}>
                <Text
                  style={[
                    styles.actionDescription,
                    { color: theme.text },
                  ]}
                  numberOfLines={2}
                >
                  {action.description}
                </Text>
                <Text
                  style={[
                    styles.actionImpact,
                    { color: theme.textSecondary },
                  ]}
                >
                  {action.estimatedImpact}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <Animated.View style={styles.spinner} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  compactText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
  pulseAnimation: {
    // Animation would be added here
  },
  survivalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.error,
  },
  survivalBannerText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  statusText: {
    gap: 2,
  },
  statusLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  scoreText: {
    fontSize: FONT_SIZE.sm,
  },
  refreshButton: {
    padding: SPACING.sm,
  },
  progressContainer: {
    height: 8,
    backgroundColor: COLORS.gray200,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: BORDER_RADIUS.full,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  metricBox: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    marginTop: SPACING.xs,
  },
  metricLabel: {
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
  emergencyWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: `${COLORS.error}15`,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  emergencyText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.error,
    fontWeight: '600',
  },
  actionsContainer: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  actionsTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionDescription: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
  },
  actionImpact: {
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: COLORS.primary,
    borderTopColor: 'transparent',
  },
});

export default SurvivalIndicator;
