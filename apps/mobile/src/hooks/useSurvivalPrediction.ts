/**
 * useSurvivalPrediction Hook for Agora Mobile
 * React hook for survival prediction and forecasting
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  SurvivalPredictor,
  createPredictorFromSnapshots,
  type HistoricalDataPoint,
  type PredictionResult,
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
  const [hasEnoughData, setHasEnoughData] = useState(false);

  // Refs
  const predictorRef = useRef<SurvivalPredictor | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize predictor
  useEffect(() => {
    if (snapshots.length >= minDataPoints) {
      predictorRef.current = createPredictorFromSnapshots(snapshots);
      setHasEnoughData(true);
    } else {
      predictorRef.current = new SurvivalPredictor();
      setHasEnoughData(false);
    }
  }, [snapshots, minDataPoints]);

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
  }, [daysAhead]);

  // Refresh prediction
  const refresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    await predict();
  }, [predict]);

  // Add data point
  const addDataPoint = useCallback((point: HistoricalDataPoint): void => {
    predictorRef.current?.addDataPoint(point);
    setHasEnoughData(predictorRef.current?.getHistoryLength() >= minDataPoints);
  }, [minDataPoints]);

  // Clear history
  const clearHistory = useCallback((): void => {
    predictorRef.current?.clearHistory();
    setHistory([]);
    setTrend(null);
    setForecast(null);
    setHasEnoughData(false);
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
  const isBankruptcyRisk = forecast?.bankruptcyRisk > 0.3;
  const daysUntilCritical = trend?.daysToCritical ?? null;
  const confidenceLevel = trend?.predictedScore.confidence ?? 0;

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
