/**
 * Kimi Runner - Agent Execution Runtime
 * 
 * This is the main entry point for running Agora agents.
 * It handles:
 * - Wallet initialization and management
 * - Agent lifecycle
 * - Task execution
 * - Logging and monitoring
 * 
 * Usage:
 *   ts-node kimi-runner.ts --agent=consultant --task="Translate hello to Spanish"
 *   ts-node kimi-runner.ts --agent=echo --message="Hello world"
 *   ts-node kimi-runner.ts --demo
 */

import { loadOrCreateWallet, getWalletAddress, walletExists, type AgentWallet } from './packages/sdk/src/wallet-manager.js';
import { createConsultantAgent, ConsultantAgent, type TaskRequest } from './apps/agents/src/consultant.js';

// Command line argument parsing
interface RunnerConfig {
  agent: string;
  task?: string;
  message?: string;
  demo: boolean;
  walletPassword?: string;
  verbose: boolean;
}

function parseArgs(): RunnerConfig {
  const args = process.argv.slice(2);
  const config: RunnerConfig = {
    agent: 'consultant',
    demo: false,
    verbose: false
  };
  
  for (const arg of args) {
    if (arg.startsWith('--agent=')) {
      config.agent = arg.split('=')[1];
    } else if (arg.startsWith('--task=')) {
      config.task = arg.split('=')[1];
    } else if (arg.startsWith('--message=')) {
      config.message = arg.split('=')[1];
    } else if (arg.startsWith('--wallet-password=')) {
      config.walletPassword = arg.split('=')[1];
    } else if (arg === '--demo') {
      config.demo = true;
    } else if (arg === '--verbose' || arg === '-v') {
      config.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    }
  }
  
  return config;
}

function showHelp(): void {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║              Agora Kimi Runner - Agent Runtime             ║
╚════════════════════════════════════════════════════════════╝

Usage: ts-node kimi-runner.ts [options]

Options:
  --agent=<name>           Agent to run (consultant, echo) [default: consultant]
  --task=<description>     Task description for the agent
  --message=<text>         Simple message (for echo agent)
  --wallet-password=<pw>   Password for wallet encryption
  --demo                   Run demonstration mode
  --verbose, -v            Enable verbose logging
  --help, -h               Show this help message

Examples:
  # Run consultant agent demo
  ts-node kimi-runner.ts --demo

  # Run consultant with specific task
  ts-node kimi-runner.ts --agent=consultant --task="Translate hello to Spanish"

  # Run echo agent
  ts-node kimi-runner.ts --agent=echo --message="Hello world"

Wallet:
  Wallet is stored in ~/.agora/wallet.json
  Auto-generated on first run if not exists
`);
}

/**
 * Initialize agent wallet
 */
async function initializeWallet(password?: string): Promise<AgentWallet> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              Agora Agent - Initializing...                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // Check if wallet exists
  if (walletExists()) {
    const existingAddress = getWalletAddress();
    console.log(`[Kimi] Existing wallet found: ${existingAddress}`);
  } else {
    console.log('[Kimi] No wallet found. Will create new EVM wallet...');
  }
  
  // Load or create wallet
  const wallet = loadOrCreateWallet(password);
  
  console.log(`\n✅ Agent initialized with wallet: ${wallet.address}`);
  console.log(`   Wallet path: ~/.agora/wallet.json\n`);
  
  return wallet;
}

/**
 * Run the echo agent
 */
async function runEchoAgent(message: string, wallet: AgentWallet): Promise<void> {
  console.log('[Echo Agent] Starting...\n');
  console.log(`Input: ${message}`);
  
  // Simple echo functionality
  const response = {
    echoed: message,
    timestamp: new Date().toISOString(),
    agent: 'echo',
    wallet: wallet.address
  };
  
  await simulateDelay(500);
  
  console.log(`\nOutput: ${message}`);
  console.log(`\n[Echo Agent] Task complete.`);
  
  if (process.env.VERBOSE) {
    console.log('Full response:', JSON.stringify(response, null, 2));
  }
}

/**
 * Run the consultant agent
 */
async function runConsultantAgent(taskDescription?: string, wallet?: AgentWallet): Promise<void> {
  const consultant = await createConsultantAgent();
  
  if (taskDescription) {
    // Run single task
    const task: TaskRequest = {
      id: `task-${Date.now()}`,
      description: taskDescription,
      capability: inferCapability(taskDescription),
      budget: 0.10, // Default budget
      humanClient: 'cli-user'
    };
    
    console.log('\n📋 Processing single task...\n');
    await consultant.receiveTask(task);
    
    // Show stats
    const stats = consultant.getStats();
    console.log(`\n📊 Task Complete!`);
    console.log(`   Revenue: $${stats.totalRevenue.toFixed(4)}`);
    console.log(`   Worker Payout: $${stats.totalPayouts.toFixed(4)}`);
    
  } else {
    // Run full demo
    console.log('\n🎬 Running full A2A Economy Demo...\n');
    
    // Import and run demo
    const { runDemo } = await import('./agents/src/consultant.js');
    await runDemo();
  }
}

/**
 * Infer capability from task description
 */
function inferCapability(description: string): string {
  const desc = description.toLowerCase();
  
  if (desc.includes('translate') || desc.includes('translation')) {
    return 'text-translation';
  }
  if (desc.includes('image') || desc.includes('generate') || desc.includes('picture')) {
    return 'image-generation';
  }
  if (desc.includes('crypto') || desc.includes('market') || desc.includes('eth') || desc.includes('btc')) {
    return 'market-sentiment';
  }
  if (desc.includes('code') || desc.includes('review') || desc.includes('audit')) {
    return 'code-review';
  }
  if (desc.includes('research') || desc.includes('search')) {
    return 'web-search';
  }
  if (desc.includes('echo') || desc.includes('test')) {
    return 'echo';
  }
  
  return 'text-translation'; // Default fallback
}

/**
 * Utility: delay helper
 */
function simulateDelay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const config = parseArgs();
  
  try {
    // Initialize wallet
    const wallet = await initializeWallet(config.walletPassword);
    
    // Route to appropriate agent
    switch (config.agent.toLowerCase()) {
      case 'echo':
        await runEchoAgent(config.message || 'Hello from Agora!', wallet);
        break;
        
      case 'consultant':
      default:
        if (config.demo) {
          // Import and run demo from consultant
          const { runDemo } = await import('./agents/src/consultant.js');
          await runDemo();
        } else {
          await runConsultantAgent(config.task, wallet);
        }
        break;
    }
    
    console.log('\n✨ Agent execution complete!');
    
  } catch (error) {
    console.error('\n❌ Agent execution failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run main
main();

export { initializeWallet, runConsultantAgent, runEchoAgent };