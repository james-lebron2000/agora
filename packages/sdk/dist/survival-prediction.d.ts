/**
 * Survival Prediction Module for Agora
 *
 * Provides predictive analytics for agent survival metrics using
 * time-series analysis and statistical forecasting.
 *
 * @module survival-prediction
 */
import type { SurvivalSnapshot } from './survival.js';
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
    confidence: number;
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
    trendStrength: number;
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
    bankruptcyRisk: number;
    breakEvenDate: number | null;
}
/**
 * Survival Predictor class
 */
export declare class SurvivalPredictor {
    private history;
    private readonly maxHistorySize;
    /**
     * Add a data point to history
     */
    addDataPoint(point: HistoricalDataPoint): void;
    /**
     * Add multiple data points
     */
    addHistory(points: HistoricalDataPoint[]): void;
    /**
     * Get survival trend prediction
     */
    predictTrend(daysAhead?: number): SurvivalTrendPrediction;
    /**
     * Predict economic forecast
     */
    predictEconomics(daysAhead?: number): EconomicForecast;
    /**
     * Get prediction for specific metric
     */
    predictMetric(metric: 'survivalScore' | 'balance' | 'runwayDays', daysAhead?: number): PredictionResult<number>;
    /**
     * Clear all history
     */
    clearHistory(): void;
    /**
     * Get current history
     */
    getHistory(): HistoricalDataPoint[];
    /**
     * Calculate linear regression using least squares method
     */
    private calculateLinearRegression;
    /**
     * Calculate standard deviation
     */
    private calculateStdDev;
}
/**
 * Create a predictor from survival snapshots
 */
export declare function createPredictorFromSnapshots(snapshots: SurvivalSnapshot[], tasksCompleted?: number[], tasksFailed?: number[]): SurvivalPredictor;
/**
 * Get or create global predictor
 */
export declare function getGlobalPredictor(): SurvivalPredictor;
export default SurvivalPredictor;
//# sourceMappingURL=survival-prediction.d.ts.map