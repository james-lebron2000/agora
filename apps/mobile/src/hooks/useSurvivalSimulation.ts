/**
 * useSurvivalSimulation Hook for Agora Mobile
 * React hook for survival simulation and scenario analysis
 */

import { useState, useCallback, useRef } from 'react';
import {
  SurvivalSimulator,
  createSimulatorFromSnapshot,
  type SimulationParams as SDKSimulationParams,
  type SimulationResult as SDKSimulationResult,
  type ScenarioComparison as SDKScenarioComparison,
  type ScenarioType,
} from '@agora/sdk/survival-simulation';
import type { SurvivalSnapshot } from '@agora/sdk/survival';
import type {
  UseSimulationReturn,
  SimulationParams,
  SimulationResult,
  ScenarioComparison,
  MonteCarloResult,
  SimulationOptions,
} from '../types/survival';

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
    scenario: result.scenario as ScenarioType,
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
      const sdkResult = simulator.simulateScenario('custom', sdkParams);
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
      const scenarios: ScenarioType[] = ['optimistic', 'pessimistic', 'realistic'];
      const results: Record<string, SimulationResult> = {};

      for (const scenario of scenarios) {
        const sdkResult = simulator.simulateScenario(scenario as any, sdkParams);
        results[scenario] = toMobileResult(sdkResult);
      }

      // Determine recommendation
      const realisticResult = results['realistic'];
      let recommendation: ScenarioType = 'realistic';
      
      if (realisticResult.riskAssessment.bankruptcyProbability < 0.1) {
        recommendation = 'optimistic';
      } else if (realisticResult.riskAssessment.bankruptcyProbability > 0.5) {
        recommendation = 'pessimistic';
      }

      const comparisonResult: ScenarioComparison = {
        scenarios: results as Record<ScenarioType, SimulationResult>,
        recommendation,
        riskAnalysis: {
          bestCaseOutcome: results['optimistic'].summary.finalBalance,
          worstCaseOutcome: results['pessimistic'].summary.finalBalance,
          expectedOutcome: results['realistic'].summary.finalBalance,
          probabilityOfSuccess: 1 - realisticResult.riskAssessment.bankruptcyProbability,
        },
      };

      setComparison(comparisonResult);
      setLastUpdated(Date.now());
      return comparisonResult;
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
      const sdkResult = simulator.runMonteCarlo(sdkParams, its);

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
  const bankruptcyProbability = result?.riskAssessment.bankruptcyProbability ?? 0;
  const isSafe = bankruptcyProbability < 0.2;

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

export default useSurvivalSimulation;
