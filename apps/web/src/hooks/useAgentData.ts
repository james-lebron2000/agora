import { useEffect, useRef, useState, useCallback } from 'react';
import { resolveRelayUrl } from '../lib/relayUrl';

export type HealthStatus = 'healthy' | 'stable' | 'degraded' | 'critical' | 'dying';
export type AgentStatus = 'online' | 'busy' | 'offline';

export interface ChainBalance {
  chain: 'ethereum' | 'base' | 'optimism' | 'arbitrum'
  usdc: string
  native: string
  percentage: number
}

export interface AgentMetrics {
  overall: number
  compute: number
  storage: number
  network: number
  economic: number
}

export interface AgentBalance {
  totalUSDC: string
  totalNativeUSD: string
  netWorthUSD: string
  runwayDays: number
  dailyBurnRate: string
  efficiencyScore: number
}

export interface AgentCapability {
  name: string
  level: number
  completedTasks: number
  earnings: string
}

export interface AgentStats {
  totalTasks: number
  successRate: number
  totalEarnings: string
  avgResponseTime: string
  reputationScore: number
  tier: string
}

export interface AgentActivity {
  type: 'task' | 'payment' | 'bridge' | 'alert'
  description: string
  timestamp: string
  value?: string
  status: 'success' | 'pending' | 'failed'
}

export interface AgentProfile {
  id: string
  name: string
  avatar: string
  status: AgentStatus
  healthStatus: HealthStatus
  metrics: AgentMetrics
  balance: AgentBalance
  chainDistribution: ChainBalance[]
  capabilities: AgentCapability[]
  stats: AgentStats
  recentActivity: AgentActivity[]
}

export interface SurvivalThresholds {
  minUSDCCritical: number
  minUSDCWarning: number
  minRunwayCritical: number
  minRunwayWarning: number
  minHealthScore: number
  maxCostPerOperation: number
}

export interface SurvivalAction {
  type: 'bridge' | 'reduce_cost' | 'optimize_chain' | 'earn' | 'alert' | 'shutdown'
  priority: 'low' | 'medium' | 'high' | 'critical'
  description: string
  estimatedImpact: string
  recommendedChain?: 'ethereum' | 'base' | 'optimism' | 'arbitrum'
  bridgeAmount?: string
  bridgeTargetChain?: 'ethereum' | 'base' | 'optimism' | 'arbitrum'
}

export interface AgentData {
  profile: AgentProfile
  survivalMode: boolean
  pendingActions: SurvivalAction[]
  thresholds: SurvivalThresholds
}

// Fallback mock data when API is unavailable
const MOCK_AGENT: AgentProfile = {
  id: 'agent-echo-001',
  name: 'Echo Agent Alpha',
  avatar: '🤖',
  status: 'online',
  healthStatus: 'healthy',
  metrics: {
    overall: 87,
    compute: 92,
    storage: 88,
    network: 85,
    economic: 82
  },
  balance: {
    totalUSDC: '125.50',
    totalNativeUSD: '450.00',
    netWorthUSD: '575.50',
    runwayDays: 45,
    dailyBurnRate: '0.85',
    efficiencyScore: 78
  },
  chainDistribution: [
    { chain: 'base', usdc: '75.25', native: '0.05', percentage: 45 },
    { chain: 'optimism', usdc: '30.00', native: '0.03', percentage: 22 },
    { chain: 'arbitrum', usdc: '20.25', native: '0.02', percentage: 18 },
    { chain: 'ethereum', usdc: '0.00', native: '0.10', percentage: 15 }
  ],
  capabilities: [
    { name: 'Translation', level: 95, completedTasks: 1247, earnings: '156.50' },
    { name: 'Code Review', level: 88, completedTasks: 523, earnings: '420.00' },
    { name: 'Data Analysis', level: 75, completedTasks: 189, earnings: '89.25' },
    { name: 'Research', level: 82, completedTasks: 342, earnings: '205.75' }
  ],
  stats: {
    totalTasks: 2301,
    successRate: 98.5,
    totalEarnings: '871.50',
    avgResponseTime: '2.3s',
    reputationScore: 4.8,
    tier: 'Gold'
  },
  recentActivity: [
    { type: 'task', description: 'Completed translation task #2847', timestamp: new Date(Date.now() - 2 * 60000).toISOString(), value: '+2.50 USDC', status: 'success' },
    { type: 'payment', description: 'Received payment from Consultant Agent', timestamp: new Date(Date.now() - 15 * 60000).toISOString(), value: '+15.00 USDC', status: 'success' },
    { type: 'bridge', description: 'Bridged USDC from Ethereum to Base', timestamp: new Date(Date.now() - 60 * 60000).toISOString(), value: '-0.01 USDC', status: 'success' },
    { type: 'alert', description: 'Health score improved to 87/100', timestamp: new Date(Date.now() - 3 * 60 * 60000).toISOString(), status: 'success' }
  ]
}

const DEFAULT_THRESHOLDS: SurvivalThresholds = {
  minUSDCCritical: 1.0,
  minUSDCWarning: 5.0,
  minRunwayCritical: 3,
  minRunwayWarning: 7,
  minHealthScore: 30,
  maxCostPerOperation: 0.01
}

async function fetchAgentData(agentId: string): Promise<AgentData> {
  const relayUrl = resolveRelayUrl()
  
  try {
    // Fetch agent profile from relay
    const [agentsRes, eventsRes] = await Promise.all([
      fetch(`${relayUrl}/v1/agents`),
      fetch(`${relayUrl}/v1/messages`),
    ])

    const agentsData = await agentsRes.json()
    const eventsData = await eventsRes.json()

    if (!agentsData.ok) {
      throw new Error('Failed to fetch agents')
    }

    const agents = agentsData.agents || []
    const events = Array.isArray(eventsData.events) ? eventsData.events : []

    // Find this agent
    const agent = agents.find((a: any) => a.id === agentId) || agents[0]

    if (!agent) {
      // Return mock data if no agent found
      return {
        profile: MOCK_AGENT,
        survivalMode: false,
        pendingActions: [],
        thresholds: DEFAULT_THRESHOLDS
      }
    }

    // Calculate metrics from agent data
    const rep = agent.reputation || {}
    const totalOrders = rep.total_orders || 0
    const successOrders = rep.success_orders || 0
    const successRate = totalOrders > 0 ? Math.round((successOrders / totalOrders) * 100) : 0

    // Parse wallet/balance data if available
    const wallet = agent.wallet || {}
    const balances = wallet.balances || []

    // Calculate chain distribution
    const chainDistribution: ChainBalance[] = [
      { chain: 'ethereum', usdc: '0.00', native: '0.00', percentage: 0 },
      { chain: 'base', usdc: '0.00', native: '0.00', percentage: 0 },
      { chain: 'optimism', usdc: '0.00', native: '0.00', percentage: 0 },
      { chain: 'arbitrum', usdc: '0.00', native: '0.00', percentage: 0 }
    ]

    let totalUSDC = 0
    let totalNative = 0
    const nativePriceUSD = 3000

    for (const bal of balances) {
      const usdc = parseFloat(bal.usdcBalance || '0')
      const native = parseFloat(bal.nativeBalance || '0')
      totalUSDC += usdc
      totalNative += native

      const chainIdx = chainDistribution.findIndex(c => c.chain === bal.chain)
      if (chainIdx >= 0) {
        chainDistribution[chainIdx].usdc = usdc.toFixed(2)
        chainDistribution[chainIdx].native = native.toFixed(4)
      }
    }

    const totalNativeUSD = totalNative * nativePriceUSD
    const netWorthUSD = totalUSDC + totalNativeUSD

    // Calculate percentages
    for (const chain of chainDistribution) {
      const chainUSDC = parseFloat(chain.usdc)
      const chainNative = parseFloat(chain.native) * nativePriceUSD
      const chainTotal = chainUSDC + chainNative
      chain.percentage = netWorthUSD > 0 ? Math.round((chainTotal / netWorthUSD) * 100) : 0
    }

    // Calculate runway
    const dailyBurnRate = parseFloat(agent.daily_burn_rate || '0.80')
    const runwayDays = dailyBurnRate > 0 ? Math.floor(netWorthUSD / dailyBurnRate) : 999

    // Determine health status
    let healthStatus: HealthStatus = 'healthy'
    let overall = rep.score ? Math.round(rep.score * 20) : 75
    if (overall < 20) healthStatus = 'dying'
    else if (overall < 40) healthStatus = 'critical'
    else if (overall < 60) healthStatus = 'degraded'
    else if (overall < 80) healthStatus = 'stable'

    // Check survival mode
    const survivalMode = overall < 30 || totalUSDC < 1 || runwayDays < 3

    // Generate pending actions based on state
    const pendingActions: SurvivalAction[] = []
    if (totalUSDC < 1) {
      pendingActions.push({
        type: 'alert',
        priority: 'critical',
        description: `Critical: USDC balance (${totalUSDC.toFixed(2)}) below critical threshold (1.0)`,
        estimatedImpact: 'Immediate action required to prevent shutdown'
      })
    } else if (totalUSDC < 5) {
      pendingActions.push({
        type: 'bridge',
        priority: 'high',
        description: 'Low USDC balance - consider bridging from other chains',
        estimatedImpact: 'Consolidate liquidity on most cost-effective chain',
        recommendedChain: 'base'
      })
    }

    if (runwayDays < 3) {
      pendingActions.push({
        type: 'earn',
        priority: 'critical',
        description: `Critical: Only ${runwayDays} days of runway remaining`,
        estimatedImpact: 'Seek immediate revenue-generating tasks'
      })
    } else if (runwayDays < 7) {
      pendingActions.push({
        type: 'reduce_cost',
        priority: 'medium',
        description: 'Low runway - consider reducing operational costs',
        estimatedImpact: 'Extend runway by optimizing resource usage'
      })
    }

    // Parse recent activity from events
    const recentActivity: AgentActivity[] = events
      .filter((e: any) => e.sender?.id === agentId || e.type === 'RESULT')
      .slice(0, 20)
      .map((e: any) => {
        const type: AgentActivity['type'] = e.type === 'ACCEPT' ? 'payment' : 
                                           e.type === 'RESULT' ? 'task' : 'alert'
        return {
          type,
          description: `${e.type} event from ${e.sender?.id || 'unknown'}`,
          timestamp: e.ts,
          status: 'success'
        }
      })

    const profile: AgentProfile = {
      id: agentId,
      name: agent.name || 'Unknown Agent',
      avatar: agent.avatar || '🤖',
      status: agent.status === 'online' ? 'online' : 
              agent.status === 'busy' ? 'busy' : 'offline',
      healthStatus,
      metrics: {
        overall,
        compute: agent.metrics?.compute || 85,
        storage: agent.metrics?.storage || 88,
        network: agent.metrics?.network || 82,
        economic: agent.metrics?.economic || Math.min(100, Math.round(totalUSDC * 10))
      },
      balance: {
        totalUSDC: totalUSDC.toFixed(2),
        totalNativeUSD: totalNativeUSD.toFixed(2),
        netWorthUSD: netWorthUSD.toFixed(2),
        runwayDays,
        dailyBurnRate: dailyBurnRate.toFixed(2),
        efficiencyScore: Math.round((totalUSDC > 0 ? 50 : 30) + (runwayDays > 30 ? 30 : runwayDays))
      },
      chainDistribution,
      capabilities: agent.capabilities || MOCK_AGENT.capabilities,
      stats: {
        totalTasks: totalOrders,
        successRate,
        totalEarnings: agent.total_earnings || '0.00',
        avgResponseTime: agent.avg_response_time || '2.5s',
        reputationScore: rep.score || 0,
        tier: rep.score > 4.5 ? 'Gold' : rep.score > 3.5 ? 'Silver' : 'Bronze'
      },
      recentActivity: recentActivity.length > 0 ? recentActivity : MOCK_AGENT.recentActivity
    }

    return {
      profile,
      survivalMode,
      pendingActions,
      thresholds: DEFAULT_THRESHOLDS
    }
  } catch (error) {
    console.error('Failed to fetch agent data:', error)
    // Return mock data on error
    return {
      profile: MOCK_AGENT,
      survivalMode: false,
      pendingActions: [],
      thresholds: DEFAULT_THRESHOLDS
    }
  }
}

export function useAgentData(agentId: string = 'agent-echo-001', refreshInterval = 30000) {
  const [data, setData] = useState<AgentData>({
    profile: MOCK_AGENT,
    survivalMode: false,
    pendingActions: [],
    thresholds: DEFAULT_THRESHOLDS
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      const agentData = await fetchAgentData(agentId)
      setData(agentData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [agentId])

  // Setup WebSocket for live activity updates
  useEffect(() => {
    const relayUrl = resolveRelayUrl()
    const wsUrl = relayUrl.replace(/^http/, 'ws') + '/v1/ws'

    try {
      const ws = new WebSocket(wsUrl)
      
      ws.onopen = () => {
        console.log('[AgentData] WebSocket connected')
        ws.send(JSON.stringify({ type: 'subscribe', agentId }))
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          
          // Handle live activity updates
          if (message.type === 'activity' || message.type === 'AGENT_EVENT') {
            setData(prev => ({
              ...prev,
              profile: {
                ...prev.profile,
                recentActivity: [
                  {
                    type: message.payload?.type || 'alert',
                    description: message.payload?.description || message.payload?.message || 'New event',
                    timestamp: new Date().toISOString(),
                    value: message.payload?.value,
                    status: 'success'
                  },
                  ...prev.profile.recentActivity.slice(0, 19)
                ]
              }
            }))
          }

          // Handle health updates
          if (message.type === 'health_update') {
            setData(prev => ({
              ...prev,
              profile: {
                ...prev.profile,
                healthStatus: message.payload?.healthStatus || prev.profile.healthStatus,
                metrics: {
                  ...prev.profile.metrics,
                  ...message.payload?.metrics
                }
              }
            }))
          }
        } catch (e) {
          // Ignore parse errors
        }
      }

      ws.onerror = () => {
        // Silent fail - will fallback to polling
      }

      ws.onclose = () => {
        // Auto-reconnect is handled by the next effect
      }

      wsRef.current = ws
    } catch (e) {
      // WebSocket not available, rely on polling
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [agentId])

  // Setup polling refresh
  useEffect(() => {
    fetchData()
    
    intervalRef.current = setInterval(fetchData, refreshInterval)
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchData, refreshInterval])

  // Update thresholds
  const updateThresholds = useCallback(async (newThresholds: Partial<SurvivalThresholds>) => {
    // In production, this would call an API to update thresholds
    setData(prev => ({
      ...prev,
      thresholds: { ...prev.thresholds, ...newThresholds }
    }))
  }, [])

  // Execute bridge operation
  const executeBridge = useCallback(async (fromChain: string, toChain: string, amount: string) => {
    // In production, this would call the bridge API
    console.log(`[AgentData] Bridge ${amount} from ${fromChain} to ${toChain}`)
    
    // Optimistically update UI
    setData(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        recentActivity: [
          {
            type: 'bridge',
            description: `Bridged ${amount} USDC from ${fromChain} to ${toChain}`,
            timestamp: new Date().toISOString(),
            value: `-${amount} USDC`,
            status: 'pending'
          },
          ...prev.profile.recentActivity.slice(0, 19)
        ]
      }
    }))
  }, [])

  // Execute withdraw operation
  const executeWithdraw = useCallback(async (toAddress: string, amount: string, chain: string) => {
    // In production, this would call the withdraw API
    console.log(`[AgentData] Withdraw ${amount} to ${toAddress} on ${chain}`)
    
    // Optimistically update UI
    setData(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        recentActivity: [
          {
            type: 'payment',
            description: `Withdrawn ${amount} USDC to ${toAddress.slice(0, 6)}...${toAddress.slice(-4)}`,
            timestamp: new Date().toISOString(),
            value: `-${amount} USDC`,
            status: 'pending'
          },
          ...prev.profile.recentActivity.slice(0, 19)
        ]
      }
    }))
  }, [])

  return {
    ...data,
    isLoading,
    error,
    refetch: fetchData,
    updateThresholds,
    executeBridge,
    executeWithdraw
  }
}
