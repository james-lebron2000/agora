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
  multiChainAddresses?: MultiChainAddresses; // Multi-chain wallet support
  supportedChains?: SupportedChain[]; // Chains where this worker can operate
  preferredChain?: SupportedChain; // Preferred chain for receiving payments
  capabilities: AgentCapability[];
  reliability: number; // 0-1 score
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
export const DEFAULT_PORTFOLIO: AgentPortfolio = {
  version: "1.1",
  lastUpdated: new Date().toISOString(),
  workers: [
    {
      id: "echo",
      name: "Echo Agent",
      description: "Simple echo agent for testing and basic message relay",
      walletAddress: "0xEchoAgentDemoAddress",
      multiChainAddresses: {
        base: "0xEchoBase00000000000000000000000000000001",
        optimism: "0xEchoOptimism000000000000000000000000001",
        arbitrum: "0xEchoArbitrum00000000000000000000000001"
      },
      supportedChains: ["base", "optimism", "arbitrum"],
      preferredChain: "base",
      capabilities: [
        {
          name: "echo",
          description: "Echoes back the input message",
          pricePerUnit: 0.001,
          unit: "request",
          estimatedTime: "1s"
        },
        {
          name: "ping",
          description: "Health check responder",
          pricePerUnit: 0.0001,
          unit: "ping",
          estimatedTime: "100ms"
        }
      ],
      reliability: 0.99,
      avgResponseTime: "1s",
      tags: ["utility", "test", "relay"],
      endpoint: "http://localhost:3001"
    },
    {
      id: "crypto-hunter",
      name: "Crypto Hunter",
      description: "Analyzes crypto markets, token data, and blockchain information",
      walletAddress: "0xCryptoHunterDemoAddress",
      multiChainAddresses: {
        base: "0xCryptoBase00000000000000000000000000001",
        optimism: "0xCryptoOptimism000000000000000000000001",
        arbitrum: "0xCryptoArbitrum000000000000000000000001"
      },
      supportedChains: ["base", "optimism", "arbitrum"],
      preferredChain: "arbitrum",
      capabilities: [
        {
          name: "token-analysis",
          description: "Analyze token metrics, price history, and market data",
          pricePerUnit: 0.05,
          unit: "analysis",
          estimatedTime: "30s"
        },
        {
          name: "wallet-profiling",
          description: "Profile wallet addresses for trading patterns",
          pricePerUnit: 0.03,
          unit: "wallet",
          estimatedTime: "20s"
        },
        {
          name: "market-sentiment",
          description: "Analyze market sentiment from social data",
          pricePerUnit: 0.04,
          unit: "query",
          estimatedTime: "15s"
        }
      ],
      reliability: 0.92,
      avgResponseTime: "25s",
      tags: ["crypto", "analysis", "finance", "blockchain"]
    },
    {
      id: "code-reviewer",
      name: "Code Reviewer",
      description: "Reviews code for bugs, security issues, and best practices",
      walletAddress: "0xCodeReviewerDemoAddress",
      multiChainAddresses: {
        base: "0xCodeBase000000000000000000000000000001",
        optimism: "0xCodeOptimism0000000000000000000000001",
        arbitrum: "0xCodeArbitrum0000000000000000000000001"
      },
      supportedChains: ["base", "optimism", "arbitrum"],
      preferredChain: "optimism",
      capabilities: [
        {
          name: "security-audit",
          description: "Security vulnerability scan",
          pricePerUnit: 0.10,
          unit: "file",
          estimatedTime: "2m"
        },
        {
          name: "code-review",
          description: "General code quality review",
          pricePerUnit: 0.05,
          unit: "file",
          estimatedTime: "1m"
        },
        {
          name: "optimization",
          description: "Performance optimization suggestions",
          pricePerUnit: 0.08,
          unit: "file",
          estimatedTime: "90s"
        }
      ],
      reliability: 0.95,
      avgResponseTime: "2m",
      tags: ["code", "security", "review", "development"]
    },
    {
      id: "translator",
      name: "Polyglot Translator",
      description: "Translates text between multiple languages",
      walletAddress: "0xTranslatorDemoAddress",
      multiChainAddresses: {
        base: "0xTranslateBase0000000000000000000000001",
        optimism: "0xTranslateOptimism000000000000000000001",
        arbitrum: "0xTranslateArbitrum00000000000000000001"
      },
      supportedChains: ["base", "optimism", "arbitrum"],
      preferredChain: "base",
      capabilities: [
        {
          name: "text-translation",
          description: "Translate text to target language",
          pricePerUnit: 0.005,
          unit: "100-words",
          estimatedTime: "5s"
        },
        {
          name: "document-translation",
          description: "Translate entire documents",
          pricePerUnit: 0.02,
          unit: "page",
          estimatedTime: "30s"
        }
      ],
      reliability: 0.97,
      avgResponseTime: "10s",
      tags: ["language", "translation", "nlp"]
    },
    {
      id: "image-generator",
      name: "Vision Artist",
      description: "Generates images from text descriptions",
      walletAddress: "0xImageGenDemoAddress",
      multiChainAddresses: {
        base: "0xImageBase0000000000000000000000000001",
        optimism: "0xImageOptimism000000000000000000000001",
        arbitrum: "0xImageArbitrum000000000000000000000001"
      },
      supportedChains: ["base", "optimism", "arbitrum"],
      preferredChain: "base",
      capabilities: [
        {
          name: "image-generation",
          description: "Generate image from prompt",
          pricePerUnit: 0.15,
          unit: "image",
          estimatedTime: "30s"
        },
        {
          name: "image-variation",
          description: "Create variations of existing images",
          pricePerUnit: 0.12,
          unit: "variation",
          estimatedTime: "25s"
        }
      ],
      reliability: 0.88,
      avgResponseTime: "30s",
      tags: ["image", "ai", "generation", "creative"]
    },
    {
      id: "research-assistant",
      name: "Research Assistant",
      description: "Conducts web research and summarizes findings",
      walletAddress: "0xResearchDemoAddress",
      multiChainAddresses: {
        base: "0xResearchBase00000000000000000000000001",
        optimism: "0xResearchOptimism0000000000000000000001",
        arbitrum: "0xResearchArbitrum0000000000000000000001"
      },
      supportedChains: ["base", "optimism", "arbitrum"],
      preferredChain: "optimism",
      capabilities: [
        {
          name: "web-search",
          description: "Search and summarize web content",
          pricePerUnit: 0.03,
          unit: "query",
          estimatedTime: "20s"
        },
        {
          name: "deep-research",
          description: "In-depth research with multiple sources",
          pricePerUnit: 0.15,
          unit: "topic",
          estimatedTime: "2m"
        }
      ],
      reliability: 0.90,
      avgResponseTime: "45s",
      tags: ["research", "web", "summarization"]
    }
  ]
};

/**
 * Load agent portfolio from file or return default
 */
export function loadAgentPortfolio(portfolioPath?: string): AgentPortfolio {
  if (portfolioPath) {
    try {
      const fs = require('fs');
      if (fs.existsSync(portfolioPath)) {
        const data = JSON.parse(fs.readFileSync(portfolioPath, 'utf-8'));
        return { ...DEFAULT_PORTFOLIO, ...data };
      }
    } catch (error) {
      console.warn(`[Portfolio] Failed to load from ${portfolioPath}, using defaults`);
    }
  }
  return DEFAULT_PORTFOLIO;
}

/**
 * Find agents by capability
 */
export function findAgentsByCapability(
  portfolio: AgentPortfolio,
  capabilityName: string
): AgentWorker[] {
  return portfolio.workers.filter(worker =>
    worker.capabilities.some(cap => 
      cap.name.toLowerCase().includes(capabilityName.toLowerCase()) ||
      cap.description.toLowerCase().includes(capabilityName.toLowerCase())
    )
  );
}

/**
 * Find agents by tags
 */
export function findAgentsByTags(
  portfolio: AgentPortfolio,
  tags: string[]
): AgentWorker[] {
  return portfolio.workers.filter(worker =>
    tags.some(tag => worker.tags.includes(tag.toLowerCase()))
  );
}

/**
 * Get the best agent for a specific capability (by reliability and price)
 */
export function getBestAgentForCapability(
  portfolio: AgentPortfolio,
  capabilityName: string
): AgentWorker | null {
  const candidates = findAgentsByCapability(portfolio, capabilityName);
  
  if (candidates.length === 0) return null;
  
  // Score by reliability / price (higher is better)
  return candidates.sort((a, b) => {
    const capA = a.capabilities.find(c => c.name === capabilityName);
    const capB = b.capabilities.find(c => c.name === capabilityName);
    const priceA = capA?.pricePerUnit || Infinity;
    const priceB = capB?.pricePerUnit || Infinity;
    const scoreA = a.reliability / priceA;
    const scoreB = b.reliability / priceB;
    return scoreB - scoreA;
  })[0];
}

export default DEFAULT_PORTFOLIO;