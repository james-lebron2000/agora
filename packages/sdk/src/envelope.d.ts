export interface Envelope {
    version: string;
    id: string;
    ts: string;
    type: MessageType;
    sender: Sender;
    recipient?: Recipient;
    payload: Record<string, unknown>;
    thread?: Thread;
    meta?: Meta;
    sig?: string;
    encrypted?: boolean;
    encryptionNonce?: string;
}
export type MessageType = 'HELLO' | 'WELCOME' | 'STATUS' | 'REQUEST' | 'OFFER' | 'ACCEPT' | 'RESULT' | 'DEBATE' | 'ERROR' | 'REVOKE' | 'ESCROW_HELD' | 'ESCROW_RELEASED' | 'ESCROW_REFUNDED';
export interface Sender {
    id: string;
    name?: string;
    url?: string;
}
export interface Recipient {
    id: string;
    url?: string;
}
export interface Thread {
    id: string;
    parent?: string;
}
export interface Meta {
    ttl?: number;
    hop?: number;
    tags?: string[];
}
export interface SignedEnvelope extends Envelope {
    sig: string;
    encrypted?: boolean;
    encryptionNonce?: string;
}
export declare class EnvelopeBuilder {
    private envelope;
    id(id: string): this;
    type(type: MessageType): this;
    sender(sender: Sender): this;
    recipient(recipient: Recipient): this;
    payload(payload: Record<string, unknown>): this;
    thread(thread: Thread): this;
    meta(meta: Meta): this;
    build(): Envelope;
}
export declare class EnvelopeSigner {
    private privateKey;
    constructor(privateKey: Uint8Array);
    sign(envelope: Envelope, encryptedPayload?: string): Promise<SignedEnvelope>;
    /**
     * Sign an envelope with an encrypted payload
     * This is a convenience method for signing encrypted envelopes
     */
    signEncrypted(envelope: Envelope, encryptedPayload: string): Promise<SignedEnvelope>;
}
export declare class EnvelopeVerifier {
    verify(envelope: SignedEnvelope): Promise<boolean>;
    private resolvePublicKey;
}
export declare function generateKeypair(): Promise<{
    publicKey: Uint8Array;
    privateKey: Uint8Array;
}>;
//# sourceMappingURL=envelope.d.ts.map