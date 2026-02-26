import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Agent, Task } from '../types/navigation';

// API Configuration - Connect to real Relay API
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://45.32.219.241:8789/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth token storage key
const AUTH_TOKEN_KEY = '@agora:auth_token';
const WALLET_ADDRESS_KEY = '@agora:wallet_address';

/**
 * Get auth token from secure storage
 * @returns The stored auth token or null
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error('[Auth] Failed to get auth token:', error);
    return null;
  }
}

/**
 * Set auth token in secure storage
 * @param token - The auth token to store
 */
export async function setAuthToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch (error) {
    console.error('[Auth] Failed to set auth token:', error);
    throw new Error('Failed to save authentication token');
  }
}

/**
 * Clear auth token from storage
 */
export async function clearAuthToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error('[Auth] Failed to clear auth token:', error);
  }
}

/**
 * Get connected wallet address
 * @returns The stored wallet address or null
 */
export async function getWalletAddress(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(WALLET_ADDRESS_KEY);
  } catch (error) {
    console.error('[Auth] Failed to get wallet address:', error);
    return null;
  }
}

/**
 * Set wallet address in storage
 * @param address - The wallet address to store
 */
export async function setWalletAddress(address: string): Promise<void> {
  try {
    await AsyncStorage.setItem(WALLET_ADDRESS_KEY, address);
  } catch (error) {
    console.error('[Auth] Failed to set wallet address:', error);
    throw new Error('Failed to save wallet address');
  }
}

/**
 * Clear wallet address from storage
 */
export async function clearWalletAddress(): Promise<void> {
  try {
    await AsyncStorage.removeItem(WALLET_ADDRESS_KEY);
  } catch (error) {
    console.error('[Auth] Failed to clear wallet address:', error);
  }
}

/**
 * Check if user is authenticated
 * @returns True if auth token exists
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  return token !== null;
}

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  async (config) => {
    // Get auth token from secure storage
    const token = await getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add wallet address if available
    const walletAddress = await getWalletAddress();
    if (walletAddress) {
      config.headers['X-Wallet-Address'] = walletAddress;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      console.error('[API] Server error:', error.response.status, error.response.data);
    } else if (error.request) {
      // Request made but no response received
      console.error('[API] Network error - no response from server');
    } else {
      // Error in request configuration
      console.error('[API] Request error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Agent API
export const agentApi = {
  getAgents: async (): Promise<Agent[]> => {
    try {
      const response = await apiClient.get('/agents');
      return response.data.agents || response.data || [];
    } catch (error) {
      console.error('[API] Failed to fetch agents:', error);
      throw new Error('Failed to fetch agents. Please check your connection.');
    }
  },
  
  getAgentById: async (id: string): Promise<Agent> => {
    try {
      const response = await apiClient.get(`/agents/${id}`);
      return response.data;
    } catch (error) {
      console.error(`[API] Failed to fetch agent ${id}:`, error);
      throw new Error('Agent not found or server error');
    }
  },
  
  getAgentsByTag: async (tag: string): Promise<Agent[]> => {
    try {
      const response = await apiClient.get('/agents', { params: { tag } });
      return response.data.agents || response.data || [];
    } catch (error) {
      console.error(`[API] Failed to fetch agents by tag ${tag}:`, error);
      throw new Error('Failed to fetch agents by tag');
    }
  },
  
  createAgent: async (agentData: Partial<Agent>): Promise<Agent> => {
    try {
      const response = await apiClient.post('/agents', agentData);
      return response.data;
    } catch (error) {
      console.error('[API] Failed to create agent:', error);
      throw new Error('Failed to create agent');
    }
  },
};

// Task API
export const taskApi = {
  getTasks: async (): Promise<Task[]> => {
    try {
      const response = await apiClient.get('/tasks');
      return response.data.tasks || response.data || [];
    } catch (error) {
      console.error('[API] Failed to fetch tasks:', error);
      throw new Error('Failed to fetch tasks. Please check your connection.');
    }
  },
  
  getTaskById: async (id: string): Promise<Task> => {
    try {
      const response = await apiClient.get(`/tasks/${id}`);
      return response.data;
    } catch (error) {
      console.error(`[API] Failed to fetch task ${id}:`, error);
      throw new Error('Task not found or server error');
    }
  },
  
  createTask: async (taskData: Partial<Task>): Promise<Task> => {
    try {
      const response = await apiClient.post('/tasks', taskData);
      return response.data;
    } catch (error) {
      console.error('[API] Failed to create task:', error);
      throw new Error('Failed to create task');
    }
  },
  
  updateTask: async (id: string, updates: Partial<Task>): Promise<Task> => {
    try {
      const response = await apiClient.patch(`/tasks/${id}`, updates);
      return response.data;
    } catch (error) {
      console.error(`[API] Failed to update task ${id}:`, error);
      throw new Error('Failed to update task');
    }
  },
  
  acceptTask: async (id: string, agentId: string): Promise<Task> => {
    try {
      const response = await apiClient.post(`/tasks/${id}/accept`, { agentId });
      return response.data;
    } catch (error) {
      console.error(`[API] Failed to accept task ${id}:`, error);
      throw new Error('Failed to accept task');
    }
  },
  
  completeTask: async (id: string): Promise<Task> => {
    try {
      const response = await apiClient.post(`/tasks/${id}/complete`);
      return response.data;
    } catch (error) {
      console.error(`[API] Failed to complete task ${id}:`, error);
      throw new Error('Failed to complete task');
    }
  },
  
  cancelTask: async (id: string): Promise<Task> => {
    try {
      const response = await apiClient.post(`/tasks/${id}/cancel`);
      return response.data;
    } catch (error) {
      console.error(`[API] Failed to cancel task ${id}:`, error);
      throw new Error('Failed to cancel task');
    }
  },
};

// Wallet API
export const walletApi = {
  getBalance: async (address: string): Promise<{ native: string; usdc: string }> => {
    try {
      const response = await apiClient.get(`/wallet/${address}/balance`);
      return response.data;
    } catch (error) {
      console.error(`[API] Failed to get balance for ${address}:`, error);
      // Return default values on error
      return { native: '0', usdc: '0' };
    }
  },
  
  getMultiChainBalance: async (address: string): Promise<Array<{
    chain: string;
    nativeBalance: string;
    usdcBalance: string;
  }>> => {
    try {
      const response = await apiClient.get(`/wallet/${address}/multichain-balance`);
      return response.data.balances || [];
    } catch (error) {
      console.error(`[API] Failed to get multi-chain balance:`, error);
      return [];
    }
  },
  
  getTransactions: async (address: string) => {
    try {
      const response = await apiClient.get(`/wallet/${address}/transactions`);
      return response.data.transactions || [];
    } catch (error) {
      console.error(`[API] Failed to get transactions:`, error);
      return [];
    }
  },
};

// Bridge API
export const bridgeApi = {
  getQuote: async (params: {
    sourceChain: string;
    destinationChain: string;
    token: string;
    amount: string;
  }) => {
    try {
      const response = await apiClient.post('/bridge/quote', params);
      return response.data;
    } catch (error) {
      console.error('[API] Failed to get bridge quote:', error);
      throw new Error('Failed to get bridge quote');
    }
  },
  
  executeBridge: async (params: {
    sourceChain: string;
    destinationChain: string;
    token: string;
    amount: string;
    recipient?: string;
  }) => {
    try {
      const response = await apiClient.post('/bridge/execute', params);
      return response.data;
    } catch (error) {
      console.error('[API] Failed to execute bridge:', error);
      throw new Error('Failed to execute bridge transaction');
    }
  },
  
  getBridgeStatus: async (txHash: string) => {
    try {
      const response = await apiClient.get(`/bridge/status/${txHash}`);
      return response.data;
    } catch (error) {
      console.error('[API] Failed to get bridge status:', error);
      throw new Error('Failed to get bridge status');
    }
  },
};

// Survival API (Echo Survival Monitor)
export const survivalApi = {
  getHealth: async (agentId: string) => {
    try {
      const response = await apiClient.get(`/survival/${agentId}/health`);
      return response.data;
    } catch (error) {
      console.error(`[API] Failed to get health for ${agentId}:`, error);
      throw new Error('Failed to get agent health');
    }
  },
  
  getEconomics: async (agentId: string) => {
    try {
      const response = await apiClient.get(`/survival/${agentId}/economics`);
      return response.data;
    } catch (error) {
      console.error(`[API] Failed to get economics for ${agentId}:`, error);
      throw new Error('Failed to get agent economics');
    }
  },
  
  getSnapshot: async (agentId: string) => {
    try {
      const response = await apiClient.get(`/survival/${agentId}/snapshot`);
      return response.data;
    } catch (error) {
      console.error(`[API] Failed to get snapshot for ${agentId}:`, error);
      throw new Error('Failed to get survival snapshot');
    }
  },
};

// Notification API
export const notificationApi = {
  registerToken: async (token: string, walletAddress: string) => {
    try {
      await apiClient.post('/notifications/register', { token, walletAddress });
    } catch (error) {
      console.error('[API] Failed to register notification token:', error);
    }
  },
  
  unregisterToken: async (token: string) => {
    try {
      await apiClient.post('/notifications/unregister', { token });
    } catch (error) {
      console.error('[API] Failed to unregister notification token:', error);
    }
  },
};

// Health check
export const healthApi = {
  check: async () => {
    try {
      const response = await apiClient.get('/health');
      return response.data;
    } catch (error) {
      console.error('[API] Health check failed:', error);
      return { status: 'error', message: 'API unreachable' };
    }
  },
};

export default apiClient;
