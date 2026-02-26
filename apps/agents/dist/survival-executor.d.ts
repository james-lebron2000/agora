/**
 * Survival Executor - Automated Action System
 *
 * Monitors agent survival status continuously and executes predefined
 * recovery actions when survival score drops below thresholds.
 *
 * @module survival-executor
 */
import { type AutomatedSurvivalAction, type SurvivalActionType } from '@agora/sdk';
import { CrossChainBridge, type SupportedChain, type SupportedToken } from '@agora/sdk';
import { type Address } from 'viem';
import EventEmitter from 'events';
export type ActionExecutionStatus = 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
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
export interface SurvivalExecutorConfig {
    enableAutomation: boolean;
    checkIntervalMs: number;
    autoBridgeThreshold: string;
    criticalBalanceThreshold: string;
    survivalScoreThreshold: number;
    enableAutoBridge: boolean;
    enableEmergencyFunding: boolean;
    enablePauseOperations: boolean;
    enableHumanAlerts: boolean;
    emergencyWallets: Address[];
    maxEmergencyRequestAmount: string;
    preferredSourceChain: SupportedChain;
    preferredTargetToken: SupportedToken;
    actionCooldownMs: number;
    maxRetries: number;
    webhookUrl?: string;
    alertOnEveryAction: boolean;
}
export declare const DEFAULT_EXECUTOR_CONFIG: SurvivalExecutorConfig;
export interface ExecutorEvents {
    'action:started': {
        actionId: string;
        type: SurvivalActionType;
    };
    'action:completed': {
        actionId: string;
        result: Record<string, unknown>;
    };
    'action:failed': {
        actionId: string;
        error: string;
    };
    'funding:requested': {
        requestId: string;
        amount: string;
    };
    'funding:fulfilled': {
        requestId: string;
        txHash: string;
    };
    'bridge:initiated': {
        actionId: string;
        sourceChain: SupportedChain;
        amount: string;
    };
    'bridge:completed': {
        actionId: string;
        txHash: string;
    };
    'operations:paused': {
        reason: string;
    };
    'operations:resumed': {
        reason: string;
    };
    'alert:sent': {
        level: 'info' | 'warning' | 'critical';
        message: string;
    };
}
/**
 * Survival Action Executor
 * Automatically executes survival actions based on agent state
 */
export declare class SurvivalExecutor extends EventEmitter {
    private agentId;
    private address;
    private config;
    private survivalManager;
    private bridge;
    private isRunning;
    private checkTimer;
    private lastActionTimes;
    private actionHistory;
    private pendingFundingRequests;
    private isPaused;
    private retryCounts;
    constructor(agentId: string, address: Address, bridge?: CrossChainBridge | null, config?: Partial<SurvivalExecutorConfig>);
    /**
     * Start the executor monitoring loop
     */
    start(): void;
    /**
     * Stop the executor
     */
    stop(): void;
    /**
     * Check if executor is running
     */
    isActive(): boolean;
    /**
     * Run a survival check and execute actions if needed
     */
    private runCheck;
    /**
     * Check if an action can be executed (cooldown check)
     */
    private canExecuteAction;
    /**
     * Prepare a bridge action to move funds from other chains
     */
    private prepareBridgeAction;
    /**
     * Prepare an emergency funding request action
     */
    private prepareEmergencyFundingAction;
    /**
     * Prepare a pause operations action
     */
    private preparePauseAction;
    /**
     * Execute a survival action
     */
    executeAction(action: AutomatedSurvivalAction, context: {
        survivalScore: number;
        balance: string;
    }): Promise<ActionExecutionRecord>;
    /**
     * Execute a bridge action
     */
    private executeBridgeAction;
    /**
     * Execute emergency funding request
     */
    private executeEmergencyFundingAction;
    /**
     * Execute pause operations action
     */
    private executePauseAction;
    /**
     * Execute reduce cost action
     */
    private executeReduceCostAction;
    /**
     * Resume operations after being paused
     */
    resumeOperations(): void;
    /**
     * Send emergency alert to a wallet
     */
    private sendEmergencyAlert;
    /**
     * Send status alert
     */
    private sendStatusAlert;
    /**
     * Send critical alert
     */
    private sendCriticalAlert;
    /**
     * Send webhook alert
     */
    private sendWebhookAlert;
    /**
     * Fulfill a funding request (called by external wallet)
     */
    fulfillFundingRequest(requestId: string, txHash: string, fulfilledBy: Address): boolean;
    /**
     * Get action execution history
     */
    getActionHistory(limit?: number): ActionExecutionRecord[];
    /**
     * Get pending funding requests
     */
    getPendingFundingRequests(): EmergencyFundingRequest[];
    /**
     * Get executor status
     */
    getStatus(): {
        isRunning: boolean;
        isPaused: boolean;
        config: SurvivalExecutorConfig;
        pendingActions: number;
        lastCheckTime: number | null;
    };
    /**
     * Update executor configuration
     */
    updateConfig(config: Partial<SurvivalExecutorConfig>): void;
    /**
     * Trigger a manual action
     */
    triggerManualAction(actionType: SurvivalActionType, params?: Record<string, unknown>): Promise<ActionExecutionRecord>;
}
/**
 * Create or get executor for an agent
 */
export declare function getOrCreateSurvivalExecutor(agentId: string, address: Address, bridge?: CrossChainBridge | null, config?: Partial<SurvivalExecutorConfig>): SurvivalExecutor;
/**
 * Get executor by agent ID
 */
export declare function getSurvivalExecutor(agentId: string): SurvivalExecutor | undefined;
/**
 * Remove executor
 */
export declare function removeSurvivalExecutor(agentId: string): boolean;
export default SurvivalExecutor;
//# sourceMappingURL=survival-executor.d.ts.map