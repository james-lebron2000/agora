import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { resolveRelayUrl } from '../lib/relayUrl';
import {
  getOrCreateSurvivalManager,
  type AgentHealthStatus,
  type SurvivalSnapshot
} from '@agora/sdk/survival';
import {
  getAllBalances,
  type SupportedChain,
  type ChainBalance
} from '@agora/sdk/bridge';
import { createPublicClient, http, formatUnits, type Address } from 'viem';
import { base, optimism, arbitrum, mainnet } from 'viem/chains';

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
  /** Real survival status from EchoSurvivalManager */
  survivalStatus: AgentHealthStatus;
  /** Survival score (0-100) */
  survivalScore: number;
  /** Last heartbeat timestamp */
  lastHeartbeat: number;
  /** Consecutive failures count */
  consecutiveFailures: number;
  /** Success rate (0-1) */
  successRate: number;
}

export interface ChainDistribution {
  name: string;
  percentage: number;
  color: string;
  usdcBalance: number;
  nativeBalance: number;
  chainId: SupportedChain;
}

export interface AgentEconomics {
  balances: Record<string, number>;
  runwayDays: number;
  dailyBurn: number;
  efficiency: number;
  chains: ChainDistribution[];
  /** Raw chain balances from CrossChainBridge */
  rawBalances: ChainBalance[];
  /** Total USDC across all chains */
  totalUSDC: number;
  /** Total native token value in USD */
  totalNativeUSD: number;
  /** Net worth in USD */
  netWorthUSD: number;
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

// Chain configuration for viem
const SUPPORTED_CHAINS = { ethereum: mainnet, base, optimism, arbitrum } as const;

// USDC addresses
const USDC_ADDRESSES: Record<SupportedChain, Address> = {
  ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  optimism: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
};

// RPC endpoints
const RPC_URLS: Record<SupportedChain, string> = {
  ethereum: 'https://eth.llamarpc.com',
  base: 'https://base.llamarpc.com',
  optimism: 'https://optimism.llamarpc.com',
  arbitrum: 'https://arbitrum.llamarpc.com'
};

// Chain colors for UI
const CHAIN_COLORS: Record<SupportedChain, string> = {
  ethereum: '#627EEA',
  base: '#0052FF',
  optimism: '#FF0420',
  arbitrum: '#28A0F0'
};

// Cache for survival managers and balance data
const survivalManagerCache = new Map<string, ReturnType<typeof getOrCreateSurvivalManager>>();
const balanceCache = new Map<string, { data: ChainBalance[]; timestamp: number }>();
const BALANCE_CACHE_TTL = 30000; // 30 seconds

/**
 * Get USDC balance for an address on a specific chain
 */
async function getUSDCBalance(address: Address, chain: SupportedChain): Promise<string> {
  try {
    const client = createPublicClient({
      chain: SUPPORTED_CHAINS[chain],
      transport: http(RPC_URLS[chain])
    });
    
    const balance = await client.readContract({
      address: USDC_ADDRESSES[chain],
      abi: [{
        name: 'balanceOf',
        type: 'function',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ type: 'uint256' }],
        stateMutability: 'view'
      }],
      functionName: 'balanceOf',
      args: [address]
    });
    return formatUnits(balance, 6);
  } catch (error) {
    console.error(`[useAgent] Failed to get USDC balance on ${chain}:`, error);
    return '0';
  }
}

/**
 * Get native token balance for an address on a specific chain
 */
async function getNativeBalance(address: Address, chain: SupportedChain): Promise<string> {
  try {
    const client = createPublicClient({
      chain: SUPPORTED_CHAINS[chain],
      transport: http(RPC_URLS[chain])
    });
    const balance = await client.getBalance({ address });
    return formatUnits(balance, 18);
  } catch (error) {
    console.error(`[useAgent] Failed to get native balance on ${chain}:`, error);
    return '0';
  }
}

/**
 * Get all balances across chains with caching
 */
async function getAllBalancesCached(address: Address): Promise<ChainBalance[]> {
  const cacheKey = address.toLowerCase();
  const cached = balanceCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < BALANCE_CACHE_TTL) {
    return cached.data;
  }
  
  const chains: SupportedChain[] = ['ethereum', 'base', 'optimism', 'arbitrum'];
  const balances: ChainBalance[] = [];
  
  await Promise.all(
    chains.map(async (chain) => {
      const [nativeBalance, usdcBalance] = await Promise.all([
        getNativeBalance(address, chain),
        getUSDCBalance(address, chain)
      ]);
      balances.push({ chain, nativeBalance, usdcBalance });
    })
  );
  
  balanceCache.set(cacheKey, { data: balances, timestamp: Date.now() });
  return balances;
}

/**
 * Get or create survival manager for an agent
 */
function getSurvivalManager(agentId: string, address: Address) {
  const cacheKey = `${agentId}:${address}`;
  if (!survivalManagerCache.has(cacheKey)) {
    survivalManagerCache.set(cacheKey, getOrCreateSurvivalManager(agentId, address));
  }
  return survivalManagerCache.get(cacheKey)!;
}

/**
 * Fetch agent data from the relay/API with SDK integration
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

    // Transform API data to Agent interface (now async for SDK calls)
    return await transformAgentData(agentData);
  } catch (error) {
    console.error('[useAgent] Failed to fetch agent:', error);
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
 * Transform raw API agent data to Agent interface with SDK integration
 */
async function transformAgentData(data: any): Promise<Agent> {
  const reputation = data.reputation || {};
  const wallet = data.wallet || {};
  const address = data.address as Address | undefined;
  
  // Get balances from CrossChainBridge SDK (real on-chain data)
  let rawBalances: ChainBalance[] = [];
  let totalUSDC = 0;
  let totalNative = 0;
  const nativePriceUSD = 3000; // ETH price
  
  if (address) {
    try {
      rawBalances = await getAllBalancesCached(address);
      for (const bal of rawBalances) {
        totalUSDC += parseFloat(bal.usdcBalance || '0');
        totalNative += parseFloat(bal.nativeBalance || '0');
      }
    } catch (error) {
      console.error('[useAgent] Failed to fetch balances:', error);
    }
  }
  
  // Fallback to API data if SDK fetch fails
  if (rawBalances.length === 0 && wallet.balances) {
    for (const bal of wallet.balances) {
      totalUSDC += parseFloat(bal.usdcBalance || '0');
      totalNative += parseFloat(bal.nativeBalance || '0');
    }
    rawBalances = wallet.balances.map((b: any) => ({
      chain: b.chain as SupportedChain,
      nativeBalance: b.nativeBalance || '0',
      usdcBalance: b.usdcBalance || '0'
    }));
  }
  
  const totalNativeUSD = totalNative * nativePriceUSD;
  const netWorthUSD = totalUSDC + totalNativeUSD;
  
  // Get survival data from EchoSurvivalManager SDK
  let survivalSnapshot: SurvivalSnapshot | null = null;
  let survivalScore = 50;
  let survivalStatus: AgentHealthStatus = 'healthy';
  let lastHeartbeat = Date.now();
  let consecutiveFailures = 0;
  let successRate = 1.0;
  
  if (address) {
    try {
      const survivalManager = getSurvivalManager(data.id, address);
      survivalSnapshot = await survivalManager.performSurvivalCheck(rawBalances);
      survivalStatus = survivalSnapshot.health.status;
      survivalScore = survivalSnapshot.health.overall;
      
      // Get detailed health metrics
      const health = survivalManager.checkHealth(data.id);
      lastHeartbeat = health.lastHeartbeat;
      consecutiveFailures = health.consecutiveFailures;
      successRate = health.successRate;
    } catch (error) {
      console.error('[useAgent] Failed to fetch survival data:', error);
    }
  }
  
  // Calculate runway
  const dailyBurn = parseFloat(data.daily_burn_rate || '0.80');
  const runwayDays = dailyBurn > 0 ? Math.floor(netWorthUSD / dailyBurn) : 999;
  
  // Calculate overall health combining reputation and survival
  const repScore = reputation.score || 0;
  const repHealth = Math.min(100, Math.round(repScore * 20) + 20);
  const overallHealth = Math.round((repHealth + survivalScore) / 2);
  
  // Calculate chain distribution
  const chainDistribution = calculateChainDistribution(rawBalances, netWorthUSD, nativePriceUSD);
  
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
      survivalStatus,
      survivalScore,
      lastHeartbeat,
      consecutiveFailures,
      successRate,
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
      rawBalances,
      totalUSDC,
      totalNativeUSD,
      netWorthUSD,
    },
    capabilities: transformCapabilities(data.capabilities || []),
    recentActivity: [], // Will be populated separately
  };
}

/**
 * Calculate chain distribution from balances
 */
function calculateChainDistribution(
  balances: ChainBalance[],
  netWorthUSD: number,
  nativePriceUSD: number
): ChainDistribution[] {
  const chains: SupportedChain[] = ['ethereum', 'base', 'optimism', 'arbitrum'];

  return chains.map(chain => {
    const balance = balances.find((b) => b.chain === chain);
    const usdc = parseFloat(balance?.usdcBalance || '0');
    const native = parseFloat(balance?.nativeBalance || '0');
    const nativeUSD = native * nativePriceUSD;
    const total = usdc + nativeUSD;
    const percentage = netWorthUSD > 0 ? Math.round((total / netWorthUSD) * 100) : 0;

    return {
      name: chain.charAt(0).toUpperCase() + chain.slice(1),
      percentage,
      color: CHAIN_COLORS[chain],
      usdcBalance: usdc,
      nativeBalance: native,
      chainId: chain,
    };
  }).filter(c => c.percentage > 0).sort((a, b) => b.percentage - a.percentage);
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
 * Features:
 * - Auto-refresh with configurable interval
 * - Memoized data transformations
 * - Request deduplication
 * - Error recovery
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
  const lastFetchRef = useRef<number>(0);
  const pendingFetchRef = useRef<Promise<void> | null>(null);

  const fetchData = useCallback(async () => {
    if (!agentId || agentId === '') {
      setError('Agent ID is required');
      setIsLoading(false);
      return;
    }

    // Deduplication: if there's a pending fetch, wait for it
    if (pendingFetchRef.current) {
      return pendingFetchRef.current;
    }

    // Rate limiting: prevent fetches more frequent than 1 second
    const now = Date.now();
    if (now - lastFetchRef.current < 1000) {
      return;
    }
    lastFetchRef.current = now;

    setIsLoading(true);
    setError(null);

    const fetchPromise = (async () => {
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
        pendingFetchRef.current = null;
      }
    })();

    pendingFetchRef.current = fetchPromise;
    return fetchPromise;
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

  // Memoize derived data to prevent unnecessary re-renders
  const memoizedAgent = useMemo(() => {
    if (!agent) return null;
    
    return {
      ...agent,
      // Pre-computed display values
      displayName: agent.name || agent.id,
      statusColor: agent.status === 'online' ? 'success' : agent.status === 'busy' ? 'warning' : 'neutral',
      formattedEarnings: `$${agent.reputation.totalEarnings.toLocaleString()}`,
      formattedSuccessRate: `${(agent.health.successRate * 100).toFixed(0)}%`,
    };
  }, [agent]);

  return {
    agent: memoizedAgent,
    rawAgent: agent,
    isLoading,
    error,
    refetch: fetchData,
  };
}

export default useAgent;
