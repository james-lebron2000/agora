import express, { Request, Response } from 'express';
import { createPublicClient, http, formatUnits, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import * as fs from 'fs';
import * as path from 'path';

const app = express();
app.use(express.json());

const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const ESCROW_CONTRACT = '0x19c368E0799793237893630f9247833072234559';

// Load agent portfolio
function loadAgentPortfolio() {
  const portfolioPath = path.join(__dirname, '../data/agent-portfolio.json');
  if (fs.existsSync(portfolioPath)) {
    return JSON.parse(fs.readFileSync(portfolioPath, 'utf8'));
  }
  return { agents: [] };
}

// Consultant Agent - The Master Agent that hires other agents
class ConsultantAgent {
  private name = 'AgoraConsultant';
  private portfolio: any;
  
  constructor() {
    this.portfolio = loadAgentPortfolio();
    console.log(`[Consultant] Loaded ${this.portfolio.agents?.length || 0} worker agents`);
  }
  
  /**
   * Main entry point: Receive complex task from human
   */
  async handleTask(task: {
    description: string;
    budget: number;
    deadline?: string;
    requirements?: string[];
  }) {
    console.log(`[Consultant] Received task: ${task.description}`);
    console.log(`[Consultant] Budget: $${task.budget} USDC`);
    
    // Step 1: Decompose task into subtasks
    const subtasks = await this.decomposeTask(task);
    console.log(`[Consultant] Decomposed into ${subtasks.length} subtasks`);
    
    // Step 2: Find best workers for each subtask
    const assignments = await this.findWorkers(subtasks);
    console.log(`[Consultant] Assigned workers to all subtasks`);
    
    // Step 3: Calculate costs and margins
    const plan = this.calculateEconomics(task.budget, assignments);
    console.log(`[Consultant] Economics: Worker costs $${plan.workerCost}, Platform fee $${plan.platformFee}`);
    
    // Step 4: Execute hiring (simulated for now)
    const results = await this.executeHiring(assignments);
    
    // Step 5: Aggregate results
    const finalDeliverable = await this.aggregateResults(results);
    
    return {
      success: true,
      task: task.description,
      subtasksCompleted: subtasks.length,
      workersHired: assignments.length,
      totalCost: plan.totalCost,
      platformFee: plan.platformFee,
      deliverable: finalDeliverable,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Decompose complex task into subtasks using LLM logic
   */
  private async decomposeTask(task: any): Promise<any[]> {
    // In production, this would call an LLM
    // For now, use rule-based decomposition
    
    const description = task.description.toLowerCase();
    const subtasks = [];
    
    if (description.includes('website') || description.includes('app')) {
      subtasks.push(
        { type: 'design', description: 'Create UI/UX design', estimatedCost: 0.1 },
        { type: 'frontend', description: 'Build frontend components', estimatedCost: 0.15 },
        { type: 'backend', description: 'Develop backend API', estimatedCost: 0.2 },
        { type: 'review', description: 'Code review and testing', estimatedCost: 0.05 }
      );
    } else if (description.includes('contract') || description.includes('audit')) {
      subtasks.push(
        { type: 'audit', description: 'Smart contract security audit', estimatedCost: 0.3 },
        { type: 'review', description: 'Secondary review', estimatedCost: 0.1 }
      );
    } else if (description.includes('research') || description.includes('analysis')) {
      subtasks.push(
        { type: 'research', description: 'Market research', estimatedCost: 0.1 },
        { type: 'analysis', description: 'Data analysis', estimatedCost: 0.1 },
        { type: 'report', description: 'Report writing', estimatedCost: 0.05 }
      );
    } else {
      // Generic single task
      subtasks.push({
        type: 'general',
        description: task.description,
        estimatedCost: task.budget * 0.6 // 60% to worker, 20% platform, 20% buffer
      });
    }
    
    return subtasks;
  }
  
  /**
   * Find best worker agents for each subtask
   */
  private async findWorkers(subtasks: any[]): Promise<any[]> {
    const agents = this.portfolio.agents || [];
    const assignments = [];
    
    for (const subtask of subtasks) {
      // Score each agent based on capability match
      const scoredAgents = agents.map((agent: any) => {
        let score = 0;
        
        // Capability match
        if (agent.capabilities?.some((c: any) => 
          c.id.includes(subtask.type) || 
          c.name.toLowerCase().includes(subtask.type)
        )) {
          score += 50;
        }
        
        // Rating bonus
        score += (agent.avgRating || 0) * 10;
        
        // Success rate bonus
        score += (agent.successRate || 0) * 0.1;
        
        // Price competitiveness (lower is better)
        const price = agent.pricing?.minPrice || 0.01;
        if (price <= subtask.estimatedCost) {
          score += 20;
        }
        
        return { agent, score };
      });
      
      // Sort by score and pick best
      scoredAgents.sort((a: any, b: any) => b.score - a.score);
      const bestMatch = scoredAgents[0];
      
      if (bestMatch) {
        assignments.push({
          subtask,
          worker: bestMatch.agent,
          score: bestMatch.score,
          payment: Math.min(subtask.estimatedCost, bestMatch.agent.pricing?.minPrice || 0.01)
        });
      }
    }
    
    return assignments;
  }
  
  /**
   * Calculate economics: 80% to workers, 20% platform fee
   */
  private calculateEconomics(totalBudget: number, assignments: any[]) {
    const workerCost = assignments.reduce((sum, a) => sum + a.payment, 0);
    const platformFee = totalBudget * 0.20; // 20% platform fee
    const buffer = totalBudget - workerCost - platformFee;
    
    return {
      totalCost: totalBudget,
      workerCost,
      platformFee,
      buffer: Math.max(0, buffer),
      workerPercentage: (workerCost / totalBudget * 100).toFixed(1),
      platformPercentage: '20.0'
    };
  }
  
  /**
   * Execute hiring via Agora protocol
   */
  private async executeHiring(assignments: any[]): Promise<any[]> {
    const results = [];
    
    for (const assignment of assignments) {
      console.log(`[Consultant] Hiring ${assignment.worker.agentName} for $${assignment.payment}`);
      
      // In production, this would:
      // 1. Create escrow transaction
      // 2. Send REQUEST to worker via Relay
      // 3. Wait for OFFER
      // 4. Lock funds in escrow
      // 5. Wait for RESULT
      // 6. Release payment
      
      // Simulated execution
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      results.push({
        worker: assignment.worker.agentName,
        task: assignment.subtask.description,
        payment: assignment.payment,
        status: 'completed',
        result: `Simulated result for: ${assignment.subtask.description}`,
        timestamp: new Date().toISOString()
      });
    }
    
    return results;
  }
  
  /**
   * Aggregate results from all workers into final deliverable
   */
  private async aggregateResults(results: any[]): Promise<string> {
    // In production, this would use LLM to synthesize results
    const summary = results.map(r => 
      `- ${r.worker}: ${r.task} ($${r.payment}) - ${r.status}`
    ).join('\n');
    
    return `## Task Completion Report\n\n${summary}\n\n` +
           `## Summary\n` +
           `- Total workers hired: ${results.length}\n` +
           `- All subtasks completed successfully\n` +
           `- Deliverable ready for delivery\n\n` +
           `Generated at: ${new Date().toISOString()}`;
  }
}

// Initialize consultant
const consultant = new ConsultantAgent();

// API Routes

/**
 * POST /task - Submit a complex task to Consultant
 */
app.post('/task', async (req: Request, res: Response) => {
  try {
    const { description, budget, deadline, requirements } = req.body;
    
    if (!description || !budget) {
      return res.status(400).json({
        error: 'Missing required fields: description, budget'
      });
    }
    
    const result = await consultant.handleTask({
      description,
      budget: parseFloat(budget),
      deadline,
      requirements: requirements || []
    });
    
    res.json(result);
  } catch (error) {
    console.error('[Consultant] Error:', error);
    res.status(500).json({
      error: 'Task processing failed',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /workers - List available worker agents
 */
app.get('/workers', (req: Request, res: Response) => {
  const portfolio = loadAgentPortfolio();
  res.json({
    count: portfolio.agents?.length || 0,
    workers: portfolio.agents?.map((a: any) => ({
      id: a.agentId,
      name: a.agentName,
      capabilities: a.capabilities?.map((c: any) => c.name),
      rating: a.avgRating,
      price: a.pricing?.minPrice
    }))
  });
});

/**
 * GET /status - Consultant health check
 */
app.get('/status', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    name: 'AgoraConsultant',
    version: '1.0.0',
    workersAvailable: loadAgentPortfolio().agents?.length || 0,
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.CONSULTANT_PORT || 3457;

app.listen(PORT, () => {
  console.log(`[Consultant] Agora Consultant Agent running on port ${PORT}`);
  console.log(`[Consultant] API Endpoints:`);
  console.log(`  POST /task - Submit complex task`);
  console.log(`  GET /workers - List available workers`);
  console.log(`  GET /status - Health check`);
});

export default app;
