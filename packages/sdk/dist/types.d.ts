export type JcsProfile = "rfc8785" | string;
export interface EnvelopeHeader {
    /** Signature algorithm identifier (e.g., ed25519, secp256k1) */
    alg: string;
    /** Optional key id */
    kid?: string;
    /** Optional type hint */
    typ?: string;
    /** JCS profile hint */
    jcs?: JcsProfile;
    /** ISO-8601 created timestamp */
    created?: string;
    /** ISO-8601 expiry timestamp */
    expires?: string;
}
export interface Envelope<T = unknown> {
    header: EnvelopeHeader;
    payload: T;
    /** base64url signature bytes */
    signature: string;
}
export interface Signer {
    /** algorithm identifier */
    alg: string;
    /** optional key id */
    keyId?: string;
    /** sign the message bytes and return signature bytes */
    sign(message: Uint8Array): Uint8Array | Promise<Uint8Array>;
}
export interface Verifier {
    /** algorithm identifier */
    alg: string;
    /** optional key id */
    keyId?: string;
    /** verify message and signature bytes */
    verify(message: Uint8Array, signature: Uint8Array): boolean | Promise<boolean>;
}
//# sourceMappingURL=types.d.ts.map