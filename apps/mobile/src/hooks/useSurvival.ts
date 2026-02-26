/**
 * useSurvival Hook for Agora Mobile
 * React hook for managing Echo Survival monitoring with SDK integration
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Address } from 'viem';
import {
  getOrCreateSurvivalManager,
  type AgentHealthStatus,
  type SurvivalSnapshot as SDKSurvivalSnapshot
} from '@agora/sdk/survival';
import type { SupportedChain, ChainBalance } from '@agora/sdk/bridge';
import {
  type MobileSurvivalSnapshot,
  type SurvivalHealth,
  type SurvivalEconomics,
  type SurvivalAction,
  type SurvivalTrend,
  type HeartbeatRecord,
  type SurvivalAlert,
  type ExtendedHealthStatus
} from '../types/survival';

// Convert SDK health status to extended status
function extendHealthStatus(status: AgentHealthStatus): ExtendedHealthStatus {
  return status;
}

// Convert SDK snapshot to mobile snapshot
function convertToMobileSnapshot(
  sdkSnapshot: SDKSurvivalSnapshot,
  balances: ChainBalance[],
  cheapestChain: SupportedChain,
  recommendations: string[],
  actions: SurvivalAction[]
): MobileSurvivalSnapshot {
  const now = Date.now();
  const health: SurvivalHealth = {
    status: extendHealthStatus(sdkSnapshot.health.status),
    overall: sdkSnapshot.health.overall,
    lastHeartbeat: now,
    lastCheck: sdkSnapshot.timestamp || now,
    consecutiveFailures: 0,
    totalTasksCompleted: 0,
    totalTasksFailed: 0,
    successRate: 1.0,
    averageResponseTime: 0,
    compute: 85,
    storage: 88,
    network: 82,
    economic: Math.min(100, Math.round(parseFloat(sdkSnapshot.economics.balance) * 2)),
    survivalMode: sdkSnapshot.health.status === 'critical' || sdkSnapshot.health.status === 'dead',
    trend: 'stable'
  };

  const dailyBurn = parseFloat(balances.length > 0 ? '0.8' : '1');
  const balance = parseFloat(sdkSnapshot.economics.balance);
  const runwayDays = dailyBurn > 0 ? Math.floor(balance / dailyBurn) : 999;

  const economics: SurvivalEconomics = {
    totalUSDC: balance,
    totalNativeUSD: 0,
    netWorthUSD: balance,
    runwayDays,
    dailyBurnRateUSD: dailyBurn,
    efficiencyScore: Math.round((balance > 0 ? 60 : 40) + (runwayDays > 30 ? 20 : runwayDays / 3)),
    rawBalances: balances,
    cheapestChain
  };

  const trend: SurvivalTrend = {
    direction: runwayDays > 14 ? 'improving' : runwayDays > 7 ? 'stable' : 'declining',
    rateOfChange: (runwayDays - 30) / 7,
    predictedHealth: Math.max(0, Math.min(100, health.overall + (runwayDays - 30) / 7)),
    predictedRunway: runwayDays,
    lastUpdated: now
  };

  return {
    health,
    economics,
    timestamp: now,
    trend,
    pendingActions: actions,
    survivalMode: health.survivalMode,
    recommendations
  };
}

// Generate actions from recommendations
function generateActions(recommendations: string[]): SurvivalAction[] {
  return recommendations.map((rec, index) => {
    const isUrgent = rec.toLowerCase().includes('urgent') || 
                    rec.toLowerCase().includes('critical') ||
                    rec.toLowerCase().includes('emergency');
    
    let type: SurvivalAction['type'] = 'alert';
    if (rec.toLowerCase().includes('bridge')) type = 'bridge';
    else if (rec.toLowerCase().includes('cost')) type = 'reduce_cost';
    else if (rec.toLowerCase().includes('chain')) type = 'optimize_chain';
    else if (rec.toLowerCase().includes('revenue') || rec.toLowerCase().includes('earn')) type = 'earn';

    const priority: SurvivalAction['priority'] = isUrgent ? 'critical' : 
                                                rec.toLowerCase().includes('improve') ? 'high' : 'medium';
    
    const iconMap: Record<SurvivalAction['type'], string> = {
      bridge: 'swap-horizontal',
      reduce_cost: 'trending-down',
      optimize_chain: 'git-network',
      earn: 'cash',
      alert: 'alert-circle',
      shutdown: 'power'
    };

    const colorMap: Record<SurvivalAction['priority'], string> = {
      critical: '#ef4444',
      high: '#f59e0b',
      medium: '#3b82f6',
      low: '#6b7280'
    };

    return {
      type,
      priority,
      description: rec,
      estimatedImpact: isUrgent ? 'Immediate improvement needed' : 'Moderate improvement expected',
      icon: iconMap[type],
      color: colorMap[priority],
      actionable: type !== 'alert'
    };
  }).slice(0, 5);
}

// Cache for survival managers
const survivalManagerCache = new Map<string, ReturnType<typeof getOrCreateSurvivalManager>>();

interface UseSurvivalOptions {
  agentId?: string | null;
  address?: Address | null;
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableHeartbeat?: boolean;
  heartbeatInterval?: number;
}

interface UseSurvivalReturn {
  // State
  snapshot: MobileSurvivalSnapshot | null;
  health: SurvivalHealth | null;
  economics: SurvivalEconomics | null;
  actions: SurvivalAction[];
  alerts: SurvivalAlert[];
  heartbeatHistory: HeartbeatRecord[];
  
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdated: number;
  
  // Actions
  refresh: () => Promise<void>;
  performCheck: () => Promise<MobileSurvivalSnapshot | null>;
  sendHeartbeat: (metadata?: Record<string, unknown>) => Promise<HeartbeatRecord | null>;
  acknowledgeAlert: (alertId: string) => void;
  dismissAllAlerts: () => void;
  
  // Status helpers
  isHealthy: boolean;
  isInSurvivalMode: boolean;
  needsEmergencyFunding: boolean;
  daysOfRunway: number;
  survivalScore: number;
  
  // History
  getHealthHistory: (limit?: number) => Promise<HeartbeatRecord[]>;
}

export function useSurvival(options: UseSurvivalOptions = {}): UseSurvivalReturn {
  const {
    agentId = null,
    address = null,
    autoRefresh = true,
    refreshInterval = 60000,
    enableHeartbeat = true,
    heartbeatInterval = 30000
  } = options;

  // State
  const [snapshot, setSnapshot] = useState<MobileSurvivalSnapshot | null>(null);
  const [health, setHealth] = useState<SurvivalHealth | null>(null);
  const [economics, setEconomics] = useState<SurvivalEconomics | null>(null);
  const [actions, setActions] = useState<SurvivalAction[]>([]);
  const [alerts, setAlerts] = useState<SurvivalAlert[]>([]);
  const [heartbeatHistory, setHeartbeatHistory] = useState<HeartbeatRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(0);

  // Refs
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get or create survival manager
  const getSurvivalManager = useCallback(() => {
    if (!agentId || !address) return null;
    
    const cacheKey = `${agentId}:${address.toLowerCase()}`;
    if (!survivalManagerCache.has(cacheKey)) {
      survivalManagerCache.set(cacheKey, getOrCreateSurvivalManager(agentId, address));
    }
    return survivalManagerCache.get(cacheKey)!;
  }, [agentId, address]);

  // Perform survival check
  const performCheck = useCallback(async (): Promise<MobileSurvivalSnapshot | null> => {
    if (!agentId || !address) {
      setError('Agent ID and address are required');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const manager = getSurvivalManager();
      if (!manager) {
        throw new Error('Failed to initialize survival manager');
      }

      // Get SDK survival check
      const sdkSnapshot = await manager.performSurvivalCheck();
      
      // Get recommendations
      const recommendations = await manager.getRecoveryRecommendations();
      
      // Get balances (mock for now - would integrate with bridge SDK)
      const mockBalances: ChainBalance[] = [
        { chain: 'base', usdcBalance: sdkSnapshot.economics.balance, nativeBalance: '0.1' },
        { chain: 'optimism', usdcBalance: '0', nativeBalance: '0.05' },
        { chain: 'arbitrum', usdcBalance: '0', nativeBalance: '0' },
        { chain: 'ethereum', usdcBalance: '0', nativeBalance: '0' }
      ];

      // Generate actions from recommendations
      const generatedActions = generateActions(recommendations);

      // Convert to mobile snapshot
      const mobileSnapshot = convertToMobileSnapshot(
        sdkSnapshot,
        mockBalances,
        'base', // Would call findCheapestChain
        recommendations,
        generatedActions
      );

      setSnapshot(mobileSnapshot);
      setHealth(mobileSnapshot.health);
      setEconomics(mobileSnapshot.economics);
      setActions(generatedActions);
      setLastUpdated(Date.now());

      // Generate alerts based on status
      const newAlerts: SurvivalAlert[] = [];
      if (mobileSnapshot.survivalMode) {
        newAlerts.push({
          id: `alert-${Date.now()}-survival`,
          type: 'health',
          severity: 'critical',
          title: 'Survival Mode Active',
          message: 'Your agent is in survival mode. Immediate action required.',
          timestamp: Date.now(),
          acknowledged: false,
          action: generatedActions.find(a => a.priority === 'critical')
        });
      }
      if (mobileSnapshot.economics.runwayDays < 7) {
        newAlerts.push({
          id: `alert-${Date.now()}-runway`,
          type: 'economic',
          severity: 'warning',
          title: 'Low Runway',
          message: `Only ${mobileSnapshot.economics.runwayDays} days of runway remaining.`,
          timestamp: Date.now(),
          acknowledged: false
        });
      }
      setAlerts(newAlerts);

      return mobileSnapshot;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to perform survival check';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [agentId, address, getSurvivalManager]);

  // Send heartbeat
  const sendHeartbeat = useCallback(async (
    metadata?: Record<string, unknown>
  ): Promise<HeartbeatRecord | null> => {
    if (!agentId || !address) return null;

    try {
      const manager = getSurvivalManager();
      if (!manager) return null;

      const record = await manager.sendHeartbeat(metadata);
      const heartbeatRecord: HeartbeatRecord = {
        timestamp: record.timestamp,
        status: extendHealthStatus(record.status),
        survivalScore: record.survivalScore,
        metadata: record.metadata
      };

      setHeartbeatHistory(prev => [...prev.slice(-99), heartbeatRecord]);
      return heartbeatRecord;
    } catch (error) {
      console.error('[useSurvival] Failed to send heartbeat:', error);
      return null;
    }
  }, [agentId, address, getSurvivalManager]);

  // Refresh data
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await performCheck();
    setIsRefreshing(false);
  }, [performCheck]);

  // Acknowledge alert
  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      )
    );
  }, []);

  // Dismiss all alerts
  const dismissAllAlerts = useCallback(() => {
    setAlerts(prev => prev.map(alert => ({ ...alert, acknowledged: true })));
  }, []);

  // Get health history
  const getHealthHistory = useCallback(async (limit = 100): Promise<HeartbeatRecord[]> => {
    if (!agentId) return [];
    
    try {
      const manager = getSurvivalManager();
      if (!manager) return [];

      const history = manager.getHeartbeatHistory(limit);
      return history.map(h => ({
        timestamp: h.timestamp,
        status: extendHealthStatus(h.status),
        survivalScore: h.survivalScore,
        metadata: h.metadata
      }));
    } catch (error) {
      console.error('[useSurvival] Failed to get health history:', error);
      return [];
    }
  }, [agentId, getSurvivalManager]);

  // Initial load
  useEffect(() => {
    if (agentId && address) {
      performCheck();
    }
  }, [agentId, address, performCheck]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh && agentId && address) {
      refreshIntervalRef.current = setInterval(refresh, refreshInterval);
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [autoRefresh, agentId, address, refresh, refreshInterval]);

  // Heartbeat
  useEffect(() => {
    if (enableHeartbeat && agentId && address) {
      heartbeatIntervalRef.current = setInterval(() => {
        sendHeartbeat({ source: 'periodic' });
      }, heartbeatInterval);
      return () => {
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
      };
    }
  }, [enableHeartbeat, agentId, address, sendHeartbeat, heartbeatInterval]);

  // Computed values
  const isHealthy = health?.status === 'healthy' || health?.status === 'stable';
  const isInSurvivalMode = snapshot?.survivalMode ?? false;
  const needsEmergencyFunding = economics ? economics.runwayDays < 3 || economics.totalUSDC < 10 : false;
  const daysOfRunway = economics?.runwayDays ?? 0;
  const survivalScore = health?.overall ?? 0;

  return {
    snapshot,
    health,
    economics,
    actions,
    alerts,
    heartbeatHistory,
    isLoading,
    isRefreshing,
    error,
    lastUpdated,
    refresh,
    performCheck,
    sendHeartbeat,
    acknowledgeAlert,
    dismissAllAlerts,
    isHealthy,
    isInSurvivalMode,
    needsEmergencyFunding,
    daysOfRunway,
    survivalScore,
    getHealthHistory
  };
}

export default useSurvival;
