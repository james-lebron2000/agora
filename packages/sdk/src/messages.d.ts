import { Envelope, Sender } from './envelope.js';
export interface RequestPayload {
    request_id: string;
    intent: string;
    title?: string;
    description?: string;
    params: Record<string, unknown>;
    constraints?: {
        max_cost_usd?: number;
        max_latency_ms?: number;
        deadline?: string;
    };
}
export interface OfferPayload {
    request_id: string;
    plan?: string;
    price?: {
        amount: number;
        currency: string;
    };
    eta_seconds?: number;
    valid_until?: string;
}
export interface AcceptPayload {
    request_id: string;
    accepted_at: string;
    payment_tx?: string;
    terms?: Record<string, unknown>;
}
export interface ResultPayload {
    request_id: string;
    status: 'success' | 'partial' | 'failed' | 'cancelled';
    output?: Record<string, unknown>;
    artifacts?: Array<{
        type: string;
        url: string;
        name?: string;
    }>;
    metrics?: {
        latency_ms?: number;
        cost_actual?: number;
    };
}
export interface ErrorPayload {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}
export declare class MessageBuilder {
    static request(sender: Sender, payload: RequestPayload, options?: {
        recipient?: string;
        thread?: string;
    }): Envelope;
    static offer(sender: Sender, requestId: string, payload: Omit<OfferPayload, 'request_id'>, options?: {
        thread?: string;
    }): Envelope;
    static accept(sender: Sender, requestId: string, options?: {
        thread?: string;
        terms?: Record<string, unknown>;
        payment_tx?: string;
    }): Envelope;
    static result(sender: Sender, requestId: string, payload: Omit<ResultPayload, 'request_id'>, options?: {
        thread?: string;
    }): Envelope;
    static error(sender: Sender, code: string, message: string, options?: {
        recipient?: string;
        details?: Record<string, unknown>;
        thread?: string;
    }): Envelope;
}
//# sourceMappingURL=messages.d.ts.map