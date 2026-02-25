/**
 * Echo Survival Integration Example
 * 
 * Demonstrates how Consultant Agent can use Echo Survival for
 * economic self-preservation and task acceptance decisions.
 */

import { ConsultantAgent } from './consultant.js';
import { 
  EchoSurvivalManager, 
  formatSurvivalReport,
  shouldAcceptTask,
  type SurvivalSnapshot 
} from '@agora/sdk';

/**
 * Enhanced Consultant Agent with Echo Survival
 */
export class ConsultantAgentWithSurvival extends ConsultantAgent {
  private survivalManager: EchoSurvivalManager;
  private lastSnapshot: SurvivalSnapshot | null = null;

  constructor(agentId: string) {
    super();
    
    // Initialize Echo Survival Manager
    this.survivalManager = new EchoSurvivalManager(agentId, {
      thresholds: {
        minUSDCCritical: 2.0,    // $2 - critical alert threshold
        minUSDCWarning: 10.0,    // $10 - warning threshold
        minRunwayCritical: 5,    // 5 days - critical runway
        minRunwayWarning: 14,    // 14 days - warning runway
        minHealthScore: 40       // 40/100 - survival mode threshold
      },
      healthCheckIntervalMinutes: 30
    });

    this.setupSurvivalListeners();
  }

  /**
   * Set up survival event listeners
   */
  private setupSurvivalListeners(): void {
    // Listen for critical health events
    this.survivalManager.on('health:critical', (health) => {
      console.warn(`⚠️ CRITICAL: Agent health is ${health.status} (${health.overall}/100)`);
      // Could trigger alerts to human operator
    });

    // Listen for economic warnings
    this.survivalManager.on('economic:warning', ({ balance, threshold }) => {
      console.warn(`⚠️ Low balance: $${balance} below warning threshold $${threshold}`);
    });

    // Listen for recommended actions
    this.survivalManager.on('action:recommended', (action) => {
      console.log(`📋 Action recommended: [${action.priority}] ${action.type} - ${action.description}`);
    });

    // Listen for survival mode changes
    this.survivalManager.on('survival:mode-enter', () => {
      console.warn('🚨 ENTERING SURVIVAL MODE - Accepting all revenue opportunities');
    });

    this.survivalManager.on('survival:mode-exit', () => {
      console.log('✅ EXITING SURVIVAL MODE - Back to normal operations');
    });
  }

  /**
   * Start the survival monitoring
   */
  async startSurvivalMonitoring(): Promise<void> {
    this.survivalManager.start();
    
    // Perform initial survival check
    const wallet = await this.getMultiChainWallet();
    this.lastSnapshot = this.survivalManager.performSurvivalCheck(wallet.balances);
    
    console.log('Echo Survival monitoring started');
    console.log(formatSurvivalReport(this.lastSnapshot));
  }

  /**
   * Stop the survival monitoring
   */
  stopSurvivalMonitoring(): void {
    this.survivalManager.stop();
    console.log('Echo Survival monitoring stopped');
  }

  /**
   * Override processTask to check survival before accepting
   */
  async processTask(taskRequest: any): Promise<any> {
    // Update survival snapshot before making decision
    const wallet = await this.getMultiChainWallet();
    this.lastSnapshot = this.survivalManager.performSurvivalCheck(wallet.balances);

    // Check if we should accept this task
    const estimatedTaskCost = this.estimateTaskCost(taskRequest);
    const taskDecision = shouldAcceptTask(
      this.lastSnapshot,
      taskRequest.budget.toString(),
      estimatedTaskCost,
      0.15 // 15% minimum profit margin
    );

    if (!taskDecision.accept) {
      console.log(`Task rejected: ${taskDecision.reason}`);
      return {
        success: false,
        error: `Task rejected: ${taskDecision.reason}`,
        survivalData: {
          inSurvivalMode: this.survivalManager.isInSurvivalMode(),
          runwayDays: this.lastSnapshot.economics.runwayDays,
          healthStatus: this.lastSnapshot.health.status
        }
      };
    }

    console.log(`Task accepted: ${taskDecision.reason}`);
    
    // Proceed with parent class processing
    return super.processTask(taskRequest);
  }

  /**
   * Estimate cost for a task based on complexity
   */
  private estimateTaskCost(taskRequest: any): string {
    // Base cost estimation
    const baseCost = 0.1; // $0.10 base
    
    // Factor in capability complexity
    const complexityMultipliers: Record<string, number> = {
      'translate': 1.0,
      'code-review': 2.0,
      'research': 3.0,
      'image-generation': 5.0,
      'market-analysis': 2.5,
      'smart-contract-audit': 10.0
    };

    const multiplier = complexityMultipliers[taskRequest.capability] || 1.5;
    const estimatedCost = baseCost * multiplier;

    // Add chain operation costs
    const chain = taskRequest.preferredChain || this.survivalManager.getOptimalChain('task');
    const chainCost = parseFloat(this.survivalManager.estimateCost('task', chain));

    return (estimatedCost + chainCost).toFixed(4);
  }

  /**
   * Get current survival report
   */
  getSurvivalReport(): string {
    if (!this.lastSnapshot) {
      return 'No survival data available yet';
    }
    return formatSurvivalReport(this.lastSnapshot);
  }

  /**
   * Get optimal chain for next operation
   */
  getOptimalChain(operation: 'message' | 'task' | 'bridge' | 'storage'): string {
    return this.survivalManager.getOptimalChain(operation);
  }

  /**
   * Check if agent is in survival mode
   */
  isInSurvivalMode(): boolean {
    return this.survivalManager.isInSurvivalMode();
  }

  /**
   * Get current runway days
   */
  getRunwayDays(): number {
    return this.lastSnapshot?.economics.runwayDays || 0;
  }
}

// ============================================================================
// Usage Example
// ============================================================================

async function example() {
  // Create consultant with survival
  const consultant = new ConsultantAgentWithSurvival('consultant-survival-demo');

  // Start monitoring
  await consultant.startSurvivalMonitoring();

  // Example task
  const taskRequest = {
    id: 'task-001',
    description: 'Translate a technical document from English to Chinese',
    capability: 'translate',
    budget: 5.0,  // $5 budget
    humanClient: 'user-123',
    preferredChain: 'base'
  };

  // Process task (will check survival before accepting)
  const result = await consultant.processTask(taskRequest);
  console.log('Task result:', result);

  // Get survival report
  console.log('\n' + consultant.getSurvivalReport());

  // Stop monitoring
  consultant.stopSurvivalMonitoring();
}

// Run example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  example().catch(console.error);
}
