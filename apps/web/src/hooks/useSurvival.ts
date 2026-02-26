import { useState, useEffect, useCallback, useRef } from 'react'
import {
  EchoSurvivalManager,
  getOrCreateSurvivalManager,
  type AgentHealth,
  type AgentEconomics,
  type SurvivalCheckResult,
  type SurvivalSnapshot,
  type AgentHealthStatus,
} from '@agora/sdk'
import { useWallet } from './useWallet'

interface SurvivalData {
  score: number
  healthScore: number
  economicsScore: number
  status: AgentHealthStatus
  balance: string
  runwayDays: number
  dailyBurnRate: string
  lastHeartbeat: number
  recommendations: string[]
  needsEmergencyFunding: boolean
}

interface UseSurvivalOptions {
  autoRefresh?: boolean
  refreshInterval?: number // in milliseconds
}

interface UseSurvivalReturn {
  survivalData: SurvivalData | null
  healthMetrics: AgentHealth | null
  economicMetrics: AgentEconomics | null
  isLoading: boolean
  isRefreshing: boolean
  error: Error | null
  refresh: () => Promise<void>
  survivalManager: EchoSurvivalManager | null
}

// Convert SDK SurvivalSnapshot to UI SurvivalData
const convertSurvivalData = (
  result: SurvivalCheckResult,
  snapshot: SurvivalSnapshot,
  economics: AgentEconomics
): SurvivalData => {
  return {
    score: result.survivalScore,
    healthScore: result.healthScore,
    economicsScore: result.economicsScore,
    status: snapshot.health.status,
    balance: snapshot.economics.balance,
    runwayDays: snapshot.economics.runwayDays,
    dailyBurnRate: economics.dailyBurnRate,
    lastHeartbeat: snapshot.health.status === 'dead' ? 0 : Date.now() - 60000, // Approximate
    recommendations: result.recommendations,
    needsEmergencyFunding: result.needsEmergencyFunding,
  }
}

export function useSurvival(options: UseSurvivalOptions = {}): UseSurvivalReturn {
  const { autoRefresh = true, refreshInterval = 30000 } = options
  const { address, isConnected } = useWallet()
  
  const [survivalData, setSurvivalData] = useState<SurvivalData | null>(null)
  const [healthMetrics, setHealthMetrics] = useState<AgentHealth | null>(null)
  const [economicMetrics, setEconomicMetrics] = useState<AgentEconomics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const managerRef = useRef<EchoSurvivalManager | null>(null)

  // Initialize survival manager
  useEffect(() => {
    if (!address) {
      managerRef.current = null
      return
    }

    try {
      managerRef.current = getOrCreateSurvivalManager(address)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to initialize survival manager'))
    }

    return () => {
      // Cleanup if needed
    }
  }, [address])

  // Fetch survival data
  const fetchData = useCallback(async (showRefreshing = false) => {
    if (!managerRef.current || !address) {
      setSurvivalData(null)
      setHealthMetrics(null)
      setEconomicMetrics(null)
      return
    }

    if (showRefreshing) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

    try {
      const manager = managerRef.current
      
      // Get all survival data from SDK
      const checkResult = await manager.checkSurvival()
      const snapshot = manager.getSnapshot()
      const health = manager.getHealth()
      const economics = manager.getEconomics()
      
      // Convert to UI format
      const convertedData = convertSurvivalData(checkResult, snapshot, economics)
      
      setSurvivalData(convertedData)
      setHealthMetrics(health)
      setEconomicMetrics(economics)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch survival data'))
      console.error('Survival data fetch error:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [address])

  // Initial fetch
  useEffect(() => {
    if (isConnected && address && managerRef.current) {
      fetchData(false)
    }
  }, [isConnected, address, fetchData])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !isConnected) return

    const interval = setInterval(() => {
      fetchData(true)
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, isConnected, fetchData])

  // Record heartbeat when user is active
  useEffect(() => {
    if (!managerRef.current || !isConnected) return

    const handleActivity = () => {
      managerRef.current?.recordHeartbeat()
    }

    // Record heartbeat on mount
    handleActivity()

    // Set up interval for periodic heartbeats
    const heartbeatInterval = setInterval(handleActivity, 60000) // Every minute

    return () => {
      clearInterval(heartbeatInterval)
    }
  }, [isConnected])

  return {
    survivalData,
    healthMetrics,
    economicMetrics,
    isLoading,
    isRefreshing,
    error,
    refresh: () => fetchData(true),
    survivalManager: managerRef.current,
  }
}

export default useSurvival
