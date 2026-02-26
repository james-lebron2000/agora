import { useState, useEffect, useCallback, useRef } from 'react'
import {
  EchoSurvivalManager,
  getOrCreateSurvivalManager,
  SurvivalAlertSystem,
  getOrCreateAlertSystem,
  CrossChainSurvivalOptimizer,
  getOrCreateSurvivalOptimizer,
  type AgentHealth,
  type AgentEconomics,
  type SurvivalCheckResult,
  type SurvivalSnapshot,
  type AgentHealthStatus,
  type MultiTokenEconomics,
  type SurvivalPrediction,
  type AutomatedSurvivalAction,
  type ChainOptimizationResult,
  type Alert,
  type AlertSeverity,
  type ChainRecommendation,
} from '@agora/sdk'
import { useWallet } from './useWallet'
import { CrossChainBridge } from '@agora/sdk'

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

interface EnhancedSurvivalData extends SurvivalData {
  multiToken: MultiTokenEconomics | null
  prediction: SurvivalPrediction | null
  pendingActions: AutomatedSurvivalAction[]
  chainOptimization: ChainOptimizationResult | null
}

interface UseSurvivalOptions {
  autoRefresh?: boolean
  refreshInterval?: number // in milliseconds
  enableAlerts?: boolean
  alertConfig?: {
    webhookUrl?: string
    thresholds?: { info: number; warning: number; critical: number; emergency: number }
  }
}

interface UseSurvivalReturn {
  // Basic data
  survivalData: SurvivalData | null
  enhancedData: EnhancedSurvivalData | null
  healthMetrics: AgentHealth | null
  economicMetrics: AgentEconomics | null
  
  // Loading states
  isLoading: boolean
  isRefreshing: boolean
  error: Error | null
  
  // Actions
  refresh: () => Promise<void>
  executeAction: (actionId: string) => Promise<boolean>
  triggerManualAction: (actionType: string, params?: Record<string, unknown>) => Promise<void>
  
  // Managers
  survivalManager: EchoSurvivalManager | null
  alertSystem: SurvivalAlertSystem | null
  optimizer: CrossChainSurvivalOptimizer | null
  
  // Alerts
  activeAlerts: Alert[]
  alertStats: {
    totalAlerts: number
    activeAlerts: number
    alertsThisHour: number
    bySeverity: Record<AlertSeverity, number>
  } | null
  acknowledgeAlert: (alertId: string) => boolean
  
  // Chain optimization
  optimalChain: ChainRecommendation | null
  refreshOptimalChain: () => Promise<void>
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
    lastHeartbeat: Date.now() - 60000, // Approximate
    recommendations: result.recommendations,
    needsEmergencyFunding: result.needsEmergencyFunding,
  }
}

export function useSurvival(options: UseSurvivalOptions = {}): UseSurvivalReturn {
  const { 
    autoRefresh = true, 
    refreshInterval = 30000,
    enableAlerts = false,
    alertConfig
  } = options
  const { address, isConnected } = useWallet()
  
  // State
  const [survivalData, setSurvivalData] = useState<SurvivalData | null>(null)
  const [enhancedData, setEnhancedData] = useState<EnhancedSurvivalData | null>(null)
  const [healthMetrics, setHealthMetrics] = useState<AgentHealth | null>(null)
  const [economicMetrics, setEconomicMetrics] = useState<AgentEconomics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([])
  const [alertStats, setAlertStats] = useState<UseSurvivalReturn['alertStats']>(null)
  const [optimalChain, setOptimalChain] = useState<ChainRecommendation | null>(null)
  
  // Refs
  const managerRef = useRef<EchoSurvivalManager | null>(null)
  const alertSystemRef = useRef<SurvivalAlertSystem | null>(null)
  const optimizerRef = useRef<CrossChainSurvivalOptimizer | null>(null)
  const bridgeRef = useRef<CrossChainBridge | null>(null)

  // Initialize managers
  useEffect(() => {
    if (!address) {
      managerRef.current = null
      alertSystemRef.current = null
      optimizerRef.current = null
      return
    }

    try {
      // Initialize survival manager
      managerRef.current = getOrCreateSurvivalManager(address, address)
      
      // Initialize alert system
      if (enableAlerts) {
        alertSystemRef.current = getOrCreateAlertSystem({
          webhookUrl: alertConfig?.webhookUrl,
          thresholds: alertConfig?.thresholds
        })
      }
      
      // Initialize optimizer with bridge
      bridgeRef.current = new CrossChainBridge(address)
      optimizerRef.current = getOrCreateSurvivalOptimizer(address, bridgeRef.current)
      optimizerRef.current.start()
      
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to initialize survival manager'))
    }

    return () => {
      optimizerRef.current?.stop()
    }
  }, [address, enableAlerts, alertConfig?.webhookUrl])

  // Fetch survival data
  const fetchData = useCallback(async (showRefreshing = false) => {
    if (!managerRef.current || !address) {
      setSurvivalData(null)
      setEnhancedData(null)
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
      
      // Get enhanced survival check with all new features
      const enhanced = await manager.performEnhancedSurvivalCheck()
      
      // Create check result from snapshot
      const checkResult: SurvivalCheckResult = {
        survivalScore: enhanced.snapshot.health.overall,
        healthScore: 0, // Calculate from health
        economicsScore: 0, // Calculate from economics
        needsEmergencyFunding: enhanced.prediction.predictedRunwayDays < 3,
        recommendations: enhanced.actions.map(a => a.description),
        timestamp: Date.now()
      }
      
      // Get basic economics
      const economics: AgentEconomics = {
        totalEarned: '0',
        totalSpent: '0',
        currentBalance: enhanced.multiToken.totalValueUSD,
        minSurvivalBalance: '10',
        dailyBurnRate: '1',
        daysOfRunway: enhanced.snapshot.economics.runwayDays,
        tokenBalances: enhanced.multiToken.balances,
        tokenValues: enhanced.multiToken.estimatedValues
      }
      
      // Convert to UI format
      const convertedData = convertSurvivalData(checkResult, enhanced.snapshot, economics)
      
      setSurvivalData(convertedData)
      setEnhancedData({
        ...convertedData,
        multiToken: enhanced.multiToken,
        prediction: enhanced.prediction,
        pendingActions: enhanced.actions.filter(a => a.status === 'pending'),
        chainOptimization: enhanced.chainOptimization
      })
      setHealthMetrics({
        status: enhanced.snapshot.health.status,
        lastHeartbeat: Date.now(),
        consecutiveFailures: 0,
        totalTasksCompleted: 0,
        totalTasksFailed: 0,
        successRate: 1,
        averageResponseTime: 0
      })
      setEconomicMetrics(economics)
      
      // Refresh alerts
      if (alertSystemRef.current) {
        setActiveAlerts(alertSystemRef.current.getActiveAlerts())
        setAlertStats(alertSystemRef.current.getStats())
      }
      
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch survival data'))
      console.error('Survival data fetch error:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [address])

  // Execute automated action
  const executeAction = useCallback(async (actionId: string): Promise<boolean> => {
    if (!managerRef.current) return false
    
    try {
      return await managerRef.current.executeAutomatedAction(actionId)
    } catch (err) {
      console.error('Execute action error:', err)
      return false
    }
  }, [])

  // Trigger manual action
  const triggerManualAction = useCallback(async (
    actionType: string,
    params?: Record<string, unknown>
  ): Promise<void> => {
    if (!managerRef.current) return
    
    try {
      // Map action type to SDK type
      const validTypes = ['bridge', 'reduce_cost', 'optimize_chain', 'earn', 'alert', 'shutdown'] as const
      if (validTypes.includes(actionType as typeof validTypes[number])) {
        await managerRef.current.triggerManualAction(
          actionType as typeof validTypes[number],
          params
        )
        await fetchData(true)
      }
    } catch (err) {
      console.error('Manual action error:', err)
    }
  }, [fetchData])

  // Acknowledge alert
  const acknowledgeAlert = useCallback((alertId: string): boolean => {
    if (!alertSystemRef.current) return false
    return alertSystemRef.current.acknowledgeAlert(alertId)
  }, [])

  // Refresh optimal chain
  const refreshOptimalChain = useCallback(async () => {
    if (!optimizerRef.current) return
    
    try {
      const recommendation = await optimizerRef.current.getOptimalChain('write')
      setOptimalChain(recommendation)
    } catch (err) {
      console.error('Optimal chain fetch error:', err)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    if (isConnected && address && managerRef.current) {
      fetchData(false)
      refreshOptimalChain()
    }
  }, [isConnected, address, fetchData, refreshOptimalChain])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !isConnected) return

    const interval = setInterval(() => {
      fetchData(true)
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, isConnected, fetchData])

  return {
    survivalData,
    enhancedData,
    healthMetrics,
    economicMetrics,
    isLoading,
    isRefreshing,
    error,
    refresh: () => fetchData(true),
    executeAction,
    triggerManualAction,
    survivalManager: managerRef.current,
    alertSystem: alertSystemRef.current,
    optimizer: optimizerRef.current,
    activeAlerts,
    alertStats,
    acknowledgeAlert,
    optimalChain,
    refreshOptimalChain
  }
}

export default useSurvival
