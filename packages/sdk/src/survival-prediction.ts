/**
 * Survival Prediction Module for Agora
 * 
 * Provides predictive analytics for agent survival metrics using
 * time-series analysis and statistical forecasting.
 * 
 * @module survival-prediction
 */

import type { SurvivalSnapshot, AgentEconomics } from './survival.js';

/**
 * Historical data point for time-series analysis
 */
export interface HistoricalDataPoint {
  timestamp: number;
  survivalScore: number;
  balance: string;
  runwayDays: number;
  tasksCompleted: number;
  tasksFailed: number;
}

/**
 * Prediction result with confidence interval
 */
export interface PredictionResult<T> {
  value: T;
  confidence: number; // 0-1
  lowerBound: T;
  upperBound: T;
  timestamp: number;
}

/**
 * Survival trend prediction
 */
export interface SurvivalTrendPrediction {
  currentScore: number;
  predictedScore: PredictionResult<number>;
  trend: 'improving' | 'stable' | 'declining';
  trendStrength: number; // 0-1
  daysToCritical: number | null;
  daysToRecovery: number | null;
}

/**
 * Economic forecast
 */
export interface EconomicForecast {
  currentBalance: string;
  predictedBalance: PredictionResult<string>;
  runwayPrediction: PredictionResult<number>;
  burnRateTrend: 'increasing' | 'stable' | 'decreasing';
  bankruptcyRisk: number; // 0-1 probability
  breakEvenDate: number | null; // timestamp
}

/**
 * Linear regression result
 */
interface LinearRegressionResult {
  slope: number;
  intercept: number;
  r2: number; // R-squared (goodness of fit)
}

/**
 * Survival Predictor class
 */
export class SurvivalPredictor {
  private history: HistoricalDataPoint[] = [];
  private readonly maxHistorySize = 100;

  /**
   * Add a data point to history
   */
  addDataPoint(point: HistoricalDataPoint): void {
    this.history.push(point);
    
    // Keep only recent history
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
    
    // Sort by timestamp
    this.history.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Add multiple data points
   */
  addHistory(points: HistoricalDataPoint[]): void {
    points.forEach(p => this.addDataPoint(p));
  }

  /**
   * Get survival trend prediction
   */
  predictTrend(daysAhead: number = 7): SurvivalTrendPrediction {
    if (this.history.length < 3) {
      return {
        currentScore: 50,
        predictedScore: {
          value: 50,
          confidence: 0,
          lowerBound: 50,
          upperBound: 50,
          timestamp: Date.now() + daysAhead * 24 * 60 * 60 * 1000,
        },
        trend: 'stable',
        trendStrength: 0,
        daysToCritical: null,
        daysToRecovery: null,
      };
    }

    const scores = this.history.map(h => h.survivalScore);
    const currentScore = scores[scores.length - 1];
    
    // Calculate linear regression
    const regression = this.calculateLinearRegression(
      this.history.map((h, i) => ({ x: i, y: h.survivalScore }))
    );

    // Predict future score
    const futureIndex = this.history.length + daysAhead;
    const predictedScore = regression.slope * futureIndex + regression.intercept;
    const clampedPrediction = Math.max(0, Math.min(100, predictedScore));
    
    // Calculate confidence based on R-squared and data points
    const confidence = Math.min(0.95, regression.r2 * (this.history.length / 20));
    
    // Calculate bounds (simple confidence interval)
    const stdDev = this.calculateStdDev(scores);
    const margin = stdDev * 1.96; // 95% confidence
    
    // Determine trend
    const trend: SurvivalTrendPrediction['trend'] = 
      regression.slope > 0.5 ? 'improving' :
      regression.slope < -0.5 ? 'declining' : 'stable';
    
    // Calculate trend strength (0-1)
    const trendStrength = Math.min(1, Math.abs(regression.slope) / 5);
    
    // Calculate days to critical (score < 30)
    let daysToCritical: number | null = null;
    if (regression.slope < 0 && currentScore > 30) {
      const criticalIndex = (30 - regression.intercept) / regression.slope;
      if (criticalIndex > this.history.length) {
        daysToCritical = Math.round(criticalIndex - this.history.length);
      }
    }
    
    // Calculate days to recovery (score > 70 from below)
    let daysToRecovery: number | null = null;
    if (regression.slope > 0 && currentScore < 70) {
      const recoveryIndex = (70 - regression.intercept) / regression.slope;
      if (recoveryIndex > this.history.length) {
        daysToRecovery = Math.round(recoveryIndex - this.history.length);
      }
    }

    return {
      currentScore,
      predictedScore: {
        value: clampedPrediction,
        confidence,
        lowerBound: Math.max(0, clampedPrediction - margin),
        upperBound: Math.min(100, clampedPrediction + margin),
        timestamp: Date.now() + daysAhead * 24 * 60 * 60 * 1000,
      },
      trend,
      trendStrength,
      daysToCritical,
      daysToRecovery,
    };
  }

  /**
   * Predict economic forecast
   */
  predictEconomics(daysAhead: number = 30): EconomicForecast {
    if (this.history.length < 3) {
      return {
        currentBalance: '0',
        predictedBalance: {
          value: '0',
          confidence: 0,
          lowerBound: '0',
          upperBound: '0',
          timestamp: Date.now(),
        },
        runwayPrediction: {
          value: 0,
          confidence: 0,
          lowerBound: 0,
          upperBound: 0,
          timestamp: Date.now(),
        },
        burnRateTrend: 'stable',
        bankruptcyRisk: 0,
        breakEvenDate: null,
      };
    }

    const balances = this.history.map(h => parseFloat(h.balance));
    const runways = this.history.map(h => h.runwayDays);
    const currentBalance = balances[balances.length - 1];
    
    // Calculate balance regression
    const balanceRegression = this.calculateLinearRegression(
      balances.map((b, i) => ({ x: i, y: b }))
    );
    
    // Predict future balance
    const futureIndex = this.history.length + daysAhead;
    const predictedBalance = balanceRegression.slope * futureIndex + balanceRegression.intercept;
    
    // Calculate runway regression
    const runwayRegression = this.calculateLinearRegression(
      runways.map((r, i) => ({ x: i, y: r }))
    );
    const predictedRunway = Math.max(0, runwayRegression.slope * futureIndex + runwayRegression.intercept);
    
    // Calculate confidence
    const balanceConfidence = Math.min(0.9, balanceRegression.r2 * (this.history.length / 30));
    
    // Calculate bounds
    const balanceStdDev = this.calculateStdDev(balances);
    const balanceMargin = balanceStdDev * 1.5;
    
    // Determine burn rate trend
    const burnRateTrend: EconomicForecast['burnRateTrend'] =
      runwayRegression.slope < -0.1 ? 'increasing' :
      runwayRegression.slope > 0.1 ? 'decreasing' : 'stable';
    
    // Calculate bankruptcy risk
    let bankruptcyRisk = 0;
    if (predictedBalance <= 0) {
      bankruptcyRisk = 1;
    } else if (predictedRunway < 7) {
      bankruptcyRisk = 0.8 + (7 - predictedRunway) * 0.03;
    } else if (predictedRunway < 30) {
      bankruptcyRisk = 0.3 + (30 - predictedRunway) * 0.02;
    } else {
      bankruptcyRisk = Math.max(0, 0.3 - (predictedRunway - 30) * 0.01);
    }
    bankruptcyRisk = Math.min(1, bankruptcyRisk);
    
    // Calculate break-even date (when runway starts increasing)
    let breakEvenDate: number | null = null;
    if (runwayRegression.slope < 0) {
      // Find when balance would be depleted
      const depletionIndex = -balances[balances.length - 1] / balanceRegression.slope;
      if (depletionIndex > 0 && depletionIndex < 365) {
        breakEvenDate = Date.now() + depletionIndex * 24 * 60 * 60 * 1000;
      }
    }

    return {
      currentBalance: currentBalance.toString(),
      predictedBalance: {
        value: predictedBalance.toFixed(2),
        confidence: balanceConfidence,
        lowerBound: (predictedBalance - balanceMargin).toFixed(2),
        upperBound: (predictedBalance + balanceMargin).toFixed(2),
        timestamp: Date.now() + daysAhead * 24 * 60 * 60 * 1000,
      },
      runwayPrediction: {
        value: Math.round(predictedRunway),
        confidence: balanceConfidence,
        lowerBound: Math.round(Math.max(0, predictedRunway - 5)),
        upperBound: Math.round(predictedRunway + 5),
        timestamp: Date.now() + daysAhead * 24 * 60 * 60 * 1000,
      },
      burnRateTrend,
      bankruptcyRisk,
      breakEvenDate,
    };
  }

  /**
   * Get prediction for specific metric
   */
  predictMetric(
    metric: 'survivalScore' | 'balance' | 'runwayDays',
    daysAhead: number = 7
  ): PredictionResult<number> {
    const trend = this.predictTrend(daysAhead);
    const economics = this.predictEconomics(daysAhead);
    
    switch (metric) {
      case 'survivalScore':
        return trend.predictedScore as PredictionResult<number>;
      case 'balance':
        return {
          ...economics.predictedBalance,
          value: parseFloat(economics.predictedBalance.value),
          lowerBound: parseFloat(economics.predictedBalance.lowerBound),
          upperBound: parseFloat(economics.predictedBalance.upperBound),
        };
      case 'runwayDays':
        return economics.runwayPrediction as PredictionResult<number>;
      default:
        throw new Error(`Unknown metric: ${metric}`);
    }
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Get current history
   */
  getHistory(): HistoricalDataPoint[] {
    return [...this.history];
  }

  /**
   * Calculate linear regression using least squares method
   */
  private calculateLinearRegression(data: Array<{ x: number; y: number }>): LinearRegressionResult {
    const n = data.length;
    if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

    for (const point of data) {
      sumX += point.x;
      sumY += point.y;
      sumXY += point.x * point.y;
      sumX2 += point.x * point.x;
      sumY2 += point.y * point.y;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    let ssTotal = 0, ssResidual = 0;

    for (const point of data) {
      const predicted = slope * point.x + intercept;
      ssTotal += Math.pow(point.y - yMean, 2);
      ssResidual += Math.pow(point.y - predicted, 2);
    }

    const r2 = ssTotal === 0 ? 1 : 1 - ssResidual / ssTotal;

    return { slope, intercept, r2 };
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }
}

/**
 * Create a predictor from survival snapshots
 */
export function createPredictorFromSnapshots(
  snapshots: SurvivalSnapshot[],
  tasksCompleted: number[] = [],
  tasksFailed: number[] = []
): SurvivalPredictor {
  const predictor = new SurvivalPredictor();
  
  const history: HistoricalDataPoint[] = snapshots.map((s, i) => ({
    timestamp: s.timestamp,
    survivalScore: s.health.overall,
    balance: s.economics.balance,
    runwayDays: s.economics.runwayDays,
    tasksCompleted: tasksCompleted[i] || 0,
    tasksFailed: tasksFailed[i] || 0,
  }));
  
  predictor.addHistory(history);
  return predictor;
}

/**
 * Singleton predictor instance
 */
let globalPredictor: SurvivalPredictor | null = null;

/**
 * Get or create global predictor
 */
export function getGlobalPredictor(): SurvivalPredictor {
  if (!globalPredictor) {
    globalPredictor = new SurvivalPredictor();
  }
  return globalPredictor;
}

export default SurvivalPredictor;
