import type { Signer, Verifier } from "./types.js";
export declare const utf8ToBytes: (input: string) => Uint8Array;
export declare const base64urlEncode: (bytes: Uint8Array) => string;
export declare const base64urlDecode: (input: string) => Uint8Array;
export declare const ed25519Sign: (message: Uint8Array, privateKey: Uint8Array) => Promise<Uint8Array>;
export declare const ed25519Verify: (message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array) => Promise<boolean>;
export declare const createEd25519Signer: (privateKey: Uint8Array, options?: {
    keyId?: string;
}) => Signer;
export declare const createEd25519Verifier: (publicKey: Uint8Array, options?: {
    keyId?: string;
}) => Verifier;
//# sourceMappingURL=crypto.d.ts.map