import { Envelope, MessageType, Sender, SignedEnvelope } from './envelope.js';
import { RequestPayload, OfferPayload, ResultPayload } from './messages.js';
import { RelayClient, SubscribeOptions, AgentRecord } from './relay.js';
export interface AgoraAgentOptions {
    did: string;
    privateKey: Uint8Array;
    relayUrl: string;
    name?: string;
    url?: string;
    capabilities?: unknown[];
}
export interface RegisterOptions {
    capabilities?: unknown[];
    status?: string;
}
export type MessageHandler = (envelope: SignedEnvelope) => void | Promise<void>;
export declare class AgoraAgent {
    readonly did: string;
    readonly relay: RelayClient;
    private readonly signer;
    private readonly senderProfile;
    private readonly defaultCapabilities?;
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
}
//# sourceMappingURL=agent.d.ts.map