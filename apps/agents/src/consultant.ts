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
 * 
 * @module consultant
 */

import { loadAgentPortfolio, findAgentsByCapability, getBestAgentForCapability, type AgentWorker, type AgentCapability } from './agent-portfolio.js';
import { loadOrCreateWallet, type AgentWallet } from '@agora/sdk';

// Agora protocol types
interface AgoraMessage {
  protocol: 'agora/1.0';
  id: string;
  timestamp: string;
  sender: {
    id: string;
    signature: string;
  };
  type: 'REQUEST' | 'OFFER' | 'ACCEPT' | 'RESULT' | 'STATUS' | 'ERROR';
  payload: Record<string, any>;
}

interface TaskRequest {
  id: string;
  description: string;
  capability: string;
  budget: number;
  deadline?: string;
  requirements?: string[];
  humanClient: string;
}

interface HireRequest {
  workerId: string;
  task: TaskRequest;
  payment: number;
}

interface WorkResult {
  success: boolean;
  result?: any;
  error?: string;
  workerId: string;
  taskId: string;
}

interface AgentTask {
  id: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  taskRequest: TaskRequest;
  assignedWorker?: AgentWorker;
  paymentToWorker: number;
  margin: number;
  result?: WorkResult;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Consultant Agent - The Master Agent
 */
export class ConsultantAgent {
  private wallet: AgentWallet;
  private portfolio = loadAgentPortfolio();
  private activeTasks: Map<string, AgentTask> = new Map();
  private completedTasks: Map<string, AgentTask> = new Map();
  private readonly MARGIN_RATE = 0.20; // 20% consultant margin
  
  constructor(wallet: AgentWallet) {
    this.wallet = wallet;
    console.log(`[Consultant] Initialized with wallet: ${wallet.address}`);
  }
  
  /**
   * Get the consultant's wallet address
   */
  getAddress(): string {
    return this.wallet.address;
  }
  
  /**
   * Receive a task from a human client
   * Analyzes the task and delegates to appropriate worker agent(s)
   */
  async receiveTask(taskRequest: TaskRequest): Promise<AgentTask> {
    console.log(`\n[Consultant] Received task from ${taskRequest.humanClient}`);
    console.log(`  Task: ${taskRequest.description}`);
    console.log(`  Budget: $${taskRequest.budget} USD`);
    console.log(`  Required capability: ${taskRequest.capability}`);
    
    // Calculate payment split
    const margin = taskRequest.budget * this.MARGIN_RATE;
    const workerPayment = taskRequest.budget - margin;
    
    console.log(`  Consultant margin (20%): $${margin.toFixed(4)}`);
    console.log(`  Worker payment (80%): $${workerPayment.toFixed(4)}`);
    
    // Create task record
    const task: AgentTask = {
      id: taskRequest.id,
      status: 'pending',
      taskRequest,
      paymentToWorker: workerPayment,
      margin,
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
      const cap = agent.capabilities.find(c => 
        c.name.toLowerCase().includes(taskRequest.capability.toLowerCase())
      );
      console.log(`  ${i + 1}. ${agent.name} (reliability: ${agent.reliability}, price: $${cap?.pricePerUnit})`);
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
    
    // Hire the worker
    return await this.hireWorker(task, bestWorker);
  }
  
  /**
   * Hire a worker agent to complete a task
   */
  private async hireWorker(task: AgentTask, worker: AgentWorker): Promise<AgentTask> {
    console.log(`\n[Consultant] 🤝 Hiring ${worker.name} for task ${task.id}`);
    
    task.assignedWorker = worker;
    task.status = 'assigned';
    task.updatedAt = new Date();
    
    // Simulate A2A communication
    const hireRequest: HireRequest = {
      workerId: worker.id,
      task: task.taskRequest,
      payment: task.paymentToWorker
    };
    
    try {
      // Execute the work through the runKimiAgent pattern
      const result = await this.executeWorkerTask(worker, task);
      
      task.result = result;
      task.status = result.success ? 'completed' : 'failed';
      task.updatedAt = new Date();
      
      // Move to completed
      this.completedTasks.set(task.id, task);
      this.activeTasks.delete(task.id);
      
      if (result.success) {
        console.log(`[Consultant] ✅ Task completed by ${worker.name}`);
        console.log(`  Result:`, result.result);
      } else {
        console.log(`[Consultant] ❌ Task failed: ${result.error}`);
      }
      
      return task;
      
    } catch (error) {
      console.error(`[Consultant] Error hiring worker:`, error);
      task.status = 'failed';
      task.updatedAt = new Date();
      this.completedTasks.set(task.id, task);
      this.activeTasks.delete(task.id);
      return task;
    }
  }
  
  /**
   * Execute task through worker agent
   * This uses the runKimiAgent pattern to invoke the worker
   */
  private async executeWorkerTask(worker: AgentWorker, task: AgentTask): Promise<WorkResult> {
    console.log(`[Consultant] 📤 Sending work request to ${worker.name}`);
    
    // Simulate the runKimiAgent pattern
    // In production, this would make an actual HTTP call or invoke the agent
    const capability = worker.capabilities.find(c => 
      c.name.toLowerCase().includes(task.taskRequest.capability.toLowerCase())
    );
    
    // Simulate processing time based on capability
    const estimatedTime = capability?.estimatedTime || '5s';
    const delayMs = parseInt(estimatedTime) * 1000 || 5000;
    
    await this.simulateDelay(delayMs);
    
    // Simulate worker execution
    const result = await this.simulateWorkerExecution(worker, task);
    
    return {
      success: true,
      result,
      workerId: worker.id,
      taskId: task.id
    };
  }
  
  /**
   * Simulate worker agent execution
   * In production, this would invoke the actual agent
   */
  private async simulateWorkerExecution(worker: AgentWorker, task: AgentTask): Promise<any> {
    console.log(`[${worker.name}] 🔄 Processing task: ${task.taskRequest.description}`);
    
    // Simulate different behaviors based on worker type
    switch (worker.id) {
      case 'echo':
        return {
          echoed: task.taskRequest.description,
          timestamp: new Date().toISOString()
        };
        
      case 'crypto-hunter':
        return {
          analysis: `Market analysis for ${task.taskRequest.description}`,
          sentiment: 'bullish',
          confidence: 0.85,
          dataPoints: 127
        };
        
      case 'translator':
        return {
          original: task.taskRequest.description,
          translated: `[Translated] ${task.taskRequest.description}`,
          targetLanguage: 'es',
          wordCount: task.taskRequest.description.split(' ').length
        };
        
      case 'code-reviewer':
        return {
          issues: [],
          suggestions: ['Consider adding more comments', 'Optimize loop in line 42'],
          score: 8.5,
          securityRating: 'A'
        };
        
      case 'image-generator':
        return {
          prompt: task.taskRequest.description,
          imageUrl: `https://generated.agora/image/${task.id}.png`,
          dimensions: '1024x1024',
          style: 'digital-art'
        };
        
      case 'research-assistant':
        return {
          query: task.taskRequest.description,
          summary: `Research summary for: ${task.taskRequest.description}`,
          sources: 5,
          confidence: 0.92
        };
        
      default:
        return {
          processed: true,
          worker: worker.name,
          task: task.taskRequest.description
        };
    }
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
    
    return {
      activeTasks: active.length,
      completedTasks: completed.length,
      successRate: completed.length > 0 ? successCount / completed.length : 0,
      totalRevenue,
      totalPayouts,
      profitMargin: totalRevenue - (completed.length * 0), // Simplified
      workers: this.portfolio.workers.length
    };
  }
  
  /**
   * List available capabilities
   */
  listCapabilities(): string[] {
    const caps = new Set<string>();
    this.portfolio.workers.forEach(worker => {
      worker.capabilities.forEach(cap => caps.add(cap.name));
    });
    return Array.from(caps);
  }
  
  /**
   * Utility: delay helper
   */
  private simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, Math.min(ms, 3000))); // Cap at 3s for demo
  }
}

/**
 * Factory function to create and initialize Consultant Agent
 */
export async function createConsultantAgent(): Promise<ConsultantAgent> {
  console.log('[Consultant] Initializing Consultant Agent...\n');
  
  // Ensure wallet exists
  const wallet = loadOrCreateWallet();
  
  const agent = new ConsultantAgent(wallet);
  
  console.log(`[Consultant] ✅ Agent ready`);
  console.log(`  Address: ${agent.getAddress()}`);
  console.log(`  Available workers: ${agent.getPortfolio().workers.length}`);
  console.log(`  Capabilities: ${agent.listCapabilities().join(', ')}\n`);
  
  return agent;
}

/**
 * Demo function to showcase A2A economy
 */
export async function runDemo(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Agora A2A Economy - Consultant Agent Demo              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // Initialize consultant
  const consultant = await createConsultantAgent();
  
  // Simulate incoming tasks from humans
  const tasks: TaskRequest[] = [
    {
      id: 'task-001',
      description: 'Translate "Hello world" to Spanish',
      capability: 'text-translation',
      budget: 0.01,
      humanClient: 'alice'
    },
    {
      id: 'task-002',
      description: 'Generate cyberpunk cityscape image',
      capability: 'image-generation',
      budget: 0.20,
      humanClient: 'bob'
    },
    {
      id: 'task-003',
      description: 'Analyze ETH market sentiment',
      capability: 'market-sentiment',
      budget: 0.05,
      humanClient: 'charlie'
    },
    {
      id: 'task-004',
      description: 'Echo test message',
      capability: 'echo',
      budget: 0.002,
      humanClient: 'dave'
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
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log('[Consultant] A2A Economy Demo Complete!');
  console.log('The Consultant Agent has demonstrated:');
  console.log('  ✓ Wallet-based identity');
  console.log('  ✓ Task delegation to specialized workers');
  console.log('  ✓ 20/80 revenue split (margin/worker)');
  console.log('  ✓ Agent-to-Agent (A2A) economic interactions');
}

// Run demo if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo().catch(console.error);
}

export default ConsultantAgent;