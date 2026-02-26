/**
 * Survival Predictor Example
 *
 * Demonstrates how to use the prediction and simulation features
 * of the Echo Survival system.
 *
 * Usage: ts-node survival-predictor-example.ts
 */
import { type HistoricalDataPoint } from '@agora/sdk';
declare function generateMockHistory(days?: number): HistoricalDataPoint[];
declare function example1_BasicPrediction(): Promise<void>;
declare function example2_EconomicForecast(): Promise<void>;
declare function example3_ScenarioSimulation(): Promise<void>;
declare function example4_ScenarioComparison(): Promise<void>;
declare function example5_MonteCarlo(): Promise<void>;
declare function example6_GlobalInstances(): Promise<void>;
declare function runAllExamples(): Promise<void>;
export { generateMockHistory, example1_BasicPrediction, example2_EconomicForecast, example3_ScenarioSimulation, example4_ScenarioComparison, example5_MonteCarlo, example6_GlobalInstances, runAllExamples, };
//# sourceMappingURL=survival-predictor-example.d.ts.map