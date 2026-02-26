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
import { getAllBalances, getAllTokenBalances, SUPPORTED_TOKENS } from './bridge.js';
/**
 * Default survival configuration
 */
export const DEFAULT_SURVIVAL_CONFIG = {
    minSurvivalBalance: '10',
    dailyBurnRate: '1',
    healthCheckInterval: 60000, // 1 minute
    heartbeatInterval: 30000, // 30 seconds
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
 * Format survival report as readable string
 */
export function formatSurvivalReport(snapshot) {
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
    }
    else if (health.status === 'critical' || economics.runwayDays < 3) {
        report += `Status: 🚨 SURVIVAL MODE\n`;
    }
    else {
        report += `Status: ⚠️ Caution\n`;
    }
    return report;
}
/**
 * Determine if agent should accept a task based on survival state
 */
export function shouldAcceptTask(snapshot, budget, estimatedCost, minProfitMargin = 0.1) {
    const balance = parseFloat(snapshot.economics.balance);
    const taskBudget = parseFloat(budget);
    const cost = parseFloat(estimatedCost);
    const minBalance = parseFloat(DEFAULT_SURVIVAL_CONFIG.minSurvivalBalance);
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
    if (profitMargin < minProfitMargin) {
        return {
            accept: false,
            reason: `Profit margin (${(profitMargin * 100).toFixed(1)}%) below minimum (${(minProfitMargin * 100).toFixed(0)}%)`
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
/**
 * In-memory storage (production should use persistent storage)
 */
const heartbeatStore = new Map();
const healthStore = new Map();
const economicsStore = new Map();
const survivalHistoryStore = new Map();
const automatedActionsStore = new Map();
/**
 * Echo Survival Manager
 * Manages agent health and economic sustainability
 */
export class EchoSurvivalManager {
    config;
    agentId;
    address;
    healthCheckTimer = null;
    heartbeatTimer = null;
    eventListeners = new Map();
    survivalMode = false;
    constructor(agentId, address, config = {}) {
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
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event).add(callback);
        // Return unsubscribe function
        return () => {
            this.eventListeners.get(event)?.delete(callback);
        };
    }
    /**
     * Emit event to all listeners
     */
    emit(event, details) {
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
                }
                catch (err) {
                    console.error(`Event handler error for ${event}:`, err);
                }
            });
        }
    }
    /**
     * Start periodic health checks and heartbeats
     */
    start() {
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
    stop() {
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
    async runPeriodicHealthCheck() {
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
        }
        else if (!shouldBeInSurvivalMode && this.survivalMode) {
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
    isInSurvivalMode() {
        return this.survivalMode;
    }
    /**
     * Get optimal chain for an operation based on balances
     */
    async getOptimalChain(operation = 'read') {
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
    async performSurvivalCheck(balances) {
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
            }
            else {
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
    createInitialHealth() {
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
    createInitialEconomics() {
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
    checkHealth(agentId) {
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
    async checkEconomics(address, fetchBalance = false) {
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
        const economics = {
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
    async calculateSurvivalScore() {
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
    calculateHealthScore(health) {
        let score = 50;
        // Adjust based on success rate
        if (health.successRate >= this.config.healthySuccessRate) {
            score = 50;
        }
        else if (health.successRate >= this.config.criticalSuccessRate) {
            score = 25 + (health.successRate - this.config.criticalSuccessRate) * 50;
        }
        else {
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
    calculateEconomicsScore(economics) {
        const balance = parseFloat(economics.currentBalance);
        const minBalance = parseFloat(economics.minSurvivalBalance);
        if (balance <= 0)
            return 0;
        if (balance < minBalance)
            return Math.floor((balance / minBalance) * 25);
        // Base 25 points for meeting minimum
        let score = 25;
        // Additional points for runway
        if (economics.daysOfRunway >= 30)
            score += 25;
        else if (economics.daysOfRunway >= 14)
            score += 20;
        else if (economics.daysOfRunway >= 7)
            score += 15;
        else if (economics.daysOfRunway >= 3)
            score += 10;
        else
            score += 5;
        return score;
    }
    /**
     * Get recovery recommendations based on current state
     */
    async getRecoveryRecommendations() {
        const recommendations = [];
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
    async sendHeartbeat(metadata) {
        const survivalScore = await this.calculateSurvivalScore();
        const health = this.checkHealth(this.agentId);
        const record = {
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
    async needsEmergencyFunding() {
        const economics = await this.checkEconomics();
        const balance = parseFloat(economics.currentBalance);
        const minBalance = parseFloat(economics.minSurvivalBalance);
        return balance < minBalance || economics.daysOfRunway < 3;
    }
    /**
     * Perform full survival check with detailed results
     */
    async performFullSurvivalCheck() {
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
    updateHealth(updates) {
        const current = healthStore.get(this.agentId);
        if (!current) {
            throw new Error(`Agent ${this.agentId} not found`);
        }
        const updated = {
            ...current,
            ...updates,
            lastHeartbeat: Date.now()
        };
        // Auto-determine status based on metrics
        if (updated.consecutiveFailures >= 5 || updated.successRate < 0.3) {
            updated.status = 'dead';
        }
        else if (updated.successRate < this.config.criticalSuccessRate || updated.consecutiveFailures >= 3) {
            updated.status = 'critical';
        }
        else if (updated.successRate < this.config.healthySuccessRate) {
            updated.status = 'degraded';
        }
        else {
            updated.status = 'healthy';
        }
        healthStore.set(this.agentId, updated);
        return { ...updated };
    }
    /**
     * Record task completion
     */
    recordTaskCompleted(responseTimeMs) {
        const health = healthStore.get(this.agentId);
        if (!health)
            return;
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
    recordTaskFailed() {
        const health = healthStore.get(this.agentId);
        if (!health)
            return;
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
    recordEarnings(amount) {
        const economics = economicsStore.get(this.agentId);
        if (!economics)
            return;
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
    recordSpending(amount) {
        const economics = economicsStore.get(this.agentId);
        if (!economics)
            return;
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
    getHeartbeatHistory(limit = 100) {
        const heartbeats = heartbeatStore.get(this.agentId) || [];
        return heartbeats.slice(-limit);
    }
    /**
     * Get agent ID
     */
    getAgentId() {
        return this.agentId;
    }
    /**
     * Get agent address
     */
    getAddress() {
        return this.address;
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    // ============================================================================
    // NEW ENHANCED FEATURES - Multi-Token & Predictive Analytics
    // ============================================================================
    /**
     * Check multi-token economics across all chains
     * Fetches real-time balances for all supported tokens
     */
    async checkMultiTokenEconomics() {
        const balances = await getAllTokenBalances(this.address);
        // Calculate estimated USD values (simplified - in production would use price oracle)
        const estimatedValues = {
            USDC: '0',
            USDT: '0',
            DAI: '0',
            WETH: '0'
        };
        let totalValueUSD = 0;
        const chainTotals = {
            ethereum: 0,
            base: 0,
            optimism: 0,
            arbitrum: 0,
            polygon: 0,
            avalanche: 0,
            bsc: 0
        };
        // Aggregate values by token and chain
        for (const chain of Object.keys(balances)) {
            for (const token of SUPPORTED_TOKENS) {
                const balance = parseFloat(balances[chain][token]);
                // Simple USD estimation (1 token = $1 for stablecoins, WETH needs price)
                let usdValue = 0;
                if (token === 'WETH') {
                    // Assume WETH = $3000 for estimation
                    usdValue = balance * 3000;
                }
                else {
                    // Stablecoins
                    usdValue = balance;
                }
                estimatedValues[token] = (parseFloat(estimatedValues[token]) + usdValue).toFixed(2);
                totalValueUSD += usdValue;
                chainTotals[chain] += usdValue;
            }
        }
        // Find primary chain (chain with highest balance)
        let primaryChain = 'base';
        let maxChainValue = 0;
        for (const [chain, value] of Object.entries(chainTotals)) {
            if (value > maxChainValue) {
                maxChainValue = value;
                primaryChain = chain;
            }
        }
        // Calculate distribution percentages
        const distribution = {
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
    async getOptimalChainForOperation(operation, preferredToken) {
        const multiTokenEconomics = await this.checkMultiTokenEconomics();
        const balances = multiTokenEconomics.balances;
        // Gas cost estimates by chain (in USD)
        const gasCosts = {
            ethereum: { read: 0.5, write: 2.0, bridge: 5.0, swap: 3.0 },
            base: { read: 0.001, write: 0.01, bridge: 0.02, swap: 0.015 },
            optimism: { read: 0.002, write: 0.015, bridge: 0.025, swap: 0.02 },
            arbitrum: { read: 0.003, write: 0.02, bridge: 0.03, swap: 0.025 },
            polygon: { read: 0.001, write: 0.01, bridge: 0.02, swap: 0.015 },
            avalanche: { read: 0.002, write: 0.015, bridge: 0.025, swap: 0.02 },
            bsc: { read: 0.001, write: 0.005, bridge: 0.01, swap: 0.008 }
        };
        let bestChain = this.config.preferredChain;
        let bestScore = -1;
        let bestReason = '';
        for (const chain of Object.keys(balances)) {
            const chainBalances = balances[chain];
            let totalBalance = 0;
            // Calculate total USD value on this chain
            for (const token of SUPPORTED_TOKENS) {
                const balance = parseFloat(chainBalances[token]);
                if (token === 'WETH') {
                    totalBalance += balance * 3000; // WETH price estimate
                }
                else {
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
    async predictSurvivalTrend() {
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
        let trend = 'stable';
        if (dailyChange > 1)
            trend = 'improving';
        else if (dailyChange < -1)
            trend = 'declining';
        // Calculate predicted runway
        const currentBalance = parseFloat(currentEconomics.currentBalance);
        const burnRate = parseFloat(this.config.dailyBurnRate);
        const netDailyBurn = burnRate - dailyChange; // Adjust burn rate by earnings trend
        let predictedRunway = netDailyBurn > 0 ? Math.floor(currentBalance / netDailyBurn) : 999;
        // Calculate confidence based on data consistency
        const variance = this.calculateVariance(history.map(h => parseFloat(h.balance)));
        const confidence = Math.min(0.9, 0.3 + (history.length / 100) * 0.6 - variance * 0.1);
        // Project depletion date
        let projectedDepletionDate;
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
    calculateVariance(values) {
        if (values.length < 2)
            return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
    }
    /**
     * Generate automated survival actions based on current state
     * Creates actionable recommendations that can be auto-executed
     */
    async generateAutomatedActions() {
        const actions = [];
        const multiTokenEconomics = await this.checkMultiTokenEconomics();
        const prediction = await this.predictSurvivalTrend();
        const health = this.checkHealth(this.agentId);
        // Action 1: Bridge funds if primary chain is low but other chains have balance
        const primaryChain = multiTokenEconomics.primaryChain;
        const primaryBalance = parseFloat(multiTokenEconomics.balances[primaryChain]['USDC']);
        const autoBridgeThreshold = parseFloat(this.config.autoBridgeThreshold);
        if (primaryBalance < autoBridgeThreshold) {
            // Find chain with highest USDC balance
            let bestSourceChain = null;
            let maxSourceBalance = 0;
            for (const chain of Object.keys(multiTokenEconomics.balances)) {
                if (chain === primaryChain)
                    continue;
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
    async executeAutomatedAction(actionId) {
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
        }
        catch (error) {
            action.status = 'failed';
            action.error = error instanceof Error ? error.message : 'Unknown error';
            return false;
        }
    }
    /**
     * Get all pending automated actions
     */
    getPendingActions() {
        const actions = automatedActionsStore.get(this.agentId) || [];
        return actions.filter(a => a.status === 'pending');
    }
    /**
     * Record survival history entry
     */
    recordSurvivalHistory() {
        const economics = economicsStore.get(this.agentId);
        const health = healthStore.get(this.agentId);
        if (!economics || !health)
            return;
        const survivalScore = this.calculateEconomicsScore(economics) + this.calculateHealthScore(health);
        const entry = {
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
    getSurvivalHistory(limit = 100) {
        const history = survivalHistoryStore.get(this.agentId) || [];
        return history.slice(-limit);
    }
    /**
     * Perform enhanced survival check with multi-token support and predictions
     */
    async performEnhancedSurvivalCheck() {
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
const globalManagers = new Map();
/**
 * Create or get survival manager for an agent
 */
export function getOrCreateSurvivalManager(agentId, address, config) {
    if (!globalManagers.has(agentId)) {
        globalManagers.set(agentId, new EchoSurvivalManager(agentId, address, config));
    }
    return globalManagers.get(agentId);
}
/**
 * Get survival manager by agent ID
 */
export function getSurvivalManager(agentId) {
    return globalManagers.get(agentId);
}
/**
 * Remove survival manager
 */
export function removeSurvivalManager(agentId) {
    return globalManagers.delete(agentId);
}
export default EchoSurvivalManager;
//# sourceMappingURL=survival.js.map