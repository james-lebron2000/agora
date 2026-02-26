import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getOrCreateSurvivalManager,
  type AgentHealthStatus,
  type SurvivalSnapshot
} from '@agora/sdk/survival';
import {
  getAllBalances,
  findCheapestChain as sdkFindCheapestChain,
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

// SDK configuration
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
    console.error(`[useSDK] Failed to get USDC balance on ${chain}:`, error);
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
    console.error(`[useSDK] Failed to get native balance on ${chain}:`, error);
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
  
  // Use SDK's getAllBalances directly
  const balances = await getAllBalances(address);
  
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

// Import relay URL resolver
const getRelayUrl = (): string => {
  // Default to localhost for development
  return 'http://localhost:3001';
};

/**
 * Fetch agent data from the relay/API with SDK integration
 */
async function fetchAgent(agentId: string): Promise<Agent> {
  const relayUrl = getRelayUrl();

  try {
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

    return await transformAgentData(agentData);
  } catch (error) {
    console.error('[useSDK] Failed to fetch agent:', error);
    throw error;
  }
}

/**
 * Fetch agent activity history
 */
async function fetchAgentActivity(agentId: string): Promise<AgentActivity[]> {
  const relayUrl = getRelayUrl();
  
  try {
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
    console.error('[useSDK] Failed to fetch agent activity:', error);
    return [];
  }
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
 * Transform raw API agent data to Agent interface with SDK integration
 */
async function transformAgentData(data: any): Promise<Agent> {
  const reputation = data.reputation || {};
  const wallet = data.wallet || {};
  const address = data.address as Address | undefined;
  
  // Get balances from SDK's CrossChainBridge (real on-chain data)
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
      console.error('[useSDK] Failed to fetch balances:', error);
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
  
  // Get survival data from SDK's EchoSurvivalManager
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
      console.error('[useSDK] Failed to fetch survival data:', error);
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
 * Hook for fetching and managing agent data with direct SDK integration
 * 
 * @param agentId - The ID of the agent to fetch data for
 * @param refreshInterval - Auto-refresh interval in milliseconds (default: 30000)
 * @returns Agent data, loading state, error state, and refresh function
 */
export function useSDK(agentId: string | null | undefined, refreshInterval = DEFAULT_REFRESH_INTERVAL) {
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
      console.error('[useSDK] Failed to fetch agent data:', err);
      
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch agent data');
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

// Extended health type with UI-specific properties
interface ExtendedHealth {
  status: AgentHealthStatus;
  overall: number;
  lastCheck: number;
  compute: number;
  storage: number;
  network: number;
  economic: number;
}

// Extended snapshot type with UI-specific properties
interface ExtendedSurvivalSnapshot extends Omit<SurvivalSnapshot, 'health'> {
  health: ExtendedHealth;
  trend?: {
    direction: 'improving' | 'stable' | 'declining';
    rateOfChange: number;
    predictedHealth: number;
    predictedRunway: number;
  };
  pendingActions?: any[];
  survivalMode?: boolean;
}

// Survival hook using SDK directly
export function useSurvivalSDK(agentId: string | null, address: Address | null | undefined) {
  const [health, setHealth] = useState<any>(null);
  const [economics, setEconomics] = useState<any>(null);
  const [snapshot, setSnapshot] = useState<ExtendedSurvivalSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSurvivalData = useCallback(async () => {
    if (!agentId || !address) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get survival manager from SDK
      const survivalManager = getSurvivalManager(agentId, address);
      
      // Get balances from SDK
      const balances = await getAllBalancesCached(address);
      
      // Perform survival check
      const survivalSnapshot = await survivalManager.performSurvivalCheck(balances);
      
      // Get detailed health
      const healthData = survivalManager.checkHealth(agentId);
      
      // Calculate economics from balances
      let totalUSDC = 0;
      let totalNative = 0;
      const nativePriceUSD = 3000;
      
      for (const bal of balances) {
        totalUSDC += parseFloat(bal.usdcBalance || '0');
        totalNative += parseFloat(bal.nativeBalance || '0');
      }
      
      const totalNativeUSD = totalNative * nativePriceUSD;
      const netWorthUSD = totalUSDC + totalNativeUSD;
      const dailyBurn = 0.80;
      const runwayDays = dailyBurn > 0 ? Math.floor(netWorthUSD / dailyBurn) : 999;
      
      // Get recovery recommendations
      const recommendations = await survivalManager.getRecoveryRecommendations();
      
      // Create actions from recommendations
      const pendingActions = recommendations.map((rec: string, index: number): any => {
        const isUrgent = rec.toLowerCase().includes('urgent') || 
                        rec.toLowerCase().includes('critical') ||
                        rec.toLowerCase().includes('emergency');
        
        let type: any = 'alert';
        if (rec.toLowerCase().includes('bridge')) type = 'bridge';
        else if (rec.toLowerCase().includes('cost')) type = 'reduce_cost';
        else if (rec.toLowerCase().includes('chain')) type = 'optimize_chain';
        else if (rec.toLowerCase().includes('revenue') || rec.toLowerCase().includes('earn')) type = 'earn';
        
        return {
          type,
          priority: isUrgent ? 'critical' : 'high',
          description: rec,
          estimatedImpact: isUrgent ? 'Immediate improvement needed' : 'Moderate improvement expected'
        };
      }).slice(0, 5);
      
      // Find cheapest chain for bridge operations
      const cheapestChain = await sdkFindCheapestChain('send');
      
      const economicsData = {
        totalUSDC,
        totalNativeUSD,
        netWorthUSD,
        runwayDays,
        dailyBurnRateUSD: dailyBurn,
        efficiencyScore: Math.round((totalUSDC > 0 ? 60 : 40) + (runwayDays > 30 ? 20 : runwayDays / 3)),
        rawBalances: balances,
        cheapestChain: cheapestChain.chain
      };
      
      // Add trend data
      const direction: 'improving' | 'stable' | 'declining' = runwayDays > 14 ? 'improving' : runwayDays > 7 ? 'stable' : 'declining';
      const trend = {
        direction,
        rateOfChange: (runwayDays - 30) / 7,
        predictedHealth: Math.max(0, Math.min(100, survivalSnapshot.health.overall + (runwayDays - 30) / 7)),
        predictedRunway: runwayDays
      };
      
      // Add survival mode flag
      const survivalMode = survivalSnapshot.health.status === 'critical' || 
                          survivalSnapshot.health.status === 'dead' ||
                          runwayDays < 3;
      
      setHealth({
        status: survivalSnapshot.health.status,
        overall: survivalSnapshot.health.overall,
        lastHeartbeat: healthData.lastHeartbeat,
        consecutiveFailures: healthData.consecutiveFailures,
        successRate: healthData.successRate,
        totalTasksCompleted: healthData.totalTasksCompleted,
        totalTasksFailed: healthData.totalTasksFailed,
        averageResponseTime: healthData.averageResponseTime,
        compute: 85,
        storage: 88,
        network: 82,
        economic: Math.min(100, Math.round(totalUSDC * 2)),
        lastCheck: survivalSnapshot.timestamp || Date.now(),
        survivalMode
      });
      
      setEconomics(economicsData);
      // Build extended health object with UI-specific properties
      const extendedHealth = {
        ...survivalSnapshot.health,
        lastCheck: survivalSnapshot.timestamp || Date.now(),
        compute: 85,
        storage: 88,
        network: 82,
        economic: Math.min(100, Math.round(totalUSDC * 2))
      };

      setSnapshot({
        health: extendedHealth,
        economics: survivalSnapshot.economics,
        timestamp: survivalSnapshot.timestamp,
        trend,
        pendingActions,
        survivalMode
      });
    } catch (err) {
      console.error('[useSurvivalSDK] Failed to fetch survival data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch survival data');
    } finally {
      setIsLoading(false);
    }
  }, [agentId, address]);

  useEffect(() => {
    fetchSurvivalData();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchSurvivalData, 60000);
    return () => clearInterval(interval);
  }, [fetchSurvivalData]);

  return {
    health,
    economics,
    snapshot,
    isLoading,
    error,
    refetch: fetchSurvivalData
  };
}

// Bridge hook using SDK directly
export function useBridgeSDK(address: Address | null | undefined) {
  const [quote, setQuote] = useState<any>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [isBridging, setIsBridging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getQuote = useCallback(async (params: {
    sourceChain: SupportedChain;
    destinationChain: SupportedChain;
    token: 'USDC' | 'WETH';
    amount: string;
  }) => {
    if (!address) throw new Error('Address required');
    
    setIsQuoting(true);
    setError(null);
    
    try {
      const { getBridgeQuote } = await import('@agora/sdk/bridge');
      const data = await getBridgeQuote({
        sourceChain: params.sourceChain,
        destinationChain: params.destinationChain,
        token: params.token,
        amount: params.amount
      }, address);
      
      setQuote({
        estimatedFee: data.estimatedFee,
        estimatedTime: `${Math.round(data.estimatedTime / 60)} min`,
        lzFee: data.lzFee
      });
      
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get quote';
      setError(message);
      throw err;
    } finally {
      setIsQuoting(false);
    }
  }, [address]);

  const findCheapestChainForBridge = useCallback(async (excludeChains?: SupportedChain[]) => {
    try {
      const result = await sdkFindCheapestChain('send', excludeChains);
      return result;
    } catch (err) {
      console.error('[useBridgeSDK] Failed to find cheapest chain:', err);
      return { chain: 'base' as SupportedChain, estimatedCost: '0.001' };
    }
  }, []);

  const getAllChainBalances = useCallback(async () => {
    if (!address) return [];
    try {
      return await getAllBalancesCached(address);
    } catch (err) {
      console.error('[useBridgeSDK] Failed to get balances:', err);
      return [];
    }
  }, [address]);

  const clearQuote = useCallback(() => {
    setQuote(null);
  }, []);

  return {
    quote,
    isQuoting,
    isBridging,
    error,
    getQuote,
    findCheapestChain: findCheapestChainForBridge,
    getAllChainBalances,
    clearQuote
  };
}

export default useSDK;
