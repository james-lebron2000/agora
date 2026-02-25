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

import { type Address } from 'viem';
import {
  type SupportedChain,
  getAllBalances,
  type ChainBalance
} from './bridge.js';

// Agent health status
export type AgentHealthStatus = 'healthy' | 'degraded' | 'critical' | 'dead';

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
  /** Current balance in USD */
  currentBalance: string;
  /** Minimum balance needed for survival */
  minSurvivalBalance: string;
  /** Daily burn rate in USD */
  dailyBurnRate: string;
  /** Days of runway remaining */
  daysOfRunway: number;
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
  alertThreshold: 50
};

/**
 * In-memory heartbeat storage (production should use persistent storage)
 */
const heartbeatStore: Map<string, HeartbeatRecord[]> = new Map();
const healthStore: Map<string, AgentHealth> = new Map();
const economicsStore: Map<string, AgentEconomics> = new Map();

/**
 * Echo Survival Manager
 * Manages agent health and economic sustainability
 */
export class EchoSurvivalManager {
  private config: SurvivalConfig;
  private agentId: string;
  private address: Address;

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
   * Perform full survival check
   */
  async performSurvivalCheck(): Promise<SurvivalCheckResult> {
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
