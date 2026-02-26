/**
 * Cross-Chain Survival Optimizer
 *
 * Integrates with Bridge module for cross-chain optimization:
 * - Auto-detect optimal chain for operations based on gas costs, balance availability, success rates
 * - Automatic fund rebalancing between chains
 * - Chain failover mechanism
 *
 * @module survival-optimizer
 */
import { getAllTokenBalances, getBridgeQuote, SUPPORTED_CHAINS, SUPPORTED_TOKENS } from './bridge.js';
// Default optimizer configuration
export const DEFAULT_OPTIMIZER_CONFIG = {
    preferredChain: 'base',
    fallbackChain: 'arbitrum',
    enableAutoRebalancing: false,
    rebalancingThreshold: 20, // 20% deviation
    maxRebalancingFee: '5', // $5 USD
    minRebalanceAmount: '10', // $10 USD
    weights: {
        balance: 0.4,
        gasCost: 0.3,
        successRate: 0.2,
        speed: 0.1
    },
    enableFailover: true,
    failoverThreshold: 0.5,
    failoverCooldownMs: 300000, // 5 minutes
    maxGasPriceGwei: 100,
    gasPriceCheckIntervalMs: 60000 // 1 minute
};
/**
 * Cross-Chain Survival Optimizer
 * Optimizes agent operations across multiple chains
 */
export class CrossChainSurvivalOptimizer {
    address;
    bridge;
    config;
    // State
    chainMetrics = new Map();
    performanceData = new Map();
    failoverState = {
        isActive: false,
        failedChain: null,
        failoverChain: null,
        activatedAt: 0,
        reason: '',
        autoRecovered: false
    };
    lastFailoverTime = 0;
    gasPriceTimer = null;
    constructor(address, bridge, config = {}) {
        this.address = address;
        this.bridge = bridge;
        this.config = { ...DEFAULT_OPTIMIZER_CONFIG, ...config };
        // Initialize performance data for all chains
        for (const chain of Object.keys(SUPPORTED_CHAINS)) {
            this.performanceData.set(chain, {
                chain,
                transactions: []
            });
        }
    }
    /**
     * Start the optimizer monitoring
     */
    start() {
        console.log('[CrossChainSurvivalOptimizer] Started');
        // Start gas price monitoring
        this.gasPriceTimer = setInterval(() => {
            this.updateChainMetrics();
        }, this.config.gasPriceCheckIntervalMs);
        // Initial update
        this.updateChainMetrics();
    }
    /**
     * Stop the optimizer
     */
    stop() {
        if (this.gasPriceTimer) {
            clearInterval(this.gasPriceTimer);
            this.gasPriceTimer = null;
        }
        console.log('[CrossChainSurvivalOptimizer] Stopped');
    }
    /**
     * Update metrics for all chains
     */
    async updateChainMetrics() {
        try {
            // Get token balances for all chains
            const balances = await getAllTokenBalances(this.address);
            for (const chain of Object.keys(SUPPORTED_CHAINS)) {
                const performance = this.performanceData.get(chain);
                // Calculate success rate from recent transactions
                const recentTxs = performance.transactions.slice(-50);
                const successRate = recentTxs.length > 0
                    ? recentTxs.filter(t => t.success).length / recentTxs.length
                    : 1.0;
                // Calculate average confirmation time
                const avgConfirmationTime = recentTxs.length > 0
                    ? recentTxs.reduce((sum, t) => sum + t.confirmationTime, 0) / recentTxs.length
                    : 3000; // Default 3 seconds
                // Calculate total USD value on chain
                let totalBalanceUSD = 0;
                const tokenBalances = balances[chain];
                for (const token of SUPPORTED_TOKENS) {
                    const balance = parseFloat(tokenBalances[token]);
                    if (token === 'WETH') {
                        totalBalanceUSD += balance * 3000; // Approximate WETH price
                    }
                    else {
                        totalBalanceUSD += balance; // Stablecoins
                    }
                }
                // Estimate gas cost (simplified)
                const estimatedGasCostUSD = chain === 'ethereum' ? 2.0 : 0.01;
                // Calculate overall score
                const score = this.calculateChainScore({
                    balance: totalBalanceUSD,
                    gasCost: estimatedGasCostUSD,
                    successRate,
                    speed: avgConfirmationTime
                });
                const metrics = {
                    chain,
                    totalBalanceUSD,
                    nativeBalance: '0', // Would need separate native balance fetch
                    tokenBalances,
                    gasPrice: BigInt(0), // Would need gas price fetch
                    estimatedGasCostUSD,
                    averageConfirmationTime: avgConfirmationTime,
                    successRate,
                    score
                };
                this.chainMetrics.set(chain, metrics);
            }
            // Check for failover conditions
            if (this.config.enableFailover) {
                this.checkFailoverConditions();
            }
        }
        catch (error) {
            console.error('[CrossChainSurvivalOptimizer] Failed to update metrics:', error);
        }
    }
    /**
     * Calculate chain score based on criteria
     */
    calculateChainScore(data) {
        const { weights } = this.config;
        // Balance score (higher is better, max 100)
        const balanceScore = Math.min(100, data.balance / 10);
        // Gas cost score (lower is better, max 100)
        const gasScore = Math.max(0, 100 - data.gasCost * 20);
        // Success rate score (0-100)
        const successScore = data.successRate * 100;
        // Speed score (faster is better, max 100)
        const speedScore = Math.max(0, 100 - data.speed / 50);
        // Weighted total
        return (balanceScore * weights.balance +
            gasScore * weights.gasCost +
            successScore * weights.successRate +
            speedScore * weights.speed);
    }
    /**
     * Get optimal chain for an operation
     */
    async getOptimalChain(operation, preferredToken) {
        await this.updateChainMetrics();
        // If failover is active, use failover chain
        if (this.failoverState.isActive && this.failoverState.failoverChain) {
            const metrics = this.chainMetrics.get(this.failoverState.failoverChain);
            if (metrics) {
                return {
                    recommendedChain: this.failoverState.failoverChain,
                    reason: `Failover active: ${this.failoverState.reason}`,
                    confidence: 0.9,
                    estimatedSavings: '0',
                    estimatedTime: metrics.averageConfirmationTime,
                    alternativeChains: [],
                    metrics
                };
            }
        }
        // Get all metrics and sort by score
        const allMetrics = Array.from(this.chainMetrics.values());
        const sortedMetrics = allMetrics
            .filter(m => m.successRate >= this.config.failoverThreshold)
            .sort((a, b) => b.score - a.score);
        if (sortedMetrics.length === 0) {
            // Fall back to preferred chain if no good options
            const preferred = this.chainMetrics.get(this.config.preferredChain);
            return {
                recommendedChain: this.config.preferredChain,
                reason: 'No optimal chain found, using preferred chain',
                confidence: 0.5,
                estimatedSavings: '0',
                estimatedTime: preferred?.averageConfirmationTime || 3000,
                alternativeChains: [this.config.fallbackChain],
                metrics: preferred || sortedMetrics[0]
            };
        }
        const best = sortedMetrics[0];
        const alternatives = sortedMetrics.slice(1, 3).map(m => m.chain);
        // Calculate estimated savings vs preferred chain
        const preferred = this.chainMetrics.get(this.config.preferredChain);
        const savings = preferred
            ? (preferred.estimatedGasCostUSD - best.estimatedGasCostUSD).toFixed(4)
            : '0';
        // Generate reason
        let reason = '';
        if (best.chain === this.config.preferredChain) {
            reason = 'Preferred chain has optimal conditions';
        }
        else if (best.totalBalanceUSD > (preferred?.totalBalanceUSD || 0) * 1.5) {
            reason = `${best.chain} has significantly higher balance`;
        }
        else if (best.estimatedGasCostUSD < (preferred?.estimatedGasCostUSD || 0) * 0.5) {
            reason = `${best.chain} has lower gas costs`;
        }
        else if (best.successRate > (preferred?.successRate || 0)) {
            reason = `${best.chain} has better success rate`;
        }
        else {
            reason = `${best.chain} offers best overall efficiency`;
        }
        return {
            recommendedChain: best.chain,
            reason,
            confidence: best.score / 100,
            estimatedSavings: savings,
            estimatedTime: best.averageConfirmationTime,
            alternativeChains: alternatives,
            metrics: best
        };
    }
    /**
     * Check if rebalancing is needed and create a plan
     */
    async generateRebalancingPlan() {
        if (!this.config.enableAutoRebalancing) {
            return null;
        }
        await this.updateChainMetrics();
        const metrics = Array.from(this.chainMetrics.values());
        const totalBalance = metrics.reduce((sum, m) => sum + m.totalBalanceUSD, 0);
        if (totalBalance === 0) {
            return null;
        }
        // Calculate current distribution
        const currentDistribution = {
            ethereum: 0,
            base: 0,
            optimism: 0,
            arbitrum: 0
        };
        for (const m of metrics) {
            currentDistribution[m.chain] = (m.totalBalanceUSD / totalBalance) * 100;
        }
        // Target: distribute based on chain scores
        const totalScore = metrics.reduce((sum, m) => sum + m.score, 0);
        const targetDistribution = {
            ethereum: 0,
            base: 0,
            optimism: 0,
            arbitrum: 0
        };
        for (const m of metrics) {
            targetDistribution[m.chain] = totalScore > 0 ? (m.score / totalScore) * 100 : 25;
        }
        // Find chains that need rebalancing
        const moves = [];
        let totalEstimatedFee = 0;
        for (const fromChain of metrics) {
            const currentPct = currentDistribution[fromChain.chain];
            const targetPct = targetDistribution[fromChain.chain];
            const deviation = currentPct - targetPct;
            // If this chain has excess balance
            if (deviation > this.config.rebalancingThreshold) {
                const excessUSD = (deviation / 100) * totalBalance;
                // Find best destination chain
                for (const toChain of metrics) {
                    if (toChain.chain === fromChain.chain)
                        continue;
                    const toDeviation = targetDistribution[toChain.chain] - currentDistribution[toChain.chain];
                    if (toDeviation > 0) {
                        // Calculate move amount
                        const moveAmount = Math.min(excessUSD, (toDeviation / 100) * totalBalance, parseFloat(this.config.maxRebalancingFee) * 10 // Limit by max fee
                        );
                        if (moveAmount >= parseFloat(this.config.minRebalanceAmount)) {
                            // Get bridge quote for USDC
                            try {
                                const quote = await getBridgeQuote({
                                    sourceChain: fromChain.chain,
                                    destinationChain: toChain.chain,
                                    token: 'USDC',
                                    amount: moveAmount.toFixed(2)
                                }, this.address);
                                const fee = parseFloat(quote.estimatedFee);
                                if (fee <= parseFloat(this.config.maxRebalancingFee)) {
                                    moves.push({
                                        from: fromChain.chain,
                                        to: toChain.chain,
                                        token: 'USDC',
                                        amount: moveAmount.toFixed(2),
                                        estimatedFee: quote.estimatedFee
                                    });
                                    totalEstimatedFee += fee;
                                }
                            }
                            catch (error) {
                                console.warn(`Failed to get bridge quote for ${fromChain.chain} -> ${toChain.chain}:`, error);
                            }
                        }
                    }
                }
            }
        }
        if (moves.length === 0) {
            return null;
        }
        // Calculate expected improvement
        const expectedImprovement = (totalEstimatedFee * 2).toFixed(2); // Rough estimate
        return {
            id: `rebalance-${Date.now()}`,
            timestamp: Date.now(),
            targetDistribution,
            currentDistribution,
            moves,
            totalEstimatedFee: totalEstimatedFee.toFixed(4),
            expectedImprovement
        };
    }
    /**
     * Execute a rebalancing plan
     */
    async executeRebalancingPlan(plan) {
        const result = {
            success: true,
            completedMoves: 0,
            failedMoves: 0,
            totalFees: '0',
            errors: []
        };
        let totalFees = 0;
        for (const move of plan.moves) {
            try {
                const bridgeResult = await this.bridge.bridgeToken(move.to, move.token, move.amount, move.from);
                if (bridgeResult.success) {
                    result.completedMoves++;
                    totalFees += parseFloat(move.estimatedFee);
                    // Record transaction
                    this.recordTransaction(move.from, true, BigInt(0), 3000);
                }
                else {
                    result.failedMoves++;
                    result.errors.push(`Bridge failed for ${move.from} -> ${move.to}: ${bridgeResult.error || 'Unknown error'}`);
                    // Record failure
                    this.recordTransaction(move.from, false, BigInt(0), 0);
                }
            }
            catch (error) {
                result.failedMoves++;
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                result.errors.push(`Exception for ${move.from} -> ${move.to}: ${errorMsg}`);
            }
        }
        result.success = result.failedMoves === 0;
        result.totalFees = totalFees.toFixed(4);
        return result;
    }
    /**
     * Record transaction for performance tracking
     */
    recordTransaction(chain, success, gasUsed, confirmationTime) {
        const performance = this.performanceData.get(chain);
        if (!performance)
            return;
        performance.transactions.push({
            timestamp: Date.now(),
            success,
            gasUsed,
            confirmationTime
        });
        // Keep only last 1000 transactions
        if (performance.transactions.length > 1000) {
            performance.transactions.shift();
        }
        // Check for failover if transaction failed
        if (!success && this.config.enableFailover) {
            this.checkFailoverConditions();
        }
    }
    /**
     * Check if failover should be activated
     */
    checkFailoverConditions() {
        const now = Date.now();
        // Check cooldown
        if (now - this.lastFailoverTime < this.config.failoverCooldownMs) {
            return;
        }
        // Check current preferred chain
        const preferredMetrics = this.chainMetrics.get(this.config.preferredChain);
        if (preferredMetrics && preferredMetrics.successRate < this.config.failoverThreshold) {
            // Find best alternative
            let bestAlternative = null;
            let bestScore = 0;
            for (const [chain, metrics] of this.chainMetrics) {
                if (chain === this.config.preferredChain)
                    continue;
                if (metrics.successRate >= this.config.failoverThreshold && metrics.score > bestScore) {
                    bestScore = metrics.score;
                    bestAlternative = chain;
                }
            }
            if (bestAlternative) {
                this.activateFailover(this.config.preferredChain, bestAlternative);
            }
        }
    }
    /**
     * Activate failover to alternative chain
     */
    activateFailover(failedChain, failoverChain) {
        this.failoverState = {
            isActive: true,
            failedChain,
            failoverChain,
            activatedAt: Date.now(),
            reason: `${failedChain} success rate below threshold`,
            autoRecovered: false
        };
        this.lastFailoverTime = Date.now();
        console.warn(`[CrossChainSurvivalOptimizer] Failover activated: ${failedChain} -> ${failoverChain}`);
    }
    /**
     * Attempt to recover from failover
     */
    async attemptFailoverRecovery() {
        if (!this.failoverState.isActive || !this.failoverState.failedChain) {
            return false;
        }
        await this.updateChainMetrics();
        const failedMetrics = this.chainMetrics.get(this.failoverState.failedChain);
        if (failedMetrics && failedMetrics.successRate >= this.config.failoverThreshold + 0.1) {
            // Recovery threshold is higher to prevent flapping
            this.failoverState.isActive = false;
            this.failoverState.autoRecovered = true;
            console.log(`[CrossChainSurvivalOptimizer] Failover recovered, returning to ${this.failoverState.failedChain}`);
            return true;
        }
        return false;
    }
    /**
     * Get current failover state
     */
    getFailoverState() {
        return { ...this.failoverState };
    }
    /**
     * Get metrics for all chains
     */
    getChainMetrics() {
        return Array.from(this.chainMetrics.values());
    }
    /**
     * Get optimizer status
     */
    getStatus() {
        return {
            isRunning: this.gasPriceTimer !== null,
            config: { ...this.config },
            failoverState: this.getFailoverState(),
            chainCount: this.chainMetrics.size,
            preferredChain: this.failoverState.isActive && this.failoverState.failoverChain
                ? this.failoverState.failoverChain
                : this.config.preferredChain
        };
    }
    /**
     * Force switch to specific chain
     */
    forceChainSwitch(chain) {
        this.activateFailover(this.config.preferredChain, chain);
    }
    /**
     * Update configuration
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        // Restart if already running
        if (this.gasPriceTimer) {
            this.stop();
            this.start();
        }
    }
}
// Global optimizer instances
const globalOptimizers = new Map();
/**
 * Get or create optimizer for an address
 */
export function getOrCreateSurvivalOptimizer(address, bridge, config) {
    if (!globalOptimizers.has(address)) {
        const optimizer = new CrossChainSurvivalOptimizer(address, bridge, config);
        globalOptimizers.set(address, optimizer);
    }
    return globalOptimizers.get(address);
}
/**
 * Get optimizer by address
 */
export function getSurvivalOptimizer(address) {
    return globalOptimizers.get(address);
}
/**
 * Remove optimizer
 */
export function removeSurvivalOptimizer(address) {
    const optimizer = globalOptimizers.get(address);
    if (optimizer) {
        optimizer.stop();
        return globalOptimizers.delete(address);
    }
    return false;
}
export default CrossChainSurvivalOptimizer;
//# sourceMappingURL=survival-optimizer.js.map