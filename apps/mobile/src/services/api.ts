import axios from 'axios';
import type { Agent, Task } from '../types/navigation';

// API Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  async (config) => {
    // TODO: Get auth token from secure storage
    const token = null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Agent API
export const agentApi = {
  getAgents: async (): Promise<Agent[]> => {
    // Mock data for development
    return mockAgents;
    // const response = await apiClient.get('/agents');
    // return response.data;
  },
  
  getAgentById: async (id: string): Promise<Agent> => {
    const agent = mockAgents.find((a) => a.id === id);
    if (!agent) throw new Error('Agent not found');
    return agent;
    // const response = await apiClient.get(`/agents/${id}`);
    // return response.data;
  },
  
  getAgentsByTag: async (tag: string): Promise<Agent[]> => {
    return mockAgents.filter((a) => a.tags.includes(tag));
    // const response = await apiClient.get(`/agents?tag=${tag}`);
    // return response.data;
  },
};

// Task API
export const taskApi = {
  getTasks: async (): Promise<Task[]> => {
    return mockTasks;
    // const response = await apiClient.get('/tasks');
    // return response.data;
  },
  
  getTaskById: async (id: string): Promise<Task> => {
    const task = mockTasks.find((t) => t.id === id);
    if (!task) throw new Error('Task not found');
    return task;
    // const response = await apiClient.get(`/tasks/${id}`);
    // return response.data;
  },
  
  createTask: async (taskData: Partial<Task>): Promise<Task> => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: taskData.title || 'Untitled Task',
      description: taskData.description || '',
      status: 'open',
      budget: taskData.budget || 0,
      currency: taskData.currency || 'USDC',
      creator: taskData.creator || { id: '1', name: 'Anonymous', walletAddress: '0x0' },
      agentId: taskData.agentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deliverables: taskData.deliverables || [],
      escrowId: undefined,
    };
    return newTask;
    // const response = await apiClient.post('/tasks', taskData);
    // return response.data;
  },
  
  updateTask: async (id: string, updates: Partial<Task>): Promise<Task> => {
    return { ...mockTasks[0], ...updates, id };
    // const response = await apiClient.patch(`/tasks/${id}`, updates);
    // return response.data;
  },
  
  acceptTask: async (id: string, agentId: string): Promise<Task> => {
    return { ...mockTasks[0], id, status: 'in_progress', assignee: mockAgents.find(a => a.id === agentId) as any };
    // const response = await apiClient.post(`/tasks/${id}/accept`, { agentId });
    // return response.data;
  },
  
  completeTask: async (id: string): Promise<Task> => {
    return { ...mockTasks[0], id, status: 'completed' };
    // const response = await apiClient.post(`/tasks/${id}/complete`);
    // return response.data;
  },
};

// Wallet API
export const walletApi = {
  getBalance: async (address: string): Promise<{ native: string; usdc: string }> => {
    return { native: '0.5', usdc: '1000' };
    // const response = await apiClient.get(`/wallet/${address}/balance`);
    // return response.data;
  },
  
  getTransactions: async (address: string) => {
    return [];
    // const response = await apiClient.get(`/wallet/${address}/transactions`);
    // return response.data;
  },
};

// Notification API
export const notificationApi = {
  registerToken: async (token: string, walletAddress: string) => {
    // await apiClient.post('/notifications/register', { token, walletAddress });
  },
  
  unregisterToken: async (token: string) => {
    // await apiClient.post('/notifications/unregister', { token });
  },
};

// Mock Data
const mockAgents: Agent[] = [
  {
    id: 'agent-1',
    name: 'AlphaTrader',
    description: 'AI-powered crypto trading assistant with advanced market analysis capabilities.',
    tags: ['trading', 'crypto', 'finance'],
    rating: 4.8,
    completedTasks: 156,
    hourlyRate: 50,
    isOnline: true,
    walletAddress: '0x742d35Cc6634C0532925a3b8D4e6D3b6e8d3f8A0',
    capabilities: ['market-analysis', 'portfolio-management', 'risk-assessment'],
    createdAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'agent-2',
    name: 'ContentForge',
    description: 'Creative content generation specialist for blogs, social media, and marketing.',
    tags: ['content', 'writing', 'marketing'],
    rating: 4.6,
    completedTasks: 89,
    hourlyRate: 35,
    isOnline: true,
    walletAddress: '0x123d35Cc6634C0532925a3b8D4e6D3b6e8d3f8A1',
    capabilities: ['blog-writing', 'social-media', 'copywriting'],
    createdAt: '2024-02-01T00:00:00Z',
  },
  {
    id: 'agent-3',
    name: 'DataSage',
    description: 'Data analysis and visualization expert. Transforms complex data into insights.',
    tags: ['data', 'analytics', 'visualization'],
    rating: 4.9,
    completedTasks: 234,
    hourlyRate: 75,
    isOnline: false,
    walletAddress: '0x456d35Cc6634C0532925a3b8D4e6D3b6e8d3f8A2',
    capabilities: ['data-analysis', 'visualization', 'reporting'],
    createdAt: '2024-01-20T00:00:00Z',
  },
  {
    id: 'agent-4',
    name: 'CodeMaster',
    description: 'Full-stack development assistant specializing in React, Node.js, and blockchain.',
    tags: ['coding', 'development', 'blockchain'],
    rating: 4.7,
    completedTasks: 312,
    hourlyRate: 100,
    isOnline: true,
    walletAddress: '0x789d35Cc6634C0532925a3b8D4e6D3b6e8d3f8A3',
    capabilities: ['frontend', 'backend', 'smart-contracts'],
    createdAt: '2024-01-10T00:00:00Z',
  },
  {
    id: 'agent-5',
    name: 'LegalAI',
    description: 'Legal document review and contract analysis specialist.',
    tags: ['legal', 'contracts', 'compliance'],
    rating: 4.5,
    completedTasks: 67,
    hourlyRate: 120,
    isOnline: false,
    walletAddress: '0xabc35Cc6634C0532925a3b8D4e6D3b6e8d3f8A4',
    capabilities: ['contract-review', 'compliance-check', 'legal-research'],
    createdAt: '2024-02-10T00:00:00Z',
  },
];

const mockTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Create social media campaign',
    description: 'Need a comprehensive social media campaign for a new DeFi product launch.',
    status: 'open',
    budget: 500,
    currency: 'USDC',
    creator: { id: 'user-1', name: 'John Doe', walletAddress: '0xUser1' },
    createdAt: '2024-02-07T10:00:00Z',
    updatedAt: '2024-02-07T10:00:00Z',
    deliverables: ['10 Twitter posts', '5 LinkedIn articles', 'Campaign calendar'],
  },
  {
    id: 'task-2',
    title: 'Analyze token metrics',
    description: 'Deep dive analysis of on-chain metrics for Ethereum ecosystem tokens.',
    status: 'in_progress',
    budget: 1000,
    currency: 'USDC',
    creator: { id: 'user-2', name: 'Jane Smith', walletAddress: '0xUser2' },
    assignee: { id: 'agent-1', name: 'AlphaTrader', walletAddress: '0x742d35Cc6634C0532925a3b8D4e6D3b6e8d3f8A0' },
    agentId: 'agent-1',
    createdAt: '2024-02-06T14:00:00Z',
    updatedAt: '2024-02-07T09:00:00Z',
    deadline: '2024-02-10T00:00:00Z',
    deliverables: ['Analytics report', 'Visual dashboard', 'Investment recommendations'],
    escrowId: 'escrow-1',
  },
  {
    id: 'task-3',
    title: 'Build landing page',
    description: 'Design and develop a modern landing page for our NFT marketplace.',
    status: 'completed',
    budget: 2000,
    currency: 'USDC',
    creator: { id: 'user-3', name: 'Bob Wilson', walletAddress: '0xUser3' },
    assignee: { id: 'agent-4', name: 'CodeMaster', walletAddress: '0x789d35Cc6634C0532925a3b8D4e6D3b6e8d3f8A3' },
    agentId: 'agent-4',
    createdAt: '2024-02-01T08:00:00Z',
    updatedAt: '2024-02-06T16:00:00Z',
    deliverables: ['Figma design', 'React code', 'Deployment'],
    escrowId: 'escrow-2',
  },
];
