import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, {
  Path,
  Line,
  Rect,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';

import {
  scale,
  verticalScale,
  moderateScale,
  responsiveFontSize,
  spacing,
  SCREEN_WIDTH,
} from '../utils/responsive';
import { usePerformance, PerformanceAlert, OptimizationSuggestion } from '../hooks/usePerformance';
import { useNavigation } from '@react-navigation/native';

// ============================================================================
// Types
// ============================================================================

type MetricType = 'fps' | 'memory' | 'latency';
type TimeRange = '1m' | '5m' | '15m';

interface MetricCardProps {
  title: string;
  value: string;
  unit: string;
  rating: 'good' | 'needs-improvement' | 'poor';
  icon: keyof typeof Ionicons.glyphMap;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  onPress?: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

const getRatingColor = (rating: string): { text: string; bg: string; border: string } => {
  switch (rating) {
    case 'good':
      return { text: '#10b981', bg: '#d1fae5', border: '#a7f3d0' };
    case 'needs-improvement':
      return { text: '#f59e0b', bg: '#fef3c7', border: '#fde68a' };
    case 'poor':
      return { text: '#ef4444', bg: '#fee2e2', border: '#fecaca' };
    default:
      return { text: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' };
  }
};

const getRatingIcon = (rating: string): keyof typeof Ionicons.glyphMap => {
  switch (rating) {
    case 'good':
      return 'checkmark-circle';
    case 'needs-improvement':
      return 'warning';
    case 'poor':
      return 'alert-circle';
    default:
      return 'help-circle';
  }
};

// ============================================================================
// Components
// ============================================================================

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  rating,
  icon,
  trend,
  trendValue,
  onPress,
}) => {
  const colors = getRatingColor(rating);

  return (
    <TouchableOpacity
      style={[styles.metricCard, { borderColor: colors.border, backgroundColor: colors.bg }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.metricCardHeader}>
        <View style={[styles.metricIconContainer, { backgroundColor: colors.bg }]}>
          <Ionicons name={icon} size={moderateScale(20)} color={colors.text} />
        </View>
        <Ionicons name={getRatingIcon(rating)} size={moderateScale(18)} color={colors.text} />
      </View>

      <View style={styles.metricCardContent}>
        <Text style={[styles.metricValue, { color: '#1e293b' }]}>
          {value}
          <Text style={styles.metricUnit}> {unit}</Text>
        </Text>
        <Text style={styles.metricTitle}>{title}</Text>
      </View>

      {trend && trendValue !== undefined && (
        <View style={styles.metricTrend}>
          <Ionicons
            name={trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove'}
            size={moderateScale(14)}
            color={trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#64748b'}
          />
          <Text
            style={[
              styles.metricTrendText,
              {
                color:
                  trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#64748b',
              },
            ]}
          >
            {trendValue > 0 ? '+' : ''}
            {trendValue.toFixed(1)}%
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const LineChart: React.FC<{
  data: number[];
  timestamps: number[];
  color: string;
  width?: number;
  height?: number;
}> = ({ data, timestamps, color, width = SCREEN_WIDTH - scale(64), height = verticalScale(120) }) => {
  if (data.length < 2) {
    return (
      <View style={[styles.chartContainer, { width, height }]}>
        <Text style={styles.noDataText}>Not enough data</Text>
      </View>
    );
  }

  const padding = { top: 10, right: 10, bottom: 30, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(...data, 1);
  const minValue = Math.min(...data);
  const range = maxValue - minValue || 1;

  // Generate path
  const points = data.map((value, index) => {
    const x = padding.left + (index / (data.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - ((value - minValue) / range) * chartHeight;
    return { x, y, value };
  });

  const pathD = points.reduce((acc, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    return `${acc} L ${point.x} ${point.y}`;
  }, '');

  // Generate area path
  const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

  // Y-axis labels
  const yLabels = [maxValue, (maxValue + minValue) / 2, minValue];

  return (
    <View style={[styles.chartContainer, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.3" />
            <Stop offset="1" stopColor={color} stopOpacity="0.05" />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        {[0, 0.5, 1].map((ratio, index) => {
          const y = padding.top + chartHeight * ratio;
          return (
            <Line
              key={index}
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth={1}
              strokeDasharray="4,4"
            />
          );
        })}

        {/* Area fill */}
        <Path d={areaD} fill="url(#areaGradient)" />

        {/* Line */}
        <Path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((point, index) => (
          <React.Fragment key={index}>
            <Rect
              x={point.x - 4}
              y={point.y - 4}
              width={8}
              height={8}
              rx={4}
              fill={color}
            />
          </React.Fragment>
        ))}

        {/* Y-axis labels */}
        {yLabels.map((value, index) => {
          const y = padding.top + chartHeight * (1 - index / 2);
          return (
            <SvgText
              key={index}
              x={padding.left - 8}
              y={y + 4}
              fontSize={10}
              fill="#64748b"
              textAnchor="end"
            >
              {value.toFixed(0)}
            </SvgText>
          );
        })}

        {/* X-axis labels */}
        {timestamps.length > 0 && (
          <>
            <SvgText
              x={padding.left}
              y={height - 8}
              fontSize={10}
              fill="#64748b"
              textAnchor="start"
            >
              {new Date(timestamps[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </SvgText>
            <SvgText
              x={width - padding.right}
              y={height - 8}
              fontSize={10}
              fill="#64748b"
              textAnchor="end"
            >
              {new Date(timestamps[timestamps.length - 1]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </SvgText>
          </>
        )}
      </Svg>
    </View>
  );
};

const SuggestionCard: React.FC<{ suggestion: OptimizationSuggestion }> = ({ suggestion }) => {
  const severityColors = {
    high: { bg: '#fee2e2', border: '#fecaca', text: '#dc2626' },
    medium: { bg: '#fef3c7', border: '#fde68a', text: '#d97706' },
    low: { bg: '#dbeafe', border: '#bfdbfe', text: '#2563eb' },
  };

  const colors = severityColors[suggestion.severity];

  return (
    <View style={[styles.suggestionCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <View style={styles.suggestionHeader}>
        <View style={[styles.severityBadge, { backgroundColor: colors.text }]}>
          <Text style={styles.severityText}>{suggestion.severity.toUpperCase()}</Text>
        </View>
        <Text style={styles.suggestionMetric}>{suggestion.metric}</Text>
      </View>
      <Text style={styles.suggestionText}>{suggestion.suggestion}</Text>
      <View style={styles.suggestionAction}>
        <Text style={[styles.suggestionActionText, { color: colors.text }]}>
          {suggestion.action}
        </Text>
        <Ionicons name="arrow-forward" size={14} color={colors.text} />
      </View>
    </View>
  );
};

const AlertCard: React.FC<{ alert: PerformanceAlert; onDismiss: () => void }> = ({
  alert,
  onDismiss,
}) => {
  const severityColors = {
    critical: { bg: '#fee2e2', border: '#fecaca', icon: '#dc2626' },
    warning: { bg: '#fef3c7', border: '#fde68a', icon: '#d97706' },
    info: { bg: '#dbeafe', border: '#bfdbfe', icon: '#2563eb' },
  };

  const colors = severityColors[alert.severity];

  return (
    <View style={[styles.alertCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <View style={styles.alertContent}>
        <Ionicons name="warning" size={moderateScale(20)} color={colors.icon} />
        <View style={styles.alertTextContainer}>
          <Text style={styles.alertTitle}>{alert.type.replace('_', ' ').toUpperCase()}</Text>
          <Text style={styles.alertMessage}>{alert.message}</Text>
          <Text style={styles.alertTime}>{new Date(alert.timestamp).toLocaleTimeString()}</Text>
        </View>
      </View>
      <TouchableOpacity onPress={onDismiss} style={styles.alertDismiss}>
        <Ionicons name="close" size={moderateScale(18)} color="#64748b" />
      </TouchableOpacity>
    </View>
  );
};

// ============================================================================
// Main Screen Component
// ============================================================================

export default function PerformanceScreen() {
  const navigation = useNavigation();
  const [selectedMetric, setSelectedMetric] = useState<MetricType | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('5m');
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [showThresholds, setShowThresholds] = useState(false);

  const handleAlert = useCallback((alert: PerformanceAlert) => {
    // Alert is handled by the hook, we just receive it here if needed
    console.log('Performance Alert:', alert);
  }, []);

  const {
    metrics,
    history,
    alerts,
    healthScore,
    reset,
    clearAlerts,
    getSuggestions,
    runBenchmark,
    thresholds,
  } = usePerformance({
    refreshIntervalMs: 5000,
    onAlert: handleAlert,
    enabled: isAutoRefresh,
  });

  const suggestions = useMemo(() => getSuggestions(), [getSuggestions]);

  const getMetricRating = (value: number, type: 'fps' | 'memory' | 'latency'): 'good' | 'needs-improvement' | 'poor' => {
    switch (type) {
      case 'fps':
        if (value >= 55) return 'good';
        if (value >= 30) return 'needs-improvement';
        return 'poor';
      case 'memory':
        if (value <= 0.7) return 'good';
        if (value <= 0.85) return 'needs-improvement';
        return 'poor';
      case 'latency':
        if (value <= 300) return 'good';
        if (value <= 1000) return 'needs-improvement';
        return 'poor';
      default:
        return 'good';
    }
  };

  const handleReset = useCallback(() => {
    Alert.alert(
      'Reset Metrics',
      'Are you sure you want to clear all performance data?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: reset },
      ]
    );
  }, [reset]);

  const handleRunBenchmark = useCallback(async () => {
    Alert.alert('Running Benchmark', 'This will test rendering performance...');
    
    const result = await runBenchmark('render', () => {
      // Simulate some work
      for (let i = 0; i < 1000; i++) {
        Math.sqrt(i);
      }
    }, 100);

    Alert.alert(
      'Benchmark Complete',
      `Average: ${result.avgTime.toFixed(2)}ms\nOps/sec: ${result.opsPerSecond.toFixed(0)}`
    );
  }, [runBenchmark]);

  const getHealthScoreColor = (score: number): string => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>Performance Monitor</Text>
              <Text style={styles.headerSubtitle}>Real-time app performance metrics</Text>
            </View>
            <View style={[styles.healthScoreBadge, { backgroundColor: `${getHealthScoreColor(healthScore)}20` }]}>
              <Text style={[styles.healthScoreText, { color: getHealthScoreColor(healthScore) }]}>
                {healthScore}
              </Text>
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <View style={styles.controlItem}>
              <Ionicons
                name={isAutoRefresh ? 'refresh-circle' : 'pause-circle'}
                size={moderateScale(20)}
                color={isAutoRefresh ? '#10b981' : '#64748b'}
              />
              <Switch
                value={isAutoRefresh}
                onValueChange={setIsAutoRefresh}
                trackColor={{ false: '#cbd5e1', true: '#a7f3d0' }}
                thumbColor={isAutoRefresh ? '#10b981' : '#94a3b8'}
              />
            </View>

            <TouchableOpacity style={styles.controlButton} onPress={handleRunBenchmark}>
              <Ionicons name="speedometer" size={moderateScale(18)} color="#6366f1" />
              <Text style={styles.controlButtonText}>Benchmark</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={handleReset}>
              <Ionicons name="trash-outline" size={moderateScale(18)} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Metric Cards Grid */}
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Frame Rate"
            value={metrics.fps.toFixed(0)}
            unit="FPS"
            rating={getMetricRating(metrics.fps, 'fps')}
            icon="pulse"
            onPress={() => setSelectedMetric(selectedMetric === 'fps' ? null : 'fps')}
          />
          <MetricCard
            title="Memory Usage"
            value={(metrics.memory.percentage * 100).toFixed(1)}
            unit="%"
            rating={getMetricRating(metrics.memory.percentage, 'memory')}
            icon="hardware-chip"
            onPress={() => setSelectedMetric(selectedMetric === 'memory' ? null : 'memory')}
          />
          <MetricCard
            title="Avg Latency"
            value={metrics.latency.avg.toFixed(0)}
            unit="ms"
            rating={getMetricRating(metrics.latency.avg, 'latency')}
            icon="timer"
            onPress={() => setSelectedMetric(selectedMetric === 'latency' ? null : 'latency')}
          />
          <MetricCard
            title="Throughput"
            value={metrics.throughput.rps.toFixed(1)}
            unit="ops/s"
            rating="good"
            icon="flash"
          />
        </View>

        {/* Detailed Charts */}
        {selectedMetric && (
          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle}>
              {selectedMetric === 'fps' ? 'Frame Rate' : selectedMetric === 'memory' ? 'Memory Usage' : 'Latency'} History
            </Text>
            <LineChart
              data={
                selectedMetric === 'fps'
                  ? history.fps
                  : selectedMetric === 'memory'
                  ? history.memory
                  : history.latency
              }
              timestamps={history.timestamps}
              color={
                selectedMetric === 'fps'
                  ? '#10b981'
                  : selectedMetric === 'memory'
                  ? '#6366f1'
                  : '#f59e0b'
              }
            />
          </View>
        )}

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Alerts ({alerts.length})</Text>
              <TouchableOpacity onPress={clearAlerts}>
                <Text style={styles.clearText}>Clear All</Text>
              </TouchableOpacity>
            </View>
            {alerts.slice(-5).map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onDismiss={() => {}}
              />
            ))}
          </View>
        )}

        {/* Optimization Suggestions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Optimization Suggestions</Text>
          {suggestions.map((suggestion) => (
            <SuggestionCard key={suggestion.id} suggestion={suggestion} />
          ))}
        </View>

        {/* Thresholds Reference */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.thresholdHeader}
            onPress={() => setShowThresholds(!showThresholds)}
          >
            <View style={styles.thresholdTitleRow}>
              <Ionicons name="settings-outline" size={moderateScale(18)} color="#64748b" />
              <Text style={styles.sectionTitle}>Thresholds Reference</Text>
            </View>
            <Ionicons
              name={showThresholds ? 'chevron-up' : 'chevron-down'}
              size={moderateScale(20)}
              color="#64748b"
            />
          </TouchableOpacity>

          {showThresholds && (
            <View style={styles.thresholdsGrid}>
              <View style={styles.thresholdItem}>
                <Text style={styles.thresholdName}>Min FPS</Text>
                <Text style={styles.thresholdValue}>{thresholds.minFps}</Text>
              </View>
              <View style={styles.thresholdItem}>
                <Text style={styles.thresholdName}>Max Latency</Text>
                <Text style={styles.thresholdValue}>{thresholds.maxLatencyMs}ms</Text>
              </View>
              <View style={styles.thresholdItem}>
                <Text style={styles.thresholdName}>Max Memory</Text>
                <Text style={styles.thresholdValue}>{(thresholds.maxMemoryPercent * 100).toFixed(0)}%</Text>
              </View>
              <View style={styles.thresholdItem}>
                <Text style={styles.thresholdName}>Max Error Rate</Text>
                <Text style={styles.thresholdValue}>{(thresholds.maxErrorRate * 100).toFixed(0)}%</Text>
              </View>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Last updated: {new Date(metrics.timestamp).toLocaleTimeString()}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: 'white',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: responsiveFontSize(22),
    fontWeight: '700',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: responsiveFontSize(13),
    color: '#64748b',
    marginTop: verticalScale(4),
  },
  healthScoreBadge: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthScoreText: {
    fontSize: responsiveFontSize(18),
    fontWeight: '700',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(16),
    gap: scale(12),
  },
  controlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    backgroundColor: '#f1f5f9',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(8),
  },
  controlButtonText: {
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
    color: '#6366f1',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.lg,
    gap: scale(12),
  },
  metricCard: {
    width: (SCREEN_WIDTH - scale(56)) / 2,
    padding: spacing.md,
    borderRadius: moderateScale(12),
    borderWidth: 1,
  },
  metricCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricIconContainer: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricCardContent: {
    marginTop: verticalScale(12),
  },
  metricValue: {
    fontSize: responsiveFontSize(24),
    fontWeight: '700',
  },
  metricUnit: {
    fontSize: responsiveFontSize(14),
    fontWeight: '500',
    color: '#64748b',
  },
  metricTitle: {
    fontSize: responsiveFontSize(12),
    color: '#64748b',
    marginTop: verticalScale(2),
  },
  metricTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(8),
    gap: scale(4),
  },
  metricTrendText: {
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
  },
  chartSection: {
    backgroundColor: 'white',
    margin: spacing.lg,
    marginTop: 0,
    padding: spacing.lg,
    borderRadius: moderateScale(14),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: moderateScale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: responsiveFontSize(14),
    color: '#94a3b8',
  },
  section: {
    backgroundColor: 'white',
    margin: spacing.lg,
    marginTop: 0,
    padding: spacing.lg,
    borderRadius: moderateScale(14),
    marginBottom: verticalScale(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: responsiveFontSize(16),
    fontWeight: '700',
    color: '#1e293b',
  },
  clearText: {
    fontSize: responsiveFontSize(13),
    color: '#6366f1',
    fontWeight: '600',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: moderateScale(10),
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  alertTextContainer: {
    marginLeft: scale(12),
    flex: 1,
  },
  alertTitle: {
    fontSize: responsiveFontSize(12),
    fontWeight: '700',
    color: '#1e293b',
  },
  alertMessage: {
    fontSize: responsiveFontSize(13),
    color: '#64748b',
    marginTop: verticalScale(2),
  },
  alertTime: {
    fontSize: responsiveFontSize(11),
    color: '#94a3b8',
    marginTop: verticalScale(2),
  },
  alertDismiss: {
    padding: spacing.xs,
  },
  suggestionCard: {
    padding: spacing.md,
    borderRadius: moderateScale(10),
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  severityBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: moderateScale(4),
  },
  severityText: {
    fontSize: responsiveFontSize(10),
    fontWeight: '700',
    color: 'white',
  },
  suggestionMetric: {
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: scale(8),
  },
  suggestionText: {
    fontSize: responsiveFontSize(13),
    color: '#475569',
    lineHeight: moderateScale(20),
  },
  suggestionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(8),
  },
  suggestionActionText: {
    fontSize: responsiveFontSize(13),
    fontWeight: '600',
    marginRight: scale(4),
  },
  thresholdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  thresholdTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  thresholdsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: verticalScale(16),
    gap: scale(12),
  },
  thresholdItem: {
    width: (SCREEN_WIDTH - scale(88)) / 2,
    backgroundColor: '#f8fafc',
    padding: spacing.md,
    borderRadius: moderateScale(8),
  },
  thresholdName: {
    fontSize: responsiveFontSize(12),
    color: '#64748b',
    marginBottom: verticalScale(4),
  },
  thresholdValue: {
    fontSize: responsiveFontSize(16),
    fontWeight: '700',
    color: '#1e293b',
  },
  footer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    fontSize: responsiveFontSize(12),
    color: '#94a3b8',
  },
});
