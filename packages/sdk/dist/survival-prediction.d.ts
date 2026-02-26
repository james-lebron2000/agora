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
/**
 * Risk factor descriptor
 */
export interface RiskFactor {
    /** Factor identifier */
    id: string;
    /** Human-readable factor name */
    name: string;
    /** Risk severity level */
    severity: 'low' | 'medium' | 'high' | 'critical';
    /** Risk contribution score (0-100) */
    score: number;
    /** Factor description */
    description: string;
    /** Recommended action */
    recommendation?: string;
}
/**
 * Multi-factor risk score input parameters
 */
export interface MultiFactorRiskInput {
    /** Economic health score (0-100, higher is better) */
    economicHealth: number;
    /** Reputation score (0-100, higher is better) */
    reputationScore: number;
    /** Task success rate (0-1, e.g., 0.85 for 85%) */
    taskSuccessRate: number;
    /** Online hours in the last 24 hours */
    onlineHours: number;
    /** Optional: Historical volatility factor (0-1) */
    volatilityFactor?: number;
    /** Optional: Network diversity score (0-100) */
    networkDiversity?: number;
}
/**
 * Survival probability result
 */
export interface SurvivalProbability {
    /** 7-day survival probability (0-1) */
    days7: number;
    /** 30-day survival probability (0-1) */
    days30: number;
    /** Overall confidence level (0-1) */
    confidence: number;
}
/**
 * Calculate multi-factor risk score based on economic, reputation,
 * task performance, and engagement metrics.
 *
 * @param input - Risk factor inputs
 * @returns Risk score (0-100, higher = more risk)
 */
export declare function calculateMultiFactorRiskScore(input: MultiFactorRiskInput): number;
/**
 * Predict survival probability based on risk score.
 *
 * Uses exponential decay model where higher risk scores
 * result in lower survival probabilities over time.
 *
 * @param riskScore - Risk score (0-100)
 * @returns Survival probability for 7 and 30 days
 */
export declare function predictSurvivalProbability(riskScore: number): SurvivalProbability;
/**
 * Generate a list of risk factors based on input metrics.
 *
 * Identifies specific risk sources and provides actionable
 * recommendations for each identified risk.
 *
 * @param input - Risk factor inputs
 * @returns Array of identified risk factors
 */
export declare function generateRiskFactors(input: MultiFactorRiskInput): RiskFactor[];
//# sourceMappingURL=survival-prediction.d.ts.map