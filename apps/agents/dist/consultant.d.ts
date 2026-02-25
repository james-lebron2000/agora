/**
 * Consultant Agent - Master Agent for A2A Economy
 *
 * The Consultant Agent receives complex tasks from humans and delegates them
 * to specialized worker agents. It manages the A2A (Agent-to-Agent) economy
 * by:
 * - Taking a 20% margin on all transactions
 * - Paying workers 80% of the task value
 * - Selecting optimal agents based on capability and reliability
 * - Aggregating results from multiple agents when needed
 * - Supporting multi-chain operations across Base, Optimism, and Arbitrum
 * - Auto-selecting the cheapest chain for execution
 *
 * @module consultant
 */
import { type AgentWorker } from './agent-portfolio.js';
import { type AgentWallet, type MultiChainWallet, type SupportedChain, type ChainBalance } from '@agora/sdk';
interface TaskRequest {
    id: string;
    description: string;
    capability: string;
    budget: number;
    deadline?: string;
    requirements?: string[];
    humanClient: string;
    preferredChain?: SupportedChain;
}
interface WorkResult {
    success: boolean;
    result?: any;
    error?: string;
    workerId: string;
    taskId: string;
    chain: SupportedChain;
}
interface AgentTask {
    id: string;
    status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
    taskRequest: TaskRequest;
    assignedWorker?: AgentWorker;
    paymentToWorker: number;
    margin: number;
    executionChain: SupportedChain;
    result?: WorkResult;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Consultant Agent - The Master Agent with Multi-Chain Support
 */
export declare class ConsultantAgent {
    private wallet;
    private multiChainWallet;
    private walletManager;
    private bridge;
    private portfolio;
    private activeTasks;
    private completedTasks;
    private readonly MARGIN_RATE;
    constructor(wallet: AgentWallet, multiChainWallet: MultiChainWallet);
    /**
     * Get the consultant's wallet address
     */
    getAddress(): string;
    /**
     * Get balances across all chains
     */
    getBalances(): Promise<ChainBalance[]>;
    /**
     * Select the optimal chain for task execution
     * Considers: cost, available balance, and user preference
     */
    private selectExecutionChain;
    /**
     * Calculate total execution cost on a chain
     */
    private calculateExecutionCost;
    /**
     * Find the cheapest chain for hiring a worker
     */
    findCheapestChainForHiring(paymentAmount: number, excludeChains?: SupportedChain[]): Promise<{
        chain: SupportedChain;
        totalCost: number;
    }>;
    /**
     * Hire a worker on a specific chain
     */
    hireWorkerOnChain(task: AgentTask, worker: AgentWorker, chain: SupportedChain): Promise<AgentTask>;
    /**
     * Receive a task from a human client
     * Analyzes the task and delegates to appropriate worker agent(s)
     * Auto-selects the cheapest chain for execution
     */
    receiveTask(taskRequest: TaskRequest): Promise<AgentTask>;
    /**
     * Execute task through worker agent on a specific chain
     */
    private executeWorkerTask;
    /**
     * Simulate worker agent execution
     * Enhanced with chain awareness
     */
    private simulateWorkerExecution;
    /**
     * Bridge USDC to another chain if needed
     */
    bridgeUSDCIfNeeded(destinationChain: SupportedChain, amount: string): Promise<boolean>;
    /**
     * Get current portfolio of available agents
     */
    getPortfolio(): import("./agent-portfolio.js").AgentPortfolio;
    /**
     * Get statistics on tasks
     */
    getStats(): {
        activeTasks: number;
        completedTasks: number;
        successRate: number;
        totalRevenue: number;
        totalPayouts: number;
        profitMargin: number;
        workers: number;
        chainUsage: Record<string, number>;
    };
    /**
     * List available capabilities
     */
    listCapabilities(): string[];
    /**
     * Utility: delay helper
     */
    private simulateDelay;
}
/**
 * Factory function to create and initialize Consultant Agent
 */
export declare function createConsultantAgent(): Promise<ConsultantAgent>;
/**
 * Demo function to showcase A2A economy with multi-chain support
 */
export declare function runDemo(): Promise<void>;
export default ConsultantAgent;
//# sourceMappingURL=consultant.d.ts.map