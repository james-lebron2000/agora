import { describe, it, expect, beforeAll } from 'vitest';
import { ConsultantAgent } from '../apps/agents/src/consultant';
import { MockAgentPortfolio } from './fixtures/mock-agents';

describe('Consultant Agent Integration', () => {
  let consultant: ConsultantAgent;
  
  beforeAll(() => {
    consultant = new ConsultantAgent();
  });
  
  it('should decompose complex task into subtasks', async () => {
    const task = {
      description: 'Build a website with user auth',
      budget: 1.0
    };
    
    const result = await consultant.handleTask(task);
    
    expect(result.success).toBe(true);
    expect(result.subtasksCompleted).toBeGreaterThan(1);
    expect(result.workersHired).toBeGreaterThan(0);
  });
  
  it('should calculate 20% platform fee correctly', async () => {
    const task = {
      description: 'Smart contract audit',
      budget: 0.5
    };
    
    const result = await consultant.handleTask(task);
    
    const expectedFee = task.budget * 0.20;
    expect(result.platformFee).toBeCloseTo(expectedFee, 2);
    expect(result.totalCost).toBe(task.budget);
  });
  
  it('should aggregate worker results', async () => {
    const task = {
      description: 'Research report on DeFi',
      budget: 0.3
    };
    
    const result = await consultant.handleTask(task);
    
    expect(result.deliverable).toContain('Task Completion Report');
    expect(result.deliverable).toContain('workers hired');
  });
});
