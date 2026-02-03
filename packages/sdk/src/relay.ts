import { Envelope, SignedEnvelope } from './envelope';

export interface RelayClientOptions {
  baseUrl: string;
  timeout?: number;
}

export interface SubscribeOptions {
  since?: string;
  recipient?: string;
  sender?: string;
  type?: string;
  thread?: string;
  timeout?: number;
}

export interface AgentRegistration {
  agent: {
    id: string;
    name?: string;
    url?: string;
  };
  capabilities?: unknown[];
  status?: string;
}

export interface AgentRecord extends AgentRegistration {
  intents?: string[];
  last_seen?: string;
}

export class RelayClient {
  private baseUrl: string;
  private defaultTimeout: number;

  constructor(options: RelayClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.defaultTimeout = options.timeout || 30;
  }

  async submitEvent(envelope: SignedEnvelope): Promise<{ ok: boolean; id?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });
      return await (response as any).json() as { ok: boolean; id?: string; error?: string };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  async submitMessage(envelope: SignedEnvelope): Promise<{ ok: boolean; id?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ envelope }),
      });
      return await (response as any).json() as { ok: boolean; id?: string; error?: string };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  async *subscribe(options: SubscribeOptions = {}): AsyncGenerator<SignedEnvelope[]> {
    yield* this.subscribeFromPath('/events', options);
  }

  async *subscribeMessages(options: SubscribeOptions = {}): AsyncGenerator<SignedEnvelope[]> {
    yield* this.subscribeFromPath('/v1/messages', options);
  }

  private async *subscribeFromPath(path: string, options: SubscribeOptions = {}): AsyncGenerator<SignedEnvelope[]> {
    let since = options.since || new Date().toISOString();
    
    while (true) {
      try {
        const params = new URLSearchParams();
        params.set('since', since);
        if (options.recipient) params.set('recipient', options.recipient);
        if (options.sender) params.set('sender', options.sender);
        if (options.type) params.set('type', options.type);
        if (options.thread) params.set('thread', options.thread);
        params.set('timeout', String(options.timeout || this.defaultTimeout));
        
        const response = await fetch(`${this.baseUrl}${path}?${params}`);
        const data = await (response as any).json() as { ok: boolean; events: SignedEnvelope[]; lastTs?: string | null };
        
        if (data.ok && data.events.length > 0) {
          yield data.events;
          // Update since to last event timestamp
          since = data.events[data.events.length - 1].ts;
        } else if (!data.ok) {
          // Error from server, wait before retry
          await sleep(5000);
        } else if (data.lastTs) {
          since = data.lastTs;
        }
        // If no events, immediately re-subscribe (long-polling handles the wait)
      } catch (err) {
        // Network error, wait before retry
        await sleep(5000);
      }
    }
  }

  async getEvents(options: SubscribeOptions = {}): Promise<{ ok: boolean; events: SignedEnvelope[]; hasMore?: boolean }> {
    try {
      const params = new URLSearchParams();
      if (options.since) params.set('since', options.since);
      if (options.recipient) params.set('recipient', options.recipient);
      if (options.sender) params.set('sender', options.sender);
      if (options.type) params.set('type', options.type);
      if (options.thread) params.set('thread', options.thread);
      params.set('timeout', '1'); // Short timeout for single fetch
      
      const response = await fetch(`${this.baseUrl}/events?${params}`);
      return await (response as any).json() as { ok: boolean; events: SignedEnvelope[]; hasMore?: boolean };
    } catch (err) {
      return { ok: false, events: [], hasMore: false };
    }
  }

  async seed(): Promise<{ ok: boolean; count?: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/seed`, { method: 'POST' });
      return await (response as any).json() as { ok: boolean; count?: number };
    } catch (err) {
      return { ok: false };
    }
  }

  async getMessages(options: SubscribeOptions = {}): Promise<{ ok: boolean; events: SignedEnvelope[]; hasMore?: boolean }> {
    try {
      const params = new URLSearchParams();
      if (options.since) params.set('since', options.since);
      if (options.recipient) params.set('recipient', options.recipient);
      if (options.sender) params.set('sender', options.sender);
      if (options.type) params.set('type', options.type);
      if (options.thread) params.set('thread', options.thread);
      params.set('timeout', '1'); // Short timeout for single fetch
      
      const response = await fetch(`${this.baseUrl}/v1/messages?${params}`);
      return await (response as any).json() as { ok: boolean; events: SignedEnvelope[]; hasMore?: boolean };
    } catch (err) {
      return { ok: false, events: [], hasMore: false };
    }
  }

  async registerAgent(payload: AgentRegistration): Promise<{ ok: boolean; agent?: AgentRecord; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await (response as any).json() as { ok: boolean; agent?: AgentRecord; error?: string };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  async listAgents(): Promise<{ ok: boolean; agents?: AgentRecord[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/agents`);
      return await (response as any).json() as { ok: boolean; agents?: AgentRecord[]; error?: string };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  async discoverAgents(intent?: string, limit?: number): Promise<{ ok: boolean; agents?: AgentRecord[]; error?: string }> {
    try {
      const params = new URLSearchParams();
      if (intent) params.set('intent', intent);
      if (limit) params.set('limit', String(limit));
      const response = await fetch(`${this.baseUrl}/v1/discover?${params}`);
      return await (response as any).json() as { ok: boolean; agents?: AgentRecord[]; error?: string };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  async getAgentStatus(did: string): Promise<{ ok: boolean; id?: string; status?: string; last_seen?: string | null; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/agents/${encodeURIComponent(did)}/status`);
      return await (response as any).json() as { ok: boolean; id?: string; status?: string; last_seen?: string | null; error?: string };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  async health(): Promise<{ ok: boolean; version?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return await (response as any).json() as { ok: boolean; version?: string };
    } catch (err) {
      return { ok: false };
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
