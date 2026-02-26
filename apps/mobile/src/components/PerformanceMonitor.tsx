import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  scale,
  verticalScale,
  moderateScale,
  responsiveFontSize,
  spacing,
} from '../utils/responsive';
import { usePerformance } from '../hooks/usePerformance';

// ============================================================================
// Types
// ============================================================================

interface PerformanceMonitorProps {
  style?: ViewStyle;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  showLabel?: boolean;
  onPress?: () => void;
  compact?: boolean;
}

interface MiniChartProps {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}

// ============================================================================
// Mini Sparkline Chart
// ============================================================================

const MiniSparkline: React.FC<MiniChartProps> = ({
  data,
  color,
  width = scale(40),
  height = verticalScale(20),
}) => {
  if (data.length < 2) {
    return <View style={{ width, height }} />;
  }

  const maxValue = Math.max(...data, 1);
  const minValue = Math.min(...data);
  const range = maxValue - minValue || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - minValue) / range) * height;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  // For React Native, we need to use SVG from react-native-svg
  // This is a simplified version - in a real implementation you'd use Path from react-native-svg
  return (
    <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: responsiveFontSize(10), color: color, fontWeight: '600' }}>
        {data.length > 0 ? `↗ ${data[data.length - 1].toFixed(0)}` : '...'}
      </Text>
    </View>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  style,
  position = 'top-right',
  showLabel = true,
  onPress,
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const { metrics, history, healthScore } = usePerformance({
    refreshIntervalMs: 3000,
    enabled: true,
  });

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
    } else {
      setExpanded(!expanded);
    }
  }, [expanded, onPress]);

  const getFpsColor = useCallback((fps: number): string => {
    if (fps >= 55) return '#10b981';
    if (fps >= 30) return '#f59e0b';
    return '#ef4444';
  }, []);

  const getMemoryColor = useCallback((percentage: number): string => {
    if (percentage <= 0.7) return '#10b981';
    if (percentage <= 0.85) return '#f59e0b';
    return '#ef4444';
  }, []);

  const getHealthColor = useCallback((score: number): string => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  }, []);

  const positionStyles = useMemo(() => {
    switch (position) {
      case 'top-left':
        return { top: verticalScale(50), left: scale(16) };
      case 'top-right':
        return { top: verticalScale(50), right: scale(16) };
      case 'bottom-left':
        return { bottom: verticalScale(100), left: scale(16) };
      case 'bottom-right':
        return { bottom: verticalScale(100), right: scale(16) };
      default:
        return { top: verticalScale(50), right: scale(16) };
    }
  }, [position]);

  // Compact mode - just a small badge
  if (compact) {
    return (
      <TouchableOpacity
        style={[
          styles.compactContainer,
          positionStyles,
          style,
          { backgroundColor: `${getFpsColor(metrics.fps)}20` },
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Ionicons
          name="pulse"
          size={moderateScale(14)}
          color={getFpsColor(metrics.fps)}
        />
        <Text style={[styles.compactText, { color: getFpsColor(metrics.fps) }]}>
          {Math.round(metrics.fps)}
        </Text>
      </TouchableOpacity>
    );
  }

  // Full widget mode
  return (
    <TouchableOpacity
      style={[
        styles.container,
        positionStyles,
        style,
        expanded && styles.containerExpanded,
      ]}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      {/* Header with main metrics */}
      <View style={styles.header}>
        <View style={styles.mainMetric}>
          <View
            style={[
              styles.indicator,
              { backgroundColor: getFpsColor(metrics.fps) },
            ]}
          />
          <View>
            <Text style={styles.metricValue}>{Math.round(metrics.fps)}</Text>
            {showLabel && <Text style={styles.metricLabel}>FPS</Text>}
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.mainMetric}>
          <Ionicons
            name="hardware-chip-outline"
            size={moderateScale(16)}
            color={getMemoryColor(metrics.memory.percentage)}
          />
          <View>
            <Text style={styles.metricValue}>
              {(metrics.memory.percentage * 100).toFixed(0)}%
            </Text>
            {showLabel && <Text style={styles.metricLabel}>MEM</Text>}
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.healthIndicator}>
          <Text
            style={[
              styles.healthScore,
              { color: getHealthColor(healthScore) },
            ]}
          >
            {healthScore}
          </Text>
        </View>
      </View>

      {/* Expanded details */}
      {expanded && (
        <View style={styles.expandedContent}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Latency</Text>
            <Text style={styles.detailValue}>{metrics.latency.avg.toFixed(0)}ms</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Throughput</Text>
            <Text style={styles.detailValue}>{metrics.throughput.rps.toFixed(1)}/s</Text>
          </View>

          {/* Mini FPS Chart */}
          {history.fps.length > 2 && (
            <View style={styles.chartContainer}>
              <Text style={styles.chartLabel}>FPS History</Text>
              <MiniSparkline
                data={history.fps}
                color={getFpsColor(metrics.fps)}
                width={scale(120)}
                height={verticalScale(30)}
              />
            </View>
          )}

          {/* Status indicator */}
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: healthScore >= 80 ? '#10b981' : healthScore >= 60 ? '#f59e0b' : '#ef4444' },
              ]}
            />
            <Text style={styles.statusText}>
              {healthScore >= 80 ? 'Healthy' : healthScore >= 60 ? 'Warning' : 'Critical'}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  // Compact mode
  compactContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(12),
    gap: scale(4),
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactText: {
    fontSize: responsiveFontSize(12),
    fontWeight: '700',
  },

  // Full widget mode
  container: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: moderateScale(12),
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
    minWidth: scale(140),
  },
  containerExpanded: {
    minWidth: scale(160),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  mainMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  indicator: {
    width: moderateScale(8),
    height: moderateScale(8),
    borderRadius: moderateScale(4),
  },
  metricValue: {
    fontSize: responsiveFontSize(14),
    fontWeight: '700',
    color: '#1e293b',
  },
  metricLabel: {
    fontSize: responsiveFontSize(10),
    color: '#94a3b8',
  },
  divider: {
    width: 1,
    height: verticalScale(20),
    backgroundColor: '#e2e8f0',
  },
  healthIndicator: {
    marginLeft: 'auto',
  },
  healthScore: {
    fontSize: responsiveFontSize(16),
    fontWeight: '700',
  },

  // Expanded content
  expandedContent: {
    marginTop: verticalScale(12),
    paddingTop: verticalScale(12),
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(6),
  },
  detailLabel: {
    fontSize: responsiveFontSize(12),
    color: '#64748b',
  },
  detailValue: {
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
    color: '#1e293b',
  },
  chartContainer: {
    marginTop: verticalScale(8),
    marginBottom: verticalScale(8),
  },
  chartLabel: {
    fontSize: responsiveFontSize(10),
    color: '#94a3b8',
    marginBottom: verticalScale(4),
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(8),
    gap: scale(6),
  },
  statusDot: {
    width: moderateScale(6),
    height: moderateScale(6),
    borderRadius: moderateScale(3),
  },
  statusText: {
    fontSize: responsiveFontSize(11),
    fontWeight: '600',
    color: '#64748b',
  },
});

export default PerformanceMonitor;
