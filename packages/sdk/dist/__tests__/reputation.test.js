/**
 * @fileoverview Tests for the Reputation Oracle module
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { 
// Constants
DEFAULT_REPUTATION_CONFIG, 
// Tier functions
getReputationTier, getReputationTierColor, 
// Calculation functions
calculateDecay, calculateSignalValue, calculatePaymentReliability, calculateEndorsementValue, 
// Creation functions
createEmptyReputation, 
// Update functions
addSignal, addTaskRating, addEndorsement, addDispute, updatePaymentReliability, 
// Calculation functions
calculateReputationBreakdown, calculateReputation, recalculateReputation, 
// Manager
ReputationOracle, getOrCreateReputationOracle, getReputationOracle, resetReputationOracle, 
// Utility functions
formatReputation, generateReputationReport, } from '../reputation.js';
// Test constants
const TEST_ADDRESS = '0x742d35Cc6634C0532925a3b8D4e6D3b6e8d3e8D3';
const TEST_ADDRESS_2 = '0x1234567890123456789012345678901234567890';
describe('Reputation Tier Functions', () => {
    it('getReputationTier returns correct tier for scores', () => {
        expect(getReputationTier(95)).toBe('diamond');
        expect(getReputationTier(90)).toBe('diamond');
        expect(getReputationTier(89)).toBe('platinum');
        expect(getReputationTier(75)).toBe('platinum');
        expect(getReputationTier(74)).toBe('gold');
        expect(getReputationTier(60)).toBe('gold');
        expect(getReputationTier(59)).toBe('silver');
        expect(getReputationTier(40)).toBe('silver');
        expect(getReputationTier(39)).toBe('bronze');
        expect(getReputationTier(20)).toBe('bronze');
        expect(getReputationTier(19)).toBe('unrated');
        expect(getReputationTier(0)).toBe('unrated');
    });
    it('getReputationTierColor returns correct hex colors', () => {
        expect(getReputationTierColor('diamond')).toBe('#B9F2FF');
        expect(getReputationTierColor('platinum')).toBe('#E5E4E2');
        expect(getReputationTierColor('gold')).toBe('#FFD700');
        expect(getReputationTierColor('silver')).toBe('#C0C0C0');
        expect(getReputationTierColor('bronze')).toBe('#CD7F32');
        expect(getReputationTierColor('unrated')).toBe('#9CA3AF');
    });
});
describe('Decay Calculation', () => {
    it('calculateDecay returns 1 for fresh signals', () => {
        const now = Date.now();
        expect(calculateDecay(now, 90, now)).toBe(1);
    });
    it('calculateDecay returns 0.5 after half-life', () => {
        const halfLifeDays = 90;
        const halfLifeMs = halfLifeDays * 24 * 60 * 60 * 1000;
        const timestamp = Date.now() - halfLifeMs;
        const decay = calculateDecay(timestamp, halfLifeDays);
        expect(decay).toBeCloseTo(0.5, 2);
    });
    it('calculateDecay decreases over time', () => {
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        const decay1 = calculateDecay(now - dayMs, 90, now);
        const decay30 = calculateDecay(now - 30 * dayMs, 90, now);
        const decay90 = calculateDecay(now - 90 * dayMs, 90, now);
        expect(decay1).toBeGreaterThan(decay30);
        expect(decay30).toBeGreaterThan(decay90);
    });
});
describe('Signal Value Calculation', () => {
    it('calculates signal value with decay', () => {
        const now = Date.now();
        const signal = {
            type: 'task_completion',
            value: 1,
            weight: 1,
            timestamp: now,
            source: 'test',
            decayFactor: 1,
        };
        const value = calculateSignalValue(signal, DEFAULT_REPUTATION_CONFIG, now);
        const expectedWeight = DEFAULT_REPUTATION_CONFIG.signalWeights.task_completion;
        expect(value).toBeCloseTo(expectedWeight, 2);
    });
    it('applies decay to old signals', () => {
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        const signal = {
            type: 'task_completion',
            value: 1,
            weight: 1,
            timestamp: now - 90 * dayMs,
            source: 'test',
            decayFactor: 1,
        };
        const value = calculateSignalValue(signal, DEFAULT_REPUTATION_CONFIG, now);
        const baseWeight = DEFAULT_REPUTATION_CONFIG.signalWeights.task_completion;
        expect(value).toBeCloseTo(baseWeight * 0.5, 2);
    });
});
describe('Payment Reliability', () => {
    it('returns neutral baseline for no payments', () => {
        const record = {
            totalPayments: 0,
            onTimePayments: 0,
            latePayments: 0,
            failedPayments: 0,
            averageDelayHours: 0,
            reliabilityScore: 50,
        };
        expect(calculatePaymentReliability(record)).toBe(50);
    });
    it('calculates perfect reliability', () => {
        const record = {
            totalPayments: 10,
            onTimePayments: 10,
            latePayments: 0,
            failedPayments: 0,
            averageDelayHours: -2,
            reliabilityScore: 50,
        };
        expect(calculatePaymentReliability(record)).toBe(100);
    });
    it('applies penalties for failures', () => {
        const record = {
            totalPayments: 10,
            onTimePayments: 7,
            latePayments: 2,
            failedPayments: 1,
            averageDelayHours: 12,
            reliabilityScore: 50,
        };
        const score = calculatePaymentReliability(record);
        expect(score).toBeLessThan(70);
        expect(score).toBeGreaterThan(0);
    });
});
describe('Endorsement Value', () => {
    const now = Date.now();
    it('returns 0 for expired endorsements', () => {
        const endorsement = {
            endorserId: 'endorser1',
            endorserAddress: TEST_ADDRESS_2,
            endorserReputation: 80,
            strength: 'strong',
            weightedValue: 10,
            timestamp: now - 400 * 24 * 60 * 60 * 1000,
            expiresAt: now - 100 * 24 * 60 * 60 * 1000,
        };
        expect(calculateEndorsementValue(endorsement, DEFAULT_REPUTATION_CONFIG, now)).toBe(0);
    });
    it('returns 0 for low-reputation endorsers', () => {
        const endorsement = {
            endorserId: 'endorser1',
            endorserAddress: TEST_ADDRESS_2,
            endorserReputation: 30, // Below min threshold
            strength: 'strong',
            weightedValue: 10,
            timestamp: now,
        };
        expect(calculateEndorsementValue(endorsement, DEFAULT_REPUTATION_CONFIG, now)).toBe(0);
    });
    it('calculates value based on strength', () => {
        const baseEndorsement = {
            endorserId: 'endorser1',
            endorserAddress: TEST_ADDRESS_2,
            endorserReputation: 80,
            weightedValue: 10,
            timestamp: now,
        };
        const weak = calculateEndorsementValue({ ...baseEndorsement, strength: 'weak' }, DEFAULT_REPUTATION_CONFIG, now);
        const moderate = calculateEndorsementValue({ ...baseEndorsement, strength: 'moderate' }, DEFAULT_REPUTATION_CONFIG, now);
        const strong = calculateEndorsementValue({ ...baseEndorsement, strength: 'strong' }, DEFAULT_REPUTATION_CONFIG, now);
        expect(weak).toBeLessThan(moderate);
        expect(moderate).toBeLessThan(strong);
    });
});
describe('Reputation Creation', () => {
    it('creates empty reputation with defaults', () => {
        const reputation = createEmptyReputation('agent1', TEST_ADDRESS);
        expect(reputation.agentId).toBe('agent1');
        expect(reputation.address).toBe(TEST_ADDRESS);
        expect(reputation.score).toBe(50);
        expect(reputation.tier).toBe('unrated');
        expect(reputation.signals).toHaveLength(0);
        expect(reputation.endorsements).toHaveLength(0);
        expect(reputation.taskRatings).toHaveLength(0);
        expect(reputation.disputes).toHaveLength(0);
    });
});
describe('Signal Management', () => {
    let baseReputation;
    beforeEach(() => {
        baseReputation = createEmptyReputation('agent1', TEST_ADDRESS);
    });
    it('adds signal correctly', () => {
        const updated = addSignal(baseReputation, {
            type: 'task_completion',
            value: 0.5,
            weight: 1,
            source: 'test',
        });
        expect(updated.signals).toHaveLength(1);
        expect(updated.signals[0].value).toBe(0.5);
        expect(updated.signals[0].timestamp).toBeGreaterThan(0);
    });
    it('respects max signal limit', () => {
        const config = {
            ...DEFAULT_REPUTATION_CONFIG,
            maxSignalsPerAgent: 5,
        };
        let reputation = baseReputation;
        for (let i = 0; i < 10; i++) {
            reputation = addSignal(reputation, {
                type: 'task_completion',
                value: 0.5,
                weight: 1,
                source: 'test',
            }, config);
        }
        expect(reputation.signals).toHaveLength(5);
    });
});
describe('Task Rating', () => {
    let baseReputation;
    beforeEach(() => {
        baseReputation = createEmptyReputation('agent1', TEST_ADDRESS);
    });
    it('adds task rating and creates signal', () => {
        const rating = {
            taskId: 'task1',
            raterId: 'rater1',
            rating: 5,
            review: 'Great work!',
            asPoster: true,
            timestamp: Date.now(),
        };
        const updated = addTaskRating(baseReputation, rating);
        expect(updated.taskRatings).toHaveLength(1);
        expect(updated.totalRatings).toBe(1);
        expect(updated.averageRating).toBe(5);
        expect(updated.signals).toHaveLength(1);
    });
    it('calculates average rating correctly', () => {
        const ratings = [
            { taskId: 'task1', raterId: 'rater1', rating: 5, asPoster: true, timestamp: Date.now() },
            { taskId: 'task2', raterId: 'rater2', rating: 3, asPoster: true, timestamp: Date.now() },
            { taskId: 'task3', raterId: 'rater3', rating: 4, asPoster: true, timestamp: Date.now() },
        ];
        let reputation = baseReputation;
        for (const rating of ratings) {
            reputation = addTaskRating(reputation, rating);
        }
        expect(reputation.averageRating).toBe(4);
    });
    it('converts 5-star rating to positive signal', () => {
        const rating = {
            taskId: 'task1',
            raterId: 'rater1',
            rating: 5,
            asPoster: true,
            timestamp: Date.now(),
        };
        const updated = addTaskRating(baseReputation, rating);
        expect(updated.signals[0].value).toBe(1); // (5-3)/2 = 1
    });
    it('converts 1-star rating to negative signal', () => {
        const rating = {
            taskId: 'task1',
            raterId: 'rater1',
            rating: 1,
            asPoster: true,
            timestamp: Date.now(),
        };
        const updated = addTaskRating(baseReputation, rating);
        expect(updated.signals[0].value).toBe(-1); // (1-3)/2 = -1
    });
});
describe('Endorsement Management', () => {
    let baseReputation;
    beforeEach(() => {
        baseReputation = createEmptyReputation('agent1', TEST_ADDRESS);
    });
    it('adds endorsement correctly', () => {
        const endorsement = {
            endorserId: 'endorser1',
            endorserAddress: TEST_ADDRESS_2,
            endorserReputation: 80,
            strength: 'strong',
            weightedValue: 10,
            timestamp: Date.now(),
        };
        const updated = addEndorsement(baseReputation, endorsement);
        expect(updated.endorsements).toHaveLength(1);
        expect(updated.signals).toHaveLength(1);
        expect(updated.signals[0].type).toBe('endorsement');
    });
});
describe('Dispute Management', () => {
    let baseReputation;
    beforeEach(() => {
        baseReputation = createEmptyReputation('agent1', TEST_ADDRESS);
    });
    it('adds dispute record and creates signal', () => {
        const dispute = {
            disputeId: 'dispute1',
            taskId: 'task1',
            role: 'defendant',
            outcome: 'lost',
            resolvedAt: Date.now(),
            reputationImpact: -5,
        };
        const updated = addDispute(baseReputation, dispute);
        expect(updated.disputes).toHaveLength(1);
        expect(updated.signals).toHaveLength(1);
        expect(updated.signals[0].type).toBe('dispute_resolution');
        expect(updated.signals[0].value).toBe(-0.5); // -5/10
    });
    it('handles won disputes positively', () => {
        const dispute = {
            disputeId: 'dispute1',
            taskId: 'task1',
            role: 'plaintiff',
            outcome: 'won',
            resolvedAt: Date.now(),
            reputationImpact: 3,
        };
        const updated = addDispute(baseReputation, dispute);
        expect(updated.signals[0].value).toBe(0.3); // 3/10
    });
});
describe('Payment Reliability Update', () => {
    let baseReputation;
    beforeEach(() => {
        baseReputation = createEmptyReputation('agent1', TEST_ADDRESS);
    });
    it('updates payment record and creates signal', () => {
        const updated = updatePaymentReliability(baseReputation, {
            totalPayments: 5,
            onTimePayments: 5,
        });
        expect(updated.paymentReliability.totalPayments).toBe(5);
        expect(updated.paymentReliability.onTimePayments).toBe(5);
        expect(updated.signals).toHaveLength(1);
        expect(updated.signals[0].type).toBe('payment_reliability');
    });
    it('recalculates reliability score', () => {
        const updated = updatePaymentReliability(baseReputation, {
            totalPayments: 10,
            onTimePayments: 9,
            latePayments: 1,
        });
        expect(updated.paymentReliability.reliabilityScore).toBeGreaterThan(50);
    });
});
describe('Reputation Calculation', () => {
    let baseReputation;
    beforeEach(() => {
        baseReputation = createEmptyReputation('agent1', TEST_ADDRESS);
    });
    it('calculates breakdown with no signals', () => {
        const breakdown = calculateReputationBreakdown(baseReputation);
        expect(breakdown.overall).toBe(50);
        expect(breakdown.taskQuality).toBe(50);
        expect(breakdown.paymentReliability).toBe(50);
        expect(breakdown.communityStanding).toBe(50);
        expect(breakdown.consistency).toBeGreaterThanOrEqual(40);
    });
    it('calculates complete reputation', () => {
        const result = calculateReputation(baseReputation);
        expect(result.score).toBeGreaterThanOrEqual(49);
        expect(result.score).toBeLessThanOrEqual(51);
        expect(result.breakdown.overall).toBeGreaterThanOrEqual(49);
        expect(result.breakdown.overall).toBeLessThanOrEqual(51);
    });
    it('respects time window option', () => {
        const oldSignal = {
            type: 'task_completion',
            value: 1,
            weight: 1,
            timestamp: Date.now() - 200 * 24 * 60 * 60 * 1000,
            source: 'test',
            decayFactor: 1,
        };
        baseReputation.signals.push(oldSignal);
        const allTime = calculateReputationBreakdown(baseReputation, DEFAULT_REPUTATION_CONFIG, {});
        const recentOnly = calculateReputationBreakdown(baseReputation, DEFAULT_REPUTATION_CONFIG, { timeWindowDays: 30 });
        // With time window, old signal should be excluded
        expect(recentOnly.taskQuality).toBe(50);
    });
    it('allows custom weights', () => {
        const customOptions = {
            customWeights: {
                task_completion: 0.5,
                payment_reliability: 0.5,
            },
        };
        // Should not throw
        const breakdown = calculateReputationBreakdown(baseReputation, DEFAULT_REPUTATION_CONFIG, customOptions);
        expect(breakdown.overall).toBeDefined();
    });
});
describe('Reputation Recalculation', () => {
    it('tracks score changes', () => {
        let reputation = createEmptyReputation('agent1', TEST_ADDRESS);
        // Add positive signals
        reputation = addTaskRating(reputation, {
            taskId: 'task1',
            raterId: 'rater1',
            rating: 5,
            asPoster: true,
            timestamp: Date.now(),
        });
        const result = recalculateReputation(reputation);
        expect(result.previousScore).toBe(50);
        expect(result.newScore).not.toBe(50);
        expect(result.delta).not.toBe(0);
        expect(result.signalsApplied).toBe(1);
    });
    it('detects tier changes', () => {
        let reputation = createEmptyReputation('agent1', TEST_ADDRESS);
        reputation.score = 38; // Just below bronze
        reputation.tier = 'unrated';
        // Add many positive ratings to push over threshold
        for (let i = 0; i < 20; i++) {
            reputation = addTaskRating(reputation, {
                taskId: `task${i}`,
                raterId: `rater${i}`,
                rating: 5,
                asPoster: true,
                timestamp: Date.now(),
            });
        }
        const result = recalculateReputation(reputation);
        if (result.newScore >= 20) {
            expect(result.newTier).not.toBe('unrated');
        }
    });
});
describe('ReputationOracle', () => {
    let oracle;
    beforeEach(() => {
        oracle = new ReputationOracle();
        resetReputationOracle();
    });
    it('creates reputation on first access', () => {
        const reputation = oracle.getOrCreateReputation('agent1', TEST_ADDRESS);
        expect(reputation.agentId).toBe('agent1');
        expect(reputation.address).toBe(TEST_ADDRESS);
    });
    it('returns existing reputation', () => {
        oracle.getOrCreateReputation('agent1', TEST_ADDRESS);
        const second = oracle.getOrCreateReputation('agent1', TEST_ADDRESS);
        expect(second).toBe(oracle.getReputation('agent1'));
    });
    it('returns undefined for unknown agent', () => {
        expect(oracle.getReputation('unknown')).toBeUndefined();
    });
    it('adds rating and recalculates', () => {
        const result = oracle.addRating('agent1', TEST_ADDRESS, {
            taskId: 'task1',
            raterId: 'rater1',
            rating: 5,
            asPoster: true,
            timestamp: Date.now(),
        });
        expect(result.previousScore).toBe(50);
        expect(result.signalsApplied).toBe(1);
        const reputation = oracle.getReputation('agent1');
        expect(reputation?.totalRatings).toBe(1);
    });
    it('adds endorsement and recalculates', () => {
        const result = oracle.addEndorsement('agent1', TEST_ADDRESS, {
            endorserId: 'endorser1',
            endorserAddress: TEST_ADDRESS_2,
            endorserReputation: 80,
            strength: 'strong',
            weightedValue: 10,
            timestamp: Date.now(),
        });
        expect(result.signalsApplied).toBe(1);
        const reputation = oracle.getReputation('agent1');
        expect(reputation?.endorsements).toHaveLength(1);
    });
    it('adds dispute and recalculates', () => {
        const result = oracle.addDispute('agent1', TEST_ADDRESS, {
            disputeId: 'dispute1',
            taskId: 'task1',
            role: 'defendant',
            outcome: 'lost',
            resolvedAt: Date.now(),
            reputationImpact: -5,
        });
        expect(result.signalsApplied).toBe(1);
        const reputation = oracle.getReputation('agent1');
        expect(reputation?.disputes).toHaveLength(1);
    });
    it('updates payment record and recalculates', () => {
        const result = oracle.updatePaymentRecord('agent1', TEST_ADDRESS, {
            totalPayments: 10,
            onTimePayments: 10,
        });
        expect(result.signalsApplied).toBe(1);
        const reputation = oracle.getReputation('agent1');
        expect(reputation?.paymentReliability.totalPayments).toBe(10);
    });
    it('returns sorted leaderboard', () => {
        // Create multiple agents with different scores
        oracle.getOrCreateReputation('agent1', TEST_ADDRESS);
        oracle.getOrCreateReputation('agent2', TEST_ADDRESS_2);
        oracle.getOrCreateReputation('agent3', TEST_ADDRESS);
        // Manually set different scores
        const rep1 = oracle.getReputation('agent1');
        rep1.score = 75;
        const rep2 = oracle.getReputation('agent2');
        rep2.score = 90;
        const rep3 = oracle.getReputation('agent3');
        rep3.score = 60;
        const leaderboard = oracle.getLeaderboard(10);
        expect(leaderboard).toHaveLength(3);
        expect(leaderboard[0].agentId).toBe('agent2');
        expect(leaderboard[0].score).toBe(90);
        expect(leaderboard[1].agentId).toBe('agent1');
        expect(leaderboard[2].agentId).toBe('agent3');
    });
    it('calculates statistics', () => {
        oracle.getOrCreateReputation('agent1', TEST_ADDRESS);
        oracle.getOrCreateReputation('agent2', TEST_ADDRESS_2);
        const rep1 = oracle.getReputation('agent1');
        rep1.score = 80;
        rep1.tier = 'gold';
        const rep2 = oracle.getReputation('agent2');
        rep2.score = 60;
        rep2.tier = 'silver';
        const stats = oracle.getStats();
        expect(stats.totalAgents).toBe(2);
        expect(stats.averageScore).toBe(70);
        expect(stats.tierDistribution.gold).toBe(1);
        expect(stats.tierDistribution.silver).toBe(1);
    });
    it('prunes old signals', () => {
        const reputation = oracle.getOrCreateReputation('agent1', TEST_ADDRESS);
        // Add old and new signals
        reputation.signals.push({
            type: 'task_completion',
            value: 1,
            weight: 1,
            timestamp: Date.now() - 400 * 24 * 60 * 60 * 1000, // Very old
            source: 'test',
            decayFactor: 1,
        });
        reputation.signals.push({
            type: 'task_completion',
            value: 1,
            weight: 1,
            timestamp: Date.now(),
            source: 'test',
            decayFactor: 1,
        });
        oracle.updateReputation('agent1', reputation);
        const pruned = oracle.pruneOldSignals(365);
        expect(pruned).toBe(1);
        expect(oracle.getReputation('agent1')?.signals).toHaveLength(1);
    });
    it('exports and imports data', () => {
        oracle.addRating('agent1', TEST_ADDRESS, {
            taskId: 'task1',
            raterId: 'rater1',
            rating: 5,
            asPoster: true,
            timestamp: Date.now(),
        });
        const exported = oracle.exportData();
        const newOracle = new ReputationOracle();
        newOracle.importData(exported);
        expect(newOracle.getReputation('agent1')?.totalRatings).toBe(1);
    });
    it('uses custom config', () => {
        const customOracle = new ReputationOracle({
            minSignalsForRating: 5,
            maxSignalsPerAgent: 100,
        });
        // Should work without errors
        const reputation = customOracle.getOrCreateReputation('agent1', TEST_ADDRESS);
        expect(reputation.score).toBe(50);
    });
});
describe('Global Oracle', () => {
    beforeEach(() => {
        resetReputationOracle();
    });
    it('creates singleton oracle', () => {
        const oracle1 = getOrCreateReputationOracle();
        const oracle2 = getOrCreateReputationOracle();
        expect(oracle1).toBe(oracle2);
    });
    it('throws if not initialized', () => {
        expect(() => getReputationOracle()).toThrow('ReputationOracle not initialized');
    });
    it('returns oracle after initialization', () => {
        const created = getOrCreateReputationOracle();
        const retrieved = getReputationOracle();
        expect(retrieved).toBe(created);
    });
});
describe('Utility Functions', () => {
    it('formats reputation for display', () => {
        const reputation = createEmptyReputation('agent1', TEST_ADDRESS);
        reputation.score = 85;
        const formatted = formatReputation(reputation);
        expect(formatted).toContain('agent1');
        expect(formatted).toContain('85.0');
        expect(formatted).toContain('platinum');
    });
    it('generates reputation report', () => {
        const reputation = createEmptyReputation('agent1', TEST_ADDRESS);
        reputation.score = 75;
        reputation.tier = 'platinum';
        reputation.totalRatings = 10;
        reputation.averageRating = 4.5;
        const report = generateReputationReport(reputation);
        expect(report).toContain('Reputation Report');
        expect(report).toContain('75.0');
        expect(report).toContain('platinum');
        expect(report).toContain('Total Ratings: 10');
        expect(report).toContain('Task Quality');
        expect(report).toContain('Payment Reliability');
    });
});
describe('Integration Tests', () => {
    let oracle;
    beforeEach(() => {
        oracle = new ReputationOracle();
    });
    it('builds reputation through multiple interactions', () => {
        // Add ratings
        for (let i = 0; i < 5; i++) {
            oracle.addRating('agent1', TEST_ADDRESS, {
                taskId: `task${i}`,
                raterId: `rater${i}`,
                rating: 5,
                asPoster: true,
                timestamp: Date.now(),
            });
        }
        // Add endorsements
        oracle.addEndorsement('agent1', TEST_ADDRESS, {
            endorserId: 'endorser1',
            endorserAddress: TEST_ADDRESS_2,
            endorserReputation: 80,
            strength: 'strong',
            weightedValue: 10,
            timestamp: Date.now(),
        });
        // Update payment reliability
        oracle.updatePaymentRecord('agent1', TEST_ADDRESS, {
            totalPayments: 10,
            onTimePayments: 10,
        });
        const reputation = oracle.getReputation('agent1');
        expect(reputation.totalRatings).toBe(5);
        expect(reputation.endorsements).toHaveLength(1);
        expect(reputation.signals.length).toBeGreaterThan(0);
    });
    it('handles negative reputation from disputes', () => {
        // Build some positive reputation first
        for (let i = 0; i < 3; i++) {
            oracle.addRating('agent1', TEST_ADDRESS, {
                taskId: `task${i}`,
                raterId: `rater${i}`,
                rating: 5,
                asPoster: true,
                timestamp: Date.now(),
            });
        }
        const beforeDispute = oracle.getReputation('agent1').score;
        // Add a negative dispute
        oracle.addDispute('agent1', TEST_ADDRESS, {
            disputeId: 'dispute1',
            taskId: 'task1',
            role: 'defendant',
            outcome: 'lost',
            resolvedAt: Date.now(),
            reputationImpact: -10,
        });
        const afterDispute = oracle.getReputation('agent1').score;
        expect(afterDispute).toBeLessThan(beforeDispute);
    });
    it('recovers tier after improvement', () => {
        // Start with poor reputation
        let reputation = createEmptyReputation('agent1', TEST_ADDRESS);
        reputation.score = 15;
        reputation.tier = 'unrated';
        oracle.updateReputation('agent1', reputation);
        // Improve through ratings
        for (let i = 0; i < 10; i++) {
            oracle.addRating('agent1', TEST_ADDRESS, {
                taskId: `task${i}`,
                raterId: `rater${i}`,
                rating: 5,
                asPoster: true,
                timestamp: Date.now(),
            });
        }
        const final = oracle.getReputation('agent1');
        expect(final.tier).not.toBe('unrated');
        expect(final.score).toBeGreaterThan(15);
    });
});
//# sourceMappingURL=reputation.test.js.map