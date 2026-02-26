/**
 * useSurvivalSimulation Hook for Agora Mobile
 * React hook for survival simulation and scenario analysis
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import {
  SurvivalSimulator,
  createSimulatorFromSnapshot,
  type SimulationParams as SDKSimulationParams,
  type SimulationResult as SDKSimulationResult,
  type ScenarioComparison as SDKScenarioComparison,
  type ScenarioType as SDKScenarioType,
} from '@agora/sdk/survival-simulation';
import type { SurvivalSnapshot } from '@agora/sdk/survival';
import type {
  UseSimulationReturn,
  SimulationParams,
  SimulationResult,
  ScenarioComparison,
  MonteCarloResult,
  SimulationOptions,
  ScenarioType,
} from '../types/survival';

// Map mobile scenario types to SDK scenario types
const toSDKScenarioType = (scenario: ScenarioType): SDKScenarioType => {
  switch (scenario) {
    case 'optimistic': return 'best-case';
    case 'pessimistic': return 'worst-case';
    case 'realistic': return 'average-case';
    case 'custom': return 'custom';
    default: return 'custom';
  }
};

// Map SDK scenario types to mobile scenario types
const toMobileScenarioType = (scenario: SDKScenarioType): ScenarioType => {
  switch (scenario) {
    case 'best-case': return 'optimistic';
    case 'worst-case': return 'pessimistic';
    case 'average-case': return 'realistic';
    case 'custom': return 'custom';
    default: return 'custom';
  }
};

// Convert mobile params to SDK params
function toSDKParams(params: Partial<SimulationParams>): SDKSimulationParams {
  return {
    initialBalance: params.initialBalance ?? 1000,
    dailyIncome: params.dailyIncome ?? 50,
    dailyExpenses: params.dailyExpenses ?? 30,
    taskSuccessRate: params.taskSuccessRate ?? 0.8,
    avgTaskReward: params.avgTaskReward ?? 20,
    days: params.days ?? 30,
    volatility: params.volatility ?? 0.2,
    seed: params.seed,
  };
}

// Convert SDK result to mobile result
function toMobileResult(result: SDKSimulationResult): SimulationResult {
  return {
    scenario: toMobileScenarioType(result.scenario),
    params: {
      initialBalance: result.params.initialBalance,
      dailyIncome: result.params.dailyIncome,
      dailyExpenses: result.params.dailyExpenses,
      taskSuccessRate: result.params.taskSuccessRate,
      avgTaskReward: result.params.avgTaskReward,
      days: result.params.days,
      volatility: result.params.volatility,
      seed: result.params.seed,
    },
    dailyResults: result.dailyResults,
    summary: result.summary,
    riskAssessment: result.riskAssessment,
  };
}

// Convert SDK scenario comparison to mobile scenario comparison
function toMobileComparison(comparison: SDKScenarioComparison): ScenarioComparison {
  return {
    scenarios: {
      optimistic: toMobileResult(comparison.scenarios['best-case']),
      pessimistic: toMobileResult(comparison.scenarios['worst-case']),
      realistic: toMobileResult(comparison.scenarios['average-case']),
      custom: toMobileResult(comparison.scenarios['custom']),
    },
    recommendation: toMobileScenarioType(comparison.recommendation),
    riskAnalysis: comparison.riskAnalysis,
  };
}

export function useSurvivalSimulation(
  options: SimulationOptions = {}
): UseSimulationReturn {
  const {
    defaultDays = 30,
    defaultVolatility = 0.2,
    enableMonteCarlo = true,
    monteCarloIterations = 100,
  } = options;

  // State
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [comparison, setComparison] = useState<ScenarioComparison | null>(null);
  const [monteCarlo, setMonteCarlo] = useState<MonteCarloResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [isRunningMonteCarlo, setIsRunningMonteCarlo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(0);

  // Refs
  const simulatorRef = useRef<SurvivalSimulator | null>(null);

  // Initialize simulator if needed
  const getSimulator = useCallback(() => {
    if (!simulatorRef.current) {
      simulatorRef.current = new SurvivalSimulator();
    }
    return simulatorRef.current;
  }, []);

  // Run single simulation
  const simulate = useCallback(async (
    params: Partial<SimulationParams>
  ): Promise<SimulationResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const sdkParams = toSDKParams({
        ...params,
        days: params.days ?? defaultDays,
        volatility: params.volatility ?? defaultVolatility,
      });

      const simulator = getSimulator();
      const sdkResult = simulator.simulate(sdkParams);
      const mobileResult = toMobileResult(sdkResult);

      setResult(mobileResult);
      setLastUpdated(Date.now());
      return mobileResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Simulation failed';
      setError(message);
      console.error('[useSurvivalSimulation] Simulation failed:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [defaultDays, defaultVolatility, getSimulator]);

  // Compare scenarios
  const compareScenarios = useCallback(async (
    baseParams?: Partial<SimulationParams>
  ): Promise<ScenarioComparison> => {
    setIsComparing(true);
    setError(null);

    try {
      const sdkParams = toSDKParams({
        ...baseParams,
        days: baseParams?.days ?? defaultDays,
        volatility: baseParams?.volatility ?? defaultVolatility,
      });

      const simulator = getSimulator();
      const sdkComparison = simulator.compareScenarios(sdkParams);
      const mobileComparison = toMobileComparison(sdkComparison);

      setComparison(mobileComparison);
      setLastUpdated(Date.now());
      return mobileComparison;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scenario comparison failed';
      setError(message);
      console.error('[useSurvivalSimulation] Comparison failed:', err);
      throw err;
    } finally {
      setIsComparing(false);
    }
  }, [defaultDays, defaultVolatility, getSimulator]);

  // Run Monte Carlo simulation
  const runMonteCarlo = useCallback(async (
    params: Partial<SimulationParams>,
    iterations?: number
  ): Promise<MonteCarloResult> => {
    if (!enableMonteCarlo) {
      throw new Error('Monte Carlo is disabled');
    }

    setIsRunningMonteCarlo(true);
    setError(null);

    try {
      const sdkParams = toSDKParams({
        ...params,
        days: params.days ?? defaultDays,
        volatility: params.volatility ?? defaultVolatility,
      });

      const simulator = getSimulator();
      const its = iterations ?? monteCarloIterations;
      const sdkResult = simulator.monteCarlo(sdkParams, its);

      const results = sdkResult.results.map(toMobileResult);
      const monteCarloResult: MonteCarloResult = {
        results,
        aggregate: sdkResult.aggregate,
      };

      setMonteCarlo(monteCarloResult);
      setLastUpdated(Date.now());
      return monteCarloResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Monte Carlo failed';
      setError(message);
      console.error('[useSurvivalSimulation] Monte Carlo failed:', err);
      throw err;
    } finally {
      setIsRunningMonteCarlo(false);
    }
  }, [defaultDays, defaultVolatility, enableMonteCarlo, monteCarloIterations, getSimulator]);

  // Clear results
  const clearResults = useCallback((): void => {
    setResult(null);
    setComparison(null);
    setMonteCarlo(null);
    setError(null);
  }, []);

  // Preset scenarios
  const runOptimistic = useCallback((days?: number): Promise<SimulationResult> => {
    return simulate({
      days,
      taskSuccessRate: 0.9,
      dailyIncome: 80,
      volatility: 0.1,
    });
  }, [simulate]);

  const runPessimistic = useCallback((days?: number): Promise<SimulationResult> => {
    return simulate({
      days,
      taskSuccessRate: 0.5,
      dailyExpenses: 50,
      volatility: 0.4,
    });
  }, [simulate]);

  const runRealistic = useCallback((days?: number): Promise<SimulationResult> => {
    return simulate({
      days,
      taskSuccessRate: 0.75,
      volatility: 0.25,
    });
  }, [simulate]);

  // Computed helpers
  const hasResults = result !== null;
  
  const bankruptcyProbability = useMemo(() => {
    return result?.riskAssessment.bankruptcyProbability ?? 0;
  }, [result]);
  
  const isSafe = useMemo(() => {
    return bankruptcyProbability < 0.2;
  }, [bankruptcyProbability]);

  return {
    result,
    comparison,
    monteCarlo,
    isLoading,
    isComparing,
    isRunningMonteCarlo,
    error,
    lastUpdated,
    simulate,
    compareScenarios,
    runMonteCarlo,
    clearResults,
    runOptimistic,
    runPessimistic,
    runRealistic,
    hasResults,
    bankruptcyProbability,
    isSafe,
  };
}

// Helper function to generate simulation chart data
export function generateSimulationChartData(
  result: SimulationResult
): { labels: string[]; datasets: Array<{ label: string; data: number[]; color?: string }> } {
  return {
    labels: result.dailyResults.map(d => `Day ${d.day}`),
    datasets: [
      {
        label: 'Balance',
        data: result.dailyResults.map(d => d.balance),
        color: '#10b981',
      },
      {
        label: 'Income',
        data: result.dailyResults.map(d => d.income),
        color: '#3b82f6',
      },
      {
        label: 'Expenses',
        data: result.dailyResults.map(d => d.expenses),
        color: '#ef4444',
      },
    ],
  };
}

// Helper function to generate prediction chart data
export function generatePredictionChartData(
  history: Array<{ timestamp: number; trend: { currentScore: number } }>,
  prediction?: { predictedScore: { value: number; lowerBound: number; upperBound: number } } | null
): { labels: string[]; actual: number[]; predicted: number[]; lowerBound: number[]; upperBound: number[] } {
  const labels = history.map(h => new Date(h.timestamp).toLocaleDateString());
  const actual = history.map(h => h.trend.currentScore);
  
  if (!prediction) {
    return { labels, actual, predicted: [], lowerBound: [], upperBound: [] };
  }

  const futureLabels = Array.from({ length: 7 }, (_, i) => `+${i + 1}d`);
  const lastValue = actual[actual.length - 1] ?? 0;
  
  return {
    labels: [...labels, ...futureLabels],
    actual: [...actual, ...Array(7).fill(null)],
    predicted: [...Array(actual.length - 1).fill(null), lastValue, ...Array(6).fill(prediction.predictedScore.value)],
    lowerBound: [...Array(actual.length).fill(null), ...Array(7).fill(prediction.predictedScore.lowerBound)],
    upperBound: [...Array(actual.length).fill(null), ...Array(7).fill(prediction.predictedScore.upperBound)],
  };
}

export default useSurvivalSimulation;
