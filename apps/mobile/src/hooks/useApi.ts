import { useState, useCallback, useEffect } from 'react';
import { 
  agentApi, 
  taskApi, 
  walletApi, 
  bridgeApi, 
  survivalApi,
  healthApi 
} from '../services/api';
import type { Agent, Task } from '../types/navigation';

// Generic API hook for loading states and error handling
export function useApi<T>(apiFunc: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiFunc();
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, deps);

  useEffect(() => {
    execute();
  }, [execute]);

  return { data, isLoading, error, refetch: execute };
}

// Hook for fetching agents
export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await agentApi.getAgents();
      setAgents(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch agents';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getAgentsByTag = useCallback(async (tag: string) => {
    try {
      const data = await agentApi.getAgentsByTag(tag);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch agents by tag';
      setError(message);
      return [];
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return { agents, isLoading, error, refetch: fetchAgents, refresh: fetchAgents, getAgentsByTag };
}

// Hook for fetching a single agent
export function useAgent(agentId: string | null) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgent = useCallback(async () => {
    if (!agentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await agentApi.getAgentById(agentId);
      setAgent(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch agent';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  return { agent, isLoading, error, refetch: fetchAgent };
}

// Hook for fetching tasks
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await taskApi.getTasks();
      setTasks(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch tasks';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = useCallback(async (taskData: Partial<Task>) => {
    setIsLoading(true);
    try {
      const newTask = await taskApi.createTask(taskData);
      setTasks(prev => [newTask, ...prev]);
      return newTask;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create task';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const acceptTask = useCallback(async (taskId: string, agentId: string) => {
    try {
      const updatedTask = await taskApi.acceptTask(taskId, agentId);
      setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
      return updatedTask;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to accept task';
      setError(message);
      throw err;
    }
  }, []);

  const completeTask = useCallback(async (taskId: string) => {
    try {
      const updatedTask = await taskApi.completeTask(taskId);
      setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
      return updatedTask;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete task';
      setError(message);
      throw err;
    }
  }, []);

  return { 
    tasks, 
    isLoading, 
    error, 
    refetch: fetchTasks,
    refresh: fetchTasks,
    createTask,
    acceptTask,
    completeTask
  };
}

// Hook for fetching a single task
export function useTask(taskId: string | null) {
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTask = useCallback(async () => {
    if (!taskId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await taskApi.getTaskById(taskId);
      setTask(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch task';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  return { task, isLoading, error, refetch: fetchTask };
}

// Hook for wallet balance
export function useWalletBalance(address: string | null) {
  const [balance, setBalance] = useState<{ native: string; usdc: string } | null>(null);
  const [multiChainBalances, setMultiChainBalances] = useState<Array<{
    chain: string;
    nativeBalance: string;
    usdcBalance: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    setError(null);
    try {
      const [singleBalance, multiBalances] = await Promise.all([
        walletApi.getBalance(address),
        walletApi.getMultiChainBalance(address)
      ]);
      setBalance(singleBalance);
      setMultiChainBalances(multiBalances);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch balance';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { 
    balance, 
    multiChainBalances,
    isLoading, 
    error, 
    refetch: fetchBalance 
  };
}

// Hook for bridge operations
export function useBridge() {
  const [quote, setQuote] = useState<any>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [isBridging, setIsBridging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getQuote = useCallback(async (params: {
    sourceChain: string;
    destinationChain: string;
    token: string;
    amount: string;
  }) => {
    setIsQuoting(true);
    setError(null);
    try {
      const data = await bridgeApi.getQuote(params);
      setQuote(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get quote';
      setError(message);
      throw err;
    } finally {
      setIsQuoting(false);
    }
  }, []);

  const executeBridge = useCallback(async (params: {
    sourceChain: string;
    destinationChain: string;
    token: string;
    amount: string;
    recipient?: string;
  }) => {
    setIsBridging(true);
    setError(null);
    try {
      const data = await bridgeApi.executeBridge(params);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Bridge failed';
      setError(message);
      throw err;
    } finally {
      setIsBridging(false);
    }
  }, []);

  return {
    quote,
    isQuoting,
    isBridging,
    error,
    getQuote,
    executeBridge,
    clearQuote: () => setQuote(null)
  };
}

// Hook for survival monitoring
export function useSurvival(agentId: string | null) {
  const [health, setHealth] = useState<any>(null);
  const [economics, setEconomics] = useState<any>(null);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSurvivalData = useCallback(async () => {
    if (!agentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [healthData, economicsData, snapshotData] = await Promise.all([
        survivalApi.getHealth(agentId),
        survivalApi.getEconomics(agentId),
        survivalApi.getSnapshot(agentId)
      ]);
      setHealth(healthData);
      setEconomics(economicsData);
      setSnapshot(snapshotData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch survival data';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchSurvivalData();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchSurvivalData, 60000);
    return () => clearInterval(interval);
  }, [fetchSurvivalData]);

  return {
    health,
    economics,
    snapshot,
    isLoading,
    error,
    refetch: fetchSurvivalData
  };
}

// Hook for API health check
export function useApiHealth() {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkHealth = useCallback(async () => {
    setIsChecking(true);
    try {
      const result = await healthApi.check();
      setIsHealthy(result.status === 'ok' || result.status === 'healthy');
    } catch {
      setIsHealthy(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return { isHealthy, isChecking, refetch: checkHealth };
}

export default useApi;
