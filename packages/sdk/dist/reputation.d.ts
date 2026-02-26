/**
 * Reputation Oracle Module for Agora
 *
 * Implements agent reputation tracking with multi-signal aggregation:
 * - Task completion ratings
 * - Payment reliability
 * - Dispute resolution outcomes
 * - Network endorsement (weighted by endorser reputation)
 * - Longevity and consistency metrics
 *
 * @module reputation
 */
import { type Address } from 'viem';
/**
 * Reputation score range
 */
export type ReputationTier = 'unrated' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
/**
 * Reputation signal types
 */
export type ReputationSignalType = 'task_completion' | 'payment_reliability' | 'dispute_resolution' | 'endorsement' | 'longevity' | 'consistency';
/**
 * Individual reputation signal
 */
export interface ReputationSignal {
    /** Signal type */
    type: ReputationSignalType;
    /** Signal value (-1.0 to 1.0, negative for penalties) */
    value: number;
    /** Signal weight in overall calculation */
    weight: number;
    /** Timestamp */
    timestamp: number;
    /** Source agent ID or 'system' */
    source: string;
    /** Associated task ID if applicable */
    taskId?: string;
    /** Optional proof/reason */
    proof?: string;
    /** Decay factor (0-1, how quickly this signal loses importance) */
    decayFactor: number;
}
/**
 * Endorsement record with weight based on endorser reputation
 */
export interface Endorsement {
    /** Endorser agent ID */
    endorserId: string;
    /** Endorser wallet address */
    endorserAddress: Address;
    /** Endorser reputation score at time of endorsement */
    endorserReputation: number;
    /** Endorsement message/strength */
    strength: 'weak' | 'moderate' | 'strong';
    /** Numeric value derived from strength and endorser rep */
    weightedValue: number;
    /** Timestamp */
    timestamp: number;
    /** Endorsement expiration (optional) */
    expiresAt?: number;
}
/**
 * Task rating record
 */
export interface TaskRating {
    /** Task ID */
    taskId: string;
    /** Rater agent ID */
    raterId: string;
    /** Rating (1-5 stars) */
    rating: number;
    /** Optional review text */
    review?: string;
    /** Whether rating is from task poster or worker */
    asPoster: boolean;
    /** Timestamp */
    timestamp: number;
}
/**
 * Payment reliability record
 */
export interface PaymentReliability {
    /** Total payments made */
    totalPayments: number;
    /** On-time payments */
    onTimePayments: number;
    /** Late payments */
    latePayments: number;
    /** Failed/defaulted payments */
    failedPayments: number;
    /** Average delay in hours (negative = early) */
    averageDelayHours: number;
    /** Reliability score (0-100) */
    reliabilityScore: number;
}
/**
 * Dispute record
 */
export interface DisputeRecord {
    /** Dispute ID */
    disputeId: string;
    /** Task ID */
    taskId: string;
    /** Whether agent was plaintiff or defendant */
    role: 'plaintiff' | 'defendant';
    /** Dispute outcome */
    outcome: 'won' | 'lost' | 'settled';
    /** Resolution timestamp */
    resolvedAt: number;
    /** Impact on reputation (-10 to +10) */
    reputationImpact: number;
}
/**
 * Reputation breakdown by category
 */
export interface ReputationBreakdown {
    /** Overall score (0-100) */
    overall: number;
    /** Task quality component */
    taskQuality: number;
    /** Payment reliability component */
    paymentReliability: number;
    /** Community standing component */
    communityStanding: number;
    /** Consistency/longevity component */
    consistency: number;
}
/**
 * Agent reputation data
 */
export interface AgentReputation {
    /** Agent ID */
    agentId: string;
    /** Wallet address */
    address: Address;
    /** Overall reputation score (0-100) */
    score: number;
    /** Reputation tier */
    tier: ReputationTier;
    /** Detailed breakdown */
    breakdown: ReputationBreakdown;
    /** Total ratings received */
    totalRatings: number;
    /** Average rating (1-5) */
    averageRating: number;
    /** All reputation signals */
    signals: ReputationSignal[];
    /** Endorsements received */
    endorsements: Endorsement[];
    /** Task ratings */
    taskRatings: TaskRating[];
    /** Payment reliability */
    paymentReliability: PaymentReliability;
    /** Dispute history */
    disputes: DisputeRecord[];
    /** First activity timestamp */
    firstActivity: number;
    /** Last update timestamp */
    lastUpdated: number;
    /** Reputation version (for migration) */
    version: number;
}
/**
 * Reputation oracle configuration
 */
export interface ReputationConfig {
    /** Minimum signals for rating */
    minSignalsForRating: number;
    /** Signal weights by type */
    signalWeights: Record<ReputationSignalType, number>;
    /** Decay half-life in days (signals lose half relevance after this period) */
    decayHalfLifeDays: number;
    /** Maximum signals to store per agent */
    maxSignalsPerAgent: number;
    /** Endorsement expiration in days (0 = never) */
    endorsementExpirationDays: number;
    /** Minimum endorser reputation to count */
    minEndorserReputation: number;
    /** Dispute impact multiplier */
    disputeImpactMultiplier: number;
}
/**
 * Reputation calculation options
 */
export interface ReputationCalcOptions {
    /** Time window in days (0 = all time) */
    timeWindowDays?: number;
    /** Include expired endorsements */
    includeExpired?: boolean;
    /** Custom signal weights override */
    customWeights?: Partial<Record<ReputationSignalType, number>>;
}
/**
 * Reputation update result
 */
export interface ReputationUpdateResult {
    /** New score */
    newScore: number;
    /** Previous score */
    previousScore: number;
    /** Score delta */
    delta: number;
    /** New tier */
    newTier: ReputationTier;
    /** Previous tier */
    previousTier: ReputationTier;
    /** Signals applied */
    signalsApplied: number;
    /** Timestamp */
    timestamp: number;
}
/**
 * Default reputation configuration
 */
export declare const DEFAULT_REPUTATION_CONFIG: ReputationConfig;
/**
 * Get tier from reputation score
 */
export declare function getReputationTier(score: number): ReputationTier;
/**
 * Get tier color for UI (reputation tiers)
 */
export declare function getReputationTierColor(tier: ReputationTier): string;
/**
 * Calculate signal decay multiplier
 */
export declare function calculateDecay(timestamp: number, halfLifeDays: number, now?: number): number;
/**
 * Calculate weighted signal value with decay
 */
export declare function calculateSignalValue(signal: ReputationSignal, config: ReputationConfig, now?: number): number;
/**
 * Calculate payment reliability score
 */
export declare function calculatePaymentReliability(record: PaymentReliability): number;
/**
 * Calculate endorsement value
 */
export declare function calculateEndorsementValue(endorsement: Endorsement, config: ReputationConfig, now?: number): number;
/**
 * Create a new empty agent reputation
 */
export declare function createEmptyReputation(agentId: string, address: Address): AgentReputation;
/**
 * Add signal to reputation
 */
export declare function addSignal(reputation: AgentReputation, signal: Omit<ReputationSignal, 'timestamp' | 'decayFactor'>, config?: ReputationConfig): AgentReputation;
/**
 * Add task rating
 */
export declare function addTaskRating(reputation: AgentReputation, rating: TaskRating, config?: ReputationConfig): AgentReputation;
/**
 * Add endorsement
 */
export declare function addEndorsement(reputation: AgentReputation, endorsement: Endorsement, config?: ReputationConfig): AgentReputation;
/**
 * Add dispute record
 */
export declare function addDispute(reputation: AgentReputation, dispute: DisputeRecord, config?: ReputationConfig): AgentReputation;
/**
 * Update payment reliability
 */
export declare function updatePaymentReliability(reputation: AgentReputation, update: Partial<PaymentReliability>, config?: ReputationConfig): AgentReputation;
/**
 * Calculate reputation breakdown
 */
export declare function calculateReputationBreakdown(reputation: AgentReputation, config?: ReputationConfig, options?: ReputationCalcOptions): ReputationBreakdown;
/**
 * Calculate complete reputation score
 */
export declare function calculateReputation(reputation: AgentReputation, config?: ReputationConfig, options?: ReputationCalcOptions): {
    score: number;
    breakdown: ReputationBreakdown;
    tier: ReputationTier;
};
/**
 * Recalculate and update reputation
 */
export declare function recalculateReputation(reputation: AgentReputation, config?: ReputationConfig, options?: ReputationCalcOptions): ReputationUpdateResult;
/**
 * Reputation Oracle Manager
 *
 * Manages reputation calculations and provides oracle services
 */
export declare class ReputationOracle {
    private reputations;
    private config;
    constructor(config?: Partial<ReputationConfig>);
    /**
     * Get or create reputation for agent
     */
    getOrCreateReputation(agentId: string, address: Address): AgentReputation;
    /**
     * Get reputation for agent
     */
    getReputation(agentId: string): AgentReputation | undefined;
    /**
     * Update reputation for agent
     */
    updateReputation(agentId: string, reputation: AgentReputation): void;
    /**
     * Add rating for an agent
     */
    addRating(agentId: string, address: Address, rating: TaskRating): ReputationUpdateResult;
    /**
     * Add endorsement for an agent
     */
    addEndorsement(agentId: string, address: Address, endorsement: Endorsement): ReputationUpdateResult;
    /**
     * Add dispute record
     */
    addDispute(agentId: string, address: Address, dispute: DisputeRecord): ReputationUpdateResult;
    /**
     * Update payment reliability
     */
    updatePaymentRecord(agentId: string, address: Address, update: Partial<PaymentReliability>): ReputationUpdateResult;
    /**
     * Get leaderboard (sorted by reputation)
     */
    getLeaderboard(limit?: number): Array<{
        agentId: string;
        score: number;
        tier: ReputationTier;
    }>;
    /**
     * Get reputation statistics
     */
    getStats(): {
        totalAgents: number;
        averageScore: number;
        tierDistribution: Record<ReputationTier, number>;
    };
    /**
     * Clean up old signals (memory management)
     */
    pruneOldSignals(maxAgeDays?: number): number;
    /**
     * Export all reputation data
     */
    exportData(): Record<string, AgentReputation>;
    /**
     * Import reputation data
     */
    importData(data: Record<string, AgentReputation>): void;
}
/**
 * Get or create global reputation oracle
 */
export declare function getOrCreateReputationOracle(config?: Partial<ReputationConfig>): ReputationOracle;
/**
 * Get global reputation oracle (throws if not initialized)
 */
export declare function getReputationOracle(): ReputationOracle;
/**
 * Reset global oracle (mainly for testing)
 */
export declare function resetReputationOracle(): void;
/**
 * Format reputation for display
 */
export declare function formatReputation(reputation: AgentReputation): string;
/**
 * Generate reputation report
 */
export declare function generateReputationReport(reputation: AgentReputation, config?: ReputationConfig): string;
//# sourceMappingURL=reputation.d.ts.map