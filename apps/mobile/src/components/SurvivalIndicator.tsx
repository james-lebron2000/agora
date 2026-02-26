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
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSurvival } from '../hooks/useSurvival';
import type { 
  SurvivalIndicatorProps, 
  ExtendedHealthStatus,
  SurvivalAction 
} from '../types/survival';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  BORDER_RADIUS,
  SHADOWS,
} from '../constants/theme';

// Status color schemes
const STATUS_COLORS: Record<ExtendedHealthStatus, { bg: string; text: string; icon: string; border: string }> = {
  healthy: { bg: '#dcfce7', text: '#166534', icon: '#22c55e', border: '#bbf7d0' },
  stable: { bg: '#dbeafe', text: '#1e40af', icon: '#3b82f6', border: '#bfdbfe' },
  degraded: { bg: '#fef3c7', text: '#92400e', icon: '#f59e0b', border: '#fde68a' },
  critical: { bg: '#fee2e2', text: '#991b1b', icon: '#ef4444', border: '#fecaca' },
  dying: { bg: '#fecaca', text: '#7f1d1d', icon: '#dc2626', border: '#fca5a5' },
  dead: { bg: '#374151', text: '#f3f4f6', icon: '#9ca3af', border: '#4b5563' },
};

// Status icon mapping
const STATUS_ICONS: Record<ExtendedHealthStatus, keyof typeof Ionicons.glyphMap> = {
  healthy: 'checkmark-circle',
  stable: 'shield-checkmark',
  degraded: 'warning',
  critical: 'alert-circle',
  dying: 'pulse',
  dead: 'skull',
};

// Status label mapping
const STATUS_LABELS: Record<ExtendedHealthStatus, string> = {
  healthy: 'Healthy',
  stable: 'Stable',
  degraded: 'Degraded',
  critical: 'Critical',
  dying: 'Dying',
  dead: 'Dead',
};

// SurvivalIndicator - Visual indicator for Echo Survival status
// Memoized for performance optimization
export const SurvivalIndicator = React.memo(function SurvivalIndicator({
  agentId = undefined,
  address = undefined,
  compact = false,
  showActions = false,
  onStatusChange,
  onActionPress,
  testID
}: SurvivalIndicatorProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Get theme colors based on color scheme
  const theme = {
    text: isDark ? COLORS.gray100 : COLORS.gray800,
    textSecondary: isDark ? COLORS.gray400 : COLORS.gray500,
    card: isDark ? COLORS.gray800 : COLORS.white,
    border: isDark ? COLORS.gray700 : COLORS.gray200,
  };

  const {
    snapshot,
    health,
    economics,
    actions,
    isLoading,
    error
  } = useSurvival({
    agentId,
    address
  });

  // Notify parent of status changes
  React.useEffect(() => {
    if (health && onStatusChange) {
      onStatusChange(health.status);
    }
  }, [health?.status, onStatusChange]);

  // Handle action press
  const handleActionPress = React.useCallback((action: SurvivalAction) => {
    if (onActionPress) {
      onActionPress(action);
    }
  }, [onActionPress]);

  // Loading state
  if (isLoading && !snapshot) {
    return (
      <View style={[styles.loadingContainer, compact && styles.compactContainer]}>
        <ActivityIndicator size={compact ? "small" : "large"} color={COLORS.primary} />
      </View>
    );
  }

  // Error state
  if (error && !snapshot) {
    return (
      <View style={[styles.errorContainer, compact && styles.compactContainer]}>
        <Ionicons name="alert-circle" size={compact ? 16 : 24} color={COLORS.error} />
        <Text style={[styles.errorText, compact && styles.compactErrorText]}>
          Connection Error
        </Text>
      </View>
    );
  }

  // No data state
  if (!snapshot || !health) {
    return (
      <View style={[styles.emptyContainer, compact && styles.compactContainer]}>
        <Ionicons name="pulse-outline" size={compact ? 20 : 32} color={COLORS.gray400} />
        <Text style={[styles.emptyText, compact && styles.compactEmptyText]}>
          No survival data
        </Text>
      </View>
    );
  }

  const status = health.status;
  const statusColors = STATUS_COLORS[status];
  const statusIcon = STATUS_ICONS[status];
  const statusLabel = STATUS_LABELS[status];

  // Compact indicator
  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={[
          styles.compactStatusBadge,
          { backgroundColor: statusColors.bg, borderColor: statusColors.border }
        ]}>
          <Ionicons name={statusIcon} size={14} color={statusColors.icon} />
          <Text style={[styles.compactStatusText, { color: statusColors.text }]}>
            {statusLabel}
          </Text>
        </View>
        <View style={styles.compactMetrics}>
          <View style={styles.compactMetric}>
            <Text style={[styles.compactMetricValue, { color: theme.text }]}>
              {health.overall}
            </Text>
            <Text style={[styles.compactMetricLabel, { color: theme.textSecondary }]}>
              Score
            </Text>
          </View>
          <View style={styles.compactMetric}>
            <Text style={[styles.compactMetricValue, { color: theme.text }]}>
              {economics?.runwayDays ?? 0}
            </Text>
            <Text style={[styles.compactMetricLabel, { color: theme.textSecondary }]}>
              Days
            </Text>
          </View>
          <View style={styles.compactMetric}>
            <Text style={[styles.compactMetricValue, { color: theme.text }]}>
              ${economics?.totalUSDC?.toFixed(0) ?? '0'}
            </Text>
            <Text style={[styles.compactMetricLabel, { color: theme.textSecondary }]}>
              USDC
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Full indicator
  return (
    <View style={[styles.container, { backgroundColor: theme.card }]} testID={testID}>
      {/* Status Header */}
      <View style={styles.statusHeader}>
        <View style={[
          styles.statusBadge,
          { backgroundColor: statusColors.bg, borderColor: statusColors.border }
        ]}>
          <Ionicons name={statusIcon} size={16} color={statusColors.icon} />
          <Text style={[styles.statusText, { color: statusColors.text }]}>
            {statusLabel}
          </Text>
        </View>
        <Text style={[styles.survivalScore, { color: theme.text }]}>
          {health.overall}/100
        </Text>
      </View>

      {/* Survival Mode Banner */}
      {snapshot.survivalMode && (
        <View style={[styles.survivalBanner, { backgroundColor: COLORS.error }]}>
          <Ionicons name="warning" size={16} color={COLORS.white} />
          <Text style={styles.survivalBannerText}>SURVIVAL MODE ACTIVE</Text>
        </View>
      )}

      {/* Metrics */}
      <View style={styles.metricsContainer}>
        <View style={styles.metric}>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
            Health Score
          </Text>
          <Text style={[styles.metricValue, { color: theme.text }]}>
            {health.overall}
          </Text>
        </View>
        <View style={styles.metric}>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
            Runway Days
          </Text>
          <Text style={[styles.metricValue, { color: theme.text }]}>
            {economics?.runwayDays ?? 0}
          </Text>
        </View>
        <View style={styles.metric}>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
            Balance
          </Text>
          <Text style={[styles.metricValue, { color: theme.text }]}>
            ${economics?.totalUSDC?.toFixed(2) ?? '0.00'}
          </Text>
        </View>
      </View>

      {/* Actions */}
      {showActions && actions.length > 0 && (
        <View style={styles.actionsContainer}>
          <Text style={[styles.actionsTitle, { color: theme.text }]}>
            Recommended Actions
          </Text>
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.actionItem, { borderColor: theme.border }]}
              onPress={() => handleActionPress(action)}
              disabled={!action.actionable}
            >
              <View style={styles.actionLeft}>
                <Ionicons
                  name={action.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={action.color}
                />
                <View style={styles.actionContent}>
                  <Text style={[styles.actionDescription, { color: theme.text }]}>
                    {action.description}
                  </Text>
                  <Text style={[styles.actionImpact, { color: theme.textSecondary }]}>
                    {action.estimatedImpact}
                  </Text>
                </View>
              </View>
              {action.actionable && (
                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  loadingContainer: {
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  emptyContainer: {
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
  },
  compactStatusText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  compactMetrics: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  compactMetric: {
    alignItems: 'center',
  },
  compactMetricValue: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  compactMetricLabel: {
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
  compactErrorText: {
    fontSize: FONT_SIZE.xs,
  },
  compactEmptyText: {
    fontSize: FONT_SIZE.xs,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  statusText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  survivalScore: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  survivalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  survivalBannerText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.white,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.xs,
  },
  metricValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
  },
  actionsContainer: {
    padding: SPACING.lg,
  },
  actionsTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  actionContent: {
    flex: 1,
  },
  actionDescription: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
  },
  actionImpact: {
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
  },
  errorText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.error,
  },
  emptyText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.gray400,
  },
});

export default SurvivalIndicator;