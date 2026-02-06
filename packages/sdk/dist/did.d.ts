/**
 * Converts an Ed25519 public key to a did:key string.
 * Uses multicodec prefix 0xed01 and base58-btc encoding.
 */
export declare function publicKeyToDidKey(publicKey: Uint8Array): string;
/**
 * Extracts the Ed25519 public key from a did:key string.
 * Expects 'z' prefix (base58-btc) and 0xed01 multicodec prefix.
 */
export declare function didKeyToPublicKey(did: string): Uint8Array;
//# sourceMappingURL=did.d.ts.map