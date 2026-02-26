/**
 * useSurvivalPrediction Hook for Agora Mobile
 * React hook for survival prediction and forecasting
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  SurvivalPredictor,
  createPredictorFromSnapshots,
  type HistoricalDataPoint,
  type SurvivalTrendPrediction,
  type EconomicForecast,
} from '@agora/sdk/survival-prediction';
import type { SurvivalSnapshot } from '@agora/sdk/survival';
import type { 
  UsePredictionReturn, 
  PredictionHistoryEntry,
  PredictionOptions 
} from '../types/survival';

interface UsePredictionOptionsExtended extends PredictionOptions {
  snapshots?: SurvivalSnapshot[];
}

export function useSurvivalPrediction(
  options: UsePredictionOptionsExtended = {}
): UsePredictionReturn {
  const {
    daysAhead = 7,
    autoRefresh = false,
    refreshInterval = 60000,
    minDataPoints = 3,
    snapshots = []
  } = options;

  // State
  const [trend, setTrend] = useState<SurvivalTrendPrediction | null>(null);
  const [forecast, setForecast] = useState<EconomicForecast | null>(null);
  const [history, setHistory] = useState<PredictionHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(0);

  // Refs
  const predictorRef = useRef<SurvivalPredictor | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize predictor
  useEffect(() => {
    if (snapshots.length >= minDataPoints) {
      predictorRef.current = createPredictorFromSnapshots(snapshots);
    } else {
      predictorRef.current = new SurvivalPredictor();
    }
  }, [snapshots, minDataPoints]);

  // Check if we have enough data
  const hasEnoughData = useMemo(() => {
    return predictorRef.current ? predictorRef.current.getHistory().length >= minDataPoints : false;
  }, [predictorRef.current?.getHistory().length, minDataPoints]);

  // Perform prediction
  const predict = useCallback(async (customDaysAhead?: number): Promise<void> => {
    if (!predictorRef.current) {
      setError('Predictor not initialized');
      return;
    }

    const days = customDaysAhead ?? daysAhead;
    setIsLoading(true);
    setError(null);

    try {
      // Check if we have enough data
      if (predictorRef.current.getHistory().length < minDataPoints) {
        throw new Error(`Need at least ${minDataPoints} data points for prediction`);
      }

      // Get trend prediction
      const trendResult = predictorRef.current.predictTrend(days);
      setTrend(trendResult);

      // Get economic forecast
      const forecastResult = predictorRef.current.predictEconomics(days);
      setForecast(forecastResult);

      // Update history
      const entry: PredictionHistoryEntry = {
        timestamp: Date.now(),
        trend: trendResult,
        forecast: forecastResult,
      };
      setHistory(prev => [...prev.slice(-49), entry]); // Keep last 50
      setLastUpdated(Date.now());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Prediction failed';
      setError(message);
      console.error('[useSurvivalPrediction] Prediction failed:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [daysAhead, minDataPoints]);

  // Refresh prediction
  const refresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    await predict();
  }, [predict]);

  // Add data point
  const addDataPoint = useCallback((point: HistoricalDataPoint): void => {
    predictorRef.current?.addDataPoint(point);
  }, []);

  // Clear history
  const clearHistory = useCallback((): void => {
    predictorRef.current?.clearHistory();
    setHistory([]);
    setTrend(null);
    setForecast(null);
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh && hasEnoughData) {
      predict();
      intervalRef.current = setInterval(predict, refreshInterval);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, hasEnoughData, predict, refreshInterval]);

  // Computed helpers
  const isBankruptcyRisk = useMemo(() => {
    return (forecast?.bankruptcyRisk ?? 0) > 0.3;
  }, [forecast]);

  const daysUntilCritical = useMemo(() => {
    return trend?.daysToCritical ?? null;
  }, [trend]);

  const confidenceLevel = useMemo(() => {
    return trend?.predictedScore.confidence ?? 0;
  }, [trend]);

  return {
    trend,
    forecast,
    history,
    isLoading,
    isRefreshing,
    error,
    lastUpdated,
    hasEnoughData,
    refresh,
    predict,
    addDataPoint,
    clearHistory,
    isBankruptcyRisk,
    daysUntilCritical,
    confidenceLevel,
  };
}

export default useSurvivalPrediction;
