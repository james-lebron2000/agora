import { useState, useEffect, useCallback, useRef } from 'react';
import { resolveRelayUrl } from '../lib/relayUrl';

export type HealthStatus = 'healthy' | 'stable' | 'degraded' | 'critical' | 'dying';
export type ActionType = 'bridge' | 'reduce_cost' | 'optimize_chain' | 'earn' | 'alert' | 'shutdown';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type TrendDirection = 'improving' | 'stable' | 'declining';

export interface SurvivalAction {
  type: ActionType;
  priority: Priority;
  description: string;
  estimatedImpact: string;
  recommendedChain?: string;
}

export interface HealthMetrics {
  overall: number;
  compute: number;
  storage: number;
  network: number;
  economic: number;
  status: HealthStatus;
  lastCheck: string;
}

export interface EconomicData {
  totalUSDC: number;
  netWorthUSD: number;
  runwayDays: number;
  dailyBurnRateUSD: number;
  efficiencyScore: number;
}

export interface HealthTrend {
  direction: TrendDirection;
  rateOfChange: number;
  predictedHealth: number;
  predictedRunway: number;
}

export interface SurvivalData {
  health: HealthMetrics;
  economics: EconomicData;
  trend: HealthTrend;
  pendingActions: SurvivalAction[];
  survivalMode: boolean;
}

export interface SurvivalResponse {
  success: boolean;
  data: SurvivalData;
  timestamp: string;
  requestId: string;
}

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const DEFAULT_REFRESH_INTERVAL = 60000; // 60 seconds

/**
 * Fetch survival data for an agent
 */
async function fetchSurvivalData(agentId: string): Promise<SurvivalData> {
  // Try the main API first
  try {
    const response = await fetch(`${API_BASE_URL}/survival/${agentId}?address=${agentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: SurvivalResponse = await response.json();
    
    if (!result.success) {
      throw new Error('API returned unsuccessful response');
    }

    return result.data;
  } catch (apiError) {
    console.warn('[useSurvival] API fetch failed, falling back to relay:', apiError);
    
    // Fallback to relay
    return fetchSurvivalFromRelay(agentId);
  }
}

/**
 * Fetch survival data from relay as fallback
 */
async function fetchSurvivalFromRelay(agentId: string): Promise<SurvivalData> {
  const relayUrl = resolveRelayUrl();
  
  try {
    const response = await fetch(`${relayUrl}/v1/agents/${agentId}/survival`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Relay HTTP error! status: ${response.status}`);
    }

    const result: SurvivalResponse = await response.json();
    
    if (!result.success) {
      throw new Error('Relay returned unsuccessful response');
    }

    return result.data;
  } catch (relayError) {
    console.error('[useSurvival] Both API and relay failed:', relayError);
    throw relayError;
  }
}

/**
 * Hook for fetching and managing agent survival data
 * 
 * Features:
 * - Automatic data fetching on mount
 * - Auto-refresh every 60 seconds
 * - Manual refresh capability
 * - Loading and error states
 * - Fallback to relay if API fails
 * 
 * @param agentId - The ID of the agent to fetch survival data for
 * @param refreshInterval - Auto-refresh interval in milliseconds (default: 60000)
 * @returns Survival data, loading state, error state, and refresh function
 * 
 * @example
 * ```tsx
 * function SurvivalMonitor({ agentId }: { agentId: string }) {
 *   const { data, isLoading, error, refetch } = useSurvival(agentId);
 *   
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *   
 *   return (
 *     <div>
 *       <h1>Health: {data.health.overall}/100</h1>
 *       <p>Runway: {data.economics.runwayDays} days</p>
 *       <button onClick={refetch}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSurvival(agentId: string | null | undefined, refreshInterval = DEFAULT_REFRESH_INTERVAL) {
  const [data, setData] = useState<SurvivalData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const fetchData = useCallback(async () => {
    if (!agentId || agentId === '') {
      setError('Agent ID is required');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const survivalData = await fetchSurvivalData(agentId);
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setData(survivalData);
        setError(null);
      }
    } catch (err) {
      console.error('[useSurvival] Failed to fetch survival data:', err);
      
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch survival data');
        // Don't clear existing data on error, just show the error state
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [agentId]);

  // Initial fetch and setup auto-refresh
  useEffect(() => {
    isMountedRef.current = true;
    
    // Initial fetch
    fetchData();

    // Setup auto-refresh interval
    intervalRef.current = setInterval(() => {
      fetchData();
    }, refreshInterval);

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchData, refreshInterval]);

  // Reset data when agentId changes
  useEffect(() => {
    setData(null);
    setError(null);
    setIsLoading(true);
  }, [agentId]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}

export default useSurvival;
