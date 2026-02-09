import { useEffect, useMemo, useRef, useState } from 'react';
import { resolveRelayUrl } from '../lib/relayUrl';

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
  intentDistribution: Array<{ intent: string; count: number }>;
  volumeTrend: Array<{ day: string; volume: number }>;
  topAgents: AgentStats[];
  recentActivity: Array<{
    time: string;
    type: 'request' | 'offer' | 'accept' | 'result';
    agent: string;
    intent?: string;
    requestId?: string;
    value?: number;
  }>;
};

type RelayEvent = {
  ts?: string;
  type?: string;
  id?: string;
  sender?: { id?: string };
  payload?: Record<string, unknown>;
};

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function extractRequestId(payload: Record<string, unknown>): string | null {
  const raw = payload.request_id || payload.requestId;
  if (typeof raw === 'string' && raw.length > 0) return raw;
  if (typeof raw === 'number') return String(raw);
  return null;
}

function extractUsdcAmount(payload: Record<string, unknown>): number | undefined {
  const token = typeof payload.token === 'string' ? payload.token.toUpperCase() : undefined;
  const amount = asNumber(payload.amount);
  const amountUsdc = asNumber(payload.amount_usdc);
  const priceUsd = asNumber(payload.price_usd);
  if (token === 'USDC') return amount ?? amountUsdc ?? priceUsd;
  if (!token) return amountUsdc ?? priceUsd;
  return undefined;
}

function formatDayLabel(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function useRealtimeMetrics(pollInterval = 5000) {
  const relayUrl = useMemo(() => resolveRelayUrl(), [])
  const [metrics, setMetrics] = useState<NetworkMetrics>({
    activeAgents: 0,
    totalDeals: 0,
    totalVolume: 0,
    successRate: 0,
    intentDistribution: [],
    volumeTrend: [],
    topAgents: [],
    recentActivity: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMetrics = async () => {
    try {
      const [agentsRes, eventsRes] = await Promise.all([
        fetch(`${relayUrl}/v1/agents`),
        fetch(`${relayUrl}/v1/messages`),
      ]);
      const agentsData = await agentsRes.json();
      const eventsData = await eventsRes.json();

      if (!agentsData.ok) {
        throw new Error('Failed to fetch agents');
      }
      if (!eventsData.ok) {
        throw new Error('Failed to fetch relay events');
      }

      const agents = agentsData.agents || [];
      const events: RelayEvent[] = Array.isArray(eventsData.events) ? eventsData.events : [];
      const nowTs = Date.now();

      const agentStats: AgentStats[] = agents.slice(0, 50).map((agent: any) => {
        const rep = agent.reputation || {};
        return {
          name: agent.name || agent.id || 'Unknown',
          did: agent.id,
          totalOrders: rep.total_orders || 0,
          successRate: rep.total_orders
            ? Math.round((rep.success_orders / rep.total_orders) * 100)
            : 0,
          rating: rep.score || 0,
          lastSeen: agent.last_seen || '',
        };
      });

      const activeAgents = agents.filter((a: any) => {
        if (typeof a.status === 'string' && a.status.toLowerCase() === 'online') return true;
        const lastSeenTs = Date.parse(a.last_seen || '');
        return Number.isFinite(lastSeenTs) && lastSeenTs >= nowTs - 5 * 60 * 1000;
      }).length;

      const requestIntentById = new Map<string, string>();
      const completedRequestIds = new Set<string>();
      const successfulRequestIds = new Set<string>();
      const intentCount = new Map<string, number>();
      const recentActivity: NetworkMetrics['recentActivity'] = [];
      const dailyVolume = new Map<string, number>();
      let totalVolume = 0;

      for (let offset = 6; offset >= 0; offset -= 1) {
        const dayTs = nowTs - offset * 24 * 60 * 60 * 1000;
        dailyVolume.set(formatDayLabel(dayTs), 0);
      }

      for (const event of events) {
        const type = typeof event.type === 'string' ? event.type.toUpperCase() : '';
        const payload = event.payload && typeof event.payload === 'object' ? event.payload : {};
        const requestId = extractRequestId(payload);
        const sender = event.sender?.id || 'Unknown';
        const ts = typeof event.ts === 'string' ? event.ts : new Date().toISOString();
        const parsedTs = Date.parse(ts);
        const intentFromPayload = typeof payload.intent === 'string' ? payload.intent : undefined;

        if (type === 'REQUEST' && requestId && intentFromPayload) {
          requestIntentById.set(requestId, intentFromPayload);
          intentCount.set(intentFromPayload, (intentCount.get(intentFromPayload) || 0) + 1);
        }

        if (type === 'RESULT' && requestId) {
          completedRequestIds.add(requestId);
          const status = typeof payload.status === 'string' ? payload.status.toLowerCase() : '';
          if (status === 'success' || status === 'partial' || status === 'completed') {
            successfulRequestIds.add(requestId);
          }
        }

        if (type === 'ACCEPT') {
          const amount = extractUsdcAmount(payload);
          if (amount && amount > 0) {
            totalVolume += amount;
            if (Number.isFinite(parsedTs)) {
              const day = formatDayLabel(parsedTs);
              dailyVolume.set(day, (dailyVolume.get(day) || 0) + amount);
            }
          }
        }

        if (type === 'REQUEST' || type === 'OFFER' || type === 'ACCEPT' || type === 'RESULT') {
          recentActivity.push({
            time: ts,
            type: type.toLowerCase() as 'request' | 'offer' | 'accept' | 'result',
            agent: sender,
            intent: requestId ? requestIntentById.get(requestId) : intentFromPayload,
            requestId: requestId || undefined,
            value: type === 'ACCEPT' ? extractUsdcAmount(payload) : undefined,
          });
        }
      }

      recentActivity.sort((a, b) => Date.parse(b.time) - Date.parse(a.time));
      const totalDeals = completedRequestIds.size;
      const successRate = totalDeals > 0 ? Math.round((successfulRequestIds.size / totalDeals) * 100) : 0;

      const topAgents = agentStats
        .sort((a, b) => b.totalOrders - a.totalOrders)
        .slice(0, 10);

      const intentDistribution = Array.from(intentCount.entries())
        .map(([intent, count]) => ({ intent, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      const volumeTrend = Array.from(dailyVolume.entries())
        .map(([day, volume]) => ({ day, volume: Math.round(volume * 100) / 100 }));

      setMetrics({
        activeAgents,
        totalDeals,
        totalVolume: Math.round(totalVolume * 100) / 100,
        successRate,
        intentDistribution,
        volumeTrend,
        topAgents,
        recentActivity: recentActivity.slice(0, 40),
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
  }, [pollInterval, relayUrl]);

  return { metrics, isLoading, error, refetch: fetchMetrics };
}
