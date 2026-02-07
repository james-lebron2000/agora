import { Envelope, MessageType, Sender, SignedEnvelope } from './envelope.js';
import { RequestPayload, OfferPayload, ResultPayload } from './messages.js';
import { RelayClient, SubscribeOptions, AgentRecord } from './relay.js';
import { JsonSchema } from './schema.js';
export interface AgoraAgentOptions {
    did: string;
    privateKey: Uint8Array;
    relayUrl: string;
    name?: string;
    url?: string;
    description?: string;
    portfolioUrl?: string;
    metadata?: Record<string, unknown>;
    capabilities?: unknown[];
    intentSchemas?: Record<string, {
        input?: JsonSchema;
        output?: JsonSchema;
    }>;
}
export interface RegisterOptions {
    capabilities?: unknown[];
    status?: string;
}
export type MessageHandler = (envelope: SignedEnvelope) => void | Promise<void>;
export type EscrowHandler = (envelope: SignedEnvelope, escrow: {
    request_id: string;
    payer?: string;
    payee?: string;
    amount?: number;
    currency?: string;
    status?: string;
    held_at?: string;
    released_at?: string;
}) => void | Promise<void>;
export declare function extractIntentSchemasFromCapabilities(capabilities: unknown[]): Record<string, {
    input?: JsonSchema;
    output?: JsonSchema;
}>;
export declare class AgoraAgent {
    readonly did: string;
    readonly relay: RelayClient;
    private readonly signer;
    private readonly senderProfile;
    private readonly registrationProfile;
    private readonly defaultCapabilities?;
    private readonly intentSchemas;
    constructor(options: AgoraAgentOptions);
    get sender(): Sender;
    register(options?: RegisterOptions): Promise<{
        ok: boolean;
        agent?: AgentRecord;
        error?: string;
    }>;
    sign(envelope: Envelope): Promise<SignedEnvelope>;
    sendEnvelope(envelope: Envelope): Promise<{
        ok: boolean;
        id?: string;
        error?: string;
    }>;
    sendRequest(payload: RequestPayload, options?: {
        recipient?: string;
        thread?: string;
    }): Promise<{
        ok: boolean;
        id?: string;
        error?: string;
    }>;
    sendOffer(requestId: string, payload: Omit<OfferPayload, 'request_id'>, options?: {
        thread?: string;
    }): Promise<{
        ok: boolean;
        id?: string;
        error?: string;
    }>;
    sendAccept(requestId: string, options?: {
        thread?: string;
        terms?: Record<string, unknown>;
        payment_tx?: string;
    }): Promise<{
        ok: boolean;
        id?: string;
        error?: string;
    }>;
    sendResult(requestId: string, payload: Omit<ResultPayload, 'request_id'>, options?: {
        thread?: string;
        intent?: string;
    }): Promise<{
        ok: boolean;
        id?: string;
        error?: string;
    }>;
    sendError(code: string, message: string, options?: {
        recipient?: string;
        details?: Record<string, unknown>;
        thread?: string;
    }): Promise<{
        ok: boolean;
        id?: string;
        error?: string;
    }>;
    onMessage(type: MessageType, handler: MessageHandler, options?: SubscribeOptions): Promise<void>;
    onRequest(handler: MessageHandler, options?: SubscribeOptions): Promise<void>;
    onOffer(handler: MessageHandler, options?: SubscribeOptions): Promise<void>;
    onAccept(handler: MessageHandler, options?: SubscribeOptions): Promise<void>;
    onResult(handler: MessageHandler, options?: SubscribeOptions): Promise<void>;
    onEscrowDeposit(handler: EscrowHandler, options?: SubscribeOptions & {
        onlyForPayee?: boolean;
    }): Promise<void>;
}
//# sourceMappingURL=agent.d.ts.map