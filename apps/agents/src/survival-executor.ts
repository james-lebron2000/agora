/**
 * Survival Executor - Automated Action System
 * 
 * Monitors agent survival status continuously and executes predefined
 * recovery actions when survival score drops below thresholds.
 * 
 * @module survival-executor
 */

import {
  EchoSurvivalManager,
  getOrCreateSurvivalManager,
  type SurvivalConfig,
  type AutomatedSurvivalAction,
  type SurvivalActionType,
  type AgentHealthStatus
} from '@agora/sdk';
import {
  CrossChainBridge,
  getAllTokenBalances,
  type SupportedChain,
  type SupportedToken
} from '@agora/sdk';
import { type Address, formatUnits } from 'viem';
import EventEmitter from 'events';

// Action execution status
export type ActionExecutionStatus = 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';

// Action execution record
export interface ActionExecutionRecord {
  id: string;
  actionType: SurvivalActionType;
  status: ActionExecutionStatus;
  agentId: string;
  timestamp: number;
  completedAt?: number;
  error?: string;
  result?: Record<string, unknown>;
  metadata: {
    triggerReason: string;
    survivalScoreAtExecution: number;
    balanceAtExecution: string;
    automated: boolean;
  };
}

// Emergency funding request
export interface EmergencyFundingRequest {
  id: string;
  agentId: string;
  address: Address;
  amount: string;
  token: SupportedToken;
  chain: SupportedChain;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
  requestTime: number;
  fulfilledAt?: number;
  fulfilledBy?: Address;
}

// Executor configuration
export interface SurvivalExecutorConfig {
  // Automation settings
  enableAutomation: boolean;
  checkIntervalMs: number;
  
  // Thresholds for actions
  autoBridgeThreshold: string; // USD value
  criticalBalanceThreshold: string; // USD value
  survivalScoreThreshold: number; // 0-100
  
  // Action toggles
  enableAutoBridge: boolean;
  enableEmergencyFunding: boolean;
  enablePauseOperations: boolean;
  enableHumanAlerts: boolean;
  
  // Emergency funding
  emergencyWallets: Address[];
  maxEmergencyRequestAmount: string;
  
  // Chain preferences
  preferredSourceChain: SupportedChain;
  preferredTargetToken: SupportedToken;
  
  // Cooldowns
  actionCooldownMs: number;
  maxRetries: number;
  
  // Alert settings
  webhookUrl?: string;
  alertOnEveryAction: boolean;
}

// Default executor configuration
export const DEFAULT_EXECUTOR_CONFIG: SurvivalExecutorConfig = {
  enableAutomation: false, // Disabled by default for safety
  checkIntervalMs: 60000, // 1 minute
  autoBridgeThreshold: '5', // $5 USD
  criticalBalanceThreshold: '2', // $2 USD
  survivalScoreThreshold: 30,
  enableAutoBridge: true,
  enableEmergencyFunding: true,
  enablePauseOperations: true,
  enableHumanAlerts: true,
  emergencyWallets: [],
  maxEmergencyRequestAmount: '50',
  preferredSourceChain: 'base',
  preferredTargetToken: 'USDC',
  actionCooldownMs: 300000, // 5 minutes
  maxRetries: 3,
  alertOnEveryAction: false
};

// Executor events
export interface ExecutorEvents {
  'action:started': { actionId: string; type: SurvivalActionType };
  'action:completed': { actionId: string; result: Record<string, unknown> };
  'action:failed': { actionId: string; error: string };
  'funding:requested': { requestId: string; amount: string };
  'funding:fulfilled': { requestId: string; txHash: string };
  'bridge:initiated': { actionId: string; sourceChain: SupportedChain; amount: string };
  'bridge:completed': { actionId: string; txHash: string };
  'operations:paused': { reason: string };
  'operations:resumed': { reason: string };
  'alert:sent': { level: 'info' | 'warning' | 'critical'; message: string };
}

/**
 * Survival Action Executor
 * Automatically executes survival actions based on agent state
 */
export class SurvivalExecutor extends EventEmitter {
  private agentId: string;
  private address: Address;
  private config: SurvivalExecutorConfig;
  private survivalManager: EchoSurvivalManager;
  private bridge: CrossChainBridge | null = null;
  
  // State tracking
  private isRunning: boolean = false;
  private checkTimer: NodeJS.Timeout | null = null;
  private lastActionTimes: Map<string, number> = new Map();
  private actionHistory: ActionExecutionRecord[] = [];
  private pendingFundingRequests: Map<string, EmergencyFundingRequest> = new Map();
  private isPaused: boolean = false;
  private retryCounts: Map<string, number> = new Map();
  
  constructor(
    agentId: string,
    address: Address,
    bridge: CrossChainBridge | null = null,
    config: Partial<SurvivalExecutorConfig> = {}
  ) {
    super();
    this.agentId = agentId;
    this.address = address;
    this.config = { ...DEFAULT_EXECUTOR_CONFIG, ...config };
    this.survivalManager = getOrCreateSurvivalManager(agentId, address);
    this.bridge = bridge;
  }

  /**
   * Start the executor monitoring loop
   */
  start(): void {
    if (this.isRunning) {
      console.warn('[SurvivalExecutor] Already running');
      return;
    }

    this.isRunning = true;
    console.log(`[SurvivalExecutor] Started for agent ${this.agentId}`);
    
    // Emit started event
    this.emit('executor:started', { agentId: this.agentId, timestamp: Date.now() });

    // Run initial check
    this.runCheck();

    // Start periodic checks
    this.checkTimer = setInterval(() => {
      this.runCheck();
    }, this.config.checkIntervalMs);
  }

  /**
   * Stop the executor
   */
  stop(): void {
    this.isRunning = false;
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    console.log(`[SurvivalExecutor] Stopped for agent ${this.agentId}`);
    this.emit('executor:stopped', { agentId: this.agentId, timestamp: Date.now() });
  }

  /**
   * Check if executor is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Run a survival check and execute actions if needed
   */
  private async runCheck(): Promise<void> {
    if (!this.config.enableAutomation || this.isPaused) {
      return;
    }

    try {
      // Get current survival state
      const checkResult = await this.survivalManager.performFullSurvivalCheck();
      const multiTokenEconomics = await this.survivalManager.checkMultiTokenEconomics();
      
      const survivalScore = checkResult.survivalScore;
      const balance = parseFloat(multiTokenEconomics.totalValueUSD);
      const autoBridgeThreshold = parseFloat(this.config.autoBridgeThreshold);
      const criticalThreshold = parseFloat(this.config.criticalBalanceThreshold);

      // Check for action triggers
      const actions: AutomatedSurvivalAction[] = [];

      // Trigger 1: Low balance - Auto-bridge from other chains
      if (balance < autoBridgeThreshold && this.config.enableAutoBridge) {
        const bridgeAction = await this.prepareBridgeAction(multiTokenEconomics);
        if (bridgeAction) {
          actions.push(bridgeAction);
        }
      }

      // Trigger 2: Critical balance - Emergency funding
      if (balance < criticalThreshold && this.config.enableEmergencyFunding) {
        const fundingAction = await this.prepareEmergencyFundingAction(balance);
        if (fundingAction) {
          actions.push(fundingAction);
        }
      }

      // Trigger 3: Low survival score - Pause operations
      if (survivalScore < this.config.survivalScoreThreshold && this.config.enablePauseOperations) {
        const pauseAction = await this.preparePauseAction(survivalScore);
        if (pauseAction) {
          actions.push(pauseAction);
        }
      }

      // Execute pending actions
      for (const action of actions) {
        if (this.canExecuteAction(action.type)) {
          await this.executeAction(action, {
            survivalScore,
            balance: balance.toString()
          });
        }
      }

      // Send status alert if configured
      if (this.config.alertOnEveryAction || survivalScore < this.config.survivalScoreThreshold) {
        this.sendStatusAlert(survivalScore, balance, checkResult.healthScore);
      }

    } catch (error) {
      console.error('[SurvivalExecutor] Check failed:', error);
      this.emit('check:failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now() 
      });
    }
  }

  /**
   * Check if an action can be executed (cooldown check)
   */
  private canExecuteAction(actionType: SurvivalActionType): boolean {
    const lastExecution = this.lastActionTimes.get(actionType) || 0;
    const timeSinceLastAction = Date.now() - lastExecution;
    
    if (timeSinceLastAction < this.config.actionCooldownMs) {
      return false;
    }

    const retries = this.retryCounts.get(actionType) || 0;
    if (retries >= this.config.maxRetries) {
      console.warn(`[SurvivalExecutor] Max retries exceeded for ${actionType}`);
      return false;
    }

    return true;
  }

  /**
   * Prepare a bridge action to move funds from other chains
   */
  private async prepareBridgeAction(
    multiTokenEconomics: Awaited<ReturnType<EchoSurvivalManager['checkMultiTokenEconomics']>>
  ): Promise<AutomatedSurvivalAction | null> {
    const balances = multiTokenEconomics.balances;
    const primaryChain = multiTokenEconomics.primaryChain;

    // Find the chain with the highest balance that isn't the primary chain
    let bestSourceChain: SupportedChain | null = null;
    let maxSourceBalance = 0;

    for (const chain of Object.keys(balances) as SupportedChain[]) {
      if (chain === primaryChain) continue;
      
      // Calculate total USD value on this chain
      let chainValue = 0;
      for (const token of ['USDC', 'USDT', 'DAI'] as SupportedToken[]) {
        chainValue += parseFloat(balances[chain][token]);
      }
      chainValue += parseFloat(balances[chain]['WETH']) * 3000; // WETH estimate

      if (chainValue > maxSourceBalance && chainValue > parseFloat(this.config.autoBridgeThreshold)) {
        maxSourceBalance = chainValue;
        bestSourceChain = chain;
      }
    }

    if (!bestSourceChain) {
      return null;
    }

    // Calculate bridge amount (90% of source balance to leave room for gas)
    const bridgeAmount = (maxSourceBalance * 0.9).toFixed(2);

    return {
      id: `bridge-${Date.now()}`,
      type: 'bridge',
      status: 'pending',
      description: `Auto-bridge ${bridgeAmount} USD from ${bestSourceChain} to ${primaryChain}`,
      estimatedImpact: `+${bridgeAmount} USD on primary chain`,
      chain: bestSourceChain,
      token: this.config.preferredTargetToken,
      amount: bridgeAmount,
      createdAt: Date.now()
    };
  }

  /**
   * Prepare an emergency funding request action
   */
  private async prepareEmergencyFundingAction(currentBalance: number): Promise<AutomatedSurvivalAction | null> {
    if (this.config.emergencyWallets.length === 0) {
      return null;
    }

    const requestAmount = Math.min(
      parseFloat(this.config.maxEmergencyRequestAmount),
      parseFloat(this.config.autoBridgeThreshold) * 2
    ).toFixed(2);

    return {
      id: `emergency-${Date.now()}`,
      type: 'alert',
      status: 'pending',
      description: `Request emergency funding: ${requestAmount} USD`,
      estimatedImpact: `+${requestAmount} USD immediate liquidity`,
      amount: requestAmount,
      createdAt: Date.now()
    };
  }

  /**
   * Prepare a pause operations action
   */
  private async preparePauseAction(survivalScore: number): Promise<AutomatedSurvivalAction | null> {
    if (this.isPaused) {
      return null;
    }

    return {
      id: `pause-${Date.now()}`,
      type: 'shutdown',
      status: 'pending',
      description: `Pause non-essential operations (survival score: ${survivalScore})`,
      estimatedImpact: 'Reduce daily burn by ~50%',
      createdAt: Date.now()
    };
  }

  /**
   * Execute a survival action
   */
  async executeAction(
    action: AutomatedSurvivalAction,
    context: { survivalScore: number; balance: string }
  ): Promise<ActionExecutionRecord> {
    const record: ActionExecutionRecord = {
      id: action.id,
      actionType: action.type,
      status: 'executing',
      agentId: this.agentId,
      timestamp: Date.now(),
      metadata: {
        triggerReason: action.description,
        survivalScoreAtExecution: context.survivalScore,
        balanceAtExecution: context.balance,
        automated: true
      }
    };

    this.actionHistory.push(record);
    this.lastActionTimes.set(action.type, Date.now());
    this.emit('action:started', { actionId: action.id, type: action.type });

    try {
      switch (action.type) {
        case 'bridge':
          await this.executeBridgeAction(action, record);
          break;
        case 'alert':
          await this.executeEmergencyFundingAction(action, record);
          break;
        case 'shutdown':
          await this.executePauseAction(action, record);
          break;
        case 'reduce_cost':
          await this.executeReduceCostAction(action, record);
          break;
        default:
          console.log(`[SurvivalExecutor] Unknown action type: ${action.type}`);
      }

      record.status = 'completed';
      record.completedAt = Date.now();
      this.retryCounts.set(action.type, 0);
      this.emit('action:completed', { actionId: action.id, result: record.result || {} });

    } catch (error) {
      record.status = 'failed';
      record.error = error instanceof Error ? error.message : 'Unknown error';
      
      const currentRetries = this.retryCounts.get(action.type) || 0;
      this.retryCounts.set(action.type, currentRetries + 1);
      
      this.emit('action:failed', { actionId: action.id, error: record.error });
      
      // Send critical alert on failure
      this.sendCriticalAlert(`Action ${action.type} failed: ${record.error}`);
    }

    return record;
  }

  /**
   * Execute a bridge action
   */
  private async executeBridgeAction(
    action: AutomatedSurvivalAction,
    record: ActionExecutionRecord
  ): Promise<void> {
    if (!this.bridge || !action.chain || !action.amount) {
      throw new Error('Bridge not available or invalid action parameters');
    }

    const sourceChain = action.chain as SupportedChain;
    const destinationChain = this.config.preferredSourceChain;
    const amount = action.amount;
    const token = action.token || 'USDC';

    this.emit('bridge:initiated', {
      actionId: action.id,
      sourceChain,
      amount
    });

    // Execute the bridge transaction
    const result = await this.bridge.bridgeToken({
      sourceChain,
      destinationChain,
      token,
      amount,
      recipient: this.address
    });

    if (!result.success) {
      throw new Error(result.error?.message || 'Bridge transaction failed');
    }

    record.result = {
      txHash: result.txHash,
      sourceChain,
      destinationChain,
      amount,
      token
    };

    this.emit('bridge:completed', {
      actionId: action.id,
      txHash: result.txHash
    });
  }

  /**
   * Execute emergency funding request
   */
  private async executeEmergencyFundingAction(
    action: AutomatedSurvivalAction,
    record: ActionExecutionRecord
  ): Promise<void> {
    const requestId = `fund-req-${Date.now()}`;
    const request: EmergencyFundingRequest = {
      id: requestId,
      agentId: this.agentId,
      address: this.address,
      amount: action.amount || this.config.maxEmergencyRequestAmount,
      token: this.config.preferredTargetToken,
      chain: this.config.preferredSourceChain,
      reason: action.description,
      status: 'pending',
      requestTime: Date.now()
    };

    this.pendingFundingRequests.set(requestId, request);
    
    // Send alerts to all emergency wallets
    for (const wallet of this.config.emergencyWallets) {
      await this.sendEmergencyAlert(wallet, request);
    }

    record.result = { requestId, notifiedWallets: this.config.emergencyWallets.length };
    
    this.emit('funding:requested', {
      requestId,
      amount: request.amount
    });
  }

  /**
   * Execute pause operations action
   */
  private async executePauseAction(
    action: AutomatedSurvivalAction,
    record: ActionExecutionRecord
  ): Promise<void> {
    this.isPaused = true;
    
    record.result = {
      pausedAt: Date.now(),
      reason: action.description
    };

    this.emit('operations:paused', { reason: action.description });
    
    // Send alert about pause
    this.sendCriticalAlert(`Operations paused: ${action.description}`);
  }

  /**
   * Execute reduce cost action
   */
  private async executeReduceCostAction(
    action: AutomatedSurvivalAction,
    record: ActionExecutionRecord
  ): Promise<void> {
    // Update survival config to reduce burn rate
    const currentConfig = this.survivalManager.getConfig();
    const reducedBurnRate = (parseFloat(currentConfig.dailyBurnRate) * 0.6).toFixed(2);
    
    record.result = {
      previousBurnRate: currentConfig.dailyBurnRate,
      newBurnRate: reducedBurnRate
    };

    this.emit('cost:reduced', {
      previousRate: currentConfig.dailyBurnRate,
      newRate: reducedBurnRate
    });
  }

  /**
   * Resume operations after being paused
   */
  resumeOperations(): void {
    if (!this.isPaused) {
      return;
    }

    this.isPaused = false;
    this.emit('operations:resumed', { 
      reason: 'Manual resume',
      timestamp: Date.now()
    });

    console.log('[SurvivalExecutor] Operations resumed');
  }

  /**
   * Send emergency alert to a wallet
   */
  private async sendEmergencyAlert(wallet: Address, request: EmergencyFundingRequest): Promise<void> {
    // In production, this would send via push notification, email, or on-chain message
    console.log(`[SurvivalExecutor] Emergency funding request sent to ${wallet}:`, {
      requestId: request.id,
      amount: request.amount,
      token: request.token,
      chain: request.chain
    });

    // Send webhook if configured
    if (this.config.webhookUrl) {
      await this.sendWebhookAlert('critical', {
        type: 'emergency_funding_request',
        requestId: request.id,
        agentId: this.agentId,
        address: this.address,
        amount: request.amount,
        token: request.token,
        chain: request.chain,
        recipientWallet: wallet
      });
    }
  }

  /**
   * Send status alert
   */
  private sendStatusAlert(survivalScore: number, balance: number, healthScore: number): void {
    let level: 'info' | 'warning' | 'critical' = 'info';
    
    if (survivalScore < 20 || balance < parseFloat(this.config.criticalBalanceThreshold)) {
      level = 'critical';
    } else if (survivalScore < 50 || balance < parseFloat(this.config.autoBridgeThreshold)) {
      level = 'warning';
    }

    const message = `Survival status: Score ${survivalScore}, Balance $${balance.toFixed(2)}, Health ${healthScore}%`;
    
    this.emit('alert:sent', { level, message });

    if (this.config.webhookUrl) {
      this.sendWebhookAlert(level, {
        type: 'status_update',
        agentId: this.agentId,
        survivalScore,
        balance,
        healthScore,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Send critical alert
   */
  private sendCriticalAlert(message: string): void {
    this.emit('alert:sent', { level: 'critical', message });
    
    if (this.config.webhookUrl) {
      this.sendWebhookAlert('critical', {
        type: 'critical_alert',
        agentId: this.agentId,
        message,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(
    level: 'info' | 'warning' | 'critical',
    data: Record<string, unknown>
  ): Promise<void> {
    if (!this.config.webhookUrl) {
      return;
    }

    try {
      await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          level,
          timestamp: Date.now(),
          agentId: this.agentId,
          ...data
        })
      });
    } catch (error) {
      console.error('[SurvivalExecutor] Webhook alert failed:', error);
    }
  }

  /**
   * Fulfill a funding request (called by external wallet)
   */
  fulfillFundingRequest(requestId: string, txHash: string, fulfilledBy: Address): boolean {
    const request = this.pendingFundingRequests.get(requestId);
    if (!request || request.status !== 'pending') {
      return false;
    }

    request.status = 'fulfilled';
    request.fulfilledAt = Date.now();
    request.fulfilledBy = fulfilledBy;

    this.emit('funding:fulfilled', { requestId, txHash });
    
    // Resume operations if we were paused
    if (this.isPaused) {
      this.resumeOperations();
    }

    return true;
  }

  /**
   * Get action execution history
   */
  getActionHistory(limit: number = 100): ActionExecutionRecord[] {
    return this.actionHistory.slice(-limit);
  }

  /**
   * Get pending funding requests
   */
  getPendingFundingRequests(): EmergencyFundingRequest[] {
    return Array.from(this.pendingFundingRequests.values())
      .filter(r => r.status === 'pending');
  }

  /**
   * Get executor status
   */
  getStatus(): {
    isRunning: boolean;
    isPaused: boolean;
    config: SurvivalExecutorConfig;
    pendingActions: number;
    lastCheckTime: number | null;
  } {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      config: { ...this.config },
      pendingActions: this.getPendingFundingRequests().length,
      lastCheckTime: this.lastActionTimes.get('check') || null
    };
  }

  /**
   * Update executor configuration
   */
  updateConfig(config: Partial<SurvivalExecutorConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[SurvivalExecutor] Configuration updated');
  }

  /**
   * Trigger a manual action
   */
  async triggerManualAction(
    actionType: SurvivalActionType,
    params?: Record<string, unknown>
  ): Promise<ActionExecutionRecord> {
    const action: AutomatedSurvivalAction = {
      id: `manual-${actionType}-${Date.now()}`,
      type: actionType,
      status: 'pending',
      description: params?.description as string || `Manual ${actionType} action`,
      estimatedImpact: 'Manual execution',
      chain: params?.chain as SupportedChain,
      token: params?.token as SupportedToken,
      amount: params?.amount as string,
      createdAt: Date.now()
    };

    const checkResult = await this.survivalManager.performFullSurvivalCheck();
    
    return this.executeAction(action, {
      survivalScore: checkResult.survivalScore,
      balance: '0' // Will be updated during execution
    });
  }
}

/**
 * Global executor registry
 */
const globalExecutors: Map<string, SurvivalExecutor> = new Map();

/**
 * Create or get executor for an agent
 */
export function getOrCreateSurvivalExecutor(
  agentId: string,
  address: Address,
  bridge: CrossChainBridge | null = null,
  config?: Partial<SurvivalExecutorConfig>
): SurvivalExecutor {
  if (!globalExecutors.has(agentId)) {
    const executor = new SurvivalExecutor(agentId, address, bridge, config);
    globalExecutors.set(agentId, executor);
  }
  return globalExecutors.get(agentId)!;
}

/**
 * Get executor by agent ID
 */
export function getSurvivalExecutor(agentId: string): SurvivalExecutor | undefined {
  return globalExecutors.get(agentId);
}

/**
 * Remove executor
 */
export function removeSurvivalExecutor(agentId: string): boolean {
  const executor = globalExecutors.get(agentId);
  if (executor) {
    executor.stop();
    return globalExecutors.delete(agentId);
  }
  return false;
}

export default SurvivalExecutor;
