/**
 * Survival Simulation Module for Agora
 *
 * Provides "what-if" scenario analysis and Monte Carlo simulations
 * for agent survival under different conditions.
 *
 * @module survival-simulation
 */
/**
 * Survival Simulator class
 */
export class SurvivalSimulator {
    rng;
    constructor(seed) {
        // Simple seeded RNG (Mulberry32)
        let state = seed || Date.now();
        this.rng = () => {
            state = (state + 0x6D2B79F5) | 0;
            let t = Math.imul(state ^ (state >>> 15), 1 | state);
            t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    /**
     * Set random seed for reproducibility
     */
    setSeed(seed) {
        let state = seed;
        this.rng = () => {
            state = (state + 0x6D2B79F5) | 0;
            let t = Math.imul(state ^ (state >>> 15), 1 | state);
            t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    /**
     * Run a single scenario simulation
     */
    simulate(params) {
        const dailyResults = [];
        let balance = params.initialBalance;
        let totalIncome = 0;
        let totalExpenses = 0;
        let minBalance = balance;
        let maxBalance = balance;
        let bankruptcyDay = null;
        let tasksCompleted = 0;
        let tasksFailed = 0;
        const criticalPeriods = [];
        let criticalStart = null;
        for (let day = 1; day <= params.days; day++) {
            const dayEvents = [];
            // Base income with volatility
            let dayIncome = params.dailyIncome;
            if (params.volatility > 0) {
                const volatilityFactor = 1 + (this.rng() - 0.5) * 2 * params.volatility;
                dayIncome *= volatilityFactor;
            }
            // Task outcomes
            const dailyTasks = Math.floor(this.rng() * 3) + 1; // 1-3 tasks per day
            for (let t = 0; t < dailyTasks; t++) {
                if (this.rng() < params.taskSuccessRate) {
                    const reward = params.avgTaskReward * (0.8 + this.rng() * 0.4);
                    dayIncome += reward;
                    tasksCompleted++;
                    dayEvents.push({
                        type: 'task-completed',
                        description: `Task completed (+$${reward.toFixed(2)})`,
                        impact: reward,
                        day,
                    });
                }
                else {
                    tasksFailed++;
                    dayEvents.push({
                        type: 'task-failed',
                        description: 'Task failed',
                        impact: 0,
                        day,
                    });
                }
            }
            // Random market events
            if (this.rng() < 0.05 * params.volatility) {
                const boomMultiplier = 1 + this.rng() * 0.5;
                dayIncome *= boomMultiplier;
                dayEvents.push({
                    type: 'market-boom',
                    description: `Market boom! (+${((boomMultiplier - 1) * 100).toFixed(0)}%)`,
                    impact: dayIncome * (boomMultiplier - 1),
                    day,
                });
            }
            if (this.rng() < 0.03 * params.volatility) {
                const crashMultiplier = 0.7 + this.rng() * 0.2;
                dayIncome *= crashMultiplier;
                dayEvents.push({
                    type: 'market-crash',
                    description: `Market crash! (-${((1 - crashMultiplier) * 100).toFixed(0)}%)`,
                    impact: -dayIncome * (1 - crashMultiplier),
                    day,
                });
            }
            // Expenses
            let dayExpenses = params.dailyExpenses;
            if (this.rng() < 0.1) {
                const spike = params.dailyExpenses * (0.5 + this.rng());
                dayExpenses += spike;
                dayEvents.push({
                    type: 'expense-spike',
                    description: `Unexpected expense (-$${spike.toFixed(2)})`,
                    impact: -spike,
                    day,
                });
            }
            // Update balance
            balance += dayIncome - dayExpenses;
            totalIncome += dayIncome;
            totalExpenses += dayExpenses;
            minBalance = Math.min(minBalance, balance);
            maxBalance = Math.max(maxBalance, balance);
            // Calculate survival score
            const survivalScore = this.calculateSurvivalScore(balance, params.dailyExpenses, params.initialBalance);
            // Track critical periods
            if (survivalScore < 30) {
                if (criticalStart === null) {
                    criticalStart = day;
                }
            }
            else if (criticalStart !== null) {
                criticalPeriods.push({ start: criticalStart, end: day });
                criticalStart = null;
            }
            // Check bankruptcy
            if (balance <= 0 && bankruptcyDay === null) {
                bankruptcyDay = day;
            }
            dailyResults.push({
                day,
                balance: Math.max(0, balance),
                income: dayIncome,
                expenses: dayExpenses,
                tasksCompleted,
                tasksFailed,
                survivalScore,
                events: dayEvents,
            });
        }
        // Close any open critical period
        if (criticalStart !== null) {
            criticalPeriods.push({ start: criticalStart, end: params.days });
        }
        // Calculate summary
        const avgSurvivalScore = dailyResults.reduce((sum, d) => sum + d.survivalScore, 0) / dailyResults.length;
        const finalResult = dailyResults[dailyResults.length - 1];
        // Risk assessment
        const bankruptcyProbability = bankruptcyDay !== null ? 1 : Math.max(0, 1 - (minBalance / params.initialBalance));
        const recommendedActions = [];
        if (bankruptcyProbability > 0.5) {
            recommendedActions.push('Reduce daily expenses immediately');
            recommendedActions.push('Increase task completion rate');
            recommendedActions.push('Seek emergency funding');
        }
        else if (minBalance < params.initialBalance * 0.3) {
            recommendedActions.push('Monitor cash flow closely');
            recommendedActions.push('Build up reserves');
        }
        if (tasksFailed > tasksCompleted) {
            recommendedActions.push('Focus on task quality over quantity');
        }
        return {
            scenario: 'custom',
            params,
            dailyResults,
            summary: {
                finalBalance: Math.max(0, balance),
                totalIncome,
                totalExpenses,
                minBalance,
                maxBalance,
                daysSurvived: bankruptcyDay || params.days,
                bankruptcyDay,
                avgSurvivalScore,
                finalSurvivalScore: finalResult.survivalScore,
            },
            riskAssessment: {
                bankruptcyProbability,
                criticalPeriods,
                recommendedActions,
            },
        };
    }
    /**
     * Run multiple scenarios and compare
     */
    compareScenarios(baseParams) {
        const defaults = {
            initialBalance: 1000,
            dailyIncome: 50,
            dailyExpenses: 30,
            taskSuccessRate: 0.8,
            avgTaskReward: 25,
            days: 30,
            volatility: 0.2,
        };
        const params = { ...defaults, ...baseParams };
        // Best case: high income, low expenses, high success rate
        const bestCase = this.simulate({
            ...params,
            dailyIncome: params.dailyIncome * 1.5,
            dailyExpenses: params.dailyExpenses * 0.7,
            taskSuccessRate: Math.min(1, params.taskSuccessRate * 1.2),
            volatility: params.volatility * 0.5,
        });
        bestCase.scenario = 'best-case';
        // Worst case: low income, high expenses, low success rate
        const worstCase = this.simulate({
            ...params,
            dailyIncome: params.dailyIncome * 0.5,
            dailyExpenses: params.dailyExpenses * 1.5,
            taskSuccessRate: params.taskSuccessRate * 0.6,
            volatility: params.volatility * 2,
        });
        worstCase.scenario = 'worst-case';
        // Average case: base params
        const averageCase = this.simulate(params);
        averageCase.scenario = 'average-case';
        // Determine recommendation
        let recommendation = 'average-case';
        if (bestCase.riskAssessment.bankruptcyProbability < 0.1) {
            recommendation = 'best-case';
        }
        else if (worstCase.riskAssessment.bankruptcyProbability > 0.7) {
            recommendation = 'worst-case';
        }
        return {
            scenarios: {
                'best-case': bestCase,
                'worst-case': worstCase,
                'average-case': averageCase,
                'custom': averageCase, // Custom uses average case as placeholder
            },
            recommendation,
            riskAnalysis: {
                bestCaseOutcome: bestCase.summary.finalBalance,
                worstCaseOutcome: worstCase.summary.finalBalance,
                expectedOutcome: averageCase.summary.finalBalance,
                probabilityOfSuccess: 1 - averageCase.riskAssessment.bankruptcyProbability,
            },
        };
    }
    /**
     * Run Monte Carlo simulation
     */
    monteCarlo(params, iterations = 100) {
        const results = [];
        const baseSeed = params.seed || Date.now();
        for (let i = 0; i < iterations; i++) {
            this.setSeed(baseSeed + i);
            results.push(this.simulate(params));
        }
        const finalBalances = results.map(r => r.summary.finalBalance);
        const bankruptcies = results.filter(r => r.summary.bankruptcyDay !== null).length;
        const mean = finalBalances.reduce((a, b) => a + b, 0) / iterations;
        const sorted = [...finalBalances].sort((a, b) => a - b);
        const median = sorted[Math.floor(iterations / 2)];
        const variance = finalBalances.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / iterations;
        const stdDev = Math.sqrt(variance);
        // 95% confidence interval
        const confidenceInterval = [
            mean - 1.96 * stdDev,
            mean + 1.96 * stdDev,
        ];
        return {
            results,
            aggregate: {
                meanFinalBalance: mean,
                medianFinalBalance: median,
                stdDev,
                bankruptcyRate: bankruptcies / iterations,
                confidenceInterval,
            },
        };
    }
    /**
     * Calculate survival score based on current state
     */
    calculateSurvivalScore(balance, dailyExpenses, initialBalance) {
        if (balance <= 0)
            return 0;
        // Base score from runway
        const runwayDays = dailyExpenses > 0 ? balance / dailyExpenses : 999;
        let score = Math.min(100, runwayDays * 3); // 33 days = 100 score
        // Adjust based on balance ratio
        const balanceRatio = balance / initialBalance;
        if (balanceRatio > 1.5)
            score += 10;
        else if (balanceRatio < 0.5)
            score -= 20;
        return Math.max(0, Math.min(100, score));
    }
}
/**
 * Create simulator from current survival snapshot
 */
export function createSimulatorFromSnapshot(snapshot, health, days = 30) {
    const simulator = new SurvivalSimulator();
    return simulator;
}
/**
 * Quick simulation from snapshot
 */
export function simulateFromSnapshot(snapshot, days = 30, volatility = 0.2) {
    const balance = parseFloat(snapshot.economics.balance);
    const dailyExpenses = balance / Math.max(1, snapshot.economics.runwayDays);
    const simulator = new SurvivalSimulator();
    return simulator.simulate({
        initialBalance: balance,
        dailyIncome: dailyExpenses * 1.2, // Assume 20% profit margin
        dailyExpenses,
        taskSuccessRate: 0.8,
        avgTaskReward: 25,
        days,
        volatility,
    });
}
/**
 * Singleton simulator instance
 */
let globalSimulator = null;
/**
 * Get or create global simulator
 */
export function getGlobalSimulator() {
    if (!globalSimulator) {
        globalSimulator = new SurvivalSimulator();
    }
    return globalSimulator;
}
export default SurvivalSimulator;
//# sourceMappingURL=survival-simulation.js.map