/**
 * End-to-End Encryption (E2EE) Module for Agora
 *
 * Provides high-level E2EE functionality for secure agent-to-agent communication:
 * - ECDH key exchange for session establishment
 * - Sealed box encryption for anonymous messages
 * - Session key management with forward secrecy
 * - Encrypted envelope creation and parsing
 *
 * @module e2ee
 */
import { generateKeyPair, generateEncryptionKeyPair, convertEd25519ToCurve25519, encryptMessage, decryptMessage, encryptMessageForEd25519Recipient, decryptMessageWithEd25519Key, encodeBase64, decodeBase64, encodeUTF8, decodeUTF8, type SignKeyPair } from './crypto.js';
import { type SignedEnvelope, type Sender, type Recipient } from './envelope.js';
/** E2EE Session state */
export interface E2EESession {
    /** Session ID (derived from public keys) */
    id: string;
    /** Remote agent's DID */
    remoteDid: string;
    /** Remote agent's Ed25519 public key */
    remotePublicKey: Uint8Array;
    /** Our Ed25519 key pair */
    localKeyPair: SignKeyPair;
    /** Shared secret derived via ECDH */
    sharedSecret: Uint8Array;
    /** Session creation timestamp */
    createdAt: number;
    /** Last activity timestamp */
    lastActivityAt: number;
    /** Nonce counter for message ordering */
    nonceCounter: number;
}
/** Encrypted payload structure */
export interface EncryptedPayload {
    /** Encrypted message content (base64) */
    ciphertext: string;
    /** Nonce used for encryption (base64) */
    nonce: string;
    /** Ephemeral public key for this message (base64, optional) */
    ephemeralPublicKey?: string;
    /** Message sequence number */
    sequence: number;
    /** Timestamp */
    timestamp: number;
}
/** E2EE configuration options */
export interface E2EEConfig {
    /** Session timeout in ms (default: 30 minutes) */
    sessionTimeoutMs: number;
    /** Maximum sessions to keep in memory */
    maxSessions: number;
    /** Enable perfect forward secrecy (rotate keys) */
    enableForwardSecrecy: boolean;
    /** Key rotation interval in ms (if forward secrecy enabled) */
    keyRotationIntervalMs: number;
}
/** E2EE Manager events */
export type E2EEEventType = 'session:created' | 'session:expired' | 'session:rotated' | 'message:encrypted' | 'message:decrypted' | 'error' | '*';
export interface E2EEEvent {
    type: E2EEEventType;
    sessionId?: string;
    timestamp: number;
    error?: Error;
    metadata?: Record<string, unknown>;
}
export type E2EEEventHandler = (event: E2EEEvent) => void;
export declare const DEFAULT_E2EE_CONFIG: E2EEConfig;
export declare class E2EESessionManager {
    private sessions;
    private config;
    private eventHandlers;
    private cleanupInterval;
    private rotationInterval;
    constructor(config?: Partial<E2EEConfig>);
    /**
     * Subscribe to E2EE events
     */
    on(event: E2EEEventType, handler: E2EEEventHandler): () => void;
    /**
     * Emit an event
     */
    private emit;
    /**
     * Start maintenance intervals
     */
    private startMaintenance;
    /**
     * Stop maintenance intervals
     */
    stop(): void;
    /**
     * Create a new E2EE session with a remote agent
     */
    createSession(remoteDid: string, remotePublicKey: Uint8Array, localKeyPair: SignKeyPair): E2EESession;
    /**
     * Get an existing session
     */
    getSession(sessionId: string): E2EESession | null;
    /**
     * Check if a session exists and is valid
     */
    hasSession(sessionId: string): boolean;
    /**
     * Terminate a session
     */
    terminateSession(sessionId: string): boolean;
    /**
     * Encrypt a message for a session
     */
    encryptMessage(sessionId: string, plaintext: string): EncryptedPayload;
    /**
     * Decrypt a message for a session
     */
    decryptMessage(sessionId: string, payload: EncryptedPayload): string;
    /**
     * Derive session ID from two public keys
     */
    private deriveSessionId;
    /**
     * Generate a nonce from counter
     */
    private generateNonce;
    /**
     * Check if session is expired
     */
    private isSessionExpired;
    /**
     * Cleanup expired sessions
     */
    private cleanupExpiredSessions;
    /**
     * Evict oldest session when at capacity
     */
    private evictOldestSession;
    /**
     * Rotate keys for forward secrecy
     */
    private rotateExpiredKeys;
    /**
     * Get session statistics
     */
    getStats(): {
        totalSessions: number;
        activeSessions: number;
        oldestSession: number | null;
        newestSession: number | null;
    };
}
/**
 * Create an encrypted envelope for E2EE communication
 */
export declare function createEncryptedEnvelope(sender: Sender, recipient: Recipient, payload: Record<string, unknown>, senderKeyPair: SignKeyPair, recipientPublicKey: Uint8Array, sessionManager: E2EESessionManager): Promise<SignedEnvelope>;
/**
 * Decrypt an encrypted envelope
 */
export declare function decryptEnvelope(envelope: SignedEnvelope, recipientKeyPair: SignKeyPair, sessionManager: E2EESessionManager): Record<string, unknown>;
/**
 * Get or create global E2EE manager
 */
export declare function getOrCreateE2EEManager(config?: Partial<E2EEConfig>): E2EESessionManager;
/**
 * Get global E2EE manager (throws if not initialized)
 */
export declare function getE2EEManager(): E2EESessionManager;
/**
 * Reset global E2EE manager
 */
export declare function resetE2EEManager(): void;
export { generateKeyPair, generateEncryptionKeyPair, convertEd25519ToCurve25519, encryptMessage, decryptMessage, encryptMessageForEd25519Recipient, decryptMessageWithEd25519Key, encodeBase64, decodeBase64, encodeUTF8, decodeUTF8, };
export default E2EESessionManager;
//# sourceMappingURL=e2ee.d.ts.map