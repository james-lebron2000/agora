/**
 * Survival Simulation Module for Agora
 *
 * Provides "what-if" scenario analysis and Monte Carlo simulations
 * for agent survival under different conditions.
 *
 * @module survival-simulation
 */
import type { SurvivalSnapshot } from './survival.js';
/**
 * Simulation scenario type
 */
export type ScenarioType = 'best-case' | 'worst-case' | 'average-case' | 'custom';
/**
 * Simulation parameters
 */
export interface SimulationParams {
    /** Initial balance in USD */
    initialBalance: number;
    /** Daily income in USD */
    dailyIncome: number;
    /** Daily expenses in USD */
    dailyExpenses: number;
    /** Success rate for tasks (0-1) */
    taskSuccessRate: number;
    /** Average task reward in USD */
    avgTaskReward: number;
    /** Number of simulation days */
    days: number;
    /** Market volatility factor (0-1) */
    volatility: number;
    /** Random seed for reproducibility */
    seed?: number;
}
/**
 * Simulation result for a single day
 */
export interface DailyResult {
    day: number;
    balance: number;
    income: number;
    expenses: number;
    tasksCompleted: number;
    tasksFailed: number;
    survivalScore: number;
    events: SimulationEvent[];
}
/**
 * Simulation event
 */
export interface SimulationEvent {
    type: 'task-completed' | 'task-failed' | 'market-boom' | 'market-crash' | 'expense-spike';
    description: string;
    impact: number;
    day: number;
}
/**
 * Complete simulation result
 */
export interface SimulationResult {
    scenario: ScenarioType;
    params: SimulationParams;
    dailyResults: DailyResult[];
    summary: {
        finalBalance: number;
        totalIncome: number;
        totalExpenses: number;
        minBalance: number;
        maxBalance: number;
        daysSurvived: number;
        bankruptcyDay: number | null;
        avgSurvivalScore: number;
        finalSurvivalScore: number;
    };
    riskAssessment: {
        bankruptcyProbability: number;
        criticalPeriods: Array<{
            start: number;
            end: number;
        }>;
        recommendedActions: string[];
    };
}
/**
 * Multi-scenario comparison result
 */
export interface ScenarioComparison {
    scenarios: Record<ScenarioType, SimulationResult>;
    recommendation: ScenarioType;
    riskAnalysis: {
        bestCaseOutcome: number;
        worstCaseOutcome: number;
        expectedOutcome: number;
        probabilityOfSuccess: number;
    };
}
/**
 * Survival Simulator class
 */
export declare class SurvivalSimulator {
    private rng;
    constructor(seed?: number);
    /**
     * Set random seed for reproducibility
     */
    setSeed(seed: number): void;
    /**
     * Run a single scenario simulation
     */
    simulate(params: SimulationParams): SimulationResult;
    /**
     * Run multiple scenarios and compare
     */
    compareScenarios(baseParams: Partial<SimulationParams>): ScenarioComparison;
    /**
     * Run Monte Carlo simulation
     */
    monteCarlo(params: SimulationParams, iterations?: number): {
        results: SimulationResult[];
        aggregate: {
            meanFinalBalance: number;
            medianFinalBalance: number;
            stdDev: number;
            bankruptcyRate: number;
            confidenceInterval: [number, number];
        };
    };
    /**
     * Calculate survival score based on current state
     */
    private calculateSurvivalScore;
}
/**
 * Create simulator from current survival snapshot
 */
export declare function createSimulatorFromSnapshot(snapshot: SurvivalSnapshot, health: {
    taskSuccessRate: number;
}, days?: number): SurvivalSimulator;
/**
 * Quick simulation from snapshot
 */
export declare function simulateFromSnapshot(snapshot: SurvivalSnapshot, days?: number, volatility?: number): SimulationResult;
/**
 * Get or create global simulator
 */
export declare function getGlobalSimulator(): SurvivalSimulator;
export default SurvivalSimulator;
//# sourceMappingURL=survival-simulation.d.ts.map