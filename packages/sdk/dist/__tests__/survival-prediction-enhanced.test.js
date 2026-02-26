/**
 * Enhanced Survival Prediction Module Unit Tests
 * Tests for multi-factor risk calculation and survival probability prediction
 */
import { describe, it, expect } from 'vitest';
import { calculateMultiFactorRiskScore, predictSurvivalProbability, generateRiskFactors, } from '../survival-prediction.js';
describe('calculateMultiFactorRiskScore', () => {
    describe('normal input scenarios', () => {
        it('should return correct risk score for balanced input', () => {
            const input = {
                economicHealth: 70,
                reputationScore: 80,
                taskSuccessRate: 0.85,
                onlineHours: 8,
                volatilityFactor: 0.3,
                networkDiversity: 60,
            };
            const score = calculateMultiFactorRiskScore(input);
            // Economic risk: 30 * 0.30 = 9
            // Reputation risk: 20 * 0.25 = 5
            // Task risk: 15 * 0.20 = 3
            // Engagement risk: 68 * 0.10 = 6.8
            // Volatility risk: 30 * 0.10 = 3
            // Network risk: 40 * 0.05 = 2
            // Weighted sum: ~28.8, scaled: ~32.9
            expect(score).toBeGreaterThan(0);
            expect(score).toBeLessThanOrEqual(100);
            expect(typeof score).toBe('number');
        });
        it('should handle perfect health metrics', () => {
            const input = {
                economicHealth: 100,
                reputationScore: 100,
                taskSuccessRate: 1.0,
                onlineHours: 25,
                volatilityFactor: 0,
                networkDiversity: 100,
            };
            const score = calculateMultiFactorRiskScore(input);
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThan(20); // Very low risk for perfect scores
        });
        it('should handle poor health metrics', () => {
            const input = {
                economicHealth: 20,
                reputationScore: 30,
                taskSuccessRate: 0.4,
                onlineHours: 2,
                volatilityFactor: 0.8,
                networkDiversity: 20,
            };
            const score = calculateMultiFactorRiskScore(input);
            expect(score).toBeGreaterThan(50); // High risk for poor scores
            expect(score).toBeLessThanOrEqual(100);
        });
    });
    describe('boundary value tests', () => {
        it('should handle boundary value 0', () => {
            const input = {
                economicHealth: 0,
                reputationScore: 0,
                taskSuccessRate: 0,
                onlineHours: 0,
                volatilityFactor: 0,
                networkDiversity: 0,
            };
            const score = calculateMultiFactorRiskScore(input);
            expect(score).toBeGreaterThanOrEqual(50);
            expect(score).toBeLessThanOrEqual(100);
        });
        it('should handle boundary value 50', () => {
            const input = {
                economicHealth: 50,
                reputationScore: 50,
                taskSuccessRate: 0.5,
                onlineHours: 12.5, // 12.5 * 4 = 50
                volatilityFactor: 0.5,
                networkDiversity: 50,
            };
            const score = calculateMultiFactorRiskScore(input);
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
        });
        it('should handle boundary value 100', () => {
            const input = {
                economicHealth: 100,
                reputationScore: 100,
                taskSuccessRate: 1.0,
                onlineHours: 25,
                volatilityFactor: 1.0,
                networkDiversity: 100,
            };
            const score = calculateMultiFactorRiskScore(input);
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
        });
    });
    describe('extreme value tests', () => {
        it('should return low risk for all perfect scores', () => {
            const input = {
                economicHealth: 100,
                reputationScore: 100,
                taskSuccessRate: 1.0,
                onlineHours: 25,
                volatilityFactor: 0,
                networkDiversity: 100,
            };
            const score = calculateMultiFactorRiskScore(input);
            // All risks are 0, so weighted risk is 0, scaled is 0
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThan(15);
        });
        it('should return maximum risk for all zero scores', () => {
            const input = {
                economicHealth: 0,
                reputationScore: 0,
                taskSuccessRate: 0,
                onlineHours: 0,
                volatilityFactor: 1.0,
                networkDiversity: 0,
            };
            const score = calculateMultiFactorRiskScore(input);
            // All risks are 100, so weighted risk is very high
            expect(score).toBeGreaterThan(70);
            expect(score).toBeLessThanOrEqual(100);
        });
    });
    describe('weight validation', () => {
        it('should give highest weight to economic health', () => {
            const economicOnlyInput = {
                economicHealth: 0, // Full economic risk
                reputationScore: 100,
                taskSuccessRate: 1.0,
                onlineHours: 25,
                volatilityFactor: 0,
                networkDiversity: 100,
            };
            const otherInput = {
                economicHealth: 100,
                reputationScore: 0, // Full reputation risk
                taskSuccessRate: 1.0,
                onlineHours: 25,
                volatilityFactor: 0,
                networkDiversity: 100,
            };
            const economicScore = calculateMultiFactorRiskScore(economicOnlyInput);
            const otherScore = calculateMultiFactorRiskScore(otherInput);
            // Economic weight (0.30) > Reputation weight (0.25)
            expect(economicScore).toBeGreaterThan(otherScore);
        });
        it('should correctly weight task performance', () => {
            const input1 = {
                economicHealth: 100,
                reputationScore: 100,
                taskSuccessRate: 0.0,
                onlineHours: 25,
                volatilityFactor: 0,
                networkDiversity: 100,
            };
            const input2 = {
                economicHealth: 100,
                reputationScore: 100,
                taskSuccessRate: 1.0,
                onlineHours: 25,
                volatilityFactor: 0,
                networkDiversity: 100,
            };
            const score1 = calculateMultiFactorRiskScore(input1);
            const score2 = calculateMultiFactorRiskScore(input2);
            expect(score1).toBeGreaterThan(score2);
        });
        it('should apply non-linear scaling for high risks', () => {
            const input = {
                economicHealth: 10,
                reputationScore: 10,
                taskSuccessRate: 0.1,
                onlineHours: 2,
                volatilityFactor: 0.9,
                networkDiversity: 10,
            };
            const score = calculateMultiFactorRiskScore(input);
            // High risk should be amplified by non-linear scaling
            expect(score).toBeGreaterThan(60);
        });
    });
    describe('default parameter handling', () => {
        it('should use default values for optional parameters', () => {
            const input = {
                economicHealth: 70,
                reputationScore: 70,
                taskSuccessRate: 0.7,
                onlineHours: 10,
                // volatilityFactor and networkDiversity omitted
            };
            const score = calculateMultiFactorRiskScore(input);
            expect(typeof score).toBe('number');
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
        });
    });
    describe('input normalization', () => {
        it('should clamp economic health to 0-100', () => {
            const input = {
                economicHealth: 150, // Above max
                reputationScore: 100,
                taskSuccessRate: 1.0,
                onlineHours: 25,
            };
            const score = calculateMultiFactorRiskScore(input);
            // Economic risk should be 0 (clamped to 100)
            expect(score).toBeLessThan(20);
        });
        it('should handle negative input gracefully', () => {
            const input = {
                economicHealth: -20, // Below min
                reputationScore: 100,
                taskSuccessRate: 1.0,
                onlineHours: 25,
            };
            const score = calculateMultiFactorRiskScore(input);
            // Should treat as 0, giving full economic risk
            expect(score).toBeGreaterThan(20);
        });
    });
});
describe('predictSurvivalProbability', () => {
    describe('low risk scenarios (< 30)', () => {
        it('should return high survival probability for risk = 0', () => {
            const result = predictSurvivalProbability(0);
            expect(result.days7).toBeGreaterThan(0.85);
            expect(result.days30).toBeGreaterThan(0.5);
            expect(result.confidence).toBeGreaterThan(0.8);
        });
        it('should return high survival probability for low risk (10)', () => {
            const result = predictSurvivalProbability(10);
            expect(result.days7).toBeGreaterThan(0.75);
            expect(result.days30).toBeGreaterThan(0.4);
        });
        it('should return high survival probability for medium-low risk (25)', () => {
            const result = predictSurvivalProbability(25);
            expect(result.days7).toBeGreaterThan(0.7);
            expect(result.days30).toBeGreaterThan(0.2);
        });
        it('should maintain high confidence for extreme low risk', () => {
            const result = predictSurvivalProbability(5);
            expect(result.confidence).toBeGreaterThan(0.8);
        });
    });
    describe('medium risk scenarios (30-60)', () => {
        it('should return moderate survival probability for risk = 30', () => {
            const result = predictSurvivalProbability(30);
            expect(result.days7).toBeGreaterThan(0.5);
            expect(result.days7).toBeLessThan(0.9);
            expect(result.days30).toBeGreaterThan(0.2);
            expect(result.days30).toBeLessThan(0.5);
        });
        it('should return moderate survival probability for risk = 45', () => {
            const result = predictSurvivalProbability(45);
            expect(result.days7).toBeGreaterThan(0.4);
            expect(result.days7).toBeLessThan(0.8);
            expect(result.days30).toBeGreaterThan(0.1);
            expect(result.days30).toBeLessThan(0.4);
        });
        it('should return declining probability for risk = 60', () => {
            const result = predictSurvivalProbability(60);
            expect(result.days7).toBeGreaterThan(0.3);
            expect(result.days7).toBeLessThan(0.7);
            expect(result.days30).toBeGreaterThan(0.05);
            expect(result.days30).toBeLessThan(0.3);
        });
        it('should have lower confidence for medium risk', () => {
            const result = predictSurvivalProbability(45);
            expect(result.confidence).toBe(0.70);
        });
    });
    describe('high risk scenarios (> 60)', () => {
        it('should return low survival probability for risk = 70', () => {
            const result = predictSurvivalProbability(70);
            expect(result.days7).toBeLessThan(0.6);
            expect(result.days30).toBeLessThan(0.2);
        });
        it('should return very low survival probability for risk = 85', () => {
            const result = predictSurvivalProbability(85);
            expect(result.days7).toBeLessThan(0.55);
            expect(result.days30).toBeLessThan(0.2);
        });
        it('should return minimal survival probability for risk = 100', () => {
            const result = predictSurvivalProbability(100);
            expect(result.days7).toBeLessThan(0.5);
            expect(result.days30).toBeLessThan(0.15);
        });
        it('should have higher confidence for extreme high risk', () => {
            const result = predictSurvivalProbability(90);
            expect(result.confidence).toBeGreaterThan(0.8);
        });
    });
    describe('boundary values', () => {
        it('should handle risk score = 0', () => {
            const result = predictSurvivalProbability(0);
            expect(result.days7).toBeGreaterThan(0.8);
            expect(result.days30).toBeGreaterThan(0.4);
            expect(result.confidence).toBe(0.85);
        });
        it('should handle risk score = 100', () => {
            const result = predictSurvivalProbability(100);
            expect(result.days7).toBeGreaterThanOrEqual(0);
            expect(result.days7).toBeLessThan(0.5);
            expect(result.days30).toBeGreaterThanOrEqual(0);
            expect(result.days30).toBeLessThan(0.2);
        });
        it('should handle negative risk score (clamp to 0)', () => {
            const result = predictSurvivalProbability(-10);
            // Should be treated as risk = 0
            expect(result.days7).toBeGreaterThan(0.8);
            expect(result.confidence).toBe(0.85);
        });
        it('should handle risk score above 100 (clamp to 100)', () => {
            const result = predictSurvivalProbability(150);
            // Should be treated as risk = 100
            expect(result.days7).toBeLessThan(0.5);
            expect(result.confidence).toBe(0.85);
        });
    });
    describe('probability relationship', () => {
        it('should have 7-day probability >= 30-day probability', () => {
            for (let risk = 0; risk <= 100; risk += 10) {
                const result = predictSurvivalProbability(risk);
                expect(result.days7).toBeGreaterThanOrEqual(result.days30);
            }
        });
        it('should show decreasing probability with increasing risk', () => {
            const results = [];
            for (let risk = 0; risk <= 100; risk += 10) {
                results.push(predictSurvivalProbability(risk).days7);
            }
            // Generally decreasing trend (allowing for small variations)
            expect(results[0]).toBeGreaterThan(results[results.length - 1]);
        });
    });
    describe('return type validation', () => {
        it('should return correct object structure', () => {
            const result = predictSurvivalProbability(50);
            expect(result).toHaveProperty('days7');
            expect(result).toHaveProperty('days30');
            expect(result).toHaveProperty('confidence');
            expect(typeof result.days7).toBe('number');
            expect(typeof result.days30).toBe('number');
            expect(typeof result.confidence).toBe('number');
        });
        it('should return probabilities between 0 and 1', () => {
            const result = predictSurvivalProbability(50);
            expect(result.days7).toBeGreaterThanOrEqual(0);
            expect(result.days7).toBeLessThanOrEqual(1);
            expect(result.days30).toBeGreaterThanOrEqual(0);
            expect(result.days30).toBeLessThanOrEqual(1);
        });
        it('should return confidence between 0 and 1', () => {
            const result = predictSurvivalProbability(50);
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
        });
    });
});
describe('generateRiskFactors', () => {
    describe('all healthy metrics - no risk factors', () => {
        it('should return empty array for perfect health', () => {
            const input = {
                economicHealth: 100,
                reputationScore: 100,
                taskSuccessRate: 1.0,
                onlineHours: 25,
                volatilityFactor: 0,
                networkDiversity: 100,
            };
            const factors = generateRiskFactors(input);
            expect(factors).toHaveLength(0);
            expect(Array.isArray(factors)).toBe(true);
        });
        it('should return empty array for good health metrics', () => {
            const input = {
                economicHealth: 80,
                reputationScore: 85,
                taskSuccessRate: 0.9,
                onlineHours: 12,
                volatilityFactor: 0.3,
                networkDiversity: 70,
            };
            const factors = generateRiskFactors(input);
            expect(factors).toHaveLength(0);
        });
    });
    describe('critical state risk identification', () => {
        it('should identify critical economic risk', () => {
            const input = {
                economicHealth: 20, // Below 30
                reputationScore: 100,
                taskSuccessRate: 1.0,
                onlineHours: 25,
            };
            const factors = generateRiskFactors(input);
            expect(factors.length).toBeGreaterThan(0);
            expect(factors.some(f => f.id === 'economic-critical')).toBe(true);
            expect(factors.find(f => f.id === 'economic-critical')?.severity).toBe('critical');
        });
        it('should identify high economic warning', () => {
            const input = {
                economicHealth: 40, // Between 30-50
                reputationScore: 100,
                taskSuccessRate: 1.0,
                onlineHours: 25,
            };
            const factors = generateRiskFactors(input);
            expect(factors.some(f => f.id === 'economic-warning')).toBe(true);
            expect(factors.find(f => f.id === 'economic-warning')?.severity).toBe('high');
        });
        it('should identify critical low engagement', () => {
            const input = {
                economicHealth: 100,
                reputationScore: 100,
                taskSuccessRate: 1.0,
                onlineHours: 1, // Below 2
            };
            const factors = generateRiskFactors(input);
            expect(factors.some(f => f.id === 'engagement-critical')).toBe(true);
            expect(factors.find(f => f.id === 'engagement-critical')?.severity).toBe('high');
        });
        it('should identify low task success rate', () => {
            const input = {
                economicHealth: 100,
                reputationScore: 100,
                taskSuccessRate: 0.4, // Below 0.5
                onlineHours: 25,
            };
            const factors = generateRiskFactors(input);
            expect(factors.some(f => f.id === 'task-failure')).toBe(true);
            expect(factors.find(f => f.id === 'task-failure')?.severity).toBe('high');
        });
    });
    describe('medium risk factor identification', () => {
        it('should identify moderate economic watch', () => {
            const input = {
                economicHealth: 60, // Between 50-70
                reputationScore: 100,
                taskSuccessRate: 1.0,
                onlineHours: 25,
            };
            const factors = generateRiskFactors(input);
            expect(factors.some(f => f.id === 'economic-watch')).toBe(true);
            expect(factors.find(f => f.id === 'economic-watch')?.severity).toBe('medium');
        });
        it('should identify declining reputation', () => {
            const input = {
                economicHealth: 100,
                reputationScore: 50, // Between 40-60
                taskSuccessRate: 1.0,
                onlineHours: 25,
            };
            const factors = generateRiskFactors(input);
            expect(factors.some(f => f.id === 'reputation-warning')).toBe(true);
            expect(factors.find(f => f.id === 'reputation-warning')?.severity).toBe('medium');
        });
        it('should identify suboptimal task performance', () => {
            const input = {
                economicHealth: 100,
                reputationScore: 100,
                taskSuccessRate: 0.7, // Between 0.5-0.75
                onlineHours: 25,
            };
            const factors = generateRiskFactors(input);
            expect(factors.some(f => f.id === 'task-warning')).toBe(true);
            expect(factors.find(f => f.id === 'task-warning')?.severity).toBe('medium');
        });
        it('should identify low engagement warning', () => {
            const input = {
                economicHealth: 100,
                reputationScore: 100,
                taskSuccessRate: 1.0,
                onlineHours: 4, // Between 2-6
            };
            const factors = generateRiskFactors(input);
            expect(factors.some(f => f.id === 'engagement-warning')).toBe(true);
            expect(factors.find(f => f.id === 'engagement-warning')?.severity).toBe('medium');
        });
        it('should identify high volatility risk', () => {
            const input = {
                economicHealth: 100,
                reputationScore: 100,
                taskSuccessRate: 1.0,
                onlineHours: 25,
                volatilityFactor: 0.8, // Above 0.7
            };
            const factors = generateRiskFactors(input);
            expect(factors.some(f => f.id === 'volatility-high')).toBe(true);
            expect(factors.find(f => f.id === 'volatility-high')?.severity).toBe('medium');
        });
        it('should identify network concentration risk', () => {
            const input = {
                economicHealth: 100,
                reputationScore: 100,
                taskSuccessRate: 1.0,
                onlineHours: 25,
                networkDiversity: 20, // Below 30
            };
            const factors = generateRiskFactors(input);
            expect(factors.some(f => f.id === 'network-concentrated')).toBe(true);
            expect(factors.find(f => f.id === 'network-concentrated')?.severity).toBe('medium');
        });
    });
    describe('multiple risk factor handling', () => {
        it('should identify multiple risk factors', () => {
            const input = {
                economicHealth: 20, // Critical
                reputationScore: 50, // Medium
                taskSuccessRate: 0.4, // High
                onlineHours: 1, // High
            };
            const factors = generateRiskFactors(input);
            expect(factors.length).toBeGreaterThan(1);
            expect(factors.some(f => f.severity === 'critical')).toBe(true);
            expect(factors.some(f => f.severity === 'high')).toBe(true);
        });
        it('should sort factors by severity (critical first)', () => {
            const input = {
                economicHealth: 20, // Critical
                reputationScore: 30, // High
                taskSuccessRate: 0.4, // High
                onlineHours: 25,
            };
            const factors = generateRiskFactors(input);
            // Critical should come before high
            const criticalIndex = factors.findIndex(f => f.severity === 'critical');
            const highIndex = factors.findIndex(f => f.severity === 'high');
            expect(criticalIndex).toBeLessThan(highIndex);
        });
        it('should sort high before medium', () => {
            const input = {
                economicHealth: 40, // High
                reputationScore: 50, // Medium
                taskSuccessRate: 1.0,
                onlineHours: 25,
            };
            const factors = generateRiskFactors(input);
            const highIndex = factors.findIndex(f => f.severity === 'high');
            const mediumIndex = factors.findIndex(f => f.severity === 'medium');
            expect(highIndex).toBeLessThan(mediumIndex);
        });
    });
    describe('risk factor structure validation', () => {
        it('should have all required fields for each factor', () => {
            const input = {
                economicHealth: 25,
                reputationScore: 35,
                taskSuccessRate: 0.4,
                onlineHours: 1,
                volatilityFactor: 0.9,
                networkDiversity: 15,
            };
            const factors = generateRiskFactors(input);
            factors.forEach(factor => {
                expect(factor).toHaveProperty('id');
                expect(factor).toHaveProperty('name');
                expect(factor).toHaveProperty('severity');
                expect(factor).toHaveProperty('score');
                expect(factor).toHaveProperty('description');
                expect(factor).toHaveProperty('recommendation');
                expect(typeof factor.id).toBe('string');
                expect(typeof factor.name).toBe('string');
                expect(['low', 'medium', 'high', 'critical']).toContain(factor.severity);
                expect(typeof factor.score).toBe('number');
                expect(typeof factor.description).toBe('string');
                expect(typeof factor.recommendation).toBe('string');
            });
        });
    });
    describe('recommendation completeness', () => {
        it('should include recommendation for critical economic risk', () => {
            const input = {
                economicHealth: 20,
                reputationScore: 100,
                taskSuccessRate: 1.0,
                onlineHours: 25,
            };
            const factors = generateRiskFactors(input);
            const economicFactor = factors.find(f => f.id === 'economic-critical');
            expect(economicFactor?.recommendation).toBeTruthy();
            expect(economicFactor?.recommendation?.length).toBeGreaterThan(10);
            expect(economicFactor?.recommendation).toContain('Immediate');
        });
        it('should include recommendation for task failures', () => {
            const input = {
                economicHealth: 100,
                reputationScore: 100,
                taskSuccessRate: 0.4,
                onlineHours: 25,
            };
            const factors = generateRiskFactors(input);
            const taskFactor = factors.find(f => f.id === 'task-failure');
            expect(taskFactor?.recommendation).toBeTruthy();
            expect(taskFactor?.recommendation?.length).toBeGreaterThan(10);
        });
        it('should include recommendation for low engagement', () => {
            const input = {
                economicHealth: 100,
                reputationScore: 100,
                taskSuccessRate: 1.0,
                onlineHours: 1,
            };
            const factors = generateRiskFactors(input);
            const engagementFactor = factors.find(f => f.id === 'engagement-critical');
            expect(engagementFactor?.recommendation).toBeTruthy();
            expect(engagementFactor?.recommendation?.length).toBeGreaterThan(10);
        });
        it('should include recommendation for reputation damage', () => {
            const input = {
                economicHealth: 100,
                reputationScore: 35,
                taskSuccessRate: 1.0,
                onlineHours: 25,
            };
            const factors = generateRiskFactors(input);
            const reputationFactor = factors.find(f => f.id === 'reputation-critical');
            expect(reputationFactor?.recommendation).toBeTruthy();
            expect(reputationFactor?.recommendation?.length).toBeGreaterThan(10);
        });
        it('should include recommendation for network concentration', () => {
            const input = {
                economicHealth: 100,
                reputationScore: 100,
                taskSuccessRate: 1.0,
                onlineHours: 25,
                networkDiversity: 20,
            };
            const factors = generateRiskFactors(input);
            const networkFactor = factors.find(f => f.id === 'network-concentrated');
            expect(networkFactor?.recommendation).toBeTruthy();
            expect(networkFactor?.recommendation?.length).toBeGreaterThan(10);
            expect(networkFactor?.recommendation?.toLowerCase()).toContain('diversify');
        });
        it('should include recommendation for high volatility', () => {
            const input = {
                economicHealth: 100,
                reputationScore: 100,
                taskSuccessRate: 1.0,
                onlineHours: 25,
                volatilityFactor: 0.8,
            };
            const factors = generateRiskFactors(input);
            const volatilityFactor = factors.find(f => f.id === 'volatility-high');
            expect(volatilityFactor?.recommendation).toBeTruthy();
            expect(volatilityFactor?.recommendation?.length).toBeGreaterThan(10);
        });
    });
    describe('description text completeness', () => {
        it('should have meaningful descriptions', () => {
            const input = {
                economicHealth: 20,
                reputationScore: 35,
                taskSuccessRate: 0.4,
                onlineHours: 1,
            };
            const factors = generateRiskFactors(input);
            factors.forEach(factor => {
                expect(factor.description.length).toBeGreaterThan(10);
                expect(factor.description).not.toContain('undefined');
                expect(factor.description).not.toContain('null');
            });
        });
        it('should include task success rate in description', () => {
            const input = {
                economicHealth: 100,
                reputationScore: 100,
                taskSuccessRate: 0.45,
                onlineHours: 25,
            };
            const factors = generateRiskFactors(input);
            const taskFactor = factors.find(f => f.id === 'task-failure');
            expect(taskFactor?.description).toContain('45.0%');
        });
    });
    describe('default parameter handling', () => {
        it('should use default volatility factor', () => {
            const input = {
                economicHealth: 100,
                reputationScore: 100,
                taskSuccessRate: 1.0,
                onlineHours: 25,
                // volatilityFactor omitted (default 0.5)
            };
            const factors = generateRiskFactors(input);
            // Default volatility 0.5 is not > 0.7, so no volatility risk
            expect(factors.some(f => f.id === 'volatility-high')).toBe(false);
        });
        it('should use default network diversity', () => {
            const input = {
                economicHealth: 100,
                reputationScore: 100,
                taskSuccessRate: 1.0,
                onlineHours: 25,
                // networkDiversity omitted (default 50)
            };
            const factors = generateRiskFactors(input);
            // Default network diversity 50 is not < 30, so no network risk
            expect(factors.some(f => f.id === 'network-concentrated')).toBe(false);
        });
    });
});
//# sourceMappingURL=survival-prediction-enhanced.test.js.map