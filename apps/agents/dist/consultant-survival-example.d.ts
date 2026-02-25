/**
 * Echo Survival Integration Example
 *
 * Demonstrates how Consultant Agent can use Echo Survival for
 * economic self-preservation and task acceptance decisions.
 */
import { ConsultantAgent } from './consultant.js';
/**
 * Enhanced Consultant Agent with Echo Survival
 */
export declare class ConsultantAgentWithSurvival extends ConsultantAgent {
    private survivalManager;
    private lastSnapshot;
    constructor(agentId: string);
    /**
     * Set up survival event listeners
     */
    private setupSurvivalListeners;
    /**
     * Start the survival monitoring
     */
    startSurvivalMonitoring(): Promise<void>;
    /**
     * Stop the survival monitoring
     */
    stopSurvivalMonitoring(): void;
    /**
     * Override processTask to check survival before accepting
     */
    processTask(taskRequest: any): Promise<any>;
    /**
     * Estimate cost for a task based on complexity
     */
    private estimateTaskCost;
    /**
     * Get current survival report
     */
    getSurvivalReport(): string;
    /**
     * Get optimal chain for next operation
     */
    getOptimalChain(operation: 'message' | 'task' | 'bridge' | 'storage'): string;
    /**
     * Check if agent is in survival mode
     */
    isInSurvivalMode(): boolean;
    /**
     * Get current runway days
     */
    getRunwayDays(): number;
}
//# sourceMappingURL=consultant-survival-example.d.ts.map