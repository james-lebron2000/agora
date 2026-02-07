import { SignedEnvelope } from './envelope.js';
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
        description?: string;
        portfolio_url?: string;
        portfolioUrl?: string;
        metadata?: Record<string, unknown>;
    };
    capabilities?: unknown[];
    status?: string;
}
export interface AgentRecord extends AgentRegistration {
    id?: string;
    name?: string;
    url?: string;
    description?: string;
    portfolio_url?: string;
    metadata?: Record<string, unknown> | null;
    intents?: string[];
    pricing?: Array<{
        capability_id?: string | null;
        capability_name?: string | null;
        model?: string | null;
        currency?: string | null;
        fixed_price?: number | null;
        metered_unit?: string | null;
        metered_rate?: number | null;
    }>;
    last_seen?: string;
    status?: string;
    reputation?: ReputationRecord;
}
export interface DirectoryOptions {
    intent?: string;
    q?: string;
    status?: 'online' | 'offline' | string;
    limit?: number;
}
export interface ReputationRecord {
    agent_id: string;
    total_orders: number;
    success_orders: number;
    on_time_orders: number;
    rating_count: number;
    rating_positive: number;
    avg_response_ms: number | null;
    disputes: number;
    score: number;
    tier: string;
    updated_at: string;
}
export interface EscrowRecord {
    request_id: string;
    payer: string;
    payee: string;
    amount: number;
    currency: string;
    fee_bps: number;
    status: 'HELD' | 'RELEASED' | 'REFUNDED';
    held_at?: string;
    released_at?: string;
    fee?: number;
    payout?: number;
}
export interface LedgerAccount {
    id: string;
    balance: number;
    currency: string;
    updated_at: string;
}
export interface PaymentVerification {
    tx_hash: string;
    chain: string;
    token: string;
    status: string;
    confirmations: number;
    amount: string | null;
    amount_units: string | null;
    payer: string | null;
    payee: string | null;
    block_number: number | null;
    verified_at: string;
}
export interface MarketRateRow {
    currency: string;
    sample_size: number;
    average: number;
    p25: number;
    p50: number;
    p75: number;
    min: number;
    max: number;
}
export interface MarketRateResponse {
    ok: boolean;
    query?: {
        intent?: string | null;
        currency?: string | null;
        period?: string;
        period_ms?: number;
    };
    sample_size?: number;
    rates?: MarketRateRow[];
    generated_at?: string;
    error?: string;
    message?: string;
}
export declare class RelayClient {
    private baseUrl;
    private defaultTimeout;
    constructor(options: RelayClientOptions);
    submitEvent(envelope: SignedEnvelope): Promise<{
        ok: boolean;
        id?: string;
        error?: string;
    }>;
    submitMessage(envelope: SignedEnvelope): Promise<{
        ok: boolean;
        id?: string;
        error?: string;
    }>;
    subscribe(options?: SubscribeOptions): AsyncGenerator<SignedEnvelope[]>;
    subscribeMessages(options?: SubscribeOptions): AsyncGenerator<SignedEnvelope[]>;
    private subscribeFromPath;
    getEvents(options?: SubscribeOptions): Promise<{
        ok: boolean;
        events: SignedEnvelope[];
        hasMore?: boolean;
    }>;
    seed(): Promise<{
        ok: boolean;
        count?: number;
    }>;
    getMessages(options?: SubscribeOptions): Promise<{
        ok: boolean;
        events: SignedEnvelope[];
        hasMore?: boolean;
    }>;
    registerAgent(payload: AgentRegistration): Promise<{
        ok: boolean;
        agent?: AgentRecord;
        error?: string;
    }>;
    listAgents(): Promise<{
        ok: boolean;
        agents?: AgentRecord[];
        error?: string;
    }>;
    discoverAgents(intent?: string, limit?: number): Promise<{
        ok: boolean;
        agents?: AgentRecord[];
        error?: string;
    }>;
    listDirectory(options?: DirectoryOptions): Promise<{
        ok: boolean;
        agents?: AgentRecord[];
        total?: number;
        error?: string;
    }>;
    getAgentStatus(did: string): Promise<{
        ok: boolean;
        id?: string;
        status?: string;
        last_seen?: string | null;
        error?: string;
    }>;
    submitReputation(payload: {
        agent_id: string;
        outcome?: 'success' | 'partial' | 'failed' | 'cancelled';
        on_time?: boolean;
        rating?: number;
        response_time_ms?: number;
        dispute?: boolean;
        total_orders_delta?: number;
        success_orders_delta?: number;
        on_time_orders_delta?: number;
        disputes_delta?: number;
    }): Promise<{
        ok: boolean;
        reputation?: ReputationRecord;
        error?: string;
    }>;
    getReputation(did: string): Promise<{
        ok: boolean;
        reputation?: ReputationRecord;
        error?: string;
    }>;
    recommendAgents(options: {
        requester?: string;
        intents?: string[];
        limit?: number;
    }): Promise<{
        ok: boolean;
        agents?: AgentRecord[];
        error?: string;
    }>;
    holdEscrow(payload: {
        request_id: string;
        payer: string;
        payee: string;
        amount: number;
        currency?: string;
        fee_bps?: number;
    }): Promise<{
        ok: boolean;
        escrow?: EscrowRecord;
        error?: string;
    }>;
    releaseEscrow(payload: {
        request_id: string;
        resolution?: 'success' | 'refund';
    }): Promise<{
        ok: boolean;
        escrow?: EscrowRecord;
        error?: string;
    }>;
    getEscrow(requestId: string): Promise<{
        ok: boolean;
        escrow?: EscrowRecord;
        error?: string;
    }>;
    getLedgerAccount(id: string): Promise<{
        ok: boolean;
        account?: LedgerAccount;
        error?: string;
    }>;
    verifyPayment(payload: {
        tx_hash: string;
        chain?: 'base' | 'base-sepolia' | string;
        token?: 'USDC' | string;
        payer?: string;
        payee?: string;
        amount?: number | string;
        sender_id?: string;
    }): Promise<{
        ok: boolean;
        payment?: PaymentVerification;
        error?: string;
        message?: string;
        pending?: boolean;
        confirmations?: number | null;
    }>;
    getMarketRate(options?: {
        intent?: string;
        currency?: string;
        period?: string;
    }): Promise<MarketRateResponse>;
    health(): Promise<{
        ok: boolean;
        version?: string;
    }>;
}
//# sourceMappingURL=relay.d.ts.map