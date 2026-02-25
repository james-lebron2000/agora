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
import { loadAgentPortfolio, findAgentsByCapability, getBestAgentForCapability } from './agent-portfolio.js';
import { loadOrCreateWallet, loadOrCreateMultiChainWallet, refreshBalances, selectOptimalChain, MultiChainWalletManager, CrossChainBridge } from '@agora/sdk';
/**
 * Chain gas cost estimates for optimization (in USD)
 */
const CHAIN_COST_ESTIMATES = {
    ethereum: { gas: 5.0, usdcTransfer: 2.0 },
    base: { gas: 0.001, usdcTransfer: 0.0001 },
    optimism: { gas: 0.002, usdcTransfer: 0.0002 },
    arbitrum: { gas: 0.003, usdcTransfer: 0.0003 }
};
/**
 * Consultant Agent - The Master Agent with Multi-Chain Support
 */
export class ConsultantAgent {
    wallet;
    multiChainWallet;
    walletManager;
    bridge;
    portfolio = loadAgentPortfolio();
    activeTasks = new Map();
    completedTasks = new Map();
    MARGIN_RATE = 0.20; // 20% consultant margin
    constructor(wallet, multiChainWallet) {
        this.wallet = wallet;
        this.multiChainWallet = multiChainWallet;
        this.walletManager = new MultiChainWalletManager();
        this.bridge = new CrossChainBridge(wallet.privateKey);
        console.log(`[Consultant] Initialized with wallet: ${wallet.address}`);
    }
    /**
     * Get the consultant's wallet address
     */
    getAddress() {
        return this.wallet.address;
    }
    /**
     * Get balances across all chains
     */
    async getBalances() {
        return await this.walletManager.refreshBalances();
    }
    /**
     * Select the optimal chain for task execution
     * Considers: cost, available balance, and user preference
     */
    async selectExecutionChain(taskRequest, paymentAmount) {
        const paymentStr = paymentAmount.toFixed(6);
        // If user has a preference and we have balance there, respect it
        if (taskRequest.preferredChain) {
            const hasBalance = await this.walletManager.getWallet().balances.some(b => b.chain === taskRequest.preferredChain && parseFloat(b.usdcBalance) >= paymentAmount);
            if (hasBalance) {
                console.log(`[Consultant] Using preferred chain: ${taskRequest.preferredChain}`);
                return taskRequest.preferredChain;
            }
        }
        // Otherwise, select the cheapest chain with sufficient balance
        const optimalChain = selectOptimalChain(this.walletManager.getWallet(), paymentStr, taskRequest.preferredChain);
        console.log(`[Consultant] Auto-selected chain: ${optimalChain} (cheapest with sufficient balance)`);
        return optimalChain;
    }
    /**
     * Calculate total execution cost on a chain
     */
    calculateExecutionCost(chain, payment) {
        const costs = CHAIN_COST_ESTIMATES[chain];
        return costs.gas + costs.usdcTransfer + payment;
    }
    /**
     * Find the cheapest chain for hiring a worker
     */
    async findCheapestChainForHiring(paymentAmount, excludeChains) {
        const chains = ['base', 'optimism', 'arbitrum'];
        const filtered = excludeChains
            ? chains.filter(c => !excludeChains.includes(c))
            : chains;
        let cheapest = filtered[0];
        let lowestCost = this.calculateExecutionCost(cheapest, paymentAmount);
        for (const chain of filtered) {
            const cost = this.calculateExecutionCost(chain, paymentAmount);
            if (cost < lowestCost) {
                lowestCost = cost;
                cheapest = chain;
            }
        }
        return { chain: cheapest, totalCost: lowestCost };
    }
    /**
     * Hire a worker on a specific chain
     */
    async hireWorkerOnChain(task, worker, chain) {
        console.log(`\n[Consultant] 🤝 Hiring ${worker.name} on ${chain.toUpperCase()} for task ${task.id}`);
        task.assignedWorker = worker;
        task.status = 'assigned';
        task.executionChain = chain;
        task.updatedAt = new Date();
        // Simulate A2A communication
        const hireRequest = {
            workerId: worker.id,
            task: task.taskRequest,
            payment: task.paymentToWorker,
            chain
        };
        try {
            // Execute the work through the runKimiAgent pattern
            const result = await this.executeWorkerTask(worker, task, chain);
            task.result = result;
            task.status = result.success ? 'completed' : 'failed';
            task.updatedAt = new Date();
            // Move to completed
            this.completedTasks.set(task.id, task);
            this.activeTasks.delete(task.id);
            if (result.success) {
                console.log(`[Consultant] ✅ Task completed by ${worker.name} on ${chain.toUpperCase()}`);
                console.log(`  Result:`, result.result);
            }
            else {
                console.log(`[Consultant] ❌ Task failed: ${result.error}`);
            }
            return task;
        }
        catch (error) {
            console.error(`[Consultant] Error hiring worker on ${chain}:`, error);
            task.status = 'failed';
            task.updatedAt = new Date();
            this.completedTasks.set(task.id, task);
            this.activeTasks.delete(task.id);
            return task;
        }
    }
    /**
     * Receive a task from a human client
     * Analyzes the task and delegates to appropriate worker agent(s)
     * Auto-selects the cheapest chain for execution
     */
    async receiveTask(taskRequest) {
        console.log(`\n[Consultant] Received task from ${taskRequest.humanClient}`);
        console.log(`  Task: ${taskRequest.description}`);
        console.log(`  Budget: $${taskRequest.budget} USD`);
        console.log(`  Required capability: ${taskRequest.capability}`);
        if (taskRequest.preferredChain) {
            console.log(`  Preferred chain: ${taskRequest.preferredChain}`);
        }
        // Calculate payment split
        const margin = taskRequest.budget * this.MARGIN_RATE;
        const workerPayment = taskRequest.budget - margin;
        console.log(`  Consultant margin (20%): $${margin.toFixed(4)}`);
        console.log(`  Worker payment (80%): $${workerPayment.toFixed(4)}`);
        // Select optimal chain for execution
        const executionChain = await this.selectExecutionChain(taskRequest, workerPayment);
        console.log(`  Execution chain: ${executionChain.toUpperCase()}`);
        // Create task record
        const task = {
            id: taskRequest.id,
            status: 'pending',
            taskRequest,
            paymentToWorker: workerPayment,
            margin,
            executionChain,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.activeTasks.set(task.id, task);
        // Find suitable workers
        const candidates = findAgentsByCapability(this.portfolio, taskRequest.capability);
        if (candidates.length === 0) {
            console.log(`[Consultant] ❌ No agents found for capability: ${taskRequest.capability}`);
            task.status = 'failed';
            this.completedTasks.set(task.id, task);
            this.activeTasks.delete(task.id);
            return task;
        }
        console.log(`[Consultant] Found ${candidates.length} potential workers`);
        candidates.forEach((agent, i) => {
            const cap = agent.capabilities.find(c => c.name.toLowerCase().includes(taskRequest.capability.toLowerCase()));
            const chainInfo = agent.walletAddress ? `(multi-chain)` : '';
            console.log(`  ${i + 1}. ${agent.name} ${chainInfo}(reliability: ${agent.reliability}, price: $${cap?.pricePerUnit})`);
        });
        // Select best worker
        const bestWorker = getBestAgentForCapability(this.portfolio, taskRequest.capability);
        if (!bestWorker) {
            console.log(`[Consultant] ❌ Could not select best worker`);
            task.status = 'failed';
            this.completedTasks.set(task.id, task);
            this.activeTasks.delete(task.id);
            return task;
        }
        console.log(`[Consultant] Selected worker: ${bestWorker.name}`);
        // Hire the worker on the selected chain
        return await this.hireWorkerOnChain(task, bestWorker, executionChain);
    }
    /**
     * Execute task through worker agent on a specific chain
     */
    async executeWorkerTask(worker, task, chain) {
        console.log(`[Consultant] 📤 Sending work request to ${worker.name} on ${chain.toUpperCase()}`);
        // Simulate the runKimiAgent pattern
        const capability = worker.capabilities.find(c => c.name.toLowerCase().includes(task.taskRequest.capability.toLowerCase()));
        // Simulate processing time based on capability and chain
        const estimatedTime = capability?.estimatedTime || '5s';
        const baseDelay = parseInt(estimatedTime) * 1000 || 5000;
        // Add chain-specific delay simulation
        const chainMultiplier = chain === 'base' ? 0.8 : chain === 'optimism' ? 1.0 : 1.2;
        const delayMs = baseDelay * chainMultiplier;
        await this.simulateDelay(delayMs);
        // Simulate worker execution
        const result = await this.simulateWorkerExecution(worker, task, chain);
        return {
            success: true,
            result,
            workerId: worker.id,
            taskId: task.id,
            chain
        };
    }
    /**
     * Simulate worker agent execution
     * Enhanced with chain awareness
     */
    async simulateWorkerExecution(worker, task, chain) {
        console.log(`[${worker.name}] 🔄 Processing on ${chain.toUpperCase()}: ${task.taskRequest.description}`);
        // Simulate different behaviors based on worker type
        switch (worker.id) {
            case 'echo':
                return {
                    echoed: task.taskRequest.description,
                    chain,
                    timestamp: new Date().toISOString()
                };
            case 'crypto-hunter':
                return {
                    analysis: `Market analysis for ${task.taskRequest.description}`,
                    chain,
                    sentiment: 'bullish',
                    confidence: 0.85,
                    dataPoints: 127
                };
            case 'translator':
                return {
                    original: task.taskRequest.description,
                    translated: `[Translated on ${chain}] ${task.taskRequest.description}`,
                    targetLanguage: 'es',
                    wordCount: task.taskRequest.description.split(' ').length,
                    chain
                };
            case 'code-reviewer':
                return {
                    issues: [],
                    suggestions: ['Consider adding more comments', 'Optimize loop in line 42'],
                    score: 8.5,
                    securityRating: 'A',
                    chain
                };
            case 'image-generator':
                return {
                    prompt: task.taskRequest.description,
                    imageUrl: `https://generated.agora/${chain}/image/${task.id}.png`,
                    dimensions: '1024x1024',
                    style: 'digital-art',
                    chain
                };
            case 'research-assistant':
                return {
                    query: task.taskRequest.description,
                    summary: `Research summary for: ${task.taskRequest.description}`,
                    sources: 5,
                    confidence: 0.92,
                    chain
                };
            default:
                return {
                    processed: true,
                    worker: worker.name,
                    chain,
                    task: task.taskRequest.description
                };
        }
    }
    /**
     * Bridge USDC to another chain if needed
     */
    async bridgeUSDCIfNeeded(destinationChain, amount) {
        const balances = await this.walletManager.refreshBalances();
        const destBalance = balances.find(b => b.chain === destinationChain);
        if (destBalance && parseFloat(destBalance.usdcBalance) >= parseFloat(amount)) {
            console.log(`[Consultant] Sufficient USDC on ${destinationChain}, no bridge needed`);
            return true;
        }
        // Find chain with highest balance
        const sourceChain = this.walletManager.getHighestBalanceChain();
        if (!sourceChain || parseFloat(sourceChain.balance) < parseFloat(amount)) {
            console.error(`[Consultant] Insufficient USDC on any chain for bridging`);
            return false;
        }
        console.log(`[Consultant] Bridging ${amount} USDC from ${sourceChain.chain} to ${destinationChain}...`);
        const result = await this.bridge.bridgeUSDC(destinationChain, amount, sourceChain.chain);
        if (result.success) {
            console.log(`[Consultant] Bridge initiated: ${result.txHash}`);
        }
        else {
            console.error(`[Consultant] Bridge failed: ${result.error}`);
        }
        return result.success;
    }
    /**
     * Get current portfolio of available agents
     */
    getPortfolio() {
        return this.portfolio;
    }
    /**
     * Get statistics on tasks
     */
    getStats() {
        const completed = Array.from(this.completedTasks.values());
        const active = Array.from(this.activeTasks.values());
        const totalRevenue = completed.reduce((sum, t) => sum + t.margin, 0);
        const totalPayouts = completed.reduce((sum, t) => sum + t.paymentToWorker, 0);
        const successCount = completed.filter(t => t.status === 'completed').length;
        const failCount = completed.filter(t => t.status === 'failed').length;
        // Chain usage statistics
        const chainUsage = completed.reduce((acc, t) => {
            acc[t.executionChain] = (acc[t.executionChain] || 0) + 1;
            return acc;
        }, {});
        return {
            activeTasks: active.length,
            completedTasks: completed.length,
            successRate: completed.length > 0 ? successCount / completed.length : 0,
            totalRevenue,
            totalPayouts,
            profitMargin: totalRevenue,
            workers: this.portfolio.workers.length,
            chainUsage
        };
    }
    /**
     * List available capabilities
     */
    listCapabilities() {
        const caps = new Set();
        this.portfolio.workers.forEach(worker => {
            worker.capabilities.forEach(cap => caps.add(cap.name));
        });
        return Array.from(caps);
    }
    /**
     * Utility: delay helper
     */
    simulateDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, Math.min(ms, 3000))); // Cap at 3s for demo
    }
}
/**
 * Factory function to create and initialize Consultant Agent
 */
export async function createConsultantAgent() {
    console.log('[Consultant] Initializing Consultant Agent with Multi-Chain Support...\n');
    // Ensure wallet exists
    const wallet = loadOrCreateWallet();
    const multiChainWallet = loadOrCreateMultiChainWallet();
    // Refresh balances
    console.log('[Consultant] Fetching balances across chains...');
    const updatedWallet = await refreshBalances(multiChainWallet);
    const agent = new ConsultantAgent(wallet, updatedWallet);
    console.log(`\n[Consultant] ✅ Agent ready`);
    console.log(`  Address: ${agent.getAddress()}`);
    console.log(`  Available workers: ${agent.getPortfolio().workers.length}`);
    console.log(`  Capabilities: ${agent.listCapabilities().join(', ')}`);
    console.log(`  Multi-chain support: Base, Optimism, Arbitrum\n`);
    return agent;
}
/**
 * Demo function to showcase A2A economy with multi-chain support
 */
export async function runDemo() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     Agora A2A Economy - Consultant Agent Demo              ║');
    console.log('║     Multi-Chain Edition (Base, Optimism, Arbitrum)         ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    // Initialize consultant
    const consultant = await createConsultantAgent();
    // Show initial balances
    console.log('[Consultant] Initial Balances:');
    const balances = await consultant.getBalances();
    balances.forEach(b => {
        console.log(`  ${b.chain.toUpperCase()}: ${b.nativeBalance} ETH, ${b.usdcBalance} USDC`);
    });
    console.log();
    // Simulate incoming tasks from humans
    const tasks = [
        {
            id: 'task-001',
            description: 'Translate "Hello world" to Spanish',
            capability: 'text-translation',
            budget: 0.01,
            humanClient: 'alice',
            preferredChain: 'base' // Alice prefers Base
        },
        {
            id: 'task-002',
            description: 'Generate cyberpunk cityscape image',
            capability: 'image-generation',
            budget: 0.20,
            humanClient: 'bob'
            // Bob has no preference - auto-select cheapest
        },
        {
            id: 'task-003',
            description: 'Analyze ETH market sentiment',
            capability: 'market-sentiment',
            budget: 0.05,
            humanClient: 'charlie',
            preferredChain: 'optimism'
        },
        {
            id: 'task-004',
            description: 'Echo test message',
            capability: 'echo',
            budget: 0.002,
            humanClient: 'dave',
            preferredChain: 'arbitrum'
        },
        {
            id: 'task-005',
            description: 'Deep research on AI agents',
            capability: 'deep-research',
            budget: 0.15,
            humanClient: 'eve'
            // Auto-select cheapest chain
        }
    ];
    // Process each task
    for (const task of tasks) {
        await consultant.receiveTask(task);
        console.log('\n────────────────────────────────────────────────────────────\n');
    }
    // Print final stats
    const stats = consultant.getStats();
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    Final Statistics                        ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Tasks Completed: ${stats.completedTasks.toString().padEnd(38)}║`);
    console.log(`║  Success Rate: ${(stats.successRate * 100).toFixed(1)}%${''.padEnd(40)}║`);
    console.log(`║  Total Revenue: $${stats.totalRevenue.toFixed(4)}${''.padEnd(36)}║`);
    console.log(`║  Total Worker Payouts: $${stats.totalPayouts.toFixed(4)}${''.padEnd(29)}║`);
    console.log(`║  Workers in Network: ${stats.workers}${''.padEnd(37)}║`);
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║                    Chain Usage Stats                       ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    Object.entries(stats.chainUsage || {}).forEach(([chain, count]) => {
        console.log(`║  ${chain.toUpperCase().padEnd(10)}: ${count.toString().padEnd(45)}║`);
    });
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log('[Consultant] Multi-Chain A2A Economy Demo Complete!');
    console.log('Features demonstrated:');
    console.log('  ✓ Wallet-based identity');
    console.log('  ✓ Multi-chain wallet support (Base, Optimism, Arbitrum)');
    console.log('  ✓ Auto-selection of cheapest chain for execution');
    console.log('  ✓ User chain preference support');
    console.log('  ✓ Task delegation to specialized workers');
    console.log('  ✓ 20/80 revenue split (margin/worker)');
    console.log('  ✓ Agent-to-Agent (A2A) economic interactions');
}
// Run demo if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runDemo().catch(console.error);
}
export default ConsultantAgent;
//# sourceMappingURL=consultant.js.map