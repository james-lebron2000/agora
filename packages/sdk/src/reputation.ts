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

import { type Address, keccak256, toHex, verifyMessage } from 'viem';

/**
 * Reputation score range
 */
export type ReputationTier = 'unrated' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

/**
 * Reputation signal types
 */
export type ReputationSignalType = 
  | 'task_completion'
  | 'payment_reliability' 
  | 'dispute_resolution'
  | 'endorsement'
  | 'longevity'
  | 'consistency';

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
export const DEFAULT_REPUTATION_CONFIG: ReputationConfig = {
  minSignalsForRating: 3,
  signalWeights: {
    task_completion: 0.30,
    payment_reliability: 0.25,
    dispute_resolution: 0.20,
    endorsement: 0.15,
    longevity: 0.05,
    consistency: 0.05,
  },
  decayHalfLifeDays: 90,
  maxSignalsPerAgent: 1000,
  endorsementExpirationDays: 365,
  minEndorserReputation: 50,
  disputeImpactMultiplier: 2.0,
};

/**
 * Get tier from reputation score
 */
export function getReputationTier(score: number): ReputationTier {
  if (score >= 90) return 'diamond';
  if (score >= 75) return 'platinum';
  if (score >= 60) return 'gold';
  if (score >= 40) return 'silver';
  if (score >= 20) return 'bronze';
  if (score > 0) return 'unrated';
  return 'unrated';
}

/**
 * Get tier color for UI (reputation tiers)
 */
export function getReputationTierColor(tier: ReputationTier): string {
  const colors: Record<ReputationTier, string> = {
    unrated: '#9CA3AF',
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2',
    diamond: '#B9F2FF',
  };
  return colors[tier];
}

/**
 * Calculate signal decay multiplier
 */
export function calculateDecay(
  timestamp: number,
  halfLifeDays: number,
  now: number = Date.now()
): number {
  const ageMs = now - timestamp;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.pow(0.5, ageDays / halfLifeDays);
}

/**
 * Calculate weighted signal value with decay
 */
export function calculateSignalValue(
  signal: ReputationSignal,
  config: ReputationConfig,
  now: number = Date.now()
): number {
  const decay = calculateDecay(signal.timestamp, config.decayHalfLifeDays, now);
  const weight = config.signalWeights[signal.type] * signal.weight;
  return signal.value * weight * decay * signal.decayFactor;
}

/**
 * Calculate payment reliability score
 */
export function calculatePaymentReliability(
  record: PaymentReliability
): number {
  if (record.totalPayments === 0) return 50; // Neutral baseline
  
  const successRate = record.onTimePayments / record.totalPayments;
  const failurePenalty = record.failedPayments * 0.1;
  const latePenalty = record.latePayments * 0.05;
  const delayPenalty = Math.max(0, record.averageDelayHours / 24) * 0.02;
  
  return Math.max(0, Math.min(100, (successRate * 100) - failurePenalty - latePenalty - delayPenalty));
}

/**
 * Calculate endorsement value
 */
export function calculateEndorsementValue(
  endorsement: Endorsement,
  config: ReputationConfig,
  now: number = Date.now()
): number {
  // Check expiration
  if (endorsement.expiresAt && endorsement.expiresAt < now) {
    return 0;
  }
  
  // Check minimum endorser reputation
  if (endorsement.endorserReputation < config.minEndorserReputation) {
    return 0;
  }
  
  // Weight by endorser reputation (higher rep = more valuable endorsement)
  const endorserWeight = endorsement.endorserReputation / 100;
  
  // Strength multipliers
  const strengthMultipliers = {
    weak: 0.5,
    moderate: 1.0,
    strong: 1.5,
  };
  
  return endorsement.weightedValue * endorserWeight * strengthMultipliers[endorsement.strength];
}

/**
 * Create a new empty agent reputation
 */
export function createEmptyReputation(
  agentId: string,
  address: Address
): AgentReputation {
  const now = Date.now();
  return {
    agentId,
    address,
    score: 50, // Start at neutral
    tier: 'unrated',
    breakdown: {
      overall: 50,
      taskQuality: 50,
      paymentReliability: 50,
      communityStanding: 50,
      consistency: 50,
    },
    totalRatings: 0,
    averageRating: 0,
    signals: [],
    endorsements: [],
    taskRatings: [],
    paymentReliability: {
      totalPayments: 0,
      onTimePayments: 0,
      latePayments: 0,
      failedPayments: 0,
      averageDelayHours: 0,
      reliabilityScore: 50,
    },
    disputes: [],
    firstActivity: now,
    lastUpdated: now,
    version: 1,
  };
}

/**
 * Add signal to reputation
 */
export function addSignal(
  reputation: AgentReputation,
  signal: Omit<ReputationSignal, 'timestamp' | 'decayFactor'>,
  config: ReputationConfig = DEFAULT_REPUTATION_CONFIG
): AgentReputation {
  const now = Date.now();
  const newSignal: ReputationSignal = {
    ...signal,
    timestamp: now,
    decayFactor: 1.0,
  };
  
  // Add signal and maintain max limit
  const updatedSignals = [newSignal, ...reputation.signals]
    .slice(0, config.maxSignalsPerAgent);
  
  return {
    ...reputation,
    signals: updatedSignals,
    lastUpdated: now,
  };
}

/**
 * Add task rating
 */
export function addTaskRating(
  reputation: AgentReputation,
  rating: TaskRating,
  config: ReputationConfig = DEFAULT_REPUTATION_CONFIG
): AgentReputation {
  const updatedRatings = [...reputation.taskRatings, rating];
  const totalRating = updatedRatings.reduce((sum, r) => sum + r.rating, 0);
  const averageRating = totalRating / updatedRatings.length;
  
  // Convert 1-5 rating to -1 to 1 signal value
  const signalValue = (rating.rating - 3) / 2;
  
  // Create task completion signal
  const signal: Omit<ReputationSignal, 'timestamp' | 'decayFactor'> = {
    type: 'task_completion',
    value: signalValue,
    weight: rating.rating / 5, // Higher ratings = more weight
    source: rating.raterId,
    taskId: rating.taskId,
    proof: rating.review,
  };
  
  return addSignal(
    {
      ...reputation,
      taskRatings: updatedRatings,
      totalRatings: updatedRatings.length,
      averageRating,
    },
    signal,
    config
  );
}

/**
 * Add endorsement
 */
export function addEndorsement(
  reputation: AgentReputation,
  endorsement: Endorsement,
  config: ReputationConfig = DEFAULT_REPUTATION_CONFIG
): AgentReputation {
  const updatedEndorsements = [...reputation.endorsements, endorsement];
  
  // Create endorsement signal
  const value = calculateEndorsementValue(endorsement, config);
  const signal: Omit<ReputationSignal, 'timestamp' | 'decayFactor'> = {
    type: 'endorsement',
    value: Math.min(1, value / 10), // Normalize to 0-1
    weight: Math.min(1, value / 10),
    source: endorsement.endorserId,
    proof: `Endorsement from ${endorsement.endorserId} (${endorsement.strength})`,
  };
  
  return addSignal(
    {
      ...reputation,
      endorsements: updatedEndorsements,
    },
    signal,
    config
  );
}

/**
 * Add dispute record
 */
export function addDispute(
  reputation: AgentReputation,
  dispute: DisputeRecord,
  config: ReputationConfig = DEFAULT_REPUTATION_CONFIG
): AgentReputation {
  const updatedDisputes = [...reputation.disputes, dispute];
  
  // Create dispute signal
  const signal: Omit<ReputationSignal, 'timestamp' | 'decayFactor'> = {
    type: 'dispute_resolution',
    value: dispute.reputationImpact / 10, // Normalize to -1 to 1
    weight: Math.abs(dispute.reputationImpact) / 10,
    source: 'system',
    taskId: dispute.taskId,
    proof: `Dispute ${dispute.disputeId}: ${dispute.outcome}`,
  };
  
  return addSignal(
    {
      ...reputation,
      disputes: updatedDisputes,
    },
    signal,
    config
  );
}

/**
 * Update payment reliability
 */
export function updatePaymentReliability(
  reputation: AgentReputation,
  update: Partial<PaymentReliability>,
  config: ReputationConfig = DEFAULT_REPUTATION_CONFIG
): AgentReputation {
  const updatedRecord = {
    ...reputation.paymentReliability,
    ...update,
  };
  
  // Recalculate reliability score
  updatedRecord.reliabilityScore = calculatePaymentReliability(updatedRecord);
  
  // Create payment reliability signal
  const reliabilityDelta = updatedRecord.reliabilityScore - reputation.paymentReliability.reliabilityScore;
  const signal: Omit<ReputationSignal, 'timestamp' | 'decayFactor'> = {
    type: 'payment_reliability',
    value: reliabilityDelta / 50, // Normalize to -1 to 1 range
    weight: Math.abs(reliabilityDelta) / 100,
    source: 'system',
    proof: `Payment reliability updated to ${updatedRecord.reliabilityScore.toFixed(1)}`,
  };
  
  return addSignal(
    {
      ...reputation,
      paymentReliability: updatedRecord,
    },
    signal,
    config
  );
}

/**
 * Calculate reputation breakdown
 */
export function calculateReputationBreakdown(
  reputation: AgentReputation,
  config: ReputationConfig = DEFAULT_REPUTATION_CONFIG,
  options: ReputationCalcOptions = {}
): ReputationBreakdown {
  const now = Date.now();
  const timeWindowMs = options.timeWindowDays 
    ? options.timeWindowDays * 24 * 60 * 60 * 1000 
    : Infinity;
  
  // Filter signals by time window
  const relevantSignals = reputation.signals.filter(
    s => now - s.timestamp <= timeWindowMs
  );
  
  // Calculate component scores
  const taskSignals = relevantSignals.filter(s => s.type === 'task_completion');
  const paymentSignals = relevantSignals.filter(s => s.type === 'payment_reliability');
  const disputeSignals = relevantSignals.filter(s => s.type === 'dispute_resolution');
  const endorsementSignals = relevantSignals.filter(s => s.type === 'endorsement');
  
  // Task quality (based on ratings and task completion signals)
  const taskScore = taskSignals.length > 0
    ? 50 + (taskSignals.reduce((sum, s) => sum + calculateSignalValue(s, config, now), 0) * 50)
    : 50;
  
  // Payment reliability
  const paymentScore = reputation.paymentReliability.reliabilityScore;
  
  // Community standing (endorsements weighted by endorser reputation)
  const communityScore = endorsementSignals.length > 0
    ? 50 + (endorsementSignals.reduce((sum, s) => sum + calculateSignalValue(s, config, now), 0) * 50)
    : 50;
  
  // Consistency (based on longevity and consistency signals)
  const daysSinceFirstActivity = (now - reputation.firstActivity) / (24 * 60 * 60 * 1000);
  const longevityBonus = Math.min(10, daysSinceFirstActivity / 30 * 10); // Max 10 points for 30 days
  const consistencySignals = relevantSignals.filter(s => s.type === 'consistency');
  const consistencyScore = consistencySignals.length > 0
    ? 40 + longevityBonus + consistencySignals.reduce((sum, s) => sum + calculateSignalValue(s, config, now), 0) * 10
    : 50; // Default to neutral when no signals
  
  // Dispute impact (can be negative)
  const disputeImpact = disputeSignals.reduce((sum, s) => sum + calculateSignalValue(s, config, now), 0);
  
  // Calculate weighted overall score
  const weights = { ...config.signalWeights, ...options.customWeights };
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  
  const overall = (
    (taskScore * weights.task_completion) +
    (paymentScore * weights.payment_reliability) +
    (Math.max(0, Math.min(100, 50 + disputeImpact * 50)) * weights.dispute_resolution) +
    (communityScore * weights.endorsement) +
    (consistencyScore * weights.longevity) +
    (consistencyScore * weights.consistency)
  ) / totalWeight;
  
  return {
    overall: Math.max(0, Math.min(100, overall)),
    taskQuality: Math.max(0, Math.min(100, taskScore)),
    paymentReliability: Math.max(0, Math.min(100, paymentScore)),
    communityStanding: Math.max(0, Math.min(100, communityScore)),
    consistency: Math.max(0, Math.min(100, consistencyScore)),
  };
}

/**
 * Calculate complete reputation score
 */
export function calculateReputation(
  reputation: AgentReputation,
  config: ReputationConfig = DEFAULT_REPUTATION_CONFIG,
  options: ReputationCalcOptions = {}
): { score: number; breakdown: ReputationBreakdown; tier: ReputationTier } {
  const breakdown = calculateReputationBreakdown(reputation, config, options);
  const score = breakdown.overall;
  const tier = getReputationTier(score);
  
  return { score, breakdown, tier };
}

/**
 * Recalculate and update reputation
 */
export function recalculateReputation(
  reputation: AgentReputation,
  config: ReputationConfig = DEFAULT_REPUTATION_CONFIG,
  options: ReputationCalcOptions = {}
): ReputationUpdateResult {
  const previousScore = reputation.score;
  const previousTier = reputation.tier;
  
  const { score, breakdown, tier } = calculateReputation(reputation, config, options);
  
  return {
    newScore: score,
    previousScore,
    delta: score - previousScore,
    newTier: tier,
    previousTier,
    signalsApplied: reputation.signals.length,
    timestamp: Date.now(),
  };
}

/**
 * Reputation Oracle Manager
 * 
 * Manages reputation calculations and provides oracle services
 */
export class ReputationOracle {
  private reputations: Map<string, AgentReputation> = new Map();
  private config: ReputationConfig;
  
  constructor(config: Partial<ReputationConfig> = {}) {
    this.config = { ...DEFAULT_REPUTATION_CONFIG, ...config };
  }
  
  /**
   * Get or create reputation for agent
   */
  getOrCreateReputation(agentId: string, address: Address): AgentReputation {
    if (!this.reputations.has(agentId)) {
      this.reputations.set(agentId, createEmptyReputation(agentId, address));
    }
    return this.reputations.get(agentId)!;
  }
  
  /**
   * Get reputation for agent
   */
  getReputation(agentId: string): AgentReputation | undefined {
    return this.reputations.get(agentId);
  }
  
  /**
   * Update reputation for agent
   */
  updateReputation(agentId: string, reputation: AgentReputation): void {
    this.reputations.set(agentId, reputation);
  }
  
  /**
   * Add rating for an agent
   */
  addRating(
    agentId: string,
    address: Address,
    rating: TaskRating
  ): ReputationUpdateResult {
    let reputation = this.getOrCreateReputation(agentId, address);
    reputation = addTaskRating(reputation, rating, this.config);
    
    const result = recalculateReputation(reputation, this.config);
    reputation = {
      ...reputation,
      score: result.newScore,
      tier: result.newTier,
      breakdown: calculateReputationBreakdown(reputation, this.config),
    };
    
    this.updateReputation(agentId, reputation);
    return result;
  }
  
  /**
   * Add endorsement for an agent
   */
  addEndorsement(
    agentId: string,
    address: Address,
    endorsement: Endorsement
  ): ReputationUpdateResult {
    let reputation = this.getOrCreateReputation(agentId, address);
    reputation = addEndorsement(reputation, endorsement, this.config);
    
    const result = recalculateReputation(reputation, this.config);
    reputation = {
      ...reputation,
      score: result.newScore,
      tier: result.newTier,
      breakdown: calculateReputationBreakdown(reputation, this.config),
    };
    
    this.updateReputation(agentId, reputation);
    return result;
  }
  
  /**
   * Add dispute record
   */
  addDispute(
    agentId: string,
    address: Address,
    dispute: DisputeRecord
  ): ReputationUpdateResult {
    let reputation = this.getOrCreateReputation(agentId, address);
    reputation = addDispute(reputation, dispute, this.config);
    
    const result = recalculateReputation(reputation, this.config);
    reputation = {
      ...reputation,
      score: result.newScore,
      tier: result.newTier,
      breakdown: calculateReputationBreakdown(reputation, this.config),
    };
    
    this.updateReputation(agentId, reputation);
    return result;
  }
  
  /**
   * Update payment reliability
   */
  updatePaymentRecord(
    agentId: string,
    address: Address,
    update: Partial<PaymentReliability>
  ): ReputationUpdateResult {
    let reputation = this.getOrCreateReputation(agentId, address);
    reputation = updatePaymentReliability(reputation, update, this.config);
    
    const result = recalculateReputation(reputation, this.config);
    reputation = {
      ...reputation,
      score: result.newScore,
      tier: result.newTier,
      breakdown: calculateReputationBreakdown(reputation, this.config),
    };
    
    this.updateReputation(agentId, reputation);
    return result;
  }
  
  /**
   * Get leaderboard (sorted by reputation)
   */
  getLeaderboard(limit: number = 10): Array<{ agentId: string; score: number; tier: ReputationTier }> {
    return Array.from(this.reputations.entries())
      .map(([agentId, rep]) => ({ agentId, score: rep.score, tier: rep.tier }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
  
  /**
   * Get reputation statistics
   */
  getStats(): {
    totalAgents: number;
    averageScore: number;
    tierDistribution: Record<ReputationTier, number>;
  } {
    const reps = Array.from(this.reputations.values());
    if (reps.length === 0) {
      return {
        totalAgents: 0,
        averageScore: 0,
        tierDistribution: {
          unrated: 0,
          bronze: 0,
          silver: 0,
          gold: 0,
          platinum: 0,
          diamond: 0,
        },
      };
    }
    
    const totalScore = reps.reduce((sum, r) => sum + r.score, 0);
    const tierDistribution: Record<ReputationTier, number> = {
      unrated: 0,
      bronze: 0,
      silver: 0,
      gold: 0,
      platinum: 0,
      diamond: 0,
    };
    
    for (const rep of reps) {
      tierDistribution[rep.tier]++;
    }
    
    return {
      totalAgents: reps.length,
      averageScore: totalScore / reps.length,
      tierDistribution,
    };
  }
  
  /**
   * Clean up old signals (memory management)
   */
  pruneOldSignals(maxAgeDays: number = 365): number {
    const cutoff = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
    let totalPruned = 0;
    
    for (const [agentId, reputation] of this.reputations) {
      const originalLength = reputation.signals.length;
      const filteredSignals = reputation.signals.filter(s => s.timestamp > cutoff);
      totalPruned += originalLength - filteredSignals.length;
      
      this.reputations.set(agentId, {
        ...reputation,
        signals: filteredSignals,
      });
    }
    
    return totalPruned;
  }
  
  /**
   * Export all reputation data
   */
  exportData(): Record<string, AgentReputation> {
    return Object.fromEntries(this.reputations);
  }
  
  /**
   * Import reputation data
   */
  importData(data: Record<string, AgentReputation>): void {
    this.reputations = new Map(Object.entries(data));
  }
}

// Global oracle instance
let globalOracle: ReputationOracle | null = null;

/**
 * Get or create global reputation oracle
 */
export function getOrCreateReputationOracle(
  config?: Partial<ReputationConfig>
): ReputationOracle {
  if (!globalOracle) {
    globalOracle = new ReputationOracle(config);
  }
  return globalOracle;
}

/**
 * Get global reputation oracle (throws if not initialized)
 */
export function getReputationOracle(): ReputationOracle {
  if (!globalOracle) {
    throw new Error('ReputationOracle not initialized. Call getOrCreateReputationOracle first.');
  }
  return globalOracle;
}

/**
 * Reset global oracle (mainly for testing)
 */
export function resetReputationOracle(): void {
  globalOracle = null;
}

/**
 * Format reputation for display
 */
export function formatReputation(reputation: AgentReputation): string {
  const tier = getReputationTier(reputation.score);
  const tierEmoji: Record<ReputationTier, string> = {
    unrated: '⚪',
    bronze: '🥉',
    silver: '🥈',
    gold: '🥇',
    platinum: '💎',
    diamond: '👑',
  };
  
  return `${tierEmoji[tier]} ${reputation.agentId} | Score: ${reputation.score.toFixed(1)} | Tier: ${tier}`;
}

/**
 * Generate reputation report
 */
export function generateReputationReport(
  reputation: AgentReputation,
  config: ReputationConfig = DEFAULT_REPUTATION_CONFIG
): string {
  const lines: string[] = [
    `📊 Reputation Report for ${reputation.agentId}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `Overall Score: ${reputation.score.toFixed(1)}/100`,
    `Tier: ${getReputationTier(reputation.score)} ${getReputationTierColor(getReputationTier(reputation.score))}`,
    ``,
    `📈 Breakdown:`,
    `  • Task Quality: ${reputation.breakdown.taskQuality.toFixed(1)}`,
    `  • Payment Reliability: ${reputation.breakdown.paymentReliability.toFixed(1)}`,
    `  • Community Standing: ${reputation.breakdown.communityStanding.toFixed(1)}`,
    `  • Consistency: ${reputation.breakdown.consistency.toFixed(1)}`,
    ``,
    `📋 Statistics:`,
    `  • Total Ratings: ${reputation.totalRatings}`,
    `  • Average Rating: ${reputation.averageRating.toFixed(2)}/5`,
    `  • Endorsements: ${reputation.endorsements.length}`,
    `  • Disputes: ${reputation.disputes.length}`,
    `  • Signals: ${reputation.signals.length}`,
    ``,
    `💳 Payment Reliability:`,
    `  • Score: ${reputation.paymentReliability.reliabilityScore.toFixed(1)}`,
    `  • Total Payments: ${reputation.paymentReliability.totalPayments}`,
    `  • On-time: ${reputation.paymentReliability.onTimePayments}`,
    ``,
    `🕐 Member Since: ${new Date(reputation.firstActivity).toLocaleDateString()}`,
    `🔄 Last Updated: ${new Date(reputation.lastUpdated).toLocaleString()}`,
  ];
  
  return lines.join('\n');
}
