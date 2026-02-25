import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  scale,
  verticalScale,
  moderateScale,
  responsiveFontSize,
  spacing,
} from '../utils/responsive';
import { useSurvivalSDK } from '../hooks/useSDK';
import type { Address } from 'viem';

// Get screen dimensions for responsive layout
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Health status type - matches SDK's AgentHealthStatus plus UI-specific statuses
 type HealthStatus = 'healthy' | 'stable' | 'degraded' | 'critical' | 'dying' | 'dead';

interface SurvivalMonitorProps {
  agentId: string | null;
  address?: Address | null;
  showHeader?: boolean;
  compact?: boolean;
}

interface SurvivalAction {
  type: 'bridge' | 'reduce_cost' | 'optimize_chain' | 'earn' | 'alert' | 'shutdown';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  estimatedImpact: string;
  recommendedChain?: string;
}

interface HealthTrend {
  direction: 'improving' | 'stable' | 'declining';
  rateOfChange: number;
  predictedHealth: number;
  predictedRunway: number;
}

export function SurvivalMonitor({ 
  agentId,
  address,
  showHeader = true,
  compact = false 
}: SurvivalMonitorProps) {
  const { health, economics, snapshot, isLoading, error, refetch } = useSurvivalSDK(agentId, address);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('health');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const getStatusColor = (status: HealthStatus): string => {
    switch (status) {
      case 'healthy': return '#10b981'; // green
      case 'stable': return '#3b82f6'; // blue
      case 'degraded': return '#f59e0b'; // yellow
      case 'critical': return '#ef4444'; // red
      case 'dying': return '#7f1d1d'; // dark red
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: HealthStatus): keyof typeof Ionicons.glyphMap => {
    switch (status) {
      case 'healthy': return 'checkmark-circle';
      case 'stable': return 'shield-checkmark';
      case 'degraded': return 'warning';
      case 'critical': return 'alert-circle';
      case 'dying': return 'skull';
      default: return 'help-circle';
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      case 'low': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const formatNumber = (value: string | number, decimals = 2) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0';
    return num.toFixed(decimals);
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '$0.00';
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  // Compact view for embedding in other screens
  if (compact && snapshot) {
    return (
      <View style={styles.compactContainer}>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(snapshot.health.status)}20` }]}>
          <Ionicons 
            name={getStatusIcon(snapshot.health.status)} 
            size={16} 
            color={getStatusColor(snapshot.health.status)} 
          />
          <Text style={[styles.statusText, { color: getStatusColor(snapshot.health.status) }]}>
            {snapshot.health.status.toUpperCase()}
          </Text>
        </View>
        <View style={styles.compactMetrics}>
          <View style={styles.compactMetric}>
            <Text style={styles.compactMetricValue}>{snapshot.health.overall}</Text>
            <Text style={styles.compactMetricLabel}>Health</Text>
          </View>
          <View style={styles.compactMetric}>
            <Text style={styles.compactMetricValue}>{formatNumber(economics?.runwayDays || 0, 1)}</Text>
            <Text style={styles.compactMetricLabel}>Days</Text>
          </View>
          <View style={styles.compactMetric}>
            <Text style={styles.compactMetricValue}>{formatCurrency(economics?.totalUSDC || 0)}</Text>
            <Text style={styles.compactMetricLabel}>USDC</Text>
          </View>
        </View>
      </View>
    );
  }

  if (isLoading && !refreshing && !snapshot) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading survival data...</Text>
      </View>
    );
  }

  if (!snapshot) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="pulse-outline" size={48} color="#d1d5db" />
        <Text style={styles.emptyText}>No survival data available</Text>
        {error && <Text style={styles.errorSubtext}>{error}</Text>}
        <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const trend: HealthTrend = snapshot.trend || {
    direction: 'stable',
    rateOfChange: 0,
    predictedHealth: snapshot.health.overall,
    predictedRunway: economics?.runwayDays || 0
  };
  const actions: SurvivalAction[] = snapshot.pendingActions || [];

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      {showHeader && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, { backgroundColor: `${getStatusColor(snapshot.health.status)}20` }]}>
              <Ionicons 
                name="pulse" 
                size={20} 
                color={getStatusColor(snapshot.health.status)} 
              />
            </View>
            <View>
              <Text style={styles.title}>Echo Survival</Text>
              <Text style={styles.subtitle}>Agent {agentId?.slice(0, 8)}...</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={onRefresh} style={styles.iconButton}>
              <Ionicons name="refresh" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={24} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Survival Mode Banner */}
      {snapshot.survivalMode && (
        <View style={styles.survivalBanner}>
          <Ionicons name="warning" size={20} color="#fff" />
          <Text style={styles.survivalBannerText}>Survival Mode Active</Text>
        </View>
      )}

      {/* Overall Health Card */}
      <View style={styles.healthCard}>
        <View style={styles.healthHeader}>
          <View style={styles.healthStatus}>
            <Ionicons 
              name={getStatusIcon(snapshot.health.status)} 
              size={32} 
              color={getStatusColor(snapshot.health.status)} 
            />
            <View style={styles.healthStatusText}>
              <Text style={[styles.statusLabel, { color: getStatusColor(snapshot.health.status) }]}>
                {snapshot.health.status.toUpperCase()}
              </Text>
              <Text style={styles.overallScore}>{snapshot.health.overall}/100</Text>
            </View>
          </View>
          <View style={styles.lastCheck}>
            <Text style={styles.lastCheckText}>
              Last check: {new Date(snapshot.health.lastCheck).toLocaleTimeString()}
            </Text>
          </View>
        </View>

        {/* Health Metrics */}
        <View style={styles.metricsGrid}>
          {[
            { label: 'Compute', value: snapshot.health.compute, icon: 'hardware-chip' },
            { label: 'Storage', value: snapshot.health.storage, icon: 'server' },
            { label: 'Network', value: snapshot.health.network, icon: 'wifi' },
            { label: 'Economic', value: snapshot.health.economic, icon: 'cash' },
          ].map((metric) => (
            <View key={metric.label} style={styles.metricItem}>
              <View style={styles.metricHeader}>
                <Ionicons name={metric.icon as any} size={14} color="#6b7280" />
                <Text style={styles.metricLabel}>{metric.label}</Text>
              </View>
              <View style={styles.metricBarContainer}>
                <View style={styles.metricBarBackground}>
                  <View 
                    style={[
                      styles.metricBarFill,
                      { 
                        width: `${metric.value}%`,
                        backgroundColor: metric.value > 70 ? '#10b981' : metric.value > 40 ? '#f59e0b' : '#ef4444'
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.metricValue}>{metric.value}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Economics Card */}
      {economics && (
        <View style={styles.economicsCard}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => setExpandedSection(expandedSection === 'economics' ? null : 'economics')}
          >
            <View style={styles.sectionTitleRow}>
              <Ionicons name="wallet-outline" size={20} color="#6366f1" />
              <Text style={styles.sectionTitle}>Economic Metrics</Text>
            </View>
            <Ionicons 
              name={expandedSection === 'economics' ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#6b7280" 
            />
          </TouchableOpacity>

          {expandedSection === 'economics' && (
            <View style={styles.sectionContent}>
              <View style={styles.economicsGrid}>
                <View style={styles.economicsItem}>
                  <Text style={styles.economicsLabel}>Total USDC</Text>
                  <Text style={styles.economicsValue}>{formatCurrency(economics.totalUSDC)}</Text>
                </View>
                <View style={styles.economicsItem}>
                  <Text style={styles.economicsLabel}>Net Worth</Text>
                  <Text style={styles.economicsValue}>{formatCurrency(economics.netWorthUSD)}</Text>
                </View>
                <View style={styles.economicsItem}>
                  <Text style={styles.economicsLabel}>Runway</Text>
                  <Text style={[styles.economicsValue, 
                    economics.runwayDays < 7 ? styles.criticalValue : 
                    economics.runwayDays < 14 ? styles.warningValue : styles.goodValue
                  ]}>
                    {formatNumber(economics.runwayDays, 1)} days
                  </Text>
                </View>
                <View style={styles.economicsItem}>
                  <Text style={styles.economicsLabel}>Daily Burn</Text>
                  <Text style={styles.economicsValue}>{formatCurrency(economics.dailyBurnRateUSD)}/day</Text>
                </View>
              </View>

              {/* Efficiency Score */}
              <View style={styles.efficiencyContainer}>
                <Text style={styles.efficiencyLabel}>Efficiency Score</Text>
                <View style={styles.efficiencyBarContainer}>
                  <View style={styles.efficiencyBarBackground}>
                    <View 
                      style={[
                        styles.efficiencyBarFill,
                        { width: `${economics.efficiencyScore}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.efficiencyValue}>{economics.efficiencyScore}/100</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Trend Card */}
      {trend && (
        <View style={styles.trendCard}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => setExpandedSection(expandedSection === 'trend' ? null : 'trend')}
          >
            <View style={styles.sectionTitleRow}>
              <Ionicons name="trending-up-outline" size={20} color="#6366f1" />
              <Text style={styles.sectionTitle}>Health Trend</Text>
            </View>
            <Ionicons 
              name={expandedSection === 'trend' ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#6b7280" 
            />
          </TouchableOpacity>

          {expandedSection === 'trend' && (
            <View style={styles.sectionContent}>
              <View style={styles.trendInfo}>
                <View style={styles.trendRow}>
                  <Text style={styles.trendLabel}>Direction</Text>
                  <View style={[styles.trendBadge, { 
                    backgroundColor: trend.direction === 'improving' ? '#d1fae5' : 
                                     trend.direction === 'declining' ? '#fee2e2' : '#f3f4f6'
                  }]}>
                    <Text style={[styles.trendBadgeText, {
                      color: trend.direction === 'improving' ? '#059669' : 
                             trend.direction === 'declining' ? '#dc2626' : '#6b7280'
                    }]}>
                      {trend.direction}
                    </Text>
                  </View>
                </View>
                <View style={styles.trendRow}>
                  <Text style={styles.trendLabel}>Rate of Change</Text>
                  <Text style={[
                    styles.trendValue,
                    trend.rateOfChange > 0 ? styles.goodValue : 
                    trend.rateOfChange < 0 ? styles.criticalValue : undefined
                  ]}>
                    {trend.rateOfChange > 0 ? '+' : ''}{trend.rateOfChange.toFixed(2)}/day
                  </Text>
                </View>
                <View style={styles.trendRow}>
                  <Text style={styles.trendLabel}>Predicted Health (7d)</Text>
                  <Text style={styles.trendValue}>{trend.predictedHealth.toFixed(0)}/100</Text>
                </View>
                <View style={styles.trendRow}>
                  <Text style={styles.trendLabel}>Predicted Runway (7d)</Text>
                  <Text style={styles.trendValue}>{trend.predictedRunway.toFixed(1)} days</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Actions Card */}
      {actions.length > 0 && (
        <View style={styles.actionsCard}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => setExpandedSection(expandedSection === 'actions' ? null : 'actions')}
          >
            <View style={styles.sectionTitleRow}>
              <Ionicons name="flash-outline" size={20} color="#6366f1" />
              <Text style={styles.sectionTitle}>Recommended Actions ({actions.length})</Text>
            </View>
            <Ionicons 
              name={expandedSection === 'actions' ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#6b7280" 
            />
          </TouchableOpacity>

          {expandedSection === 'actions' && (
            <View style={styles.sectionContent}>
              {actions.map((action, index) => (
                <View key={index} style={styles.actionItem}>
                  <View style={styles.actionHeader}>
                    <View style={[styles.actionTypeBadge, { 
                      backgroundColor: `${getPriorityColor(action.priority)}20` 
                    }]}>
                      <Text style={[styles.actionTypeText, { 
                        color: getPriorityColor(action.priority) 
                      }]}>
                        {action.type.toUpperCase()}
                      </Text>
                    </View>
                    <View style={[styles.priorityBadge, { 
                      backgroundColor: getPriorityColor(action.priority) 
                    }]}>
                      <Text style={styles.priorityText}>{action.priority}</Text>
                    </View>
                  </View>
                  <Text style={styles.actionDescription}>{action.description}</Text>
                  <Text style={styles.actionImpact}>{action.estimatedImpact}</Text>
                  {action.recommendedChain && (
                    <View style={styles.recommendedChain}>
                      <Ionicons name="arrow-forward" size={12} color="#6366f1" />
                      <Text style={styles.recommendedChainText}>
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

      {/* Info footer */}
      <View style={styles.footer}>
        <Ionicons name="information-circle-outline" size={14} color="#9ca3af" />
        <Text style={styles.footerText}>
          Data refreshes automatically every 60 seconds
        </Text>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  compactContainer: {
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  compactMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  compactMetric: {
    alignItems: 'center',
  },
  compactMetricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  compactMetricLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 14,
  },
  errorSubtext: {
    marginTop: 8,
    color: '#ef4444',
    fontSize: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#6366f1',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    alignItems: 'center',
  },
  errorText: {
    marginTop: 8,
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  survivalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#ef4444',
    borderRadius: 10,
  },
  survivalBannerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  healthCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  healthStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  healthStatusText: {
    gap: 2,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  overallScore: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  lastCheck: {
    alignItems: 'flex-end',
  },
  lastCheckText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  metricsGrid: {
    gap: 12,
  },
  metricItem: {
    gap: 6,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  metricBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metricBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  metricBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    width: 30,
    textAlign: 'right',
  },
  economicsCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  trendCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  actionsCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  economicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 12,
  },
  economicsItem: {
    width: '47%',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
  },
  economicsLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  economicsValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  criticalValue: {
    color: '#ef4444',
  },
  warningValue: {
    color: '#f59e0b',
  },
  goodValue: {
    color: '#10b981',
  },
  efficiencyContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  efficiencyLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  efficiencyBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  efficiencyBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  efficiencyBarFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 4,
  },
  efficiencyValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  trendInfo: {
    paddingTop: 12,
    gap: 12,
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trendLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  trendValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  trendBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  actionItem: {
    padding: 14,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 10,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionTypeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
  },
  actionDescription: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 6,
  },
  actionImpact: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  recommendedChain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  recommendedChainText: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  bottomPadding: {
    height: 32,
  },
});

export default SurvivalMonitor;
