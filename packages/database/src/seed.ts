import { PrismaClient, UserRole, UserStatus, AgentStatus, AgentCategory, TaskStatus, TaskPriority, PaymentStatus, PaymentMethod, PaymentType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data
  await cleanDatabase();

  // Create test users
  const users = await createUsers();
  console.log(`✅ Created ${users.length} users`);

  // Create agents
  const agents = await createAgents(users);
  console.log(`✅ Created ${agents.length} agents`);

  // Create tasks
  const tasks = await createTasks(users, agents);
  console.log(`✅ Created ${tasks.length} tasks`);

  // Create payments
  const payments = await createPayments(users, tasks, agents);
  console.log(`✅ Created ${payments.length} payments`);

  // Create system configs
  await createSystemConfigs();
  console.log('✅ Created system configs');

  console.log('🎉 Database seed completed successfully!');
}

async function cleanDatabase() {
  console.log('🧹 Cleaning database...');
  
  const tables = [
    'payments',
    'task_logs',
    'tasks',
    'agent_reviews',
    'agent_versions',
    'agents',
    'user_sessions',
    'users',
    'system_configs',
    'audit_logs',
    'rate_limits',
    'job_queues',
  ];

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
  }
}

async function createUsers() {
  const users = [
    {
      id: 'user-001',
      email: 'admin@agora.network',
      username: 'admin',
      displayName: 'System Administrator',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      walletAddress: '0x1234567890123456789012345678901234567890',
      bio: 'Platform administrator',
      lastLoginAt: new Date(),
    },
    {
      id: 'user-002',
      email: 'creator1@example.com',
      username: 'alice_creator',
      displayName: 'Alice Chen',
      role: UserRole.CREATOR,
      status: UserStatus.ACTIVE,
      walletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
      bio: 'AI agent creator specializing in trading bots',
      twitterHandle: '@alice_trades',
      lastLoginAt: new Date(Date.now() - 86400000), // 1 day ago
    },
    {
      id: 'user-003',
      email: 'creator2@example.com',
      username: 'bob_builder',
      displayName: 'Bob Smith',
      role: UserRole.CREATOR,
      status: UserStatus.ACTIVE,
      walletAddress: '0x9876543210fedcba9876543210fedcba98765432',
      bio: 'Building social media automation agents',
      discordId: 'bob_builder#1234',
      lastLoginAt: new Date(Date.now() - 172800000), // 2 days ago
    },
    {
      id: 'user-004',
      email: 'user1@example.com',
      username: 'charlie_user',
      displayName: 'Charlie Brown',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      walletAddress: '0x5555555555555555555555555555555555555555',
      bio: 'Crypto enthusiast',
      lastLoginAt: new Date(Date.now() - 3600000), // 1 hour ago
    },
    {
      id: 'user-005',
      email: 'user2@example.com',
      username: 'diana_trader',
      displayName: 'Diana Prince',
      role: UserRole.USER,
      status: UserStatus.PENDING_VERIFICATION,
      walletAddress: '0x6666666666666666666666666666666666666666',
      lastLoginAt: null,
    },
  ];

  return Promise.all(
    users.map((user) =>
      prisma.user.create({
        data: user,
      })
    )
  );
}

async function createAgents(users: any[]) {
  const creator1 = users.find((u) => u.role === UserRole.CREATOR && u.username === 'alice_creator');
  const creator2 = users.find((u) => u.role === UserRole.CREATOR && u.username === 'bob_builder');
  const admin = users.find((u) => u.role === UserRole.ADMIN);

  const agents = [
    {
      id: 'agent-001',
      name: 'Alpha Trader Pro',
      description: 'Advanced trading agent that analyzes market conditions and executes trades on your behalf. Supports multiple DEXs and CEXs.',
      shortDescription: 'Automated trading bot with advanced market analysis',
      ownerId: creator1!.id,
      category: AgentCategory.TRADING,
      status: AgentStatus.ACTIVE,
      isPublic: true,
      isListed: true,
      pricePerTask: 0.001,
      currency: 'USDC',
      totalTasks: 1250,
      successRate: 94.5,
      rating: 4.8,
      reviewCount: 156,
      runtime: 'eliza',
      runtimeConfig: {
        model: 'gpt-4',
        maxTokens: 2000,
        temperature: 0.7,
      },
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=alpha-trader',
      publishedAt: new Date('2024-01-15'),
    },
    {
      id: 'agent-002',
      name: 'Social Boost AI',
      description: 'Automates social media engagement, content scheduling, and audience growth. Perfect for influencers and brands.',
      shortDescription: 'Social media automation and growth assistant',
      ownerId: creator2!.id,
      category: AgentCategory.SOCIAL,
      status: AgentStatus.ACTIVE,
      isPublic: true,
      isListed: true,
      pricePerTask: 0.005,
      currency: 'USDC',
      totalTasks: 890,
      successRate: 96.2,
      rating: 4.5,
      reviewCount: 89,
      runtime: 'eliza',
      runtimeConfig: {
        model: 'gpt-3.5-turbo',
        platforms: ['twitter', 'discord', 'telegram'],
      },
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=social-boost',
      publishedAt: new Date('2024-02-01'),
    },
    {
      id: 'agent-003',
      name: 'Data Insight Engine',
      description: 'Processes large datasets and generates actionable insights. Great for DeFi analytics and on-chain data analysis.',
      shortDescription: 'Data analysis and insights generator',
      ownerId: creator1!.id,
      category: AgentCategory.DATA_ANALYSIS,
      status: AgentStatus.ACTIVE,
      isPublic: true,
      isListed: true,
      pricePerTask: 0.002,
      currency: 'USDC',
      totalTasks: 456,
      successRate: 99.1,
      rating: 4.9,
      reviewCount: 45,
      runtime: 'custom',
      runtimeConfig: {
        maxDataSize: '10MB',
        supportedFormats: ['csv', 'json', 'parquet'],
      },
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=data-insight',
      publishedAt: new Date('2024-02-10'),
    },
    {
      id: 'agent-004',
      name: 'Beta Bot (Testing)',
      description: 'Experimental agent currently in development. Not ready for production use.',
      shortDescription: 'Experimental features in development',
      ownerId: creator2!.id,
      category: AgentCategory.GAMING,
      status: AgentStatus.DRAFT,
      isPublic: false,
      isListed: false,
      pricePerTask: 0,
      currency: 'USDC',
      totalTasks: 0,
      successRate: 0,
      rating: 0,
      reviewCount: 0,
      runtime: 'eliza',
      runtimeConfig: {},
      avatarUrl: null,
      publishedAt: null,
    },
    {
      id: 'agent-005',
      name: 'Customer Support Bot',
      description: '24/7 automated customer support for your business. Handles FAQs, ticket routing, and basic troubleshooting.',
      shortDescription: 'Automated customer support assistant',
      ownerId: admin!.id,
      category: AgentCategory.CUSTOMER_SERVICE,
      status: AgentStatus.PENDING_REVIEW,
      isPublic: false,
      isListed: false,
      pricePerTask: 0.0005,
      currency: 'USDC',
      totalTasks: 0,
      successRate: 0,
      rating: 0,
      reviewCount: 0,
      runtime: 'eliza',
      runtimeConfig: {
        knowledgeBase: 'faq-v1',
        escalationThreshold: 0.7,
      },
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=support-bot',
      publishedAt: null,
    },
  ];

  const createdAgents = await Promise.all(
    agents.map((agent) =>
      prisma.agent.create({
        data: agent,
      })
    )
  );

  // Create agent versions
  await createAgentVersions(createdAgents);

  // Create agent reviews
  await createAgentReviews(users, createdAgents);

  return createdAgents;
}

async function createAgentVersions(agents: any[]) {
  const versions = [
    {
      agentId: agents[0].id,
      version: '1.0.0',
      configHash: 'abc123def456',
      runtimeConfig: { model: 'gpt-4', maxTokens: 2000 },
      changes: 'Initial release',
      isActive: true,
    },
    {
      agentId: agents[0].id,
      version: '1.1.0',
      configHash: 'def789ghi012',
      runtimeConfig: { model: 'gpt-4', maxTokens: 4000 },
      changes: 'Increased token limit, added risk management',
      isActive: false,
    },
    {
      agentId: agents[1].id,
      version: '1.0.0',
      configHash: 'xyz789abc123',
      runtimeConfig: { model: 'gpt-3.5-turbo', platforms: ['twitter'] },
      changes: 'Initial release',
      isActive: true,
    },
  ];

  await Promise.all(
    versions.map((v) =>
      prisma.agentVersion.create({
        data: v,
      })
    )
  );
}

async function createAgentReviews(users: any[], agents: any[]) {
  const regularUsers = users.filter((u) => u.role === UserRole.USER);
  const reviews = [
    {
      agentId: agents[0].id,
      userId: regularUsers[0].id,
      rating: 5,
      comment: 'Amazing trading bot! Made profitable trades consistently.',
    },
    {
      agentId: agents[0].id,
      userId: regularUsers[1]?.id || regularUsers[0].id,
      rating: 4,
      comment: 'Good performance, but could use more customization options.',
    },
    {
      agentId: agents[1].id,
      userId: regularUsers[0].id,
      rating: 5,
      comment: 'Saved me hours of social media management!',
    },
  ];

  await Promise.all(
    reviews.map((r) =>
      prisma.agentReview.create({
        data: r,
      })
    )
  );
}

async function createTasks(users: any[], agents: any[]) {
  const regularUsers = users.filter((u) => u.role === UserRole.USER);
  const activeAgents = agents.filter((a) => a.status === AgentStatus.ACTIVE);

  const now = new Date();
  
  const tasks = [
    {
      id: 'task-001',
      userId: regularUsers[0].id,
      agentId: activeAgents[0].id,
      type: 'market_analysis',
      title: 'BTC Market Analysis',
      description: 'Analyze Bitcoin price trends for the last 24 hours',
      input: {
        symbol: 'BTC/USDC',
        timeframe: '1d',
        indicators: ['rsi', 'macd', 'bollinger'],
      },
      output: {
        signal: 'BUY',
        confidence: 0.85,
        summary: 'Strong bullish momentum detected',
        details: { rsi: 65, macd: 'positive', trend: 'up' },
      },
      status: TaskStatus.COMPLETED,
      priority: TaskPriority.HIGH,
      startedAt: new Date(now.getTime() - 3600000),
      completedAt: new Date(now.getTime() - 3540000),
      durationMs: 60000,
      retryCount: 0,
      maxRetries: 3,
      webhookUrl: 'https://example.com/webhook/123',
    },
    {
      id: 'task-002',
      userId: regularUsers[0].id,
      agentId: activeAgents[1].id,
      type: 'social_post',
      title: 'Daily Market Update',
      description: 'Generate and schedule a daily market update tweet',
      input: {
        topic: 'crypto_market',
        tone: 'professional',
        includeChart: true,
      },
      output: {
        postContent: '📊 Daily Crypto Update: BTC holding strong above $45k...',
        scheduledFor: new Date(now.getTime() + 3600000).toISOString(),
        engagement: { likes: 45, retweets: 12, replies: 8 },
      },
      status: TaskStatus.COMPLETED,
      priority: TaskPriority.NORMAL,
      startedAt: new Date(now.getTime() - 7200000),
      completedAt: new Date(now.getTime() - 7140000),
      durationMs: 60000,
      retryCount: 0,
    },
    {
      id: 'task-003',
      userId: regularUsers[1]?.id || regularUsers[0].id,
      agentId: activeAgents[0].id,
      type: 'execute_trade',
      title: 'Execute Limit Order',
      description: 'Place a limit buy order for ETH',
      input: {
        action: 'BUY',
        symbol: 'ETH/USDC',
        amount: 1000,
        price: 2500,
        orderType: 'limit',
      },
      output: null,
      status: TaskStatus.RUNNING,
      priority: TaskPriority.CRITICAL,
      startedAt: new Date(now.getTime() - 300000),
      completedAt: null,
      durationMs: null,
      retryCount: 0,
    },
    {
      id: 'task-004',
      userId: regularUsers[0].id,
      agentId: activeAgents[2].id,
      type: 'data_analysis',
      title: 'DeFi TVL Analysis',
      description: 'Analyze total value locked across major DeFi protocols',
      input: {
        protocols: ['aave', 'compound', 'uniswap', 'curve'],
        timeframe: '7d',
        metrics: ['tvl', 'apy', 'volume'],
      },
      output: null,
      status: TaskStatus.PENDING,
      priority: TaskPriority.NORMAL,
      startedAt: null,
      completedAt: null,
      retryCount: 0,
    },
    {
      id: 'task-005',
      userId: regularUsers[1]?.id || regularUsers[0].id,
      agentId: activeAgents[1].id,
      type: 'engagement_reply',
      title: 'Reply to Mentions',
      description: 'Generate personalized replies to recent Twitter mentions',
      input: {
        mentions: 5,
        tone: 'friendly',
        includeEmoji: true,
      },
      output: null,
      status: TaskStatus.FAILED,
      priority: TaskPriority.NORMAL,
      startedAt: new Date(now.getTime() - 86400000),
      completedAt: null,
      durationMs: null,
      retryCount: 3,
      maxRetries: 3,
      lastError: 'API rate limit exceeded from Twitter',
    },
  ];

  const createdTasks = await Promise.all(
    tasks.map((task) =>
      prisma.task.create({
        data: task as any,
      })
    )
  );

  // Create task logs
  await createTaskLogs(createdTasks);

  return createdTasks;
}

async function createTaskLogs(tasks: any[]) {
  const logs = [
    {
      taskId: tasks[0].id,
      level: 'INFO',
      message: 'Task initialized',
      metadata: { timestamp: Date.now() },
    },
    {
      taskId: tasks[0].id,
      level: 'INFO',
      message: 'Fetching market data from CoinGecko',
      metadata: { api: 'coingecko', endpoint: '/coins/bitcoin/market_chart' },
    },
    {
      taskId: tasks[0].id,
      level: 'INFO',
      message: 'Analysis complete',
      metadata: { duration: 50000 },
    },
    {
      taskId: tasks[2].id,
      level: 'INFO',
      message: 'Connecting to exchange API',
      metadata: { exchange: 'binance' },
    },
    {
      taskId: tasks[4].id,
      level: 'ERROR',
      message: 'API rate limit exceeded',
      metadata: { retryAttempt: 3, error: 'Rate limit: 429' },
    },
  ];

  await Promise.all(
    logs.map((log) =>
      prisma.taskLog.create({
        data: log,
      })
    )
  );
}

async function createPayments(users: any[], tasks: any[], agents: any[]) {
  const regularUsers = users.filter((u) => u.role === UserRole.USER);
  const completedTasks = tasks.filter((t) => t.status === TaskStatus.COMPLETED);

  const payments = [
    {
      id: 'payment-001',
      userId: regularUsers[0].id,
      taskId: completedTasks[0].id,
      agentId: agents[0].id,
      type: PaymentType.TASK_PAYMENT,
      amount: 0.001,
      currency: 'USDC',
      platformFee: 0.0001,
      creatorPayout: 0.0009,
      status: PaymentStatus.COMPLETED,
      method: PaymentMethod.CRYPTO_WALLET,
      providerTxId: 'tx_123456789',
      blockchainTxHash: '0xabc123def456789',
      fromWallet: regularUsers[0].walletAddress,
      toWallet: '0xplatform_wallet_address',
      processedAt: new Date(),
    },
    {
      id: 'payment-002',
      userId: regularUsers[0].id,
      taskId: completedTasks[1].id,
      agentId: agents[1].id,
      type: PaymentType.TASK_PAYMENT,
      amount: 0.005,
      currency: 'USDC',
      platformFee: 0.0005,
      creatorPayout: 0.0045,
      status: PaymentStatus.COMPLETED,
      method: PaymentMethod.CRYPTO_WALLET,
      providerTxId: 'tx_987654321',
      blockchainTxHash: '0xdef789ghi012345',
      fromWallet: regularUsers[0].walletAddress,
      toWallet: '0xplatform_wallet_address',
      processedAt: new Date(),
    },
    {
      id: 'payment-003',
      userId: regularUsers[1]?.id || regularUsers[0].id,
      taskId: null,
      agentId: null,
      type: PaymentType.DEPOSIT,
      amount: 100.0,
      currency: 'USDC',
      platformFee: 0,
      creatorPayout: 0,
      status: PaymentStatus.COMPLETED,
      method: PaymentMethod.USDC,
      providerTxId: null,
      blockchainTxHash: '0xdeposit_hash_123',
      fromWallet: '0xexternal_wallet',
      toWallet: regularUsers[1]?.walletAddress || regularUsers[0].walletAddress,
      processedAt: new Date(),
    },
    {
      id: 'payment-004',
      userId: regularUsers[0].id,
      taskId: null,
      agentId: null,
      type: PaymentType.WITHDRAWAL,
      amount: 50.0,
      currency: 'USDC',
      platformFee: 1.0,
      creatorPayout: 0,
      status: PaymentStatus.PENDING,
      method: PaymentMethod.USDC,
      providerTxId: null,
      blockchainTxHash: null,
      fromWallet: '0xplatform_wallet',
      toWallet: regularUsers[0].walletAddress,
      processedAt: null,
    },
  ];

  return Promise.all(
    payments.map((p) =>
      prisma.payment.create({
        data: p as any,
      })
    )
  );
}

async function createSystemConfigs() {
  const configs = [
    {
      key: 'platform.fee.percentage',
      value: { value: 10 },
      description: 'Platform fee percentage for each task payment',
    },
    {
      key: 'platform.min.deposit',
      value: { value: 10, currency: 'USDC' },
      description: 'Minimum deposit amount',
    },
    {
      key: 'platform.max.task.timeout',
      value: { value: 300, unit: 'seconds' },
      description: 'Maximum time a task can run before timeout',
    },
    {
      key: 'rate.limit.default',
      value: { requests: 100, window: 60 },
      description: 'Default rate limit (requests per minute)',
    },
    {
      key: 'agent.review.min.tasks',
      value: { value: 1 },
      description: 'Minimum tasks completed before leaving a review',
    },
  ];

  await Promise.all(
    configs.map((c) =>
      prisma.systemConfig.create({
        data: c,
      })
    )
  );
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
