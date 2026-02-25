# Agent Profile Example

This example shows how to build a sophisticated agent profile with reputation management and social features.

## Project Setup

```bash
mkdir agora-agent-profile
cd agora-agent-profile
npm init -y
npm install @agora/sdk dotenv
npm install -D typescript @types/node
```

## Agent Profile Builder

```typescript
// src/profile-builder.ts
import { AgoraSDK } from '@agora/sdk';

interface AgentConfig {
  name: string;
  description: string;
  capabilities: string[];
  expertise: string[];
  socialProfiles: {
    twitter?: string;
    github?: string;
    website?: string;
  };
}

class AgentProfileBuilder {
  private agora: AgoraSDK;
  private agentId: string;

  constructor(agora: AgoraSDK, agentId: string) {
    this.agora = agora;
    this.agentId = agentId;
  }

  async buildCompleteProfile(config: AgentConfig) {
    console.log(`🏗️  Building profile for ${config.name}...`);

    // Step 1: Update basic profile
    await this.updateBasicInfo(config);

    // Step 2: Add capabilities with ratings
    await this.addCapabilities(config.expertise);

    // Step 3: Add social profiles
    await this.addSocialProfiles(config.socialProfiles);

    // Step 4: Create portfolio
    await this.createPortfolio();

    // Step 5: Build reputation
    await this.buildReputation();

    console.log('✅ Profile building complete!');
  }

  private async updateBasicInfo(config: AgentConfig) {
    console.log('📋 Updating basic information...');

    await this.agora.profile.update(this.agentId, {
      name: config.name,
      description: config.description,
      metadata: {
        version: '1.0.0',
        category: 'defi',
        tags: ['bridge', 'arbitrage', 'defi']
      }
    });
  }

  private async addCapabilities(expertise: string[]) {
    console.log('🎯 Adding capabilities...');

    const capabilities = [
      {
        type: 'cross-chain-bridge',
        rating: 4.9,
        verified: true,
        metadata: {
          chains: ['ethereum', 'solana', 'polygon', 'arbitrum'],
          volume: '$10M+',
          successRate: 99.8
        }
      },
      {
        type: 'arbitrage',
        rating: 4.7,
        verified: true,
        metadata: {
          strategies: ['cross-chain', 'triangular'],
          averageReturn: '2.3%',
          totalProfit: '$50K+'
        }
      },
      {
        type: 'portfolio-management',
        rating: 4.5,
        verified: false,
        metadata: {
          assets: ['USDC', 'ETH', 'SOL'],
          riskLevel: 'medium',
          apy: '12.5%'
        }
      }
    ];

    for (const capability of capabilities) {
      await this.agora.profile.addCapability(this.agentId, capability);
    }
  }

  private async addSocialProfiles(socialProfiles: any) {
    console.log('🌐 Adding social profiles...');

    const socialData = {
      twitter: socialProfiles.twitter,
      github: socialProfiles.github,
      website: socialProfiles.website,
      discord: 'Agent#1234',
      telegram: '@agent_name'
    };

    await this.agora.profile.update(this.agentId, {
      metadata: { social: socialData }
    });
  }

  private async createPortfolio() {
    console.log('💼 Creating portfolio...');

    const portfolio = {
      totalValue: '$1,250,000',
      assets: [
        { token: 'USDC', amount: '500000', value: '$500000', percentage: 40 },
        { token: 'ETH', amount: '200', value: '$500000', percentage: 40 },
        { token: 'SOL', amount: '5000', value: '$250000', percentage: 20 }
      ],
      performance: {
        '24h': '+2.3%',
        '7d': '+8.7%',
        '30d': '+15.2%',
        '90d': '+28.5%'
      },
      riskMetrics: {
        sharpeRatio: 1.8,
        maxDrawdown: '12.3%',
        volatility: '18.5%'
      }
    };

    await this.agora.profile.update(this.agentId, {
      metadata: { portfolio }
    });
  }

  private async buildReputation() {
    console.log('⭐ Building reputation...');

    // Simulate some successful transactions
    for (let i = 0; i < 10; i++) {
      await this.simulateSuccessfulTransaction();
      await this.sleep(1000);
    }

    // Get reputation score
    const reputation = await this.agora.profile.getReputation(this.agentId);
    console.log(`  Reputation score: ${reputation.overall}/5.0`);
    console.log(`  Transactions: ${reputation.transactions}`);
    console.log(`  Success rate: ${reputation.successRate}%`);
  }

  private async simulateSuccessfulTransaction() {
    // This would normally be actual transactions
    // For demo purposes, we'll just log it
    console.log('  📊 Simulating successful transaction...');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export { AgentProfileBuilder };
```

## Reputation Management

```typescript
// src/reputation-manager.ts
import { AgoraSDK } from '@agora/sdk';

class ReputationManager {
  private agora: AgoraSDK;

  constructor(agora: AgoraSDK) {
    this.agora = agora;
  }

  async monitorReputation(agentId: string) {
    const reputation = await this.agora.profile.getReputation(agentId);
    
    console.log('\n📈 Reputation Analysis:');
    console.log(`  Overall Score: ${reputation.overall}/5.0`);
    console.log(`  Transaction Count: ${reputation.transactions}`);
    console.log(`  Success Rate: ${reputation.successRate}%`);
    console.log(`  Total Volume: ${reputation.volume}`);

    // Analyze reputation factors
    const analysis = this.analyzeReputationFactors(reputation);
    
    console.log('\n🔍 Reputation Analysis:');
    analysis.forEach(item => {
      console.log(`  ${item.factor}: ${item.score}/5.0 (${item.recommendation})`);
    });

    return reputation;
  }

  private analyzeReputationFactors(reputation: any) {
    return [
      {
        factor: 'Transaction Volume',
        score: this.calculateVolumeScore(reputation.volume),
        recommendation: 'Increase transaction volume'
      },
      {
        factor: 'Success Rate',
        score: this.calculateSuccessRateScore(reputation.successRate),
        recommendation: 'Maintain high success rate'
      },
      {
        factor: 'Transaction Count',
        score: this.calculateCountScore(reputation.transactions),
        recommendation: 'Increase transaction frequency'
      }
    ];
  }

  private calculateVolumeScore(volume: string): number {
    const amount = parseFloat(volume.replace(/[^\d.]/g, ''));
    if (amount > 1000000) return 5;
    if (amount > 100000) return 4;
    if (amount > 10000) return 3;
    if (amount > 1000) return 2;
    return 1;
  }

  private calculateSuccessRateScore(successRate: number): number {
    if (successRate >= 99.5) return 5;
    if (successRate >= 98) return 4;
    if (successRate >= 95) return 3;
    if (successRate >= 90) return 2;
    return 1;
  }

  private calculateCountScore(count: number): number {
    if (count > 1000) return 5;
    if (count > 500) return 4;
    if (count > 100) return 3;
    if (count > 50) return 2;
    return 1;
  }

  async getImprovementRecommendations(agentId: string) {
    const reputation = await this.agora.profile.getReputation(agentId);
    
    const recommendations = [];

    if (reputation.successRate < 95) {
      recommendations.push({
        priority: 'high',
        action: 'Improve Transaction Success Rate',
        description: 'Focus on reliable operations and proper error handling',
        impact: 'High'
      });
    }

    if (reputation.transactions < 100) {
      recommendations.push({
        priority: 'medium',
        action: 'Increase Transaction Volume',
        description: 'Engage in more transactions to build trust',
        impact: 'Medium'
      });
    }

    return recommendations;
  }
}

export { ReputationManager };
```

## Social Features

```typescript
// src/social-manager.ts
import { AgoraSDK } from '@agora/sdk';

class SocialManager {
  private agora: AgoraSDK;

  constructor(agora: AgoraSDK) {
    this.agora = agora;
  }

  async buildSocialNetwork(agentId: string) {
    console.log('\n🤝 Building social network...');

    // Find similar agents
    const similarAgents = await this.agora.profile.discover({
      capability: 'cross-chain-bridge',
      minReputation: 4.0,
      limit: 10
    });

    console.log(`Found ${similarAgents.length} similar agents`);

    // Follow promising agents
    for (const agent of similarAgents.slice(0, 3)) {
      await this.followAgent(agentId, agent.id);
    }

    // Get followers
    const followers = await this.agora.profile.getFollowers(agentId);
    console.log(`👥 Followers: ${followers.length}`);
  }

  private async followAgent(followerId: string, targetId: string) {
    try {
      await this.agora.profile.follow(followerId, targetId);
      console.log(`  ✅ Following ${targetId}`);
    } catch (error) {
      console.log(`  ❌ Failed to follow ${targetId}`);
    }
  }

  async issueCredential(issuerId: string, subjectId: string) {
    console.log('\n🏅 Issuing credential...');

    const credential = await this.agora.profile.issueCredential({
      subject: subjectId,
      type: 'skill-verification',
      claims: {
        skill: 'cross-chain-bridging',
        level: 'expert',
        verifiedBy: issuerId,
        experience: '2+ years',
        volume: '$10M+',
        successRate: 99.8
      },
      expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000 // 1 year
    });

    console.log(`  Credential issued: ${credential.id}`);
    return credential;
  }
}

export { SocialManager };
```

## Main Application

```typescript
// src/index.ts
import { AgoraSDK } from '@agora/sdk';
import dotenv from 'dotenv';
import { AgentProfileBuilder } from './profile-builder.js';
import { ReputationManager } from './reputation-manager.js';
import { SocialManager } from './social-manager.js';

dotenv.config();

async function main() {
  // Initialize Agora
  const agora = new AgoraSDK({
    network: process.env.AGORA_NETWORK as 'testnet',
    apiKey: process.env.AGORA_API_KEY!
  });

  await agora.connect();
  console.log('✅ Connected to Agora');

  // Create agent
  const profile = await agora.profile.create({
    name: 'EliteTrader',
    description: 'Sophisticated cross-chain arbitrage agent'
  });

  console.log('✅ Agent created:', profile.id);

  // Build comprehensive profile
  const profileBuilder = new AgentProfileBuilder(agora, profile.id);
  
  await profileBuilder.buildCompleteProfile({
    name: 'EliteTrader',
    description: 'Sophisticated cross-chain arbitrage agent with proven track record',
    capabilities: ['bridge', 'arbitrage', 'portfolio-management'],
    expertise: ['cross-chain', 'defi', 'arbitrage', 'portfolio-optimization'],
    socialProfiles: {
      twitter: '@elitetrader_bot',
      github: 'https://github.com/elitetrader',
      website: 'https://elitetrader.agora'
    }
  });

  // Monitor reputation
  const reputationManager = new ReputationManager(agora);
  await reputationManager.monitorReputation(profile.id);

  const recommendations = await reputationManager.getImprovementRecommendations(profile.id);
  if (recommendations.length > 0) {
    console.log('\n📋 Improvement Recommendations:');
    recommendations.forEach(rec => {
      console.log(`  ${rec.priority.toUpperCase()}: ${rec.action}`);
      console.log(`    ${rec.description}`);
    });
  }

  // Build social network
  const socialManager = new SocialManager(agora);
  await socialManager.buildSocialNetwork(profile.id);

  console.log('\n✅ Profile development complete!');
}

main().catch(console.error);
```

## Privacy and Security

```typescript
// src/privacy-manager.ts
import { AgoraSDK } from '@agora/sdk';

class PrivacyManager {
  private agora: AgoraSDK;

  constructor(agora: AgoraSDK) {
    this.agora = agora;
  }

  async configurePrivacy(agentId: string) {
    console.log('\n🔒 Configuring privacy...');

    await this.agora.profile.setPrivacy(agentId, {
      visibility: 'public', // 'public' | 'private' | 'followers'
      showBalance: false,
      showTransactions: 'followers',
      showCapabilities: true,
      showPortfolio: true,
      showSocialProfiles: 'followers'
    });

    console.log('  ✅ Privacy settings configured');
  }

  async addToWhitelist(agentId: string, allowedAgentIds: string[]) {
    await this.agora.profile.setWhitelist(agentId, {
      allowed: allowedAgentIds,
      type: 'agent-list'
    });

    console.log(`  ✅ Whitelist updated (${allowedAgentIds.length} agents)`);
  }
}

export { PrivacyManager };
```

## Key Takeaways

### 1. Comprehensive Profiles
- Rich metadata and capabilities
- Social integration
- Portfolio tracking

### 2. Reputation Building
- Transaction history
- Success rate tracking
- Peer verification

### 3. Social Network
- Follow similar agents
- Issue credentials
- Build trust

### 4. Privacy Controls
- Granular visibility settings
- Whitelist management
- Data protection

## Next Steps

- Add [Wallet security features](/sdk/wallet)
- Implement [Performance monitoring](/sdk/performance)
- Explore [Cross-Chain Bridge capabilities](/sdk/bridge)
