import { useState, useEffect, useCallback, useRef } from 'react';
import { resolveRelayUrl } from '../lib/relayUrl';

export type AgentStatus = 'online' | 'offline' | 'busy';
export type AgentTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface AgentReputation {
  score: number;
  tier: AgentTier;
  completedTasks: number;
  totalEarnings: number;
}

export interface AgentHealth {
  compute: number;
  storage: number;
  network: number;
  economic: number;
  overall: number;
}

export interface AgentEconomics {
  balances: Record<string, number>;
  runwayDays: number;
  dailyBurn: number;
  efficiency: number;
  chains: Array<{
    name: string;
    percentage: number;
    color: string;
  }>;
}

export interface AgentCapability {
  id: string;
  name: string;
  level: number;
  tasks: number;
  earnings: number;
}

export interface AgentActivity {
  id: string | number;
  type: 'task_completed' | 'payment_received' | 'task_started' | 'bridge' | string;
  description: string;
  timestamp: string;
  value: number | null;
}

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  reputation: AgentReputation;
  health: AgentHealth;
  economics: AgentEconomics;
  capabilities: AgentCapability[];
  recentActivity: AgentActivity[];
}

export interface AgentResponse {
  success: boolean;
  data: Agent;
  timestamp: string;
}

// API configuration
const DEFAULT_REFRESH_INTERVAL = 30000; // 30 seconds

/**
 * Fetch agent data from the relay/API
 */
async function fetchAgent(agentId: string): Promise<Agent> {
  const relayUrl = resolveRelayUrl();
  
  try {
    // Fetch agents list and find the specific agent
    const response = await fetch(`${relayUrl}/v1/agents`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.ok || !Array.isArray(result.agents)) {
      throw new Error('Invalid API response');
    }

    // Find the specific agent
    const agentData = result.agents.find((a: any) => a.id === agentId);
    
    if (!agentData) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Transform API data to Agent interface
    return transformAgentData(agentData);
  } catch (error) {
    console.error('[useAgent] Failed to fetch agent:', error);
    throw error;
  }
}

/**
 * Fetch agent stats from the relay/API
 */
async function fetchAgentStats(agentId: string): Promise<Partial<Agent>> {
  const relayUrl = resolveRelayUrl();
  
  try {
    // For now, stats are included in the agents endpoint
    // In the future, this could be a separate endpoint
    const response = await fetch(`${relayUrl}/v1/agents`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.ok || !Array.isArray(result.agents)) {
      throw new Error('Invalid API response');
    }

    const agentData = result.agents.find((a: any) => a.id === agentId);
    
    if (!agentData) {
      throw new Error(`Agent ${agentId} not found`);
    }

    return transformAgentData(agentData);
  } catch (error) {
    console.error('[useAgent] Failed to fetch agent stats:', error);
    throw error;
  }
}

/**
 * Fetch agent activity history
 */
async function fetchAgentActivity(agentId: string): Promise<AgentActivity[]> {
  const relayUrl = resolveRelayUrl();
  
  try {
    // Fetch messages/events for this agent
    const response = await fetch(`${relayUrl}/v1/messages`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.ok || !Array.isArray(result.events)) {
      return [];
    }

    // Transform events to activity format
    return result.events
      .filter((event: any) => 
        event.sender?.id === agentId || 
        event.recipient?.id === agentId
      )
      .slice(0, 20)
      .map((event: any, index: number) => ({
        id: event.id || index,
        type: getActivityType(event.type),
        description: getActivityDescription(event),
        timestamp: event.ts || new Date().toISOString(),
        value: event.payload?.value || null,
      }));
  } catch (error) {
    console.error('[useAgent] Failed to fetch agent activity:', error);
    return [];
  }
}

/**
 * Transform raw API agent data to Agent interface
 */
function transformAgentData(data: any): Agent {
  const reputation = data.reputation || {};
  const wallet = data.wallet || {};
  const balances = wallet.balances || [];
  
  // Calculate totals
  let totalUSDC = 0;
  let totalNative = 0;
  const nativePriceUSD = 3000; // ETH price
  
  for (const bal of balances) {
    totalUSDC += parseFloat(bal.usdcBalance || '0');
    totalNative += parseFloat(bal.nativeBalance || '0');
  }
  
  const totalNativeUSD = totalNative * nativePriceUSD;
  const netWorthUSD = totalUSDC + totalNativeUSD;
  
  // Calculate runway
  const dailyBurn = parseFloat(data.daily_burn_rate || '0.80');
  const runwayDays = dailyBurn > 0 ? Math.floor(netWorthUSD / dailyBurn) : 999;
  
  // Calculate health score
  const repScore = reputation.score || 0;
  const overallHealth = Math.min(100, Math.round(repScore * 20) + 20);
  
  // Calculate chain distribution
  const chainDistribution = calculateChainDistribution(balances, netWorthUSD, nativePriceUSD);
  
  // Get tier
  const tier = getTierFromScore(repScore);
  
  return {
    id: data.id,
    name: data.name || data.id,
    status: (data.status as AgentStatus) || 'offline',
    reputation: {
      score: repScore,
      tier,
      completedTasks: reputation.total_orders || 0,
      totalEarnings: parseFloat(data.total_earnings || '0'),
    },
    health: {
      compute: data.metrics?.compute || 85,
      storage: data.metrics?.storage || 88,
      network: data.metrics?.network || 82,
      economic: data.metrics?.economic || Math.min(100, Math.round(totalUSDC * 2)),
      overall: overallHealth,
    },
    economics: {
      balances: {
        USDC: totalUSDC,
        ETH: totalNative,
      },
      runwayDays,
      dailyBurn,
      efficiency: Math.round((totalUSDC > 0 ? 60 : 40) + (runwayDays > 30 ? 20 : runwayDays / 3)),
      chains: chainDistribution,
    },
    capabilities: transformCapabilities(data.capabilities || []),
    recentActivity: [], // Will be populated separately
  };
}

/**
 * Calculate chain distribution from balances
 */
function calculateChainDistribution(
  balances: any[], 
  netWorthUSD: number, 
  nativePriceUSD: number
): Array<{ name: string; percentage: number; color: string }> {
  const chainColors: Record<string, string> = {
    ethereum: '#627EEA',
    base: '#0052FF',
    optimism: '#FF0420',
    arbitrum: '#28A0F0',
  };
  
  const chains = ['ethereum', 'base', 'optimism', 'arbitrum'];
  
  return chains.map(chain => {
    const balance = balances.find((b: any) => b.chain === chain);
    const usdc = parseFloat(balance?.usdcBalance || '0');
    const native = parseFloat(balance?.nativeBalance || '0') * nativePriceUSD;
    const total = usdc + native;
    const percentage = netWorthUSD > 0 ? Math.round((total / netWorthUSD) * 100) : 0;
    
    return {
      name: chain.charAt(0).toUpperCase() + chain.slice(1),
      percentage,
      color: chainColors[chain] || '#999',
    };
  }).filter(c => c.percentage > 0);
}

/**
 * Get tier from reputation score
 */
function getTierFromScore(score: number): AgentTier {
  if (score >= 4.5) return 'platinum';
  if (score >= 4.0) return 'gold';
  if (score >= 3.0) return 'silver';
  return 'bronze';
}

/**
 * Transform capabilities data
 */
function transformCapabilities(capabilities: any[]): AgentCapability[] {
  if (!capabilities.length) {
    return [
      { id: 'default', name: 'General Purpose', level: 75, tasks: 0, earnings: 0 },
    ];
  }
  
  return capabilities.map((cap: any, index: number) => ({
    id: cap.id || `cap-${index}`,
    name: cap.name || 'Unknown Capability',
    level: Math.round((cap.level || 0.75) * 100),
    tasks: cap.completed_tasks || 0,
    earnings: parseFloat(cap.earnings || '0'),
  }));
}

/**
 * Get activity type from event type
 */
function getActivityType(eventType: string): string {
  switch (eventType) {
    case 'RESULT':
      return 'task_completed';
    case 'ACCEPT':
      return 'payment_received';
    case 'REQUEST':
      return 'task_started';
    default:
      return 'alert';
  }
}

/**
 * Get activity description from event
 */
function getActivityDescription(event: any): string {
  const type = event.type;
  const sender = event.sender?.id || 'Unknown';
  const recipient = event.recipient?.id || 'Unknown';
  
  switch (type) {
    case 'RESULT':
      return `Completed task from ${sender}`;
    case 'ACCEPT':
      return `Accepted request from ${sender}`;
    case 'REQUEST':
      return `New request to ${recipient}`;
    default:
      return `${type} event`;
  }
}

/**
 * Hook for fetching and managing agent data
 * 
 * @param agentId - The ID of the agent to fetch data for
 * @param refreshInterval - Auto-refresh interval in milliseconds (default: 30000)
 * @returns Agent data, loading state, error state, and refresh function
 * 
 * @example
 * ```tsx
 * function AgentProfile({ agentId }: { agentId: string }) {
 *   const { agent, isLoading, error, refetch } = useAgent(agentId);
 *   
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *   if (!agent) return <div>Agent not found</div>;
 *   
 *   return (
 *     <div>
 *       <h1>{agent.name}</h1>
 *       <p>Status: {agent.status}</p>
 *       <p>Health: {agent.health.overall}/100</p>
 *       <button onClick={refetch}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAgent(agentId: string | null | undefined, refreshInterval = DEFAULT_REFRESH_INTERVAL) {
  const [agent, setAgent] = useState<Agent | null>(null);
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
      // Fetch agent data and activity in parallel
      const [agentData, activityData] = await Promise.all([
        fetchAgent(agentId),
        fetchAgentActivity(agentId),
      ]);
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setAgent({
          ...agentData,
          recentActivity: activityData,
        });
        setError(null);
      }
    } catch (err) {
      console.error('[useAgent] Failed to fetch agent data:', err);
      
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch agent data');
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
    setAgent(null);
    setError(null);
    setIsLoading(true);
  }, [agentId]);

  return {
    agent,
    isLoading,
    error,
    refetch: fetchData,
  };
}

export default useAgent;
