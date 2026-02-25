import { useState, useCallback, useEffect } from 'react';
import { 
  default as apiClient,
  agentApi, 
  taskApi, 
  walletApi, 
  bridgeApi, 
  survivalApi,
  healthApi 
} from '../services/api';
import type { Agent, Task } from '../types/navigation';

type AchievementRarity = 'common' | 'rare' | 'epic';

export interface UserProfile {
  userId: string;
  username: string;
  nickname: string;
  avatarUrl?: string;
  updatedAt: string;
}

export interface UserStatsPoint {
  label: string;
  value: number;
}

export interface UserAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  unlocked: boolean;
  progress: number;
}

export interface UserStats {
  postedTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  cancelledTasks: number;
  completionRate: number;
  totalEarnings: number;
  averageRating: number;
  survivalHealth: number;
  weeklyTasks: UserStatsPoint[];
  achievements: UserAchievement[];
}

const generateWeeklyBuckets = (tasks: Task[]): UserStatsPoint[] => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const buckets = new Map<number, number>();

  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    buckets.set(date.getDay(), 0);
  }

  tasks.forEach((task) => {
    const date = new Date(task.createdAt);
    const day = date.getDay();
    if (buckets.has(day)) {
      const current = buckets.get(day) ?? 0;
      buckets.set(day, current + 1);
    }
  });

  const result: UserStatsPoint[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const day = date.getDay();
    result.push({
      label: days[day],
      value: buckets.get(day) ?? 0,
    });
  }

  return result;
};

const buildAchievements = (stats: Pick<UserStats, 'postedTasks' | 'completedTasks' | 'completionRate' | 'averageRating'>): UserAchievement[] => {
  const postedProgress = Math.min(100, (stats.postedTasks / 10) * 100);
  const completedProgress = Math.min(100, (stats.completedTasks / 20) * 100);
  const qualityProgress = Math.min(100, (stats.averageRating / 5) * 100);
  const reliabilityProgress = Math.min(100, stats.completionRate);

  return [
    {
      id: 'task-pioneer',
      title: 'Task Pioneer',
      description: 'Post 10 tasks',
      icon: 'rocket-outline',
      rarity: 'common',
      unlocked: stats.postedTasks >= 10,
      progress: postedProgress,
    },
    {
      id: 'execution-pro',
      title: 'Execution Pro',
      description: 'Complete 20 tasks',
      icon: 'trophy-outline',
      rarity: 'rare',
      unlocked: stats.completedTasks >= 20,
      progress: completedProgress,
    },
    {
      id: 'quality-master',
      title: 'Quality Master',
      description: 'Maintain 4.8+ rating',
      icon: 'star-outline',
      rarity: 'epic',
      unlocked: stats.averageRating >= 4.8,
      progress: qualityProgress,
    },
    {
      id: 'reliable-agent',
      title: 'Reliable Agent',
      description: 'Keep 90% completion rate',
      icon: 'shield-checkmark-outline',
      rarity: 'rare',
      unlocked: stats.completionRate >= 90,
      progress: reliabilityProgress,
    },
  ];
};

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'username' | 'nickname' | 'avatarUrl'>>
): Promise<UserProfile> {
  try {
    const response = await apiClient.put(`/users/${encodeURIComponent(userId)}/profile`, updates);
    const payload = response.data?.profile || response.data?.data || response.data || {};

    return {
      userId,
      username: String(payload.username || updates.username || 'Agora User'),
      nickname: String(payload.nickname || updates.nickname || 'Echo Agent'),
      avatarUrl: payload.avatarUrl || updates.avatarUrl,
      updatedAt: payload.updatedAt || new Date().toISOString(),
    };
  } catch (error) {
    console.error('[API] Failed to update profile:', error);
    return {
      userId,
      username: updates.username || 'Agora User',
      nickname: updates.nickname || 'Echo Agent',
      avatarUrl: updates.avatarUrl,
      updatedAt: new Date().toISOString(),
    };
  }
}

export async function uploadAvatar(
  userId: string,
  avatarUri: string
): Promise<{ avatarUrl: string }> {
  const formData = new FormData();
  formData.append('avatar', {
    uri: avatarUri,
    name: `avatar-${Date.now()}.jpg`,
    type: 'image/jpeg',
  } as unknown as Blob);

  try {
    const response = await apiClient.post(`/users/${encodeURIComponent(userId)}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const payload = response.data?.data || response.data || {};
    return {
      avatarUrl: String(payload.avatarUrl || payload.url || avatarUri),
    };
  } catch (error) {
    console.error('[API] Failed to upload avatar:', error);
    return { avatarUrl: avatarUri };
  }
}

export async function getUserStats(userId: string): Promise<UserStats> {
  try {
    const response = await apiClient.get(`/users/${encodeURIComponent(userId)}/stats`);
    const payload = response.data?.stats || response.data?.data || response.data || {};

    const postedTasks = Number(payload.postedTasks || 0);
    const completedTasks = Number(payload.completedTasks || 0);
    const inProgressTasks = Number(payload.inProgressTasks || 0);
    const cancelledTasks = Number(payload.cancelledTasks || 0);
    const completionRate = Number(
      payload.completionRate || (postedTasks > 0 ? (completedTasks / postedTasks) * 100 : 0)
    );
    const totalEarnings = Number(payload.totalEarnings || 0);
    const averageRating = Number(payload.averageRating || 4.6);
    const survivalHealth = Number(payload.survivalHealth || 78);
    const weeklyTasks = Array.isArray(payload.weeklyTasks) ? payload.weeklyTasks : [];

    const baseStats = {
      postedTasks,
      completedTasks,
      inProgressTasks,
      cancelledTasks,
      completionRate,
      totalEarnings,
      averageRating,
      survivalHealth,
    };

    return {
      ...baseStats,
      weeklyTasks: weeklyTasks.length > 0 ? weeklyTasks : generateWeeklyBuckets([]),
      achievements: buildAchievements(baseStats),
    };
  } catch (error) {
    console.error('[API] Failed to fetch user stats, using local fallback:', error);

    const tasks = await taskApi.getTasks();
    const myTasks = tasks.filter((task) => task.creator?.walletAddress === userId);
    const postedTasks = myTasks.length;
    const completedTasks = myTasks.filter((task) => task.status === 'completed').length;
    const inProgressTasks = myTasks.filter((task) => task.status === 'in_progress').length;
    const cancelledTasks = myTasks.filter((task) => task.status === 'cancelled').length;
    const completionRate = postedTasks > 0 ? (completedTasks / postedTasks) * 100 : 0;
    const totalEarnings = myTasks
      .filter((task) => task.status === 'completed')
      .reduce((sum, task) => sum + task.budget, 0);
    const averageRating = Math.min(5, 4 + completedTasks * 0.06);
    const survivalHealth = Math.max(45, Math.min(98, 60 + completedTasks * 1.2 - cancelledTasks * 2));

    const baseStats = {
      postedTasks,
      completedTasks,
      inProgressTasks,
      cancelledTasks,
      completionRate,
      totalEarnings,
      averageRating,
      survivalHealth,
    };

    return {
      ...baseStats,
      weeklyTasks: generateWeeklyBuckets(myTasks),
      achievements: buildAchievements(baseStats),
    };
  }
}

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

export function useProfileApi(userId: string | null) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStats = useCallback(async () => {
    if (!userId) return null;
    setIsLoadingStats(true);
    setError(null);
    try {
      const data = await getUserStats(userId);
      setStats(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch user stats';
      setError(message);
      return null;
    } finally {
      setIsLoadingStats(false);
    }
  }, [userId]);

  const saveProfile = useCallback(async (
    updates: Partial<Pick<UserProfile, 'username' | 'nickname' | 'avatarUrl'>>
  ) => {
    if (!userId) return null;
    setIsSavingProfile(true);
    setError(null);
    try {
      const updated = await updateProfile(userId, updates);
      setProfile(updated);
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      setError(message);
      throw err;
    } finally {
      setIsSavingProfile(false);
    }
  }, [userId]);

  const uploadUserAvatar = useCallback(async (uri: string) => {
    if (!userId) return null;
    setIsUploadingAvatar(true);
    setError(null);
    try {
      const { avatarUrl } = await uploadAvatar(userId, uri);
      setProfile((prev) => ({
        userId,
        username: prev?.username || 'Agora User',
        nickname: prev?.nickname || 'Echo Agent',
        avatarUrl,
        updatedAt: new Date().toISOString(),
      }));
      return avatarUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload avatar';
      setError(message);
      throw err;
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setStats(null);
      return;
    }

    setProfile((prev) => prev ?? {
      userId,
      username: `User ${userId.slice(0, 6)}`,
      nickname: 'Echo Agent',
      updatedAt: new Date().toISOString(),
    });
    refreshStats();
  }, [userId, refreshStats]);

  return {
    profile,
    stats,
    error,
    isLoadingStats,
    isSavingProfile,
    isUploadingAvatar,
    refreshStats,
    saveProfile,
    uploadUserAvatar,
    setProfile,
  };
}

export default useApi;
