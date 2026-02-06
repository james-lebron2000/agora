export class RelayClient {
    baseUrl;
    defaultTimeout;
    constructor(options) {
        this.baseUrl = options.baseUrl.replace(/\/$/, '');
        this.defaultTimeout = options.timeout || 30;
    }
    async submitEvent(envelope) {
        try {
            const response = await fetch(`${this.baseUrl}/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(envelope),
            });
            return await response.json();
        }
        catch (err) {
            return { ok: false, error: String(err) };
        }
    }
    async submitMessage(envelope) {
        try {
            const response = await fetch(`${this.baseUrl}/v1/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ envelope }),
            });
            return await response.json();
        }
        catch (err) {
            return { ok: false, error: String(err) };
        }
    }
    async *subscribe(options = {}) {
        yield* this.subscribeFromPath('/events', options);
    }
    async *subscribeMessages(options = {}) {
        yield* this.subscribeFromPath('/v1/messages', options);
    }
    async *subscribeFromPath(path, options = {}) {
        let since = options.since || new Date().toISOString();
        while (true) {
            try {
                const params = new URLSearchParams();
                params.set('since', since);
                if (options.recipient)
                    params.set('recipient', options.recipient);
                if (options.sender)
                    params.set('sender', options.sender);
                if (options.type)
                    params.set('type', options.type);
                if (options.thread)
                    params.set('thread', options.thread);
                params.set('timeout', String(options.timeout || this.defaultTimeout));
                const response = await fetch(`${this.baseUrl}${path}?${params}`);
                const data = await response.json();
                if (data.ok && data.events.length > 0) {
                    yield data.events;
                    // Update since to last event timestamp
                    since = data.events[data.events.length - 1].ts;
                }
                else if (!data.ok) {
                    // Error from server, wait before retry
                    await sleep(5000);
                }
                else if (data.lastTs) {
                    since = data.lastTs;
                }
                // If no events, immediately re-subscribe (long-polling handles the wait)
            }
            catch (err) {
                // Network error, wait before retry
                await sleep(5000);
            }
        }
    }
    async getEvents(options = {}) {
        try {
            const params = new URLSearchParams();
            if (options.since)
                params.set('since', options.since);
            if (options.recipient)
                params.set('recipient', options.recipient);
            if (options.sender)
                params.set('sender', options.sender);
            if (options.type)
                params.set('type', options.type);
            if (options.thread)
                params.set('thread', options.thread);
            params.set('timeout', '1'); // Short timeout for single fetch
            const response = await fetch(`${this.baseUrl}/events?${params}`);
            return await response.json();
        }
        catch (err) {
            return { ok: false, events: [], hasMore: false };
        }
    }
    async seed() {
        try {
            const response = await fetch(`${this.baseUrl}/seed`, { method: 'POST' });
            return await response.json();
        }
        catch (err) {
            return { ok: false };
        }
    }
    async getMessages(options = {}) {
        try {
            const params = new URLSearchParams();
            if (options.since)
                params.set('since', options.since);
            if (options.recipient)
                params.set('recipient', options.recipient);
            if (options.sender)
                params.set('sender', options.sender);
            if (options.type)
                params.set('type', options.type);
            if (options.thread)
                params.set('thread', options.thread);
            params.set('timeout', '1'); // Short timeout for single fetch
            const response = await fetch(`${this.baseUrl}/v1/messages?${params}`);
            return await response.json();
        }
        catch (err) {
            return { ok: false, events: [], hasMore: false };
        }
    }
    async registerAgent(payload) {
        try {
            const response = await fetch(`${this.baseUrl}/v1/agents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            return await response.json();
        }
        catch (err) {
            return { ok: false, error: String(err) };
        }
    }
    async listAgents() {
        try {
            const response = await fetch(`${this.baseUrl}/v1/agents`);
            return await response.json();
        }
        catch (err) {
            return { ok: false, error: String(err) };
        }
    }
    async discoverAgents(intent, limit) {
        try {
            const params = new URLSearchParams();
            if (intent)
                params.set('intent', intent);
            if (limit)
                params.set('limit', String(limit));
            const response = await fetch(`${this.baseUrl}/v1/discover?${params}`);
            return await response.json();
        }
        catch (err) {
            return { ok: false, error: String(err) };
        }
    }
    async getAgentStatus(did) {
        try {
            const response = await fetch(`${this.baseUrl}/v1/agents/${encodeURIComponent(did)}/status`);
            return await response.json();
        }
        catch (err) {
            return { ok: false, error: String(err) };
        }
    }
    async submitReputation(payload) {
        try {
            const response = await fetch(`${this.baseUrl}/v1/reputation/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            return await response.json();
        }
        catch (err) {
            return { ok: false, error: String(err) };
        }
    }
    async getReputation(did) {
        try {
            const response = await fetch(`${this.baseUrl}/v1/reputation/${encodeURIComponent(did)}`);
            return await response.json();
        }
        catch (err) {
            return { ok: false, error: String(err) };
        }
    }
    async recommendAgents(options) {
        try {
            const params = new URLSearchParams();
            if (options.requester)
                params.set('requester', options.requester);
            if (options.intents && options.intents.length)
                params.set('intent', options.intents.join(','));
            if (options.limit)
                params.set('limit', String(options.limit));
            const response = await fetch(`${this.baseUrl}/v1/recommend?${params}`);
            return await response.json();
        }
        catch (err) {
            return { ok: false, error: String(err) };
        }
    }
    async holdEscrow(payload) {
        try {
            const response = await fetch(`${this.baseUrl}/v1/escrow/hold`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            return await response.json();
        }
        catch (err) {
            return { ok: false, error: String(err) };
        }
    }
    async releaseEscrow(payload) {
        try {
            const response = await fetch(`${this.baseUrl}/v1/escrow/release`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            return await response.json();
        }
        catch (err) {
            return { ok: false, error: String(err) };
        }
    }
    async getEscrow(requestId) {
        try {
            const response = await fetch(`${this.baseUrl}/v1/escrow/${encodeURIComponent(requestId)}`);
            return await response.json();
        }
        catch (err) {
            return { ok: false, error: String(err) };
        }
    }
    async getLedgerAccount(id) {
        try {
            const response = await fetch(`${this.baseUrl}/v1/ledger/${encodeURIComponent(id)}`);
            return await response.json();
        }
        catch (err) {
            return { ok: false, error: String(err) };
        }
    }
    async verifyPayment(payload) {
        try {
            const response = await fetch(`${this.baseUrl}/v1/payments/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            return await response.json();
        }
        catch (err) {
            return { ok: false, error: String(err) };
        }
    }
    async health() {
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            return await response.json();
        }
        catch (err) {
            return { ok: false };
        }
    }
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
//# sourceMappingURL=relay.js.map