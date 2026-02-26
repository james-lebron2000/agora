/**
 * Echo Survival Module for Agora
 * 
 * Implements Agent survival mechanisms to ensure agents can:
 * - Monitor their economic sustainability
 * - Track health metrics
 * - Calculate survival scores
 * - Provide recovery recommendations
 * - Send heartbeat signals
 * 
 * @module survival
 */

import { isAddress, type Address } from 'viem';
import {
  type SupportedChain,
  type SupportedToken,
  getAllBalances,
  getAllTokenBalances,
  type ChainBalance,
  TOKEN_DECIMALS,
  SUPPORTED_TOKENS
} from './bridge.js';

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Survival error codes for categorizing failures
 */
export type SurvivalErrorCode =
  | 'INVALID_PARAMS'
  | 'AGENT_NOT_FOUND'
  | 'HEALTH_CHECK_FAILED'
  | 'ECONOMICS_CHECK_FAILED'
  | 'HEARTBEAT_FAILED'
  | 'INSUFFICIENT_BALANCE'
  | 'NETWORK_ERROR'
  | 'STATE_TRANSITION_ERROR'
  | 'ACTION_EXECUTION_FAILED'
  | 'PREDICTION_FAILED'
  | 'UNKNOWN_ERROR';

/**
 * Custom Survival Error class with error codes and retry capability
 */
export class SurvivalError extends Error {
  public code: SurvivalErrorCode;
  public agentId?: string;
  public retryable: boolean;
  public timestamp: number;
  public cause?: Error;

  constructor(
    message: string,
    code: SurvivalErrorCode = 'UNKNOWN_ERROR',
    options?: { agentId?: string; retryable?: boolean; cause?: Error }
  ) {
    super(message);
    this.name = 'SurvivalError';
    this.code = code;
    this.agentId = options?.agentId;
    this.retryable = options?.retryable ?? true;
    this.timestamp = Date.now();
    this.cause = options?.cause;
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    return this.retryable && [
      'NETWORK_ERROR',
      'HEALTH_CHECK_FAILED',
      'ECONOMICS_CHECK_FAILED',
      'HEARTBEAT_FAILED',
      'PREDICTION_FAILED'
    ].includes(this.code);
  }

  /**
   * Convert error to JSON representation
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      agentId: this.agentId,
      retryable: this.retryable,
      timestamp: this.timestamp,
      cause: this.cause?.message
    };
  }
}

/**
 * Retry configuration for operations
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2
};

/**
 * Execute an async function with retry logic
 * @param fn - Function to execute
 * @param config - Retry configuration
 * @param context - Error context for logging
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context?: { agentId?: string; operation: string }
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if error is retryable
      const survivalError = error instanceof SurvivalError ? error : null;
      if (survivalError && !survivalError.isRetryable()) {
        throw survivalError;
      }

      if (attempt < retryConfig.maxRetries) {
        const delay = Math.min(
          retryConfig.baseDelayMs * Math.pow(retryConfig.backoffMultiplier, attempt),
          retryConfig.maxDelayMs
        );
        console.warn(`[Survival] Retry ${attempt + 1}/${retryConfig.maxRetries} for ${context?.operation}: ${lastError.message}. Waiting ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new SurvivalError(
    `Failed after ${retryConfig.maxRetries} retries: ${lastError?.message}`,
    'UNKNOWN_ERROR',
    { agentId: context?.agentId, retryable: false, cause: lastError }
  );
}

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/** Agent health status enum */
export type AgentHealthStatus = 'healthy' | 'degraded' | 'critical' | 'dead';

/**
 * Survival mode state machine states
 */
export type SurvivalModeState = 
  | 'normal'
  | 'caution'
  | 'survival'
  | 'recovery'
  | 'shutdown';

/**
 * State transition reasons
 */
export interface StateTransition {
  from: SurvivalModeState;
  to: SurvivalModeState;
  reason: string;
  timestamp: number;
  triggeredBy: 'health' | 'economics' | 'manual' | 'automated';
}

/**
 * Survival snapshot for quick state assessment
 */
export interface SurvivalSnapshot {
  health: {
    status: AgentHealthStatus;
    overall: number;
  };
  economics: {
    balance: string;
    runwayDays: number;
  };
  timestamp: number;
}

/**
 * Agent health metrics
 */
export interface AgentHealth {
  /** Current health status */
  status: AgentHealthStatus;
  /** Last heartbeat timestamp (ms) */
  lastHeartbeat: number;
  /** Number of consecutive failures */
  consecutiveFailures: number;
  /** Total tasks completed */
  totalTasksCompleted: number;
  /** Total tasks failed */
  totalTasksFailed: number;
  /** Success rate (0-1) */
  successRate: number;
  /** Average response time in milliseconds */
  averageResponseTime: number;
}

/**
 * Agent economic metrics
 */
export interface AgentEconomics {
  /** Total earnings in USD */
  totalEarned: string;
  /** Total spent in USD */
  totalSpent: string;
  /** Current balance in USD (aggregate across all tokens) */
  currentBalance: string;
  /** Minimum balance needed for survival */
  minSurvivalBalance: string;
  /** Daily burn rate in USD */
  dailyBurnRate: string;
  /** Days of runway remaining */
  daysOfRunway: number;
  /** Multi-token balances by chain */
  tokenBalances?: Record<SupportedChain, Record<SupportedToken, string>>;
  /** Total value by token (USD) */
  tokenValues?: Record<SupportedToken, string>;
}

/**
 * Multi-token economics snapshot
 */
export interface MultiTokenEconomics {
  /** Balances for each token on each chain */
  balances: Record<SupportedChain, Record<SupportedToken, string>>;
  /** USD value for each token (would need price oracle in production) */
  estimatedValues: Record<SupportedToken, string>;
  /** Total portfolio value in USD */
  totalValueUSD: string;
  /** Chain with highest total balance */
  primaryChain: SupportedChain;
  /** Token distribution percentages */
  distribution: Record<SupportedToken, number>;
}

/**
 * Predictive survival analytics
 */
export interface SurvivalPrediction {
  /** Predicted runway in days based on trend */
  predictedRunwayDays: number;
  /** Confidence level (0-1) */
  confidence: number;
  /** Trend direction */
  trend: 'improving' | 'stable' | 'declining';
  /** Date when funds will be depleted (if trend continues) */
  projectedDepletionDate?: Date;
  /** Recommended daily earnings to maintain sustainability */
  recommendedDailyEarnings: string;
}

/**
 * Automated survival action
 */
export interface AutomatedSurvivalAction {
  /** Unique action ID */
  id: string;
  /** Action type */
  type: SurvivalActionType;
  /** Action status */
  status: 'pending' | 'executing' | 'completed' | 'failed';
  /** Action description */
  description: string;
  /** Estimated impact on survival score */
  estimatedImpact: string;
  /** Chain involved (if applicable) */
  chain?: SupportedChain;
  /** Token involved (if applicable) */
  token?: SupportedToken;
  /** Amount (if applicable) */
  amount?: string;
  /** Timestamp when action was created */
  createdAt: number;
  /** Timestamp when action was executed */
  executedAt?: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Survival check result
 */
export interface SurvivalCheckResult {
  /** Overall survival score (0-100) */
  survivalScore: number;
  /** Health component score (0-100) */
  healthScore: number;
  /** Economic component score (0-100) */
  economicsScore: number;
  /** Whether emergency funding is needed */
  needsEmergencyFunding: boolean;
  /** Recovery recommendations */
  recommendations: string[];
  /** Timestamp of check */
  timestamp: number;
}

/**
 * Heartbeat record for tracking agent liveness
 */
export interface HeartbeatRecord {
  agentId: string;
  timestamp: number;
  status: AgentHealthStatus;
  survivalScore: number;
  metadata?: Record<string, unknown>;
}

/**
 * Survival history entry for trend analysis
 */
export interface SurvivalHistoryEntry {
  timestamp: number;
  survivalScore: number;
  healthScore: number;
  economicsScore: number;
  balance: string;
  runwayDays: number;
  status: AgentHealthStatus;
}

/**
 * Chain optimization result
 */
export interface ChainOptimizationResult {
  /** Recommended chain for operation */
  recommendedChain: SupportedChain;
  /** Reason for recommendation */
  reason: string;
  /** Estimated gas cost in USD */
  estimatedGasCost: string;
  /** Current balance on recommended chain */
  availableBalance: string;
  /** Score (0-100) for this chain */
  score: number;
}

/**
 * Configuration for survival manager
 */
export interface SurvivalConfig {
  /** Minimum survival balance in USD (default: 10) */
  minSurvivalBalance: string;
  /** Daily operational cost estimate in USD (default: 1) */
  dailyBurnRate: string;
  /** Health check interval in ms (default: 60000) */
  healthCheckInterval: number;
  /** Heartbeat interval in ms (default: 30000) */
  heartbeatInterval: number;
  /** Success rate threshold for healthy status (default: 0.8) */
  healthySuccessRate: number;
  /** Critical success rate threshold (default: 0.5) */
  criticalSuccessRate: number;
  /** Max acceptable response time in ms (default: 5000) */
  maxResponseTime: number;
  /** Survival score threshold for alerts (default: 50) */
  alertThreshold: number;
  /** Enable automated survival actions (default: false) */
  enableAutomation: boolean;
  /** Minimum balance threshold for auto-bridging (default: 5) */
  autoBridgeThreshold: string;
  /** Target token for auto-bridging (default: USDC) */
  autoBridgeTargetToken: SupportedToken;
  /** Preferred chain for operations (default: base) */
  preferredChain: SupportedChain;
}

/**
 * Default survival configuration
 */
export const DEFAULT_SURVIVAL_CONFIG: SurvivalConfig = {
  minSurvivalBalance: '10',
  dailyBurnRate: '1',
  healthCheckInterval: 60000, // 1 minute
  heartbeatInterval: 30000,   // 30 seconds
  healthySuccessRate: 0.8,
  criticalSuccessRate: 0.5,
  maxResponseTime: 5000,
  alertThreshold: 50,
  enableAutomation: false,
  autoBridgeThreshold: '5',
  autoBridgeTargetToken: 'USDC',
  preferredChain: 'base'
};

/**
 * Task acceptance decision result
 */
export interface TaskDecision {
  accept: boolean;
  reason: string;
}

/**
 * Survival action types
 */
export type SurvivalActionType = 'bridge' | 'reduce_cost' | 'optimize_chain' | 'earn' | 'alert' | 'shutdown';

/**
 * Survival action priority
 */
export type SurvivalActionPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Survival action recommendation
 */
export interface SurvivalAction {
  type: SurvivalActionType;
  priority: SurvivalActionPriority;
  description: string;
  estimatedImpact: string;
  recommendedChain?: string;
}

// ============================================================================
// INPUT VALIDATION UTILITIES
// ============================================================================

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

/**
 * Validates and normalizes agent ID
 * @param agentId - Agent ID to validate
 * @returns Normalized agent ID
 * @throws SurvivalError if invalid
 */
function normalizeAgentId(agentId: unknown): string {
  if (typeof agentId !== 'string' || agentId.trim().length === 0) {
    throw new SurvivalError(
      'agentId must be a non-empty string',
      'INVALID_PARAMS',
      { retryable: false }
    );
  }
  return agentId.trim();
}

/**
 * Validates and normalizes EVM address
 * @param address - Address to validate
 * @param fieldName - Field name for error messages
 * @returns Normalized address
 * @throws SurvivalError if invalid
 */
function normalizeAddress(address: unknown, fieldName: string = 'address'): Address {
  if (typeof address !== 'string' || !ADDRESS_REGEX.test(address) || !isAddress(address, { strict: false })) {
    throw new SurvivalError(
      `${fieldName} must be a valid EVM address`,
      'INVALID_PARAMS',
      { retryable: false }
    );
  }
  return address as Address;
}

/**
 * Parses and validates a finite number
 * @param value - Value to parse
 * @param fieldName - Field name for error messages
 * @returns Parsed number
 * @throws SurvivalError if not finite
 */
function parseFiniteNumber(value: unknown, fieldName: string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new SurvivalError(
      `${fieldName} must be a finite number`,
      'INVALID_PARAMS',
      { retryable: false }
    );
  }
  return parsed;
}

/**
 * Parses and validates a non-negative number
 * @param value - Value to parse
 * @param fieldName - Field name for error messages
 * @returns Parsed non-negative number
 * @throws SurvivalError if negative
 */
function parseNonNegative(value: unknown, fieldName: string): number {
  const parsed = parseFiniteNumber(value, fieldName);
  if (parsed < 0) {
    throw new SurvivalError(
      `${fieldName} must be greater than or equal to 0`,
      'INVALID_PARAMS',
      { retryable: false }
    );
  }
  return parsed;
}

/**
 * Parses and validates a positive integer
 * @param value - Value to parse
 * @param fieldName - Field name for error messages
 * @returns Parsed positive integer
 * @throws SurvivalError if not positive integer
 */
function parsePositiveInteger(value: unknown, fieldName: string): number {
  const parsed = parseFiniteNumber(value, fieldName);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new SurvivalError(
      `${fieldName} must be a positive integer`,
      'INVALID_PARAMS',
      { retryable: false }
    );
  }
  return parsed;
}

/**
 * Parses and validates a rate between 0 and 1
 * @param value - Value to parse
 * @param fieldName - Field name for error messages
 * @returns Parsed rate
 * @throws SurvivalError if out of range
 */
function parseRate(value: unknown, fieldName: string): number {
  const parsed = parseFiniteNumber(value, fieldName);
  if (parsed < 0 || parsed > 1) {
    throw new SurvivalError(
      `${fieldName} must be between 0 and 1`,
      'INVALID_PARAMS',
      { retryable: false }
    );
  }
  return parsed;
}

/**
 * Validates and normalizes USD amount string
 * @param value - Value to validate
 * @param fieldName - Field name for error messages
 * @returns Normalized USD string
 * @throws SurvivalError if invalid
 */
function normalizeUsdString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new SurvivalError(
      `${fieldName} must be a non-empty numeric string`,
      'INVALID_PARAMS',
      { retryable: false }
    );
  }
  const parsed = parseNonNegative(value, fieldName);
  return parsed.toString();
}

/**
 * Validates survival snapshot structure
 * @param snapshot - Snapshot to validate
 * @throws SurvivalError if invalid
 */
function validateSurvivalSnapshot(snapshot: unknown): asserts snapshot is SurvivalSnapshot {
  if (!snapshot || typeof snapshot !== 'object') {
    throw new SurvivalError('snapshot must be an object', 'INVALID_PARAMS', { retryable: false });
  }
  
  const s = snapshot as Record<string, unknown>;
  
  if (!s.health || typeof s.health !== 'object') {
    throw new SurvivalError('snapshot.health is required', 'INVALID_PARAMS', { retryable: false });
  }
  
  if (!s.economics || typeof s.economics !== 'object') {
    throw new SurvivalError('snapshot.economics is required', 'INVALID_PARAMS', { retryable: false });
  }
  
  const health = s.health as Record<string, unknown>;
  const economics = s.economics as Record<string, unknown>;
  
  if (typeof health.status !== 'string') {
    throw new SurvivalError('snapshot.health.status must be a string', 'INVALID_PARAMS', { retryable: false });
  }
  
  if (typeof economics.balance !== 'string') {
    throw new SurvivalError('snapshot.economics.balance must be a string', 'INVALID_PARAMS', { retryable: false });
  }
  
  if (typeof economics.runwayDays !== 'number' || !Number.isFinite(economics.runwayDays)) {
    throw new SurvivalError('snapshot.economics.runwayDays must be a valid number', 'INVALID_PARAMS', { retryable: false });
  }
}

/**
 * Validates partial health updates
 * @param updates - Updates to validate
 * @throws SurvivalError if invalid
 */
function validateHealthUpdates(updates: unknown): asserts updates is Partial<AgentHealth> {
  if (!updates || typeof updates !== 'object') {
    throw new SurvivalError('updates must be an object', 'INVALID_PARAMS', { retryable: false });
  }
  
  const u = updates as Record<string, unknown>;
  
  if (u.successRate !== undefined) {
    parseRate(u.successRate, 'successRate');
  }
  if (u.consecutiveFailures !== undefined) {
    parseNonNegative(u.consecutiveFailures, 'consecutiveFailures');
  }
  if (u.totalTasksCompleted !== undefined) {
    parseNonNegative(u.totalTasksCompleted, 'totalTasksCompleted');
  }
  if (u.totalTasksFailed !== undefined) {
    parseNonNegative(u.totalTasksFailed, 'totalTasksFailed');
  }
  if (u.averageResponseTime !== undefined) {
    parseNonNegative(u.averageResponseTime, 'averageResponseTime');
  }
}

// ============================================================================
// STATE MACHINE
// ============================================================================

/**
 * Survival mode state machine
 * Manages transitions between survival states
 */
class SurvivalStateMachine {
  private currentState: SurvivalModeState = 'normal';
  private transitionHistory: StateTransition[] = [];
  private maxHistorySize = 100;

  /**
   * Get current state
   */
  getState(): SurvivalModeState {
    return this.currentState;
  }

  /**
   * Check if transition is valid
   */
  private isValidTransition(from: SurvivalModeState, to: SurvivalModeState): boolean {
    const validTransitions: Record<SurvivalModeState, SurvivalModeState[]> = {
      normal: ['caution', 'survival', 'shutdown'],
      caution: ['normal', 'survival', 'recovery', 'shutdown'],
      survival: ['recovery', 'shutdown', 'caution'],
      recovery: ['normal', 'caution', 'survival'],
      shutdown: [] // Terminal state
    };
    
    return validTransitions[from]?.includes(to) ?? false;
  }

  /**
   * Transition to new state
   * @param to - Target state
   * @param reason - Reason for transition
   * @param triggeredBy - What triggered the transition
   * @returns The transition record
   * @throws SurvivalError if transition is invalid
   */
  transition(
    to: SurvivalModeState,
    reason: string,
    triggeredBy: 'health' | 'economics' | 'manual' | 'automated'
  ): StateTransition {
    const from = this.currentState;
    
    if (from === to) {
      return {
        from,
        to,
        reason,
        timestamp: Date.now(),
        triggeredBy
      };
    }
    
    if (!this.isValidTransition(from, to)) {
      throw new SurvivalError(
        `Invalid state transition from ${from} to ${to}`,
        'STATE_TRANSITION_ERROR',
        { retryable: false }
      );
    }
    
    const transition: StateTransition = {
      from,
      to,
      reason,
      timestamp: Date.now(),
      triggeredBy
    };
    
    this.currentState = to;
    this.transitionHistory.push(transition);
    
    // Trim history if needed
    if (this.transitionHistory.length > this.maxHistorySize) {
      this.transitionHistory = this.transitionHistory.slice(-this.maxHistorySize);
    }
    
    console.log(`[Survival] State transition: ${from} -> ${to} (${triggeredBy}): ${reason}`);
    
    return transition;
  }

  /**
   * Get transition history
   */
  getHistory(limit: number = 50): StateTransition[] {
    return this.transitionHistory.slice(-limit);
  }

  /**
   * Determine target state based on health and economics
   */
  determineTargetState(
    health: AgentHealth,
    economics: AgentEconomics,
    minBalance: string
  ): SurvivalModeState {
    const balance = parseFloat(economics.currentBalance);
    const minBal = parseFloat(minBalance);
    
    // Shutdown conditions
    if (health.status === 'dead' || balance <= 0) {
      return 'shutdown';
    }
    
    // Survival mode conditions
    if (health.status === 'critical' || balance < minBal || economics.daysOfRunway < 3) {
      return 'survival';
    }
    
    // Caution mode conditions
    if (health.status === 'degraded' || balance < minBal * 2 || economics.daysOfRunway < 7) {
      return 'caution';
    }
    
    // Recovery if improving from survival
    if (this.currentState === 'survival' && balance >= minBal * 1.5 && economics.daysOfRunway >= 5) {
      return 'recovery';
    }
    
    // Normal operation
    return 'normal';
  }
}

// ============================================================================
// SURVIVAL EVENTS
// ============================================================================

/**
 * Survival event types
 */
export type SurvivalEventType =
  | 'health:critical'
  | 'economic:warning'
  | 'action:recommended'
  | 'survival:mode-enter'
  | 'survival:mode-exit'
  | 'state:transition'
  | 'heartbeat:sent'
  | 'heartbeat:failed';

/**
 * Event callback type
 */
export type SurvivalEventCallback = (data: {
  type: SurvivalEventType;
  agentId: string;
  timestamp: number;
  details?: Record<string, unknown>;
}) => void;

// ============================================================================
// IN-MEMORY STORAGE
// ============================================================================

/** In-memory heartbeat storage */
const heartbeatStore: Map<string, HeartbeatRecord[]> = new Map();

/** In-memory health storage */
const healthStore: Map<string, AgentHealth> = new Map();

/** In-memory economics storage */
const economicsStore: Map<string, AgentEconomics> = new Map();

/** In-memory survival history storage */
const survivalHistoryStore: Map<string, SurvivalHistoryEntry[]> = new Map();

/** In-memory automated actions storage */
const automatedActionsStore: Map<string, AutomatedSurvivalAction[]> = new Map();

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Format survival report as readable string
 * @param snapshot - Survival snapshot to format
 * @returns Formatted report string
 * @throws SurvivalError if snapshot is invalid
 */
export function formatSurvivalReport(snapshot: SurvivalSnapshot): string {
  validateSurvivalSnapshot(snapshot);
  
  const { health, economics, timestamp } = snapshot;
  const date = new Date(timestamp).toLocaleString();

  let report = `🤖 Survival Report (${date})\n`;
  report += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  report += `Health: ${health.status.toUpperCase()} (Score: ${health.overall}/100)\n`;
  report += `Balance: $${parseFloat(economics.balance).toFixed(2)}\n`;
  report += `Runway: ${economics.runwayDays} days\n`;

  // Add status indicator
  if (health.status === 'healthy' && economics.runwayDays >= 7) {
    report += `Status: ✅ Operational\n`;
  } else if (health.status === 'critical' || economics.runwayDays < 3) {
    report += `Status: 🚨 SURVIVAL MODE\n`;
  } else {
    report += `Status: ⚠️ Caution\n`;
  }

  return report;
}

/**
 * Determine if agent should accept a task based on survival state
 * @param snapshot - Current survival snapshot
 * @param budget - Task budget in USD
 * @param estimatedCost - Estimated task cost in USD
 * @param minProfitMargin - Minimum required profit margin (0-1)
 * @returns Task decision result
 * @throws SurvivalError if parameters are invalid
 */
export function shouldAcceptTask(
  snapshot: SurvivalSnapshot,
  budget: string,
  estimatedCost: string,
  minProfitMargin: number = 0.1
): TaskDecision {
  // Validate inputs
  validateSurvivalSnapshot(snapshot);
  
  if (typeof budget !== 'string' || budget.trim().length === 0) {
    throw new SurvivalError('budget must be a non-empty string', 'INVALID_PARAMS', { retryable: false });
  }
  
  if (typeof estimatedCost !== 'string' || estimatedCost.trim().length === 0) {
    throw new SurvivalError('estimatedCost must be a non-empty string', 'INVALID_PARAMS', { retryable: false });
  }
  
  const margin = parseRate(minProfitMargin, 'minProfitMargin');
  const balance = parseFloat(snapshot.economics.balance);
  const taskBudget = parseFloat(budget);
  const cost = parseFloat(estimatedCost);
  const minBalance = parseFloat(DEFAULT_SURVIVAL_CONFIG.minSurvivalBalance);

  if (![balance, taskBudget, cost, minBalance].every((value) => Number.isFinite(value))) {
    throw new SurvivalError(
      'snapshot, budget, and estimatedCost must contain valid numeric values',
      'INVALID_PARAMS',
      { retryable: false }
    );
  }

  // Check survival mode
  if (snapshot.health.status === 'critical' || snapshot.health.status === 'dead') {
    return {
      accept: false,
      reason: `Health status is ${snapshot.health.status}. Focus on recovery.`
    };
  }

  // Check runway
  if (snapshot.economics.runwayDays < 3) {
    return {
      accept: false,
      reason: `Critical runway: only ${snapshot.economics.runwayDays} days remaining`
    };
  }

  // Check if balance is too low
  if (balance < minBalance) {
    return {
      accept: false,
      reason: `Balance ($${balance.toFixed(2)}) below minimum ($${minBalance.toFixed(2)})`
    };
  }

  // Check profitability
  const profit = taskBudget - cost;
  const profitMargin = cost > 0 ? profit / cost : 0;

  if (profitMargin < margin) {
    return {
      accept: false,
      reason: `Profit margin (${(profitMargin * 100).toFixed(1)}%) below minimum (${(margin * 100).toFixed(0)}%)`
    };
  }

  // Check if we can afford the cost
  if (cost > balance * 0.5) {
    return {
      accept: false,
      reason: `Task cost ($${cost.toFixed(2)}) exceeds 50% of available balance`
    };
  }

  return {
    accept: true,
    reason: `Task profitable (${(profitMargin * 100).toFixed(1)}% margin) and within budget constraints`
  };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Normalizes and validates survival configuration
 * @param config - Configuration to normalize
 * @returns Normalized configuration
 * @throws SurvivalError if configuration is invalid
 */
function normalizeSurvivalConfig(config: Partial<SurvivalConfig>): SurvivalConfig {
  if (!config || typeof config !== 'object') {
    throw new SurvivalError('config must be an object', 'INVALID_PARAMS', { retryable: false });
  }

  const minSurvivalBalance = normalizeUsdString(config.minSurvivalBalance ?? DEFAULT_SURVIVAL_CONFIG.minSurvivalBalance, 'minSurvivalBalance');
  const dailyBurnRate = normalizeUsdString(config.dailyBurnRate ?? DEFAULT_SURVIVAL_CONFIG.dailyBurnRate, 'dailyBurnRate');
  const autoBridgeThreshold = normalizeUsdString(config.autoBridgeThreshold ?? DEFAULT_SURVIVAL_CONFIG.autoBridgeThreshold, 'autoBridgeThreshold');
  const healthCheckInterval = parsePositiveInteger(config.healthCheckInterval ?? DEFAULT_SURVIVAL_CONFIG.healthCheckInterval, 'healthCheckInterval');
  const heartbeatInterval = parsePositiveInteger(config.heartbeatInterval ?? DEFAULT_SURVIVAL_CONFIG.heartbeatInterval, 'heartbeatInterval');
  const healthySuccessRate = parseRate(config.healthySuccessRate ?? DEFAULT_SURVIVAL_CONFIG.healthySuccessRate, 'healthySuccessRate');
  const criticalSuccessRate = parseRate(config.criticalSuccessRate ?? DEFAULT_SURVIVAL_CONFIG.criticalSuccessRate, 'criticalSuccessRate');
  const maxResponseTime = parsePositiveInteger(config.maxResponseTime ?? DEFAULT_SURVIVAL_CONFIG.maxResponseTime, 'maxResponseTime');
  const alertThreshold = parseNonNegative(config.alertThreshold ?? DEFAULT_SURVIVAL_CONFIG.alertThreshold, 'alertThreshold');
  
  // Validate chain
  const preferredChain = config.preferredChain ?? DEFAULT_SURVIVAL_CONFIG.preferredChain;
  const validChains = ['ethereum', 'base', 'optimism', 'arbitrum', 'polygon', 'avalanche', 'bsc'];
  if (!validChains.includes(preferredChain)) {
    throw new SurvivalError(
      `preferredChain must be one of: ${validChains.join(', ')}`,
      'INVALID_PARAMS',
      { retryable: false }
    );
  }
  
  // Validate token
  const autoBridgeTargetToken = config.autoBridgeTargetToken ?? DEFAULT_SURVIVAL_CONFIG.autoBridgeTargetToken;
  if (!SUPPORTED_TOKENS.includes(autoBridgeTargetToken as SupportedToken)) {
    throw new SurvivalError(
      `autoBridgeTargetToken must be one of: ${SUPPORTED_TOKENS.join(', ')}`,
      'INVALID_PARAMS',
      { retryable: false }
    );
  }

  if (criticalSuccessRate > healthySuccessRate) {
    throw new SurvivalError(
      'criticalSuccessRate must be less than or equal to healthySuccessRate',
      'INVALID_PARAMS',
      { retryable: false }
    );
  }

  return {
    minSurvivalBalance,
    dailyBurnRate,
    autoBridgeThreshold,
    healthCheckInterval,
    heartbeatInterval,
    healthySuccessRate,
    criticalSuccessRate,
    maxResponseTime,
    alertThreshold,
    enableAutomation: config.enableAutomation ?? DEFAULT_SURVIVAL_CONFIG.enableAutomation,
    autoBridgeTargetToken: autoBridgeTargetToken as SupportedToken,
    preferredChain: preferredChain as SupportedChain
  };
}

// ============================================================================
// SURVIVAL MANAGER
// ============================================================================

/**
 * Echo Survival Manager
 * Manages agent health and economic sustainability
 */
export class EchoSurvivalManager {
  private config: SurvivalConfig;
  private agentId: string;
  private address: Address;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private eventListeners: Map<SurvivalEventType, Set<SurvivalEventCallback>> = new Map();
  private survivalMode: boolean = false;

  constructor(
    agentId: string,
    address: Address,
    config: Partial<SurvivalConfig> = {}
  ) {
    this.agentId = agentId;
    this.address = address;
    this.config = { ...DEFAULT_SURVIVAL_CONFIG, ...config };

    // Initialize stores
    if (!heartbeatStore.has(agentId)) {
      heartbeatStore.set(agentId, []);
    }
    if (!healthStore.has(agentId)) {
      healthStore.set(agentId, this.createInitialHealth());
    }
    if (!economicsStore.has(agentId)) {
      economicsStore.set(agentId, this.createInitialEconomics());
    }
  }

  /**
   * Register event listener
   */
  on(event: SurvivalEventType, callback: SurvivalEventCallback): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: SurvivalEventType, details?: Record<string, unknown>): void {
    const callbacks = this.eventListeners.get(event);
    if (callbacks) {
      const data = {
        type: event,
        agentId: this.agentId,
        timestamp: Date.now(),
        details
      };
      callbacks.forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Event handler error for ${event}:`, err);
        }
      });
    }
  }

  /**
   * Start periodic health checks and heartbeats
   */
  start(): void {
    if (this.healthCheckTimer || this.heartbeatTimer) {
      console.warn('Survival manager already started');
      return;
    }

    // Start health check interval
    this.healthCheckTimer = setInterval(async () => {
      await this.runPeriodicHealthCheck();
    }, this.config.healthCheckInterval);

    // Start heartbeat interval
    this.heartbeatTimer = setInterval(async () => {
      await this.sendHeartbeat({ source: 'periodic' });
    }, this.config.heartbeatInterval);

    console.log(`Survival manager started for agent ${this.agentId}`);
  }

  /**
   * Stop periodic checks and heartbeats
   */
  stop(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    console.log(`Survival manager stopped for agent ${this.agentId}`);
  }

  /**
   * Run periodic health check and emit events
   */
  private async runPeriodicHealthCheck(): Promise<void> {
    const health = this.checkHealth(this.agentId);
    const economics = await this.checkEconomics();

    // Check health status changes
    if (health.status === 'critical') {
      this.emit('health:critical', { status: health.status, successRate: health.successRate });
    }

    // Check economic warnings
    const balance = parseFloat(economics.currentBalance);
    const minBalance = parseFloat(this.config.minSurvivalBalance);
    if (balance < minBalance || economics.daysOfRunway < 7) {
      this.emit('economic:warning', { balance, runwayDays: economics.daysOfRunway });
    }

    // Check survival mode transitions
    const shouldBeInSurvivalMode = health.status === 'critical' || health.status === 'dead' || balance < minBalance || economics.daysOfRunway < 3;

    if (shouldBeInSurvivalMode && !this.survivalMode) {
      this.survivalMode = true;
      this.emit('survival:mode-enter', { balance, healthStatus: health.status });
    } else if (!shouldBeInSurvivalMode && this.survivalMode) {
      this.survivalMode = false;
      this.emit('survival:mode-exit', { balance, healthStatus: health.status });
    }

    // Emit action recommendations
    const recommendations = await this.getRecoveryRecommendations();
    if (recommendations.length > 0) {
      this.emit('action:recommended', { recommendations });
    }
  }

  /**
   * Check if agent is in survival mode
   */
  isInSurvivalMode(): boolean {
    return this.survivalMode;
  }

  /**
   * Get optimal chain for an operation based on balances
   */
  async getOptimalChain(operation: 'read' | 'write' | 'bridge' = 'read'): Promise<SupportedChain | null> {
    const balances = await this.checkEconomics();

    // Simple heuristic: prefer chains with sufficient balance
    // In production, this would consider gas costs, latency, etc.
    if (parseFloat(balances.currentBalance) > 0) {
      // Return the first supported chain (could be enhanced with chain selection logic)
      return 'arbitrum';
    }

    return null;
  }

  /**
   * Perform full survival check and return snapshot
   */
  async performSurvivalCheck(balances?: ChainBalance[]): Promise<SurvivalSnapshot> {
    const health = this.checkHealth(this.agentId);
    const economics = await this.checkEconomics();

    // Calculate health score
    const healthScore = this.calculateHealthScore(health);

    // Update survival mode based on check
    const balance = parseFloat(economics.currentBalance);
    const minBalance = parseFloat(this.config.minSurvivalBalance);
    const shouldBeInSurvivalMode = health.status === 'critical' || health.status === 'dead' || balance < minBalance || economics.daysOfRunway < 3;

    if (shouldBeInSurvivalMode !== this.survivalMode) {
      this.survivalMode = shouldBeInSurvivalMode;
      if (this.survivalMode) {
        this.emit('survival:mode-enter', { balance, healthStatus: health.status });
      } else {
        this.emit('survival:mode-exit', { balance, healthStatus: health.status });
      }
    }

    return {
      health: {
        status: health.status,
        overall: Math.round(healthScore)
      },
      economics: {
        balance: economics.currentBalance,
        runwayDays: economics.daysOfRunway
      },
      timestamp: Date.now()
    };
  }

  /**
   * Create initial health state
   */
  private createInitialHealth(): AgentHealth {
    return {
      status: 'healthy',
      lastHeartbeat: Date.now(),
      consecutiveFailures: 0,
      totalTasksCompleted: 0,
      totalTasksFailed: 0,
      successRate: 1.0,
      averageResponseTime: 0
    };
  }

  /**
   * Create initial economics state
   */
  private createInitialEconomics(): AgentEconomics {
    return {
      totalEarned: '0',
      totalSpent: '0',
      currentBalance: '0',
      minSurvivalBalance: this.config.minSurvivalBalance,
      dailyBurnRate: this.config.dailyBurnRate,
      daysOfRunway: 0
    };
  }

  /**
   * Check agent health status
   */
  checkHealth(agentId: string): AgentHealth {
    const health = healthStore.get(agentId);
    if (!health) {
      throw new Error(`Agent ${agentId} not found`);
    }
    return { ...health };
  }

  /**
   * Check agent economic status across all chains
   * @param address Optional address to check (defaults to manager's address)
   * @param fetchBalance Whether to fetch live balance from chain (default: false for tests)
   */
  async checkEconomics(address?: Address, fetchBalance: boolean = false): Promise<AgentEconomics> {
    // Get stored economics or create new
    const existing = economicsStore.get(this.agentId) || this.createInitialEconomics();
    
    let currentBalance = parseFloat(existing.currentBalance);
    
    // Only fetch live balance if explicitly requested (avoids network calls in tests)
    if (fetchBalance) {
      const targetAddress = address || this.address;
      const balances = await getAllBalances(targetAddress);
      currentBalance = balances.reduce((sum, b) => {
        return sum + parseFloat(b.usdcBalance);
      }, 0);
    }
    
    // Calculate days of runway
    const burnRate = parseFloat(this.config.dailyBurnRate);
    const daysOfRunway = burnRate > 0 ? Math.floor(currentBalance / burnRate) : 999;
    
    const economics: AgentEconomics = {
      ...existing,
      currentBalance: currentBalance.toFixed(6),
      minSurvivalBalance: this.config.minSurvivalBalance,
      dailyBurnRate: this.config.dailyBurnRate,
      daysOfRunway
    };
    
    economicsStore.set(this.agentId, economics);
    return { ...economics };
  }

  /**
   * Calculate survival score (0-100)
   * Based on health and economics
   */
  async calculateSurvivalScore(): Promise<number> {
    const health = this.checkHealth(this.agentId);
    const economics = await this.checkEconomics();
    
    // Calculate health score (0-50)
    const healthScore = this.calculateHealthScore(health);
    
    // Calculate economics score (0-50)
    const economicsScore = this.calculateEconomicsScore(economics);
    
    // Total survival score
    return Math.min(100, Math.max(0, healthScore + economicsScore));
  }

  /**
   * Calculate health component score (0-50)
   */
  private calculateHealthScore(health: AgentHealth): number {
    let score = 50;
    
    // Adjust based on success rate
    if (health.successRate >= this.config.healthySuccessRate) {
      score = 50;
    } else if (health.successRate >= this.config.criticalSuccessRate) {
      score = 25 + (health.successRate - this.config.criticalSuccessRate) * 50;
    } else {
      score = health.successRate * 50;
    }
    
    // Penalize for consecutive failures
    score -= health.consecutiveFailures * 5;
    
    // Penalize for high response time
    if (health.averageResponseTime > this.config.maxResponseTime) {
      score -= 10;
    }
    
    return Math.max(0, score);
  }

  /**
   * Calculate economics component score (0-50)
   */
  private calculateEconomicsScore(economics: AgentEconomics): number {
    const balance = parseFloat(economics.currentBalance);
    const minBalance = parseFloat(economics.minSurvivalBalance);
    
    if (balance <= 0) return 0;
    if (balance < minBalance) return Math.floor((balance / minBalance) * 25);
    
    // Base 25 points for meeting minimum
    let score = 25;
    
    // Additional points for runway
    if (economics.daysOfRunway >= 30) score += 25;
    else if (economics.daysOfRunway >= 14) score += 20;
    else if (economics.daysOfRunway >= 7) score += 15;
    else if (economics.daysOfRunway >= 3) score += 10;
    else score += 5;
    
    return score;
  }

  /**
   * Get recovery recommendations based on current state
   */
  async getRecoveryRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];
    const health = this.checkHealth(this.agentId);
    const economics = await this.checkEconomics();
    
    // Health recommendations
    if (health.successRate < this.config.healthySuccessRate) {
      recommendations.push(`Improve success rate: currently ${(health.successRate * 100).toFixed(1)}%, target ${(this.config.healthySuccessRate * 100).toFixed(0)}%`);
    }
    
    if (health.consecutiveFailures > 3) {
      recommendations.push(`Address repeated failures: ${health.consecutiveFailures} consecutive failures detected`);
    }
    
    if (health.averageResponseTime > this.config.maxResponseTime) {
      recommendations.push(`Optimize response time: currently ${health.averageResponseTime}ms, target <${this.config.maxResponseTime}ms`);
    }
    
    // Economic recommendations
    const balance = parseFloat(economics.currentBalance);
    const minBalance = parseFloat(economics.minSurvivalBalance);
    
    if (balance < minBalance) {
      recommendations.push(`URGENT: Balance below minimum. Current: $${balance.toFixed(2)}, Minimum: $${minBalance.toFixed(2)}`);
      recommendations.push(`Request emergency funding or reduce operational costs`);
    }
    
    if (economics.daysOfRunway < 7) {
      recommendations.push(`Low runway: ${economics.daysOfRunway} days remaining. Seek additional revenue streams`);
    }
    
    if (balance > minBalance * 5 && economics.daysOfRunway > 30) {
      recommendations.push(`Healthy financial state: Consider expanding capabilities or reducing prices to increase competitiveness`);
    }
    
    return recommendations;
  }

  /**
   * Send heartbeat signal
   */
  async sendHeartbeat(metadata?: Record<string, unknown>): Promise<HeartbeatRecord> {
    const survivalScore = await this.calculateSurvivalScore();
    const health = this.checkHealth(this.agentId);
    
    const record: HeartbeatRecord = {
      agentId: this.agentId,
      timestamp: Date.now(),
      status: health.status,
      survivalScore,
      metadata
    };
    
    // Store heartbeat
    const heartbeats = heartbeatStore.get(this.agentId) || [];
    heartbeats.push(record);
    
    // Keep only last 1000 heartbeats
    if (heartbeats.length > 1000) {
      heartbeats.shift();
    }
    
    heartbeatStore.set(this.agentId, heartbeats);
    
    // Update health
    health.lastHeartbeat = record.timestamp;
    healthStore.set(this.agentId, health);
    
    return record;
  }

  /**
   * Check if emergency funding is needed
   */
  async needsEmergencyFunding(): Promise<boolean> {
    const economics = await this.checkEconomics();
    const balance = parseFloat(economics.currentBalance);
    const minBalance = parseFloat(economics.minSurvivalBalance);
    
    return balance < minBalance || economics.daysOfRunway < 3;
  }

  /**
   * Perform full survival check with detailed results
   */
  async performFullSurvivalCheck(): Promise<SurvivalCheckResult> {
    const [health, economics, survivalScore, recommendations, needsEmergency] = await Promise.all([
      Promise.resolve(this.checkHealth(this.agentId)),
      this.checkEconomics(),
      this.calculateSurvivalScore(),
      this.getRecoveryRecommendations(),
      this.needsEmergencyFunding()
    ]);

    return {
      survivalScore,
      healthScore: this.calculateHealthScore(health),
      economicsScore: this.calculateEconomicsScore(economics),
      needsEmergencyFunding: needsEmergency,
      recommendations,
      timestamp: Date.now()
    };
  }

  /**
   * Update health metrics
   */
  updateHealth(updates: Partial<AgentHealth>): AgentHealth {
    const current = healthStore.get(this.agentId);
    if (!current) {
      throw new Error(`Agent ${this.agentId} not found`);
    }
    
    const updated: AgentHealth = {
      ...current,
      ...updates,
      lastHeartbeat: Date.now()
    };
    
    // Auto-determine status based on metrics
    if (updated.consecutiveFailures >= 5 || updated.successRate < 0.3) {
      updated.status = 'dead';
    } else if (updated.successRate < this.config.criticalSuccessRate || updated.consecutiveFailures >= 3) {
      updated.status = 'critical';
    } else if (updated.successRate < this.config.healthySuccessRate) {
      updated.status = 'degraded';
    } else {
      updated.status = 'healthy';
    }
    
    healthStore.set(this.agentId, updated);
    return { ...updated };
  }

  /**
   * Record task completion
   */
  recordTaskCompleted(responseTimeMs: number): void {
    const health = healthStore.get(this.agentId);
    if (!health) return;
    
    health.totalTasksCompleted++;
    health.consecutiveFailures = 0;
    
    // Update average response time
    const totalTasks = health.totalTasksCompleted + health.totalTasksFailed;
    health.averageResponseTime = 
      (health.averageResponseTime * (totalTasks - 1) + responseTimeMs) / totalTasks;
    
    // Update success rate
    health.successRate = health.totalTasksCompleted / totalTasks;
    
    healthStore.set(this.agentId, health);
  }

  /**
   * Record task failure
   */
  recordTaskFailed(): void {
    const health = healthStore.get(this.agentId);
    if (!health) return;
    
    health.totalTasksFailed++;
    health.consecutiveFailures++;
    
    // Update success rate
    const totalTasks = health.totalTasksCompleted + health.totalTasksFailed;
    health.successRate = health.totalTasksCompleted / totalTasks;
    
    healthStore.set(this.agentId, health);
  }

  /**
   * Record earnings
   */
  recordEarnings(amount: string): void {
    const economics = economicsStore.get(this.agentId);
    if (!economics) return;
    
    const current = parseFloat(economics.totalEarned);
    const addition = parseFloat(amount);
    economics.totalEarned = (current + addition).toFixed(6);
    
    // Update current balance (earnings - spending)
    const totalEarned = parseFloat(economics.totalEarned);
    const totalSpent = parseFloat(economics.totalSpent);
    economics.currentBalance = (totalEarned - totalSpent).toFixed(6);
    
    // Update runway
    const burnRate = parseFloat(this.config.dailyBurnRate);
    const currentBalance = parseFloat(economics.currentBalance);
    economics.daysOfRunway = burnRate > 0 ? Math.floor(currentBalance / burnRate) : 999;
    
    economicsStore.set(this.agentId, economics);
  }

  /**
   * Record spending
   */
  recordSpending(amount: string): void {
    const economics = economicsStore.get(this.agentId);
    if (!economics) return;
    
    const current = parseFloat(economics.totalSpent);
    const addition = parseFloat(amount);
    economics.totalSpent = (current + addition).toFixed(6);
    
    // Update current balance (earnings - spending)
    const totalEarned = parseFloat(economics.totalEarned);
    const totalSpent = parseFloat(economics.totalSpent);
    economics.currentBalance = (totalEarned - totalSpent).toFixed(6);
    
    // Update runway
    const burnRate = parseFloat(this.config.dailyBurnRate);
    const currentBalance = parseFloat(economics.currentBalance);
    economics.daysOfRunway = burnRate > 0 ? Math.floor(currentBalance / burnRate) : 999;
    
    economicsStore.set(this.agentId, economics);
  }

  /**
   * Get heartbeat history
   */
  getHeartbeatHistory(limit: number = 100): HeartbeatRecord[] {
    const heartbeats = heartbeatStore.get(this.agentId) || [];
    return heartbeats.slice(-limit);
  }

  /**
   * Get agent ID
   */
  getAgentId(): string {
    return this.agentId;
  }

  /**
   * Get agent address
   */
  getAddress(): Address {
    return this.address;
  }

  /**
   * Get current configuration
   */
  getConfig(): SurvivalConfig {
    return { ...this.config };
  }

  // ============================================================================
  // NEW ENHANCED FEATURES - Multi-Token & Predictive Analytics
  // ============================================================================

  /**
   * Check multi-token economics across all chains
   * Fetches real-time balances for all supported tokens
   */
  async checkMultiTokenEconomics(): Promise<MultiTokenEconomics> {
    const balances = await getAllTokenBalances(this.address);

    // Calculate estimated USD values (simplified - in production would use price oracle)
    const estimatedValues: Record<SupportedToken, string> = {
      USDC: '0',
      USDT: '0',
      DAI: '0',
      WETH: '0'
    };

    let totalValueUSD = 0;
    const chainTotals: Record<SupportedChain, number> = {
      ethereum: 0,
      base: 0,
      optimism: 0,
      arbitrum: 0,
      polygon: 0,
      avalanche: 0,
      bsc: 0
    };

    // Aggregate values by token and chain
    for (const chain of Object.keys(balances) as SupportedChain[]) {
      for (const token of SUPPORTED_TOKENS) {
        const balance = parseFloat(balances[chain][token]);

        // Simple USD estimation (1 token = $1 for stablecoins, WETH needs price)
        let usdValue = 0;
        if (token === 'WETH') {
          // Assume WETH = $3000 for estimation
          usdValue = balance * 3000;
        } else {
          // Stablecoins
          usdValue = balance;
        }

        estimatedValues[token] = (parseFloat(estimatedValues[token]) + usdValue).toFixed(2);
        totalValueUSD += usdValue;
        chainTotals[chain] += usdValue;
      }
    }

    // Find primary chain (chain with highest balance)
    let primaryChain: SupportedChain = 'base';
    let maxChainValue = 0;
    for (const [chain, value] of Object.entries(chainTotals)) {
      if (value > maxChainValue) {
        maxChainValue = value;
        primaryChain = chain as SupportedChain;
      }
    }

    // Calculate distribution percentages
    const distribution: Record<SupportedToken, number> = {
      USDC: totalValueUSD > 0 ? (parseFloat(estimatedValues.USDC) / totalValueUSD) * 100 : 0,
      USDT: totalValueUSD > 0 ? (parseFloat(estimatedValues.USDT) / totalValueUSD) * 100 : 0,
      DAI: totalValueUSD > 0 ? (parseFloat(estimatedValues.DAI) / totalValueUSD) * 100 : 0,
      WETH: totalValueUSD > 0 ? (parseFloat(estimatedValues.WETH) / totalValueUSD) * 100 : 0
    };

    // Update stored economics with token data
    const economics = economicsStore.get(this.agentId);
    if (economics) {
      economics.tokenBalances = balances;
      economics.tokenValues = estimatedValues;
      economics.currentBalance = totalValueUSD.toFixed(2);
      economicsStore.set(this.agentId, economics);
    }

    return {
      balances,
      estimatedValues,
      totalValueUSD: totalValueUSD.toFixed(2),
      primaryChain,
      distribution
    };
  }

  /**
   * Get optimal chain for an operation based on multi-token balances and gas costs
   * Considers: balance availability, gas costs, token requirements
   */
  async getOptimalChainForOperation(
    operation: 'read' | 'write' | 'bridge' | 'swap',
    preferredToken?: SupportedToken
  ): Promise<ChainOptimizationResult> {
    const multiTokenEconomics = await this.checkMultiTokenEconomics();
    const balances = multiTokenEconomics.balances;

    // Gas cost estimates by chain (in USD)
    const gasCosts: Record<SupportedChain, Record<string, number>> = {
      ethereum: { read: 0.5, write: 2.0, bridge: 5.0, swap: 3.0 },
      base: { read: 0.001, write: 0.01, bridge: 0.02, swap: 0.015 },
      optimism: { read: 0.002, write: 0.015, bridge: 0.025, swap: 0.02 },
      arbitrum: { read: 0.003, write: 0.02, bridge: 0.03, swap: 0.025 },
      polygon: { read: 0.001, write: 0.01, bridge: 0.02, swap: 0.015 },
      avalanche: { read: 0.002, write: 0.015, bridge: 0.025, swap: 0.02 },
      bsc: { read: 0.001, write: 0.005, bridge: 0.01, swap: 0.008 }
    };

    let bestChain: SupportedChain = this.config.preferredChain;
    let bestScore = -1;
    let bestReason = '';

    for (const chain of Object.keys(balances) as SupportedChain[]) {
      const chainBalances = balances[chain];
      let totalBalance = 0;

      // Calculate total USD value on this chain
      for (const token of SUPPORTED_TOKENS) {
        const balance = parseFloat(chainBalances[token]);
        if (token === 'WETH') {
          totalBalance += balance * 3000; // WETH price estimate
        } else {
          totalBalance += balance;
        }
      }

      // Check if preferred token is available
      const hasPreferredToken = preferredToken && parseFloat(chainBalances[preferredToken]) > 0;

      // Calculate score (0-100)
      // Factors: balance availability (50%), gas cost (30%), preferred token (20%)
      const gasCost = gasCosts[chain][operation] || 0.01;
      const balanceScore = Math.min(50, (totalBalance / 100) * 50); // Max 50 points
      const gasScore = Math.max(0, 30 - gasCost * 10); // Lower gas = higher score
      const tokenScore = hasPreferredToken ? 20 : 0;
      const score = balanceScore + gasScore + tokenScore;

      if (score > bestScore) {
        bestScore = score;
        bestChain = chain;
        bestReason = hasPreferredToken
          ? `Chain has ${preferredToken} and optimal gas costs`
          : `Optimal balance/gas cost ratio (${totalBalance.toFixed(2)} USD available)`;
      }
    }

    const gasCost = gasCosts[bestChain][operation] || 0.01;
    const availableBalance = Object.values(balances[bestChain]).reduce((sum, bal, idx) => {
      const token = SUPPORTED_TOKENS[idx];
      const value = parseFloat(bal);
      return sum + (token === 'WETH' ? value * 3000 : value);
    }, 0);

    return {
      recommendedChain: bestChain,
      reason: bestReason,
      estimatedGasCost: gasCost.toFixed(4),
      availableBalance: availableBalance.toFixed(2),
      score: Math.round(bestScore)
    };
  }

  /**
   * Generate predictive survival analytics based on historical data
   * Uses trend analysis to predict future runway
   */
  async predictSurvivalTrend(): Promise<SurvivalPrediction> {
    const history = this.getSurvivalHistory(30); // Last 30 data points
    const currentEconomics = await this.checkEconomics();

    if (history.length < 3) {
      // Not enough data for prediction
      return {
        predictedRunwayDays: currentEconomics.daysOfRunway,
        confidence: 0.3,
        trend: 'stable',
        recommendedDailyEarnings: this.config.dailyBurnRate
      };
    }

    // Calculate trend from history
    const recent = history.slice(-7); // Last 7 data points
    const older = history.slice(0, Math.min(7, history.length)); // First 7 data points

    const recentAvgBalance = recent.reduce((sum, h) => sum + parseFloat(h.balance), 0) / recent.length;
    const olderAvgBalance = older.reduce((sum, h) => sum + parseFloat(h.balance), 0) / older.length;

    // Calculate daily change rate
    const daysSpan = (recent[recent.length - 1].timestamp - older[0].timestamp) / (1000 * 60 * 60 * 24);
    const dailyChange = daysSpan > 0 ? (recentAvgBalance - olderAvgBalance) / daysSpan : 0;

    // Determine trend
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (dailyChange > 1) trend = 'improving';
    else if (dailyChange < -1) trend = 'declining';

    // Calculate predicted runway
    const currentBalance = parseFloat(currentEconomics.currentBalance);
    const burnRate = parseFloat(this.config.dailyBurnRate);
    const netDailyBurn = burnRate - dailyChange; // Adjust burn rate by earnings trend

    let predictedRunway = netDailyBurn > 0 ? Math.floor(currentBalance / netDailyBurn) : 999;

    // Calculate confidence based on data consistency
    const variance = this.calculateVariance(history.map(h => parseFloat(h.balance)));
    const confidence = Math.min(0.9, 0.3 + (history.length / 100) * 0.6 - variance * 0.1);

    // Project depletion date
    let projectedDepletionDate: Date | undefined;
    if (predictedRunway < 365 && predictedRunway > 0) {
      projectedDepletionDate = new Date(Date.now() + predictedRunway * 24 * 60 * 60 * 1000);
    }

    // Calculate recommended daily earnings to maintain sustainability
    const recommendedDailyEarnings = burnRate + (currentBalance / 30); // Target 30-day sustainability

    return {
      predictedRunwayDays: predictedRunway,
      confidence,
      trend,
      projectedDepletionDate,
      recommendedDailyEarnings: Math.max(0, recommendedDailyEarnings).toFixed(2)
    };
  }

  /**
   * Calculate variance for confidence scoring
   */
  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
  }

  /**
   * Generate automated survival actions based on current state
   * Creates actionable recommendations that can be auto-executed
   */
  async generateAutomatedActions(): Promise<AutomatedSurvivalAction[]> {
    const actions: AutomatedSurvivalAction[] = [];
    const multiTokenEconomics = await this.checkMultiTokenEconomics();
    const prediction = await this.predictSurvivalTrend();
    const health = this.checkHealth(this.agentId);

    // Action 1: Bridge funds if primary chain is low but other chains have balance
    const primaryChain = multiTokenEconomics.primaryChain;
    const primaryBalance = parseFloat(multiTokenEconomics.balances[primaryChain]['USDC']);
    const autoBridgeThreshold = parseFloat(this.config.autoBridgeThreshold);

    if (primaryBalance < autoBridgeThreshold) {
      // Find chain with highest USDC balance
      let bestSourceChain: SupportedChain | null = null;
      let maxSourceBalance = 0;

      for (const chain of Object.keys(multiTokenEconomics.balances) as SupportedChain[]) {
        if (chain === primaryChain) continue;
        const balance = parseFloat(multiTokenEconomics.balances[chain]['USDC']);
        if (balance > maxSourceBalance && balance > autoBridgeThreshold) {
          maxSourceBalance = balance;
          bestSourceChain = chain;
        }
      }

      if (bestSourceChain) {
        actions.push({
          id: `bridge-${Date.now()}`,
          type: 'bridge',
          status: 'pending',
          description: `Bridge USDC from ${bestSourceChain} to ${primaryChain}`,
          estimatedImpact: `+${(maxSourceBalance * 0.9).toFixed(2)} USD on primary chain`,
          chain: bestSourceChain,
          token: 'USDC',
          amount: (maxSourceBalance * 0.9).toFixed(2),
          createdAt: Date.now()
        });
      }
    }

    // Action 2: Optimize chain if current chain has high gas costs
    const optimalChain = await this.getOptimalChainForOperation('write');
    if (optimalChain.recommendedChain !== primaryChain && optimalChain.score > 70) {
      actions.push({
        id: `optimize-${Date.now()}`,
        type: 'optimize_chain',
        status: 'pending',
        description: `Switch operations to ${optimalChain.recommendedChain} for lower costs`,
        estimatedImpact: `Save ~${(parseFloat(optimalChain.estimatedGasCost) * 10).toFixed(2)} USD per 10 operations`,
        chain: optimalChain.recommendedChain,
        createdAt: Date.now()
      });
    }

    // Action 3: Reduce costs if in survival mode
    if (this.survivalMode || prediction.trend === 'declining') {
      actions.push({
        id: `reduce-cost-${Date.now()}`,
        type: 'reduce_cost',
        status: 'pending',
        description: 'Reduce operational costs - prioritize high-value tasks only',
        estimatedImpact: 'Reduce daily burn by ~30%',
        createdAt: Date.now()
      });
    }

    // Action 4: Alert if critical
    if (health.status === 'critical' || prediction.predictedRunwayDays < 3) {
      actions.push({
        id: `alert-${Date.now()}`,
        type: 'alert',
        status: 'pending',
        description: `Critical survival alert: ${prediction.predictedRunwayDays} days runway remaining`,
        estimatedImpact: 'Immediate attention required',
        createdAt: Date.now()
      });
    }

    // Action 5: Earn recommendation if balance is healthy
    if (parseFloat(multiTokenEconomics.totalValueUSD) > parseFloat(this.config.minSurvivalBalance) * 3) {
      actions.push({
        id: `earn-${Date.now()}`,
        type: 'earn',
        status: 'pending',
        description: 'Healthy balance - consider expanding task acceptance',
        estimatedImpact: `Potential +${prediction.recommendedDailyEarnings} USD daily revenue`,
        createdAt: Date.now()
      });
    }

    // Store actions
    const existingActions = automatedActionsStore.get(this.agentId) || [];
    automatedActionsStore.set(this.agentId, [...existingActions, ...actions]);

    return actions;
  }

  /**
   * Execute an automated survival action
   */
  async executeAutomatedAction(actionId: string): Promise<boolean> {
    const actions = automatedActionsStore.get(this.agentId) || [];
    const action = actions.find(a => a.id === actionId);

    if (!action || action.status !== 'pending') {
      return false;
    }

    action.status = 'executing';
    action.executedAt = Date.now();

    try {
      // Execute based on action type
      switch (action.type) {
        case 'bridge':
          // In production, this would call the bridge module
          console.log(`[Survival] Executing bridge: ${action.amount} ${action.token} from ${action.chain}`);
          // Simulate bridge execution
          await new Promise(resolve => setTimeout(resolve, 1000));
          break;

        case 'optimize_chain':
          // Update preferred chain in config
          if (action.chain) {
            this.config.preferredChain = action.chain;
            console.log(`[Survival] Optimized to chain: ${action.chain}`);
          }
          break;

        case 'reduce_cost':
          // Reduce daily burn rate
          const currentBurn = parseFloat(this.config.dailyBurnRate);
          this.config.dailyBurnRate = (currentBurn * 0.7).toFixed(2);
          console.log(`[Survival] Reduced burn rate to: ${this.config.dailyBurnRate}`);
          break;

        case 'alert':
          // Emit alert event
          this.emit('economic:warning', {
            message: action.description,
            severity: 'critical'
          });
          break;

        case 'earn':
          // Enable more aggressive task acceptance
          console.log(`[Survival] Expansion mode enabled`);
          break;

        default:
          break;
      }

      action.status = 'completed';
      return true;
    } catch (error) {
      action.status = 'failed';
      action.error = error instanceof Error ? error.message : 'Unknown error';
      return false;
    }
  }

  /**
   * Get all pending automated actions
   */
  getPendingActions(): AutomatedSurvivalAction[] {
    const actions = automatedActionsStore.get(this.agentId) || [];
    return actions.filter(a => a.status === 'pending');
  }

  /**
   * Record survival history entry
   */
  private recordSurvivalHistory(): void {
    const economics = economicsStore.get(this.agentId);
    const health = healthStore.get(this.agentId);

    if (!economics || !health) return;

    const survivalScore = this.calculateEconomicsScore(economics) + this.calculateHealthScore(health);

    const entry: SurvivalHistoryEntry = {
      timestamp: Date.now(),
      survivalScore,
      healthScore: this.calculateHealthScore(health),
      economicsScore: this.calculateEconomicsScore(economics),
      balance: economics.currentBalance,
      runwayDays: economics.daysOfRunway,
      status: health.status
    };

    const history = survivalHistoryStore.get(this.agentId) || [];
    history.push(entry);

    // Keep only last 1000 entries (~1 week at 10-min intervals)
    if (history.length > 1000) {
      history.shift();
    }

    survivalHistoryStore.set(this.agentId, history);
  }

  /**
   * Get survival history for trend analysis
   */
  getSurvivalHistory(limit: number = 100): SurvivalHistoryEntry[] {
    const history = survivalHistoryStore.get(this.agentId) || [];
    return history.slice(-limit);
  }

  /**
   * Perform enhanced survival check with multi-token support and predictions
   */
  async performEnhancedSurvivalCheck(): Promise<{
    snapshot: SurvivalSnapshot;
    multiToken: MultiTokenEconomics;
    prediction: SurvivalPrediction;
    actions: AutomatedSurvivalAction[];
    chainOptimization: ChainOptimizationResult;
  }> {
    // Run all checks in parallel
    const [snapshot, multiToken, prediction, actions, chainOptimization] = await Promise.all([
      this.performSurvivalCheck(),
      this.checkMultiTokenEconomics(),
      this.predictSurvivalTrend(),
      this.generateAutomatedActions(),
      this.getOptimalChainForOperation('write')
    ]);

    // Record history
    this.recordSurvivalHistory();

    return {
      snapshot,
      multiToken,
      prediction,
      actions,
      chainOptimization
    };
  }
}

/**
 * Global survival manager registry
 */
const globalManagers: Map<string, EchoSurvivalManager> = new Map();

/**
 * Create or get survival manager for an agent
 */
export function getOrCreateSurvivalManager(
  agentId: string,
  address: Address,
  config?: Partial<SurvivalConfig>
): EchoSurvivalManager {
  if (!globalManagers.has(agentId)) {
    globalManagers.set(agentId, new EchoSurvivalManager(agentId, address, config));
  }
  return globalManagers.get(agentId)!;
}

/**
 * Get survival manager by agent ID
 */
export function getSurvivalManager(agentId: string): EchoSurvivalManager | undefined {
  return globalManagers.get(agentId);
}

/**
 * Remove survival manager
 */
export function removeSurvivalManager(agentId: string): boolean {
  return globalManagers.delete(agentId);
}

export default EchoSurvivalManager;
