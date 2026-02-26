/**
 * Survival Predictor Example
 *
 * Demonstrates how to use the prediction and simulation features
 * of the Echo Survival system.
 *
 * Usage: ts-node survival-predictor-example.ts
 */
import { SurvivalPredictor, SurvivalSimulator, getGlobalPredictor, getGlobalSimulator, } from '@agora/sdk';
// Generate mock historical data
function generateMockHistory(days = 30) {
    const history = [];
    let balance = 1000;
    let score = 75;
    for (let i = 0; i < days; i++) {
        // Simulate some volatility
        const dailyChange = (Math.random() - 0.4) * 50; // Slight upward bias
        balance = Math.max(100, balance + dailyChange);
        // Score correlates with balance but with noise
        score = Math.max(0, Math.min(100, score + (dailyChange / 10) + (Math.random() - 0.5) * 5));
        history.push({
            timestamp: Date.now() - (days - i) * 24 * 60 * 60 * 1000,
            survivalScore: score,
            balance: balance.toString(),
            runwayDays: balance / 30,
            tasksCompleted: Math.floor(Math.random() * 5) + 1,
            tasksFailed: Math.floor(Math.random() * 2),
        });
    }
    return history;
}
// Example 1: Basic Trend Prediction
async function example1_BasicPrediction() {
    console.log('\n🎯 Example 1: Basic Trend Prediction');
    console.log('=====================================\n');
    const predictor = new SurvivalPredictor();
    const history = generateMockHistory(14);
    predictor.addHistory(history);
    // Predict 7 days ahead
    const prediction = predictor.predictTrend(7);
    console.log(`Current Score: ${prediction.currentScore.toFixed(1)}`);
    console.log(`Predicted Score (7 days): ${prediction.predictedScore.value.toFixed(1)}`);
    console.log(`Confidence: ${(prediction.predictedScore.confidence * 100).toFixed(1)}%`);
    console.log(`Trend: ${prediction.trend} (strength: ${(prediction.trendStrength * 100).toFixed(1)}%)`);
    if (prediction.daysToCritical) {
        console.log(`⚠️  Days until critical: ${prediction.daysToCritical}`);
    }
    if (prediction.daysToRecovery) {
        console.log(`✅ Days until recovery: ${prediction.daysToRecovery}`);
    }
}
// Example 2: Economic Forecast
async function example2_EconomicForecast() {
    console.log('\n💰 Example 2: Economic Forecast');
    console.log('================================\n');
    const predictor = new SurvivalPredictor();
    const history = generateMockHistory(30);
    predictor.addHistory(history);
    const forecast = predictor.predictEconomics(30);
    console.log(`Current Balance: $${parseFloat(forecast.currentBalance).toFixed(2)}`);
    console.log(`Predicted Balance (30 days): $${parseFloat(forecast.predictedBalance.value).toFixed(2)}`);
    console.log(`  - Lower Bound: $${parseFloat(forecast.predictedBalance.lowerBound).toFixed(2)}`);
    console.log(`  - Upper Bound: $${parseFloat(forecast.predictedBalance.upperBound).toFixed(2)}`);
    console.log(`Predicted Runway: ${forecast.runwayPrediction.value} days`);
    console.log(`Burn Rate Trend: ${forecast.burnRateTrend}`);
    console.log(`Bankruptcy Risk: ${(forecast.bankruptcyRisk * 100).toFixed(1)}%`);
    if (forecast.breakEvenDate) {
        console.log(`⚠️  Break-even Date: ${new Date(forecast.breakEvenDate).toLocaleDateString()}`);
    }
}
// Example 3: Scenario Simulation
async function example3_ScenarioSimulation() {
    console.log('\n🎲 Example 3: Scenario Simulation');
    console.log('==================================\n');
    const simulator = new SurvivalSimulator();
    const params = {
        initialBalance: 1000,
        dailyIncome: 50,
        dailyExpenses: 30,
        taskSuccessRate: 0.8,
        avgTaskReward: 25,
        days: 30,
        volatility: 0.3,
        seed: 12345, // For reproducibility
    };
    console.log('Simulation Parameters:');
    console.log(`  Initial Balance: $${params.initialBalance}`);
    console.log(`  Daily Income: $${params.dailyIncome}`);
    console.log(`  Daily Expenses: $${params.dailyExpenses}`);
    console.log(`  Task Success Rate: ${(params.taskSuccessRate * 100).toFixed(0)}%`);
    console.log(`  Duration: ${params.days} days`);
    console.log();
    const result = simulator.simulate(params);
    console.log('Simulation Results:');
    console.log(`  Final Balance: $${result.summary.finalBalance.toFixed(2)}`);
    console.log(`  Total Income: $${result.summary.totalIncome.toFixed(2)}`);
    console.log(`  Total Expenses: $${result.summary.totalExpenses.toFixed(2)}`);
    console.log(`  Min Balance: $${result.summary.minBalance.toFixed(2)}`);
    console.log(`  Avg Survival Score: ${result.summary.avgSurvivalScore.toFixed(1)}`);
    console.log(`  Days Survived: ${result.summary.daysSurvived}`);
    if (result.summary.bankruptcyDay) {
        console.log(`  ⚠️  Bankruptcy on Day ${result.summary.bankruptcyDay}`);
    }
    console.log('\nRisk Assessment:');
    console.log(`  Bankruptcy Probability: ${(result.riskAssessment.bankruptcyProbability * 100).toFixed(1)}%`);
    if (result.riskAssessment.recommendedActions.length > 0) {
        console.log('\n  Recommended Actions:');
        result.riskAssessment.recommendedActions.forEach(action => {
            console.log(`    - ${action}`);
        });
    }
    // Show some events
    const allEvents = result.dailyResults.flatMap(d => d.events);
    if (allEvents.length > 0) {
        console.log('\n  Notable Events:');
        allEvents.slice(0, 5).forEach(event => {
            console.log(`    Day ${event.day}: ${event.description}`);
        });
    }
}
// Example 4: Scenario Comparison
async function example4_ScenarioComparison() {
    console.log('\n📊 Example 4: Scenario Comparison');
    console.log('==================================\n');
    const simulator = new SurvivalSimulator();
    const comparison = simulator.compareScenarios({
        initialBalance: 1000,
        dailyIncome: 50,
        dailyExpenses: 30,
        days: 30,
    });
    console.log('Scenario Results (Final Balance):');
    console.log(`  Best Case:  $${comparison.scenarios['best-case'].summary.finalBalance.toFixed(2)}`);
    console.log(`  Average:    $${comparison.scenarios['average-case'].summary.finalBalance.toFixed(2)}`);
    console.log(`  Worst Case: $${comparison.scenarios['worst-case'].summary.finalBalance.toFixed(2)}`);
    console.log();
    console.log(`Recommended Approach: ${comparison.recommendation}`);
    console.log(`Probability of Success: ${(comparison.riskAnalysis.probabilityOfSuccess * 100).toFixed(1)}%`);
}
// Example 5: Monte Carlo Analysis
async function example5_MonteCarlo() {
    console.log('\n🎰 Example 5: Monte Carlo Analysis');
    console.log('====================================\n');
    const simulator = new SurvivalSimulator();
    const params = {
        initialBalance: 1000,
        dailyIncome: 50,
        dailyExpenses: 30,
        taskSuccessRate: 0.8,
        avgTaskReward: 25,
        days: 30,
        volatility: 0.3,
    };
    console.log('Running 100 Monte Carlo simulations...\n');
    const monteCarlo = simulator.monteCarlo(params, 100);
    console.log('Aggregate Results:');
    console.log(`  Mean Final Balance: $${monteCarlo.aggregate.meanFinalBalance.toFixed(2)}`);
    console.log(`  Median Final Balance: $${monteCarlo.aggregate.medianFinalBalance.toFixed(2)}`);
    console.log(`  Standard Deviation: $${monteCarlo.aggregate.stdDev.toFixed(2)}`);
    console.log(`  Bankruptcy Rate: ${(monteCarlo.aggregate.bankruptcyRate * 100).toFixed(1)}%`);
    console.log(`  95% Confidence Interval: $${monteCarlo.aggregate.confidenceInterval[0].toFixed(2)} - $${monteCarlo.aggregate.confidenceInterval[1].toFixed(2)}`);
}
// Example 6: Global Instance Usage
async function example6_GlobalInstances() {
    console.log('\n🌍 Example 6: Global Instance Usage');
    console.log('====================================\n');
    // Use global predictor
    const predictor = getGlobalPredictor();
    const history = generateMockHistory(7);
    predictor.addHistory(history);
    const prediction = predictor.predictTrend(3);
    console.log(`Global Predictor - 3-day forecast: ${prediction.predictedScore.value.toFixed(1)}`);
    // Use global simulator
    const simulator = getGlobalSimulator();
    const result = simulator.simulate({
        initialBalance: 500,
        dailyIncome: 30,
        dailyExpenses: 20,
        taskSuccessRate: 0.75,
        avgTaskReward: 20,
        days: 14,
        volatility: 0.25,
    });
    console.log(`Global Simulator - 14-day projection: $${result.summary.finalBalance.toFixed(2)}`);
}
// Run all examples
async function runAllExamples() {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║        Echo Survival Prediction Examples                 ║');
    console.log('║        Demonstrating Forecasting & Simulation           ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    try {
        await example1_BasicPrediction();
        await example2_EconomicForecast();
        await example3_ScenarioSimulation();
        await example4_ScenarioComparison();
        await example5_MonteCarlo();
        await example6_GlobalInstances();
        console.log('\n');
        console.log('✅ All examples completed successfully!');
        console.log('\nNext steps:');
        console.log('  1. Integrate predictions into your agent dashboard');
        console.log('  2. Set up automated alerts based on predictions');
        console.log('  3. Use simulations for strategic planning');
        console.log('  4. Run Monte Carlo analysis for risk assessment');
        console.log('');
    }
    catch (error) {
        console.error('❌ Error running examples:', error);
    }
}
// Run if executed directly
if (require.main === module) {
    runAllExamples();
}
export { generateMockHistory, example1_BasicPrediction, example2_EconomicForecast, example3_ScenarioSimulation, example4_ScenarioComparison, example5_MonteCarlo, example6_GlobalInstances, runAllExamples, };
//# sourceMappingURL=survival-predictor-example.js.map