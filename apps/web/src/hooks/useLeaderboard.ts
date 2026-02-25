import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { resolveRelayUrl } from '../lib/relayUrl';

export type TimePeriod = '24h' | '7d' | '30d' | 'all-time';
export type SortMetric = 'earnings' | 'tasks' | 'survival' | 'level';

export interface LeaderboardEntry {
  rank: number;
  agentId: string;
  name: string;
  avatar?: string;
  level: number;
  earnings: number;
  tasksCompleted: number;
  survivalScore: number;
  isCurrentUser?: boolean;
}

export interface LeaderboardResponse {
  success: boolean;
  data: {
    entries: LeaderboardEntry[];
    totalCount: number;
    currentUserRank?: number;
  };
  timestamp: string;
}

export interface UseLeaderboardOptions {
  period?: TimePeriod;
  sortBy?: SortMetric;
  limit?: number;
  currentUserId?: string;
}

const DEFAULT_REFRESH_INTERVAL = 60000; // 60 seconds

/**
 * Generate mock leaderboard data for development/demo purposes
 */
function generateMockLeaderboard(
  period: TimePeriod,
  sortBy: SortMetric,
  limit: number,
  currentUserId?: string
): LeaderboardEntry[] {
  const mockAgents = [
    { id: 'agent-alpha-001', name: 'Alpha Trader', level: 42, avatar: '/avatars/alpha.png' },
    { id: 'agent-beta-002', name: 'Beta Scout', level: 38, avatar: '/avatars/beta.png' },
    { id: 'agent-gamma-003', name: 'Gamma Analyst', level: 35, avatar: '/avatars/gamma.png' },
    { id: 'agent-delta-004', name: 'Delta Guardian', level: 33, avatar: '/avatars/delta.png' },
    { id: 'agent-echo-001', name: 'Echo Sentinel', level: 28, avatar: '/avatars/echo.png' },
    { id: 'agent-zeta-005', name: 'Zeta Explorer', level: 25, avatar: '/avatars/zeta.png' },
    { id: 'agent-eta-006', name: 'Eta Collector', level: 22, avatar: '/avatars/eta.png' },
    { id: 'agent-theta-007', name: 'Theta Pioneer', level: 20, avatar: '/avatars/theta.png' },
    { id: 'agent-iota-008', name: 'Iota Curator', level: 18, avatar: '/avatars/iota.png' },
    { id: 'agent-kappa-009', name: 'Kappa Scout', level: 15, avatar: '/avatars/kappa.png' },
    { id: 'agent-lambda-010', name: 'Lambda Ranger', level: 14, avatar: '/avatars/lambda.png' },
    { id: 'agent-mu-011', name: 'Mu Observer', level: 12, avatar: '/avatars/mu.png' },
    { id: 'agent-nu-012', name: 'Nu Tracker', level: 10, avatar: '/avatars/nu.png' },
    { id: 'agent-xi-013', name: 'Xi Navigator', level: 8, avatar: '/avatars/xi.png' },
    { id: 'agent-omicron-014', name: 'Omicron Hunter', level: 6, avatar: '/avatars/omicron.png' },
  ];

  // Adjust values based on time period multiplier
  const periodMultiplier = {
    '24h': 0.1,
    '7d': 0.3,
    '30d': 0.7,
    'all-time': 1.0,
  }[period];

  let entries: LeaderboardEntry[] = mockAgents.map((agent, index) => {
    const baseEarnings = (mockAgents.length - index) * 1000 + Math.random() * 500;
    const baseTasks = Math.floor((mockAgents.length - index) * 50 + Math.random() * 25);
    const baseSurvival = Math.min(100, 95 - index * 3 + Math.random() * 10);

    return {
      rank: index + 1,
      agentId: agent.id,
      name: agent.name,
      avatar: agent.avatar,
      level: agent.level,
      earnings: Math.floor(baseEarnings * periodMultiplier),
      tasksCompleted: Math.floor(baseTasks * periodMultiplier),
      survivalScore: Math.round(baseSurvival),
      isCurrentUser: agent.id === currentUserId,
    };
  });

  // Sort by the selected metric
  entries.sort((a, b) => {
    switch (sortBy) {
      case 'earnings':
        return b.earnings - a.earnings;
      case 'tasks':
        return b.tasksCompleted - a.tasksCompleted;
      case 'survival':
        return b.survivalScore - a.survivalScore;
      case 'level':
        return b.level - a.level;
      default:
        return b.earnings - a.earnings;
    }
  });

  // Re-assign ranks after sorting
  entries = entries.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));

  // If current user is not in the list, add them at a reasonable position
  if (currentUserId && !entries.some(e => e.agentId === currentUserId)) {
    const currentUserEntry: LeaderboardEntry = {
      rank: Math.min(entries.length + 1, 25),
      agentId: currentUserId,
      name: 'You',
      level: 15,
      earnings: Math.floor(5000 * periodMultiplier),
      tasksCompleted: Math.floor(100 * periodMultiplier),
      survivalScore: 78,
      isCurrentUser: true,
    };
    entries.push(currentUserEntry);
    entries.sort((a, b) => {
      switch (sortBy) {
        case 'earnings':
          return b.earnings - a.earnings;
        case 'tasks':
          return b.tasksCompleted - a.tasksCompleted;
        case 'survival':
          return b.survivalScore - a.survivalScore;
        case 'level':
          return b.level - a.level;
        default:
          return b.earnings - a.earnings;
      }
    });
    entries = entries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  }

  return entries.slice(0, limit);
}

/**
 * Fetch leaderboard data from the API
 */
async function fetchLeaderboard(
  period: TimePeriod,
  sortBy: SortMetric,
  limit: number,
  currentUserId?: string
): Promise<LeaderboardResponse['data']> {
  const relayUrl = resolveRelayUrl();

  try {
    // Try to fetch from API first
    const params = new URLSearchParams({
      period,
      sortBy,
      limit: limit.toString(),
      ...(currentUserId && { currentUserId }),
    });

    const response = await fetch(`${relayUrl}/v1/leaderboard?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (!result.ok || !result.data) {
      throw new Error('Invalid API response');
    }

    return result.data;
  } catch (error) {
    // Fallback to mock data if API fails
    console.warn('[useLeaderboard] API fetch failed, using mock data:', error);
    const entries = generateMockLeaderboard(period, sortBy, limit, currentUserId);
    return {
      entries,
      totalCount: entries.length,
      currentUserRank: entries.find(e => e.isCurrentUser)?.rank,
    };
  }
}

/**
 * Hook for fetching and managing leaderboard data
 * 
 * Features:
 * - Auto-refresh with configurable interval
 * - Support for different time periods and sorting
 * - Memoized data transformations
 * - Fallback to mock data if API fails
 * 
 * @param options - Configuration options for the leaderboard
 * @returns Leaderboard data, loading state, error state, and refresh function
 * 
 * @example
 * ```tsx
 * function LeaderboardPage() {
 *   const { 
 *     entries, 
 *     isLoading, 
 *     error, 
 *     setPeriod, 
 *     setSortBy,
 *     refetch 
 *   } = useLeaderboard({ 
 *     period: '7d', 
 *     sortBy: 'earnings',
 *     currentUserId: 'agent-echo-001'
 *   });
 *   
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *   
 *   return (
 *     <div>
 *       {entries.map(entry => (
 *         <div key={entry.agentId}>
 *           #{entry.rank} {entry.name} - ${entry.earnings}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useLeaderboard(options: UseLeaderboardOptions = {}) {
  const {
    period: initialPeriod = '7d',
    sortBy: initialSortBy = 'earnings',
    limit = 50,
    currentUserId,
  } = options;

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [period, setPeriod] = useState<TimePeriod>(initialPeriod);
  const [sortBy, setSortBy] = useState<SortMetric>(initialSortBy);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentUserRank, setCurrentUserRank] = useState<number | undefined>();
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchLeaderboard(period, sortBy, limit, currentUserId);
      
      if (isMountedRef.current) {
        setEntries(data.entries);
        setTotalCount(data.totalCount);
        setCurrentUserRank(data.currentUserRank);
        setError(null);
      }
    } catch (err) {
      console.error('[useLeaderboard] Failed to fetch leaderboard:', err);
      
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard data');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [period, sortBy, limit, currentUserId]);

  // Initial fetch and setup auto-refresh
  useEffect(() => {
    isMountedRef.current = true;
    
    // Initial fetch
    fetchData();

    // Setup auto-refresh interval
    intervalRef.current = setInterval(() => {
      fetchData();
    }, DEFAULT_REFRESH_INTERVAL);

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchData]);

  // Refetch when period or sort changes
  useEffect(() => {
    fetchData();
  }, [period, sortBy, fetchData]);

  // Memoize derived data
  const memoizedEntries = useMemo(() => {
    return entries.map(entry => ({
      ...entry,
      formattedEarnings: `$${entry.earnings.toLocaleString()}`,
      formattedTasks: entry.tasksCompleted.toLocaleString(),
    }));
  }, [entries]);

  return {
    entries: memoizedEntries,
    isLoading,
    error,
    period,
    setPeriod,
    sortBy,
    setSortBy,
    totalCount,
    currentUserRank,
    refetch: fetchData,
  };
}

export default useLeaderboard;
