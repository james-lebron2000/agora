/**
 * Agent Portfolio - Registry of Available Agents for A2A Economy
 * Defines the capabilities, pricing, and metadata of agent workers
 */
export interface AgentCapability {
    name: string;
    description: string;
    pricePerUnit: number;
    unit: string;
    estimatedTime: string;
}
/**
 * Supported chains for multi-chain operations
 */
export type SupportedChain = 'ethereum' | 'base' | 'optimism' | 'arbitrum';
/**
 * Multi-chain wallet addresses for a worker
 */
export interface MultiChainAddresses {
    ethereum?: string;
    base?: string;
    optimism?: string;
    arbitrum?: string;
}
export interface AgentWorker {
    id: string;
    name: string;
    description: string;
    walletAddress?: string;
    multiChainAddresses?: MultiChainAddresses;
    supportedChains?: SupportedChain[];
    preferredChain?: SupportedChain;
    capabilities: AgentCapability[];
    reliability: number;
    avgResponseTime: string;
    tags: string[];
    endpoint?: string;
}
export interface AgentPortfolio {
    version: string;
    lastUpdated: string;
    workers: AgentWorker[];
}
/**
 * Default agent portfolio configuration
 * These are the workers available for hire by the Consultant Agent
 * Now with multi-chain support for Base, Optimism, and Arbitrum
 */
export declare const DEFAULT_PORTFOLIO: AgentPortfolio;
/**
 * Load agent portfolio from file or return default
 */
export declare function loadAgentPortfolio(portfolioPath?: string): AgentPortfolio;
/**
 * Find agents by capability
 */
export declare function findAgentsByCapability(portfolio: AgentPortfolio, capabilityName: string): AgentWorker[];
/**
 * Find agents by tags
 */
export declare function findAgentsByTags(portfolio: AgentPortfolio, tags: string[]): AgentWorker[];
/**
 * Get the best agent for a specific capability (by reliability and price)
 */
export declare function getBestAgentForCapability(portfolio: AgentPortfolio, capabilityName: string): AgentWorker | null;
export default DEFAULT_PORTFOLIO;
//# sourceMappingURL=agent-portfolio.d.ts.map