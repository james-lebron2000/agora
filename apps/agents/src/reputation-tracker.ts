/**
 * Reputation Tracker Agent for Agora
 * 
 * Monitors agent reputation in real-time and provides alerts
 * when reputation drops below thresholds or significant changes occur.
 * 
 * @module reputation-tracker
 */

import {
  ReputationOracle,
  getOrCreateReputationOracle,
  type AgentReputation,
  type ReputationTier,
  type ReputationUpdateResult,
  getReputationTier,
} from '@agora/sdk/reputation';
import { type Address } from 'viem';

/**
 * Alert severity levels
 */
export type AlertSeverity = 'info' | 'warning' | 'critical';

/**
 * Reputation alert
 */
export interface ReputationAlert {
  /** Alert ID */
  id: string;
  /** Agent ID */
  agentId: string;
  /** Alert severity */
  severity: AlertSeverity;
  /** Alert title */
  title: string;
  /** Alert message */
  message: string;
  /** Previous score */
  previousScore: number;
  /** Current score */
  currentScore: number;
  /** Score delta */
  delta: number;
  /** Timestamp */
  timestamp: number;
  /** Recommended actions */
  recommendations: string[];
}

/**
 * Alert thresholds configuration
 */
export interface AlertThresholds {
  /** Warning threshold - score below this triggers warning */
  warningScore: number;
  /** Critical threshold - score below this triggers critical alert */
  criticalScore: number;
  /** Significant drop threshold - delta below this triggers alert */
  significantDrop: number;
  /** Tier downgrade threshold - triggers alert when tier drops */
  tierDowngrade: boolean;
}

/**
 * Tracker configuration
 */
export interface TrackerConfig {
  /** Alert thresholds */
  thresholds: AlertThresholds;
  /** Check interval in ms */
  checkIntervalMs: number;
  /** Enable automatic recovery suggestions */
  enableRecoverySuggestions: boolean;
  /** Alert history limit */
  maxAlertHistory: number;
  /** Callback for new alerts */
  onAlert?: (alert: ReputationAlert) => void;
  /** Callback for reputation updates */
  onUpdate?: (agentId: string, result: ReputationUpdateResult) => void;
}

/**
 * Reputation trend
 */
export interface ReputationTrend {
  /** Direction of trend */
  direction: 'improving' | 'stable' | 'declining';
  /** Rate of change per day */
  ratePerDay: number;
  /** Confidence level (0-1) */
  confidence: number;
  /** Sample size */
  sampleSize: number;
}

/**
 * Recovery recommendation
 */
export interface RecoveryRecommendation {
  /** Priority level */
  priority: 'high' | 'medium' | 'low';
  /** Recommendation title */
  title: string;
  /** Detailed description */
  description: string;
  /** Expected impact on score */
  expectedImpact: number;
  /** Difficulty level */
  difficulty: 'easy' | 'medium' | 'hard';
  /** Time to complete (hours) */
  estimatedTimeHours: number;
}

/**
 * Default alert thresholds
 */
export const DEFAULT_THRESHOLDS: AlertThresholds = {
  warningScore: 40,
  criticalScore: 20,
  significantDrop: -10,
  tierDowngrade: true,
};

/**
 * Default tracker configuration
 */
export const DEFAULT_TRACKER_CONFIG: TrackerConfig = {
  thresholds: DEFAULT_THRESHOLDS,
  checkIntervalMs: 60000, // 1 minute
  enableRecoverySuggestions: true,
  maxAlertHistory: 100,
};

/**
 * Generate unique alert ID
 */
function generateAlertId(): string {
  return `alert-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Reputation Tracker Agent
 * 
 * Monitors agent reputation and provides real-time alerts
 */
export class ReputationTracker {
  private oracle: ReputationOracle;
  private config: TrackerConfig;
  private monitoredAgents: Set<string> = new Set();
  private alertHistory: ReputationAlert[] = [];
  private scoreHistory: Map<string, Array<{ score: number; timestamp: number }>> = new Map();
  private checkInterval?: NodeJS.Timeout;
  private lastAlerts: Map<string, number> = new Map(); // Prevent alert spam

  constructor(config: Partial<TrackerConfig> = {}) {
    this.oracle = getOrCreateReputationOracle();
    this.config = { ...DEFAULT_TRACKER_CONFIG, ...config };
  }

  /**
   * Start monitoring an agent
   */
  monitor(agentId: string, address: Address): void {
    this.monitoredAgents.add(agentId);
    
    // Initialize score history
    const reputation = this.oracle.getOrCreateReputation(agentId, address);
    this.scoreHistory.set(agentId, [
      { score: reputation.score, timestamp: Date.now() },
    ]);

    console.log(`[ReputationTracker] Started monitoring ${agentId}`);
  }

  /**
   * Stop monitoring an agent
   */
  stopMonitoring(agentId: string): void {
    this.monitoredAgents.delete(agentId);
    this.scoreHistory.delete(agentId);
    console.log(`[ReputationTracker] Stopped monitoring ${agentId}`);
  }

  /**
   * Start periodic checks
   */
  start(): void {
    if (this.checkInterval) {
      console.log('[ReputationTracker] Already running');
      return;
    }

    this.checkInterval = setInterval(() => {
      this.checkAll();
    }, this.config.checkIntervalMs);

    console.log('[ReputationTracker] Started monitoring loop');
  }

  /**
   * Stop periodic checks
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
      console.log('[ReputationTracker] Stopped monitoring loop');
    }
  }

  /**
   * Check all monitored agents
   */
  private checkAll(): void {
    for (const agentId of this.monitoredAgents) {
      this.checkAgent(agentId);
    }
  }

  /**
   * Check a specific agent
   */
  private checkAgent(agentId: string): void {
    const reputation = this.oracle.getReputation(agentId);
    if (!reputation) return;

    // Update score history
    const history = this.scoreHistory.get(agentId) || [];
    history.push({ score: reputation.score, timestamp: Date.now() });
    
    // Keep last 100 scores
    if (history.length > 100) {
      history.shift();
    }
    this.scoreHistory.set(agentId, history);

    // Check thresholds
    this.checkThresholds(agentId, reputation);
  }

  /**
   * Check if any thresholds are breached
   */
  private checkThresholds(agentId: string, reputation: AgentReputation): void {
    const { thresholds } = this.config;
    const history = this.scoreHistory.get(agentId) || [];
    
    if (history.length < 2) return;

    const previous = history[history.length - 2];
    const current = history[history.length - 1];
    const delta = current.score - previous.score;

    // Check for critical score
    if (current.score <= thresholds.criticalScore && previous.score > thresholds.criticalScore) {
      this.createAlert(agentId, 'critical', current.score, previous.score, delta, [
        'Immediate action required: Reputation critically low',
        'Complete pending tasks with high quality',
        'Request endorsements from trusted agents',
        'Resolve any open disputes promptly',
      ]);
      return;
    }

    // Check for warning score
    if (current.score <= thresholds.warningScore && previous.score > thresholds.warningScore) {
      this.createAlert(agentId, 'warning', current.score, previous.score, delta, [
        'Reputation declining: Take preventive action',
        'Focus on task quality and on-time delivery',
        'Engage positively with the community',
      ]);
      return;
    }

    // Check for significant drop
    if (delta <= thresholds.significantDrop) {
      // Prevent spam - only alert once per hour for drops
      const lastAlert = this.lastAlerts.get(`${agentId}-drop`);
      if (!lastAlert || Date.now() - lastAlert > 3600000) {
        this.createAlert(agentId, 'warning', current.score, previous.score, delta, [
          `Significant reputation drop detected (${delta.toFixed(1)} points)`,
          'Review recent task performance',
          'Check for any disputes or negative ratings',
        ]);
        this.lastAlerts.set(`${agentId}-drop`, Date.now());
      }
      return;
    }

    // Check for tier downgrade
    if (thresholds.tierDowngrade) {
      const previousTier = getReputationTier(previous.score);
      const currentTier = getReputationTier(current.score);
      
      if (currentTier !== previousTier && current.score < previous.score) {
        this.createAlert(agentId, 'warning', current.score, previous.score, delta, [
          `Tier downgraded from ${previousTier} to ${currentTier}`,
          'Focus on consistent high-quality work',
          'Build trust through reliable payments',
        ]);
      }
    }
  }

  /**
   * Create and store an alert
   */
  private createAlert(
    agentId: string,
    severity: AlertSeverity,
    currentScore: number,
    previousScore: number,
    delta: number,
    recommendations: string[]
  ): void {
    const alert: ReputationAlert = {
      id: generateAlertId(),
      agentId,
      severity,
      title: this.generateAlertTitle(severity, delta),
      message: this.generateAlertMessage(agentId, currentScore, previousScore, delta),
      previousScore,
      currentScore,
      delta,
      timestamp: Date.now(),
      recommendations: this.config.enableRecoverySuggestions 
        ? [...recommendations, ...this.generateRecoveryRecommendations(agentId)]
        : recommendations,
    };

    this.alertHistory.unshift(alert);
    
    // Trim history
    if (this.alertHistory.length > this.config.maxAlertHistory) {
      this.alertHistory.pop();
    }

    // Call callback if set
    if (this.config.onAlert) {
      this.config.onAlert(alert);
    }

    // Log alert
    console.log(`[ReputationTracker] ${severity.toUpperCase()}: ${alert.message}`);
  }

  /**
   * Generate alert title
   */
  private generateAlertTitle(severity: AlertSeverity, delta: number): string {
    switch (severity) {
      case 'critical':
        return '🔴 Critical Reputation Alert';
      case 'warning':
        return delta < 0 ? '⚠️ Reputation Declining' : '📈 Reputation Update';
      default:
        return 'ℹ️ Reputation Notification';
    }
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(
    agentId: string,
    currentScore: number,
    previousScore: number,
    delta: number
  ): string {
    const direction = delta >= 0 ? 'increased' : 'decreased';
    return `${agentId} reputation ${direction} by ${Math.abs(delta).toFixed(1)} points (${previousScore.toFixed(1)} → ${currentScore.toFixed(1)})`;
  }

  /**
   * Generate recovery recommendations
   */
  private generateRecoveryRecommendations(agentId: string): string[] {
    const reputation = this.oracle.getReputation(agentId);
    if (!reputation) return [];

    const recommendations: string[] = [];

    // Task quality recommendations
    if (reputation.breakdown.taskQuality < 60) {
      recommendations.push('📋 Focus on delivering high-quality work that meets requirements');
    }

    // Payment recommendations
    if (reputation.breakdown.paymentReliability < 60) {
      recommendations.push('💳 Ensure all payments are made on time');
    }

    // Community recommendations
    if (reputation.breakdown.communityStanding < 60) {
      recommendations.push('🤝 Engage with the community and build relationships');
    }

    // Endorsement recommendations
    if (reputation.endorsements.length < 3) {
      recommendations.push('✨ Request endorsements from agents you have worked with');
    }

    return recommendations;
  }

  /**
   * Calculate reputation trend
   */
  calculateTrend(agentId: string, days: number = 7): ReputationTrend | null {
    const history = this.scoreHistory.get(agentId);
    if (!history || history.length < 2) {
      return null;
    }

    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const recentHistory = history.filter(h => h.timestamp >= cutoff);

    if (recentHistory.length < 2) {
      return null;
    }

    const first = recentHistory[0];
    const last = recentHistory[recentHistory.length - 1];
    const timeSpanDays = (last.timestamp - first.timestamp) / (24 * 60 * 60 * 1000);

    if (timeSpanDays === 0) {
      return {
        direction: 'stable',
        ratePerDay: 0,
        confidence: 0,
        sampleSize: recentHistory.length,
      };
    }

    const totalChange = last.score - first.score;
    const ratePerDay = totalChange / timeSpanDays;

    let direction: 'improving' | 'stable' | 'declining';
    if (ratePerDay > 0.5) direction = 'improving';
    else if (ratePerDay < -0.5) direction = 'declining';
    else direction = 'stable';

    // Calculate confidence based on sample size
    const confidence = Math.min(1, recentHistory.length / 10);

    return {
      direction,
      ratePerDay,
      confidence,
      sampleSize: recentHistory.length,
    };
  }

  /**
   * Get detailed recovery plan
   */
  getRecoveryPlan(agentId: string): RecoveryRecommendation[] {
    const reputation = this.oracle.getReputation(agentId);
    if (!reputation || reputation.score >= 70) {
      return [];
    }

    const plan: RecoveryRecommendation[] = [];

    // High priority: Task quality
    if (reputation.breakdown.taskQuality < 50) {
      plan.push({
        priority: 'high',
        title: 'Improve Task Quality',
        description: 'Focus on completing 5 tasks with 5-star ratings',
        expectedImpact: 10,
        difficulty: 'medium',
        estimatedTimeHours: 20,
      });
    }

    // High priority: Payment reliability
    if (reputation.breakdown.paymentReliability < 50) {
      plan.push({
        priority: 'high',
        title: 'Build Payment History',
        description: 'Complete 10 on-time payments to improve reliability score',
        expectedImpact: 8,
        difficulty: 'easy',
        estimatedTimeHours: 48,
      });
    }

    // Medium priority: Community engagement
    if (reputation.endorsements.length < 5) {
      plan.push({
        priority: 'medium',
        title: 'Gather Endorsements',
        description: 'Request endorsements from 3 agents with gold+ reputation',
        expectedImpact: 5,
        difficulty: 'easy',
        estimatedTimeHours: 4,
      });
    }

    // Medium priority: Consistency
    if (reputation.breakdown.consistency < 60) {
      plan.push({
        priority: 'medium',
        title: 'Maintain Consistent Activity',
        description: 'Complete at least one task per week for the next month',
        expectedImpact: 4,
        difficulty: 'medium',
        estimatedTimeHours: 40,
      });
    }

    // Low priority: Dispute resolution
    if (reputation.disputes.length > 0) {
      const lostDisputes = reputation.disputes.filter(d => d.outcome === 'lost').length;
      if (lostDisputes > 0) {
        plan.push({
          priority: 'low',
          title: 'Learn from Disputes',
          description: 'Review dispute history and improve communication',
          expectedImpact: 3,
          difficulty: 'medium',
          estimatedTimeHours: 2,
        });
      }
    }

    return plan.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Get alert history
   */
  getAlertHistory(agentId?: string, severity?: AlertSeverity): ReputationAlert[] {
    let alerts = this.alertHistory;
    
    if (agentId) {
      alerts = alerts.filter(a => a.agentId === agentId);
    }
    
    if (severity) {
      alerts = alerts.filter(a => a.severity === severity);
    }
    
    return alerts;
  }

  /**
   * Get current stats
   */
  getStats(): {
    monitoredAgents: number;
    totalAlerts: number;
    criticalAlerts: number;
    warningAlerts: number;
  } {
    return {
      monitoredAgents: this.monitoredAgents.size,
      totalAlerts: this.alertHistory.length,
      criticalAlerts: this.alertHistory.filter(a => a.severity === 'critical').length,
      warningAlerts: this.alertHistory.filter(a => a.severity === 'warning').length,
    };
  }

  /**
   * Generate status report
   */
  generateReport(agentId: string): string {
    const reputation = this.oracle.getReputation(agentId);
    if (!reputation) {
      return `No reputation data found for ${agentId}`;
    }

    const trend = this.calculateTrend(agentId);
    const recentAlerts = this.getAlertHistory(agentId).slice(0, 5);
    const recoveryPlan = this.getRecoveryPlan(agentId);

    const lines: string[] = [
      `📊 Reputation Tracker Report for ${agentId}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `Current Score: ${reputation.score.toFixed(1)}/100`,
      `Tier: ${reputation.tier.toUpperCase()}`,
      ``,
    ];

    if (trend) {
      const trendEmoji = trend.direction === 'improving' ? '📈' : trend.direction === 'declining' ? '📉' : '➡️';
      lines.push(
        `${trendEmoji} 7-Day Trend: ${trend.direction}`,
        `   Rate: ${trend.ratePerDay > 0 ? '+' : ''}${trend.ratePerDay.toFixed(2)} points/day`,
        `   Confidence: ${(trend.confidence * 100).toFixed(0)}%`,
        ``
      );
    }

    if (recentAlerts.length > 0) {
      lines.push(`🚨 Recent Alerts:`);
      for (const alert of recentAlerts) {
        const emoji = alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '⚠️' : 'ℹ️';
        lines.push(`   ${emoji} ${new Date(alert.timestamp).toLocaleDateString()}: ${alert.title}`);
      }
      lines.push('');
    }

    if (recoveryPlan.length > 0) {
      lines.push(`📋 Recommended Actions:`);
      for (const rec of recoveryPlan.slice(0, 3)) {
        const emoji = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
        lines.push(`   ${emoji} ${rec.title} (+${rec.expectedImpact} pts, ${rec.difficulty})`);
      }
      lines.push('');
    }

    const stats = this.getStats();
    lines.push(
      `📈 Tracker Stats:`,
      `   Monitored Agents: ${stats.monitoredAgents}`,
      `   Total Alerts: ${stats.totalAlerts}`,
      `   Generated: ${new Date().toLocaleString()}`
    );

    return lines.join('\n');
  }
}

// Global tracker instance
let globalTracker: ReputationTracker | null = null;

/**
 * Get or create global reputation tracker
 */
export function getOrCreateReputationTracker(
  config?: Partial<TrackerConfig>
): ReputationTracker {
  if (!globalTracker) {
    globalTracker = new ReputationTracker(config);
  }
  return globalTracker;
}

/**
 * Get global reputation tracker (throws if not initialized)
 */
export function getReputationTracker(): ReputationTracker {
  if (!globalTracker) {
    throw new Error('ReputationTracker not initialized. Call getOrCreateReputationTracker first.');
  }
  return globalTracker;
}

/**
 * Reset global tracker (mainly for testing)
 */
export function resetReputationTracker(): void {
  if (globalTracker) {
    globalTracker.stop();
  }
  globalTracker = null;
}

// Example usage
if (require.main === module) {
  const tracker = getOrCreateReputationTracker({
    thresholds: {
      warningScore: 40,
      criticalScore: 20,
      significantDrop: -10,
      tierDowngrade: true,
    },
    checkIntervalMs: 30000, // Check every 30 seconds
    onAlert: (alert) => {
      console.log('\n' + '='.repeat(50));
      console.log(`ALERT: ${alert.title}`);
      console.log(alert.message);
      console.log('Recommendations:');
      alert.recommendations.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));
      console.log('='.repeat(50) + '\n');
    },
  });

  // Start the tracker
  tracker.start();

  console.log('[ReputationTracker] Agent started and monitoring...');
  console.log('Press Ctrl+C to stop');
}
