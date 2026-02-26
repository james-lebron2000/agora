import { useState, useEffect, useCallback, useMemo } from 'react';

export type PerformancePeriod = '7d' | '30d' | '90d' | '1y';

export interface EarningsDataPoint {
  date: string;
  earnings: number;
}

export interface TaskDataPoint {
  date: string;
  completed: number;
  failed: number;
}

export interface SkillDistribution {
  skill: string;
  earnings: number;
  tasks: number;
}

export interface HourlyActivity {
  hour: number;
  tasks: number;
}

export interface PerformanceSummary {
  totalEarnings: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  successRate: number;
  avgTasksPerDay: number;
  earningsChange: number;
  tasksChange: number;
}

export interface ComparisonData {
  networkAvgEarnings: number;
  networkAvgSuccessRate: number;
  networkAvgTasksPerDay: number;
  topPercentileEarnings: number;
  topPercentileSuccessRate: number;
  topPercentileTasksPerDay: number;
  earningsPerTask: number;
}

export interface EfficiencyMetrics {
  score: number;
  percentile: number;
  trend: number;
  roi: number;
}

export interface AgentPerformanceData {
  summary: PerformanceSummary;
  earningsTrend: EarningsDataPoint[];
  taskTrend: TaskDataPoint[];
  skillDistribution: SkillDistribution[];
  hourlyActivity: HourlyActivity[];
  comparison: ComparisonData;
  efficiency: EfficiencyMetrics;
}

interface UseAgentPerformanceReturn {
  data: AgentPerformanceData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// Generate mock data for development
function generateMockData(agentId: string, period: PerformancePeriod): AgentPerformanceData {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
  const now = new Date();
  
  // Generate earnings trend
  const earningsTrend: EarningsDataPoint[] = [];
  const taskTrend: TaskDataPoint[] = [];
  
  let totalEarnings = 0;
  let totalTasks = 0;
  let completedTasks = 0;
  let failedTasks = 0;
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dailyTasks = Math.floor(Math.random() * 8) + 2;
    const dailyCompleted = Math.floor(dailyTasks * (0.7 + Math.random() * 0.25));
    const dailyFailed = dailyTasks - dailyCompleted;
    const dailyEarnings = dailyCompleted * (50 + Math.random() * 150);
    
    earningsTrend.push({ date: dateStr, earnings: dailyEarnings });
    taskTrend.push({ date: dateStr, completed: dailyCompleted, failed: dailyFailed });
    
    totalEarnings += dailyEarnings;
    totalTasks += dailyTasks;
    completedTasks += dailyCompleted;
    failedTasks += dailyFailed;
  }
  
  // Generate skill distribution
  const skills = ['Code Generation', 'Data Analysis', 'Content Creation', 'Research', 'Translation', 'Design'];
  const skillDistribution: SkillDistribution[] = skills.map(skill => ({
    skill,
    earnings: Math.random() * totalEarnings * 0.4,
    tasks: Math.floor(Math.random() * totalTasks * 0.3),
  })).sort((a, b) => b.earnings - a.earnings);
  
  // Generate hourly activity
  const hourlyActivity: HourlyActivity[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    tasks: Math.floor(Math.random() * (hour >= 9 && hour <= 18 ? 15 : 5)),
  }));
  
  // Calculate summary
  const successRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const avgTasksPerDay = totalTasks / days;
  
  // Calculate changes (mock)
  const earningsChange = (Math.random() - 0.3) * 40;
  const tasksChange = (Math.random() - 0.3) * 30;
  
  // Comparison data
  const comparison: ComparisonData = {
    networkAvgEarnings: totalEarnings * 0.7,
    networkAvgSuccessRate: 75,
    networkAvgTasksPerDay: avgTasksPerDay * 0.8,
    topPercentileEarnings: totalEarnings * 1.5,
    topPercentileSuccessRate: 95,
    topPercentileTasksPerDay: avgTasksPerDay * 1.8,
    earningsPerTask: totalEarnings / (completedTasks || 1),
  };
  
  // Efficiency metrics
  const efficiencyScore = Math.min(100, successRate * 0.5 + (totalEarnings / 1000) * 0.3 + Math.random() * 20);
  const efficiency: EfficiencyMetrics = {
    score: efficiencyScore,
    percentile: Math.floor(Math.random() * 30) + 10,
    trend: (Math.random() - 0.4) * 20,
    roi: (totalEarnings / (totalTasks * 10)) * 100,
  };
  
  return {
    summary: {
      totalEarnings,
      totalTasks,
      completedTasks,
      failedTasks,
      successRate,
      avgTasksPerDay,
      earningsChange,
      tasksChange,
    },
    earningsTrend,
    taskTrend,
    skillDistribution,
    hourlyActivity,
    comparison,
    efficiency,
  };
}

/**
 * Hook for fetching agent-specific performance analytics
 * 
 * @param agentId - The ID of the agent to fetch data for
 * @param period - Time period for analytics ('7d', '30d', '90d', '1y')
 * @returns Performance data, loading state, error, and refetch function
 * 
 * @example
 * ```tsx
 * function AgentAnalyticsPage({ agentId }: { agentId: string }) {
 *   const { data, isLoading, error } = useAgentPerformance(agentId, '30d');
 *   
 *   if (isLoading) return <Loading />;
 *   if (error) return <Error message={error} />;
 *   
 *   return <PerformanceDashboard data={data} />;
 * }
 * ```
 */
export function useAgentPerformance(
  agentId: string,
  period: PerformancePeriod = '30d'
): UseAgentPerformanceReturn {
  const [data, setData] = useState<AgentPerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/agents/${agentId}/performance?period=${period}`);
      // const result = await response.json();
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Use mock data for now
      const mockData = generateMockData(agentId, period);
      setData(mockData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch performance data');
    } finally {
      setIsLoading(false);
    }
  }, [agentId, period]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}

export default useAgentPerformance;
