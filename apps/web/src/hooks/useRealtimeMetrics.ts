import { useEffect, useRef, useState } from 'react';

const RELAY_URL = import.meta.env.VITE_RELAY_URL || 'http://45.32.219.241:8789';

export type AgentStats = {
  name: string;
  did: string;
  totalOrders: number;
  successRate: number;
  rating: number;
  lastSeen: string;
};

export type NetworkMetrics = {
  activeAgents: number;
  totalDeals: number;
  totalVolume: number;
  successRate: number;
  topAgents: AgentStats[];
  recentActivity: Array<{
    time: string;
    type: 'request' | 'offer' | 'accept' | 'result';
    agent: string;
    value?: number;
  }>;
};

export function useRealtimeMetrics(pollInterval = 5000) {
  const [metrics, setMetrics] = useState<NetworkMetrics>({
    activeAgents: 0,
    totalDeals: 0,
    totalVolume: 0,
    successRate: 0,
    topAgents: [],
    recentActivity: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMetrics = async () => {
    try {
      // Fetch agent list
      const agentsRes = await fetch(`${RELAY_URL}/v1/agents`);
      const agentsData = await agentsRes.json();
      
      if (!agentsData.ok) {
        throw new Error('Failed to fetch agents');
      }

      const agents = agentsData.agents || [];
      
      // Fetch reputation for each agent
      const agentStats: AgentStats[] = await Promise.all(
        agents.slice(0, 20).map(async (agent: any) => {
          try {
            const repRes = await fetch(`${RELAY_URL}/v1/reputation/${encodeURIComponent(agent.id)}`);
            const repData = await repRes.json();
            const rep = repData.reputation;
            
            return {
              name: agent.agent?.name || 'Unknown',
              did: agent.id,
              totalOrders: rep?.total_orders || 0,
              successRate: rep?.total_orders 
                ? Math.round((rep.success_orders / rep.total_orders) * 100) 
                : 0,
              rating: rep?.score || 0,
              lastSeen: agent.last_seen || new Date().toISOString(),
            };
          } catch {
            return {
              name: agent.agent?.name || 'Unknown',
              did: agent.id,
              totalOrders: 0,
              successRate: 0,
              rating: 0,
              lastSeen: agent.last_seen || new Date().toISOString(),
            };
          }
        })
      );

      // Aggregate metrics
      const activeAgents = agents.filter((a: any) => {
        const lastSeen = new Date(a.last_seen);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return lastSeen > fiveMinutesAgo;
      }).length;

      const totalDeals = agentStats.reduce((sum, a) => sum + a.totalOrders, 0);
      const totalVolume = totalDeals * 0.5; // Estimated average deal size
      const avgSuccessRate = agentStats.length > 0
        ? Math.round(agentStats.reduce((sum, a) => sum + a.successRate, 0) / agentStats.length)
        : 0;

      // Sort by activity for top agents
      const topAgents = agentStats
        .sort((a, b) => b.totalOrders - a.totalOrders)
        .slice(0, 10);

      // Generate recent activity (mocked based on real data for now)
      const recentActivity = generateRecentActivity(agentStats);

      setMetrics({
        activeAgents,
        totalDeals,
        totalVolume,
        successRate: avgSuccessRate,
        topAgents,
        recentActivity,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    intervalRef.current = setInterval(fetchMetrics, pollInterval);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [pollInterval]);

  return { metrics, isLoading, error, refetch: fetchMetrics };
}

function generateRecentActivity(agents: AgentStats[]) {
  const activity = [];
  const now = new Date();
  
  for (let i = 0; i < 20; i++) {
    const time = new Date(now.getTime() - i * 2 * 60 * 1000); // Every 2 minutes
    const agent = agents[Math.floor(Math.random() * Math.max(agents.length, 1))] || { name: 'Unknown' };
    const types: Array<'request' | 'offer' | 'accept' | 'result'> = ['request', 'offer', 'accept', 'result'];
    
    activity.push({
      time: time.toISOString(),
      type: types[Math.floor(Math.random() * types.length)],
      agent: agent.name,
      value: Math.random() > 0.5 ? Math.round(Math.random() * 100) / 10 : undefined,
    });
  }
  
  return activity.reverse();
}
