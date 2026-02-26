import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useSurvivalSDK } from '../hooks/useSDK';
import type { RootStackParamList } from '../types/navigation';
import type { ChainBalance } from '@agora/sdk/bridge';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  BORDER_RADIUS,
  SHADOWS,
} from '../constants/theme';

type EchoScreenRouteProp = RouteProp<RootStackParamList, 'Echo'>;

type HealthStatus = 'healthy' | 'stable' | 'degraded' | 'critical' | 'dying' | 'dead';

// Helper functions
const formatCurrency = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0.00';
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
};

const formatNumber = (value: string | number, decimals = 2): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return num.toFixed(decimals);
};

const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

// Chain color helper
const getChainColor = (chain: string): string => {
  const chainColors: Record<string, string> = {
    ethereum: '#627eea',
    base: '#0052ff',
    arbitrum: '#28a0f0',
    optimism: '#ff0420',
    polygon: '#8247e5',
  };
  return chainColors[chain.toLowerCase()] || COLORS.gray500;
};

export default function EchoScreen() {
  const route = useRoute<EchoScreenRouteProp>();
  const { agentId } = route.params || {};
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string>('health');
  const [selectedTab, setSelectedTab] = useState<'overview' | 'economics' | 'history'>('overview');

  // Use SDK hook - in production, we'd get the address from wallet store
  const address = '0x1234567890123456789012345678901234567890' as const;
  const { health, economics, snapshot, isLoading, error, refetch } = useSurvivalSDK(
    agentId || null,
    address
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Theme colors
  const theme = useMemo(() => ({
    background: isDark ? COLORS.gray900 : COLORS.gray50,
    card: isDark ? COLORS.gray800 : COLORS.white,
    text: isDark ? COLORS.gray100 : COLORS.gray900,
    textSecondary: isDark ? COLORS.gray400 : COLORS.gray600,
    border: isDark ? COLORS.gray700 : COLORS.gray200,
  }), [isDark]);

  // Get status colors and icons
  const getStatusColor = (status?: HealthStatus): string => {
    switch (status) {
      case 'healthy': return COLORS.success;
      case 'stable': return COLORS.info;
      case 'degraded': return COLORS.warning;
      case 'critical': return COLORS.error;
      case 'dying':
      case 'dead': return '#7f1d1d';
      default: return COLORS.gray500;
    }
  };

  const getStatusIcon = (status?: HealthStatus): keyof typeof Ionicons.glyphMap => {
    switch (status) {
      case 'healthy': return 'checkmark-circle';
      case 'stable': return 'shield-checkmark';
      case 'degraded': return 'warning';
      case 'critical': return 'alert-circle';
      case 'dying':
      case 'dead': return 'skull';
      default: return 'help-circle';
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return COLORS.error;
      case 'high': return COLORS.warning;
      case 'medium': return COLORS.info;
      case 'low': return COLORS.gray500;
      default: return COLORS.gray500;
    }
  };

  // Mock heartbeat history - in production, this comes from SDK
  const heartbeatHistory = useMemo(() => {
    if (!health) return [];
    const now = Date.now();
    return Array.from({ length: 10 }, (_, i) => ({
      timestamp: now - i * 30000,
      status: i === 0 ? health.status : 'healthy',
      survivalScore: Math.max(0, Math.min(100, (health.overall || 50) + Math.random() * 10 - 5)),
      metadata: { source: 'periodic' },
    }));
  }, [health]);

  // Loading state
  if (isLoading && !refreshing && !snapshot) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading survival data...
        </Text>
      </View>
    );
  }

  // Error state
  if (error && !snapshot) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <Ionicons name="alert-circle" size={48} color={COLORS.error} />
        <Text style={[styles.errorText, { color: theme.text }]}>Failed to load survival data</Text>
        <Text style={[styles.errorSubtext, { color: theme.textSecondary }]}>{error}</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: `${COLORS.primary}20` }]}>
            <Ionicons name="pulse" size={24} color={COLORS.primary} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Echo Survival</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              Agent {agentId ? `${agentId.slice(0, 8)}...` : 'Monitoring'}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Survival Mode Banner */}
      {snapshot?.survivalMode && (
        <View style={styles.survivalBanner}>
          <Ionicons name="warning" size={20} color={COLORS.white} />
          <Text style={styles.survivalBannerText}>SURVIVAL MODE ACTIVE</Text>
        </View>
      )}

      {/* Tab Navigation */}
      <View style={[styles.tabContainer, { borderBottomColor: theme.border }]}>
        {(['overview', 'economics', 'history'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setSelectedTab(tab)}
            style={[
              styles.tab,
              selectedTab === tab && [styles.activeTab, { borderBottomColor: COLORS.primary }],
            ]}
          >
            <Text
              style={[
                styles.tabText,
                { color: selectedTab === tab ? COLORS.primary : theme.textSecondary },
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <>
            {/* Overall Health Card */}
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.healthHeader}>
                <View style={styles.healthStatusRow}>
                  <Ionicons
                    name={getStatusIcon(snapshot?.health.status)}
                    size={40}
                    color={getStatusColor(snapshot?.health.status)}
                  />
                  <View style={styles.healthStatusText}>
                    <Text
                      style={[
                        styles.statusLabel,
                        { color: getStatusColor(snapshot?.health.status) },
                      ]}
                    >
                      {(snapshot?.health.status || 'unknown').toUpperCase()}
                    </Text>
                    <Text style={[styles.overallScore, { color: theme.text }]}>
                      {snapshot?.health.overall || 0}/100
                    </Text>
                  </View>
                </View>
                {health?.lastHeartbeat && (
                  <Text style={[styles.lastCheckText, { color: theme.textSecondary }]}>
                    Last heartbeat: {formatTimeAgo(health.lastHeartbeat)}
                  </Text>
                )}
              </View>

              {/* Survival Score Gauge */}
              <View style={styles.scoreContainer}>
                <View style={styles.scoreCircle}>
                  <View
                    style={[
                      styles.scoreFill,
                      {
                        backgroundColor:
                          (snapshot?.health.overall || 0) > 70
                            ? COLORS.success
                            : (snapshot?.health.overall || 0) > 40
                            ? COLORS.warning
                            : COLORS.error,
                        width: `${snapshot?.health.overall || 0}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>
                  Survival Score
                </Text>
              </View>

              {/* Health Metrics Grid */}
              <View style={styles.metricsGrid}>
                {[
                  { label: 'Compute', value: snapshot?.health.compute || 0, icon: 'hardware-chip' },
                  { label: 'Storage', value: snapshot?.health.storage || 0, icon: 'server' },
                  { label: 'Network', value: snapshot?.health.network || 0, icon: 'wifi' },
                  { label: 'Economic', value: snapshot?.health.economic || 0, icon: 'cash' },
                ].map((metric) => (
                  <View key={metric.label} style={styles.metricItem}>
                    <View style={styles.metricHeader}>
                      <Ionicons name={metric.icon as any} size={14} color={COLORS.gray500} />
                      <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                        {metric.label}
                      </Text>
                    </View>
                    <View style={styles.metricBarContainer}>
                      <View
                        style={[
                          styles.metricBarBackground,
                          { backgroundColor: isDark ? COLORS.gray700 : COLORS.gray200 },
                        ]}
                      >
                        <View
                          style={[
                            styles.metricBarFill,
                            {
                              width: `${metric.value}%`,
                              backgroundColor:
                                metric.value > 70
                                  ? COLORS.success
                                  : metric.value > 40
                                  ? COLORS.warning
                                  : COLORS.error,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.metricValue, { color: theme.text }]}>{metric.value}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Quick Stats */}
            <View style={styles.quickStatsContainer}>
              <View style={[styles.quickStatCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="time-outline" size={24} color={COLORS.primary} />
                <Text style={[styles.quickStatValue, { color: theme.text }]}>
                  {formatNumber(economics?.runwayDays || 0, 1)}
                </Text>
                <Text style={[styles.quickStatLabel, { color: theme.textSecondary }]}>Days Runway</Text>
              </View>
              <View style={[styles.quickStatCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="wallet-outline" size={24} color={COLORS.success} />
                <Text style={[styles.quickStatValue, { color: theme.text }]}>
                  {formatCurrency(economics?.totalUSDC || 0)}
                </Text>
                <Text style={[styles.quickStatLabel, { color: theme.textSecondary }]}>Total USDC</Text>
              </View>
              <View style={[styles.quickStatCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="trending-up-outline" size={24} color={COLORS.info} />
                <Text style={[styles.quickStatValue, { color: theme.text }]}>
                  {(health?.successRate || 0) * 100}%
                </Text>
                <Text style={[styles.quickStatLabel, { color: theme.textSecondary }]}>Success Rate</Text>
              </View>
            </View>

            {/* Emergency Actions */}
            {snapshot?.pendingActions && snapshot.pendingActions.length > 0 && (
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() =>
                    setExpandedSection(expandedSection === 'actions' ? 'none' : 'actions')
                  }
                >
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="flash-outline" size={20} color={COLORS.warning} />
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                      Recovery Actions ({snapshot.pendingActions.length})
                    </Text>
                  </View>
                  <Ionicons
                    name={expandedSection === 'actions' ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>

                {expandedSection === 'actions' && (
                  <View style={styles.sectionContent}>
                    {snapshot.pendingActions.map((action, index) => (
                      <View
                        key={index}
                        style={[
                          styles.actionItem,
                          { backgroundColor: isDark ? COLORS.gray700 : COLORS.gray100 },
                        ]}
                      >
                        <View style={styles.actionHeader}>
                          <View
                            style={[
                              styles.actionTypeBadge,
                              { backgroundColor: `${getPriorityColor(action.priority)}20` },
                            ]}
                          >
                            <Text
                              style={[
                                styles.actionTypeText,
                                { color: getPriorityColor(action.priority) },
                              ]}
                            >
                              {action.type.toUpperCase()}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.priorityBadge,
                              { backgroundColor: getPriorityColor(action.priority) },
                            ]}
                          >
                            <Text style={styles.priorityText}>{action.priority}</Text>
                          </View>
                        </View>
                        <Text style={[styles.actionDescription, { color: theme.text }]}>
                          {action.description}
                        </Text>
                        <Text style={[styles.actionImpact, { color: theme.textSecondary }]}>
                          {action.estimatedImpact}
                        </Text>
                        {action.recommendedChain && (
                          <View style={styles.recommendedChain}>
                            <Ionicons name="arrow-forward" size={12} color={COLORS.primary} />
                            <Text style={[styles.recommendedChainText, { color: COLORS.primary }]}>
                              Recommended: {action.recommendedChain}
                            </Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Trend Card */}
            {snapshot?.trend && (
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() =>
                    setExpandedSection(expandedSection === 'trend' ? 'none' : 'trend')
                  }
                >
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="trending-up-outline" size={20} color={COLORS.primary} />
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Health Trend</Text>
                  </View>
                  <Ionicons
                    name={expandedSection === 'trend' ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>

                {expandedSection === 'trend' && (
                  <View style={styles.sectionContent}>
                    <View style={styles.trendGrid}>
                      <View style={styles.trendItem}>
                        <Text style={[styles.trendLabel, { color: theme.textSecondary }]}>Direction</Text>
                        <View
                          style={[
                            styles.trendBadge,
                            {
                              backgroundColor:
                                snapshot.trend.direction === 'improving'
                                  ? '#d1fae5'
                                  : snapshot.trend.direction === 'declining'
                                  ? '#fee2e2'
                                  : '#f3f4f6',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.trendBadgeText,
                              {
                                color:
                                  snapshot.trend.direction === 'improving'
                                    ? COLORS.success
                                    : snapshot.trend.direction === 'declining'
                                    ? COLORS.error
                                    : COLORS.gray500,
                              },
                            ]}
                          >
                            {snapshot.trend.direction}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.trendItem}>
                        <Text style={[styles.trendLabel, { color: theme.textSecondary }]}>
                          Rate of Change
                        </Text>
                        <Text
                          style={[
                            styles.trendValue,
                            {
                              color:
                                snapshot.trend.rateOfChange > 0
                                  ? COLORS.success
                                  : snapshot.trend.rateOfChange < 0
                                  ? COLORS.error
                                  : theme.text,
                            },
                          ]}
                        >
                          {snapshot.trend.rateOfChange > 0 ? '+' : ''}
                          {snapshot.trend.rateOfChange.toFixed(2)}/day
                        </Text>
                      </View>
                      <View style={styles.trendItem}>
                        <Text style={[styles.trendLabel, { color: theme.textSecondary }]}>
                          Predicted Health (7d)
                        </Text>
                        <Text style={[styles.trendValue, { color: theme.text }]}>
                          {snapshot.trend.predictedHealth.toFixed(0)}/100
                        </Text>
                      </View>
                      <View style={styles.trendItem}>
                        <Text style={[styles.trendLabel, { color: theme.textSecondary }]}>
                          Predicted Runway (7d)
                        </Text>
                        <Text style={[styles.trendValue, { color: theme.text }]}>
                          {snapshot.trend.predictedRunway.toFixed(1)} days
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}
          </>
        )}

        {/* Economics Tab */}
        {selectedTab === 'economics' && economics && (
          <>
            {/* Balance Overview */}
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Balance Overview</Text>
              <View style={styles.balanceGrid}>
                <View style={styles.balanceItem}>
                  <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>Total USDC</Text>
                  <Text style={[styles.balanceValue, { color: theme.text }]}>
                    {formatCurrency(economics.totalUSDC)}
                  </Text>
                </View>
                <View style={styles.balanceItem}>
                  <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>Net Worth</Text>
                  <Text style={[styles.balanceValue, { color: theme.text }]}>
                    {formatCurrency(economics.netWorthUSD)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Economic Metrics */}
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Economic Metrics</Text>
              <View style={styles.economicsList}>
                <View style={styles.economicsRow}>
                  <View style={styles.economicsLabelContainer}>
                    <Ionicons name="flame-outline" size={18} color={COLORS.error} />
                    <Text style={[styles.economicsLabel, { color: theme.textSecondary }]}>
                      Daily Burn Rate
                    </Text>
                  </View>
                  <Text style={[styles.economicsValue, { color: theme.text }]}>
                    {formatCurrency(economics.dailyBurnRateUSD)}/day
                  </Text>
                </View>
                <View style={styles.economicsRow}>
                  <View style={styles.economicsLabelContainer}>
                    <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                    <Text style={[styles.economicsLabel, { color: theme.textSecondary }]}>
                      Runway
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.economicsValue,
                      {
                        color:
                          economics.runwayDays < 7
                            ? COLORS.error
                            : economics.runwayDays < 14
                            ? COLORS.warning
                            : COLORS.success,
                      },
                    ]}
                  >
                    {formatNumber(economics.runwayDays, 1)} days
                  </Text>
                </View>
                <View style={styles.economicsRow}>
                  <View style={styles.economicsLabelContainer}>
                    <Ionicons name="speedometer-outline" size={18} color={COLORS.info} />
                    <Text style={[styles.economicsLabel, { color: theme.textSecondary }]}>
                      Efficiency Score
                    </Text>
                  </View>
                  <Text style={[styles.economicsValue, { color: theme.text }]}>
                    {economics.efficiencyScore}/100
                  </Text>
                </View>
              </View>

              {/* Efficiency Progress Bar */}
              <View style={styles.efficiencyContainer}>
                <View style={styles.efficiencyBarBackground}>
                  <View
                    style={[
                      styles.efficiencyBarFill,
                      {
                        width: `${economics.efficiencyScore}%`,
                        backgroundColor:
                          economics.efficiencyScore > 70
                            ? COLORS.success
                            : economics.efficiencyScore > 40
                            ? COLORS.warning
                            : COLORS.error,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>

            {/* Chain Distribution */}
            {economics.rawBalances && economics.rawBalances.length > 0 && (
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>Chain Distribution</Text>
                {economics.rawBalances.map((balance: ChainBalance) => (
                  <View key={balance.chain} style={styles.chainItem}>
                    <View style={styles.chainHeader}>
                      <Text style={[styles.chainName, { color: theme.text }]}>
                        {balance.chain.charAt(0).toUpperCase() + balance.chain.slice(1)}
                      </Text>
                      <Text style={[styles.chainBalance, { color: theme.text }]}>
                        {formatCurrency(parseFloat(balance.usdcBalance))}
                      </Text>
                    </View>
                    <View style={styles.chainBarContainer}>
                      <View
                        style={[
                          styles.chainBar,
                          {
                            backgroundColor: getChainColor(balance.chain),
                            width: `${Math.min(
                              100,
                              (parseFloat(balance.usdcBalance) / (economics.totalUSDC || 1)) * 100
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* History Tab */}
        {selectedTab === 'history' && (
          <>
            {/* Heartbeat History */}
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Recent Heartbeats</Text>
              <View style={styles.heartbeatList}>
                {heartbeatHistory.map((heartbeat, index) => (
                  <View
                    key={index}
                    style={[
                      styles.heartbeatItem,
                      index < heartbeatHistory.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: COLORS.gray200,
                      },
                    ]}
                  >
                    <View style={styles.heartbeatLeft}>
                      <Ionicons
                        name={getStatusIcon(heartbeat.status)}
                        size={20}
                        color={getStatusColor(heartbeat.status)}
                      />
                      <View style={styles.heartbeatInfo}>
                        <Text style={[styles.heartbeatStatus, { color: COLORS.gray900 }]}>
                          {heartbeat.status.toUpperCase()}
                        </Text>
                        <Text style={[styles.heartbeatTime, { color: COLORS.gray500 }]}>
                          {formatTimeAgo(heartbeat.timestamp)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.heartbeatScore}>
                      <Text style={[styles.heartbeatScoreText, { color: COLORS.gray900 }]}>
                        {heartbeat.survivalScore.toFixed(0)}
                      </Text>
                      <Text style={[styles.heartbeatScoreLabel, { color: COLORS.gray500 }]}>
                        Score
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Health Statistics */}
            {health && (
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>Health Statistics</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.text }]}>
                      {health.totalTasksCompleted || 0}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                      Tasks Completed
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.text }]}>
                      {health.totalTasksFailed || 0}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                      Tasks Failed
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.text }]}>
                      {health.consecutiveFailures || 0}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                      Consecutive Failures
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.text }]}>
                      {Math.round(health.averageResponseTime || 0)}ms
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                      Avg Response Time
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Ionicons name="information-circle-outline" size={14} color={COLORS.gray400} />
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            Data refreshes automatically every 60 seconds
          </Text>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.sm,
  },
  refreshButton: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
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
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  scrollContent: {
    padding: SPACING.md,
  },
  card: {
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  cardTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  errorText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
  },
  errorSubtext: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.md,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
  },
  retryText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: FONT_SIZE.md,
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  healthStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  healthStatusText: {
    gap: 2,
  },
  statusLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  overallScore: {
    fontSize: FONT_SIZE['3xl'],
    fontWeight: '700',
  },
  lastCheckText: {
    fontSize: FONT_SIZE.xs,
  },
  scoreContainer: {
    marginBottom: SPACING.lg,
  },
  scoreCircle: {
    height: 12,
    backgroundColor: COLORS.gray200,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  scoreFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.full,
  },
  scoreLabel: {
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
  },
  metricsGrid: {
    gap: SPACING.md,
  },
  metricItem: {
    gap: SPACING.xs,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  metricLabel: {
    fontSize: FONT_SIZE.xs,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  metricBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  metricBarBackground: {
    flex: 1,
    height: 8,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  metricBarFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.full,
  },
  metricValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    width: 30,
    textAlign: 'right',
  },
  quickStatsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  quickStatCard: {
    flex: 1,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  quickStatValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    marginTop: SPACING.xs,
  },
  quickStatLabel: {
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  sectionContent: {
    marginTop: SPACING.md,
  },
  actionItem: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  actionTypeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  actionTypeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
  },
  priorityBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  priorityText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  actionDescription: {
    fontSize: FONT_SIZE.md,
    marginBottom: 4,
  },
  actionImpact: {
    fontSize: FONT_SIZE.sm,
    fontStyle: 'italic',
  },
  recommendedChain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.xs,
  },
  recommendedChainText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
  },
  trendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  trendItem: {
    width: '47%',
    gap: SPACING.xs,
  },
  trendLabel: {
    fontSize: FONT_SIZE.sm,
  },
  trendValue: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  trendBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.md,
    alignSelf: 'flex-start',
  },
  trendBadgeText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  balanceGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  balanceItem: {
    flex: 1,
    padding: SPACING.md,
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.lg,
  },
  balanceLabel: {
    fontSize: FONT_SIZE.xs,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
  },
  economicsList: {
    gap: SPACING.md,
  },
  economicsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  economicsLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  economicsLabel: {
    fontSize: FONT_SIZE.md,
  },
  economicsValue: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  efficiencyContainer: {
    marginTop: SPACING.md,
  },
  efficiencyBarBackground: {
    height: 8,
    backgroundColor: COLORS.gray200,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  efficiencyBarFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.full,
  },
  chainItem: {
    marginBottom: SPACING.md,
  },
  chainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  chainName: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  chainBalance: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  chainBarContainer: {
    height: 6,
    backgroundColor: COLORS.gray200,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  chainBar: {
    height: '100%',
    borderRadius: BORDER_RADIUS.full,
  },
  heartbeatList: {
    gap: SPACING.md,
  },
  heartbeatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: SPACING.md,
  },
  heartbeatLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  heartbeatInfo: {
    gap: 2,
  },
  heartbeatStatus: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  heartbeatTime: {
    fontSize: FONT_SIZE.xs,
  },
  heartbeatScore: {
    alignItems: 'flex-end',
  },
  heartbeatScoreText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  heartbeatScoreLabel: {
    fontSize: FONT_SIZE.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  statItem: {
    width: '47%',
    padding: SPACING.md,
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.lg,
  },
  statValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.lg,
  },
  footerText: {
    fontSize: FONT_SIZE.sm,
  },
  bottomPadding: {
    height: 32,
  },
});
