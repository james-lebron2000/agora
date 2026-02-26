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
import nacl from 'tweetnacl';
import { generateKeyPair, generateEncryptionKeyPair, convertEd25519ToCurve25519, encryptMessage, decryptMessage, encryptMessageForEd25519Recipient, decryptMessageWithEd25519Key, encodeBase64, decodeBase64, encodeUTF8, decodeUTF8, } from './crypto.js';
import { EnvelopeBuilder, EnvelopeSigner, } from './envelope.js';
// ============================================================================
// Default Configuration
// ============================================================================
export const DEFAULT_E2EE_CONFIG = {
    sessionTimeoutMs: 30 * 60 * 1000, // 30 minutes
    maxSessions: 100,
    enableForwardSecrecy: true,
    keyRotationIntervalMs: 15 * 60 * 1000, // 15 minutes
};
// ============================================================================
// E2EE Session Manager
// ============================================================================
export class E2EESessionManager {
    sessions = new Map();
    config;
    eventHandlers = new Set();
    cleanupInterval = null;
    rotationInterval = null;
    constructor(config = {}) {
        this.config = { ...DEFAULT_E2EE_CONFIG, ...config };
        this.startMaintenance();
    }
    /**
     * Subscribe to E2EE events
     */
    on(event, handler) {
        const wrappedHandler = (e) => {
            if (e.type === event || event === '*') {
                handler(e);
            }
        };
        this.eventHandlers.add(wrappedHandler);
        return () => this.eventHandlers.delete(wrappedHandler);
    }
    /**
     * Emit an event
     */
    emit(event) {
        this.eventHandlers.forEach(handler => {
            try {
                handler(event);
            }
            catch (err) {
                console.error('[E2EE] Event handler error:', err);
            }
        });
    }
    /**
     * Start maintenance intervals
     */
    startMaintenance() {
        // Cleanup expired sessions every minute
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredSessions();
        }, 60000);
        // Rotate keys if forward secrecy is enabled
        if (this.config.enableForwardSecrecy) {
            this.rotationInterval = setInterval(() => {
                this.rotateExpiredKeys();
            }, this.config.keyRotationIntervalMs);
        }
    }
    /**
     * Stop maintenance intervals
     */
    stop() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        if (this.rotationInterval) {
            clearInterval(this.rotationInterval);
            this.rotationInterval = null;
        }
    }
    /**
     * Create a new E2EE session with a remote agent
     */
    createSession(remoteDid, remotePublicKey, localKeyPair) {
        // Convert remote Ed25519 key to Curve25519 for ECDH
        const remoteCurve25519PublicKey = convertEd25519PublicKey(remotePublicKey);
        // Convert our Ed25519 key to Curve25519
        const localCurve25519KeyPair = convertEd25519ToCurve25519(localKeyPair);
        // Derive shared secret using ECDH
        const sharedSecret = nacl.box.before(remoteCurve25519PublicKey, localCurve25519KeyPair.secretKey);
        // Generate session ID from sorted public keys
        const sessionId = this.deriveSessionId(localKeyPair.publicKey, remotePublicKey);
        // Check if session already exists
        if (this.sessions.has(sessionId)) {
            const existing = this.sessions.get(sessionId);
            existing.lastActivityAt = Date.now();
            return existing;
        }
        // Enforce max sessions limit
        if (this.sessions.size >= this.config.maxSessions) {
            this.evictOldestSession();
        }
        const session = {
            id: sessionId,
            remoteDid,
            remotePublicKey,
            localKeyPair,
            sharedSecret,
            createdAt: Date.now(),
            lastActivityAt: Date.now(),
            nonceCounter: 0,
        };
        this.sessions.set(sessionId, session);
        this.emit({
            type: 'session:created',
            sessionId,
            timestamp: Date.now(),
            metadata: { remoteDid },
        });
        return session;
    }
    /**
     * Get an existing session
     */
    getSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            // Check if session expired
            if (this.isSessionExpired(session)) {
                this.sessions.delete(sessionId);
                this.emit({
                    type: 'session:expired',
                    sessionId,
                    timestamp: Date.now(),
                });
                return null;
            }
            session.lastActivityAt = Date.now();
        }
        return session || null;
    }
    /**
     * Check if a session exists and is valid
     */
    hasSession(sessionId) {
        return this.getSession(sessionId) !== null;
    }
    /**
     * Terminate a session
     */
    terminateSession(sessionId) {
        const existed = this.sessions.delete(sessionId);
        if (existed) {
            this.emit({
                type: 'session:expired',
                sessionId,
                timestamp: Date.now(),
                metadata: { reason: 'manual_termination' },
            });
        }
        return existed;
    }
    /**
     * Encrypt a message for a session
     */
    encryptMessage(sessionId, plaintext) {
        const session = this.getSession(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        // Generate nonce from counter
        const nonce = this.generateNonce(session.nonceCounter++);
        // Encrypt using shared secret
        const plaintextBytes = encodeUTF8(plaintext);
        const ciphertext = nacl.secretbox(plaintextBytes, nonce, session.sharedSecret);
        if (!ciphertext) {
            throw new Error('Encryption failed');
        }
        const payload = {
            ciphertext: encodeBase64(ciphertext),
            nonce: encodeBase64(nonce),
            sequence: session.nonceCounter,
            timestamp: Date.now(),
        };
        session.lastActivityAt = Date.now();
        this.emit({
            type: 'message:encrypted',
            sessionId,
            timestamp: Date.now(),
            metadata: { sequence: payload.sequence },
        });
        return payload;
    }
    /**
     * Decrypt a message for a session
     */
    decryptMessage(sessionId, payload) {
        const session = this.getSession(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        const ciphertext = decodeBase64(payload.ciphertext);
        const nonce = decodeBase64(payload.nonce);
        const plaintext = nacl.secretbox.open(ciphertext, nonce, session.sharedSecret);
        if (!plaintext) {
            throw new Error('Decryption failed - invalid ciphertext or tampered message');
        }
        session.lastActivityAt = Date.now();
        this.emit({
            type: 'message:decrypted',
            sessionId,
            timestamp: Date.now(),
            metadata: { sequence: payload.sequence },
        });
        return decodeUTF8(plaintext);
    }
    /**
     * Derive session ID from two public keys
     */
    deriveSessionId(keyA, keyB) {
        // Sort keys to ensure consistent session ID regardless of order
        const keys = [keyA, keyB].sort((a, b) => {
            for (let i = 0; i < Math.min(a.length, b.length); i++) {
                if (a[i] !== b[i])
                    return a[i] - b[i];
            }
            return a.length - b.length;
        });
        // Concatenate and hash
        const combined = new Uint8Array(keys[0].length + keys[1].length);
        combined.set(keys[0], 0);
        combined.set(keys[1], keys[0].length);
        const hash = nacl.hash(combined);
        return encodeBase64(hash.slice(0, 16)); // Use first 16 bytes as session ID
    }
    /**
     * Generate a nonce from counter
     */
    generateNonce(counter) {
        const nonce = new Uint8Array(nacl.secretbox.nonceLength);
        // Fill with counter bytes (little-endian)
        const view = new DataView(nonce.buffer);
        view.setUint32(0, counter, true);
        // Fill remaining with random bytes for uniqueness
        const randomPart = nacl.randomBytes(nonce.length - 4);
        nonce.set(randomPart, 4);
        return nonce;
    }
    /**
     * Check if session is expired
     */
    isSessionExpired(session) {
        return Date.now() - session.lastActivityAt > this.config.sessionTimeoutMs;
    }
    /**
     * Cleanup expired sessions
     */
    cleanupExpiredSessions() {
        const now = Date.now();
        for (const [id, session] of this.sessions.entries()) {
            if (now - session.lastActivityAt > this.config.sessionTimeoutMs) {
                this.sessions.delete(id);
                this.emit({
                    type: 'session:expired',
                    sessionId: id,
                    timestamp: now,
                });
            }
        }
    }
    /**
     * Evict oldest session when at capacity
     */
    evictOldestSession() {
        let oldestId = null;
        let oldestTime = Infinity;
        for (const [id, session] of this.sessions.entries()) {
            if (session.lastActivityAt < oldestTime) {
                oldestTime = session.lastActivityAt;
                oldestId = id;
            }
        }
        if (oldestId) {
            this.sessions.delete(oldestId);
            this.emit({
                type: 'session:expired',
                sessionId: oldestId,
                timestamp: Date.now(),
                metadata: { reason: 'eviction' },
            });
        }
    }
    /**
     * Rotate keys for forward secrecy
     */
    rotateExpiredKeys() {
        const now = Date.now();
        for (const [id, session] of this.sessions.entries()) {
            if (now - session.createdAt > this.config.keyRotationIntervalMs) {
                // Create new session with same remote party
                this.createSession(session.remoteDid, session.remotePublicKey, session.localKeyPair);
                this.emit({
                    type: 'session:rotated',
                    sessionId: id,
                    timestamp: now,
                });
            }
        }
    }
    /**
     * Get session statistics
     */
    getStats() {
        const sessions = Array.from(this.sessions.values());
        const now = Date.now();
        const activeSessions = sessions.filter(s => !this.isSessionExpired(s));
        return {
            totalSessions: sessions.length,
            activeSessions: activeSessions.length,
            oldestSession: sessions.length > 0
                ? Math.min(...sessions.map(s => s.createdAt))
                : null,
            newestSession: sessions.length > 0
                ? Math.max(...sessions.map(s => s.createdAt))
                : null,
        };
    }
}
// ============================================================================
// Encrypted Envelope Utilities
// ============================================================================
/**
 * Create an encrypted envelope for E2EE communication
 */
export async function createEncryptedEnvelope(sender, recipient, payload, senderKeyPair, recipientPublicKey, sessionManager) {
    // Get or create session
    const sessionId = deriveSessionIdFromKeys(senderKeyPair.publicKey, recipientPublicKey);
    let session = sessionManager.getSession(sessionId);
    if (!session) {
        session = sessionManager.createSession(recipient.id, recipientPublicKey, senderKeyPair);
    }
    // Encrypt payload
    const plaintext = JSON.stringify(payload);
    const encryptedPayload = sessionManager.encryptMessage(session.id, plaintext);
    // Build envelope with encrypted content
    const envelope = new EnvelopeBuilder()
        .id(generateMessageId())
        .type('REQUEST')
        .sender(sender)
        .recipient(recipient)
        .payload({
        encrypted: true,
        ciphertext: encryptedPayload.ciphertext,
        nonce: encryptedPayload.nonce,
        sequence: encryptedPayload.sequence,
        timestamp: encryptedPayload.timestamp,
    })
        .build();
    // Sign the envelope
    const signer = new EnvelopeSigner(senderKeyPair.secretKey);
    return signer.signEncrypted(envelope, encryptedPayload.ciphertext);
}
/**
 * Decrypt an encrypted envelope
 */
export function decryptEnvelope(envelope, recipientKeyPair, sessionManager) {
    if (!envelope.payload?.encrypted || !envelope.payload?.ciphertext) {
        throw new Error('Envelope is not encrypted');
    }
    // Resolve sender's public key
    const senderPublicKey = resolveSenderPublicKey(envelope.sender.id);
    if (!senderPublicKey) {
        throw new Error('Cannot resolve sender public key');
    }
    // Get or create session
    const sessionId = deriveSessionIdFromKeys(senderPublicKey, recipientKeyPair.publicKey);
    let session = sessionManager.getSession(sessionId);
    if (!session) {
        session = sessionManager.createSession(envelope.sender.id, senderPublicKey, recipientKeyPair);
    }
    // Decrypt payload
    const encryptedPayload = {
        ciphertext: envelope.payload.ciphertext,
        nonce: envelope.payload.nonce,
        sequence: envelope.payload.sequence,
        timestamp: envelope.payload.timestamp,
    };
    const plaintext = sessionManager.decryptMessage(session.id, encryptedPayload);
    return JSON.parse(plaintext);
}
// ============================================================================
// Utility Functions
// ============================================================================
/**
 * Convert Ed25519 public key to Curve25519
 */
function convertEd25519PublicKey(ed25519PublicKey) {
    // Use tweetnacl-util for conversion
    const signKeyPair = {
        publicKey: ed25519PublicKey,
        secretKey: new Uint8Array(64), // Dummy secret key for conversion
    };
    const boxKeyPair = convertEd25519ToCurve25519(signKeyPair);
    return boxKeyPair.publicKey;
}
/**
 * Generate a unique message ID
 */
function generateMessageId() {
    const random = nacl.randomBytes(16);
    const timestamp = Date.now().toString(36);
    return `${timestamp}-${encodeBase64(random).slice(0, 8)}`;
}
/**
 * Derive session ID from public keys (helper for envelope functions)
 */
function deriveSessionIdFromKeys(keyA, keyB) {
    const keys = [keyA, keyB].sort((a, b) => {
        for (let i = 0; i < Math.min(a.length, b.length); i++) {
            if (a[i] !== b[i])
                return a[i] - b[i];
        }
        return a.length - b.length;
    });
    const combined = new Uint8Array(keys[0].length + keys[1].length);
    combined.set(keys[0], 0);
    combined.set(keys[1], keys[0].length);
    const hash = nacl.hash(combined);
    return encodeBase64(hash.slice(0, 16));
}
/**
 * Resolve sender's public key from DID
 */
function resolveSenderPublicKey(senderDid) {
    // Support did:key format
    if (senderDid.startsWith('did:key:z')) {
        try {
            // Extract multibase key
            const multibaseKey = senderDid.slice(9);
            const decoded = decodeBase64(multibaseKey);
            // First 2 bytes are multicodec prefix (0xed01 for Ed25519)
            return decoded.slice(2);
        }
        catch {
            return null;
        }
    }
    return null;
}
// ============================================================================
// Global Instance
// ============================================================================
let globalE2EEManager = null;
/**
 * Get or create global E2EE manager
 */
export function getOrCreateE2EEManager(config) {
    if (!globalE2EEManager) {
        globalE2EEManager = new E2EESessionManager(config);
    }
    return globalE2EEManager;
}
/**
 * Get global E2EE manager (throws if not initialized)
 */
export function getE2EEManager() {
    if (!globalE2EEManager) {
        throw new Error('E2EE manager not initialized. Call getOrCreateE2EEManager first.');
    }
    return globalE2EEManager;
}
/**
 * Reset global E2EE manager
 */
export function resetE2EEManager() {
    if (globalE2EEManager) {
        globalE2EEManager.stop();
        globalE2EEManager = null;
    }
}
// ============================================================================
// Re-exports
// ============================================================================
export { generateKeyPair, generateEncryptionKeyPair, convertEd25519ToCurve25519, encryptMessage, decryptMessage, encryptMessageForEd25519Recipient, decryptMessageWithEd25519Key, encodeBase64, decodeBase64, encodeUTF8, decodeUTF8, };
// Default export
export default E2EESessionManager;
//# sourceMappingURL=e2ee.js.map