/**
 * E2EE (End-to-End Encryption) Module Tests
 * 
 * Comprehensive test coverage for the E2EE module including:
 * - Session management and lifecycle
 * - ECDH key exchange
 * - Message encryption/decryption
 * - Envelope handling
 * - Forward secrecy
 * - Event system
 */

import {
  E2EESessionManager,
  getOrCreateE2EEManager,
  getE2EEManager,
  resetE2EEManager,
  createEncryptedEnvelope,
  decryptEnvelope,
  DEFAULT_E2EE_CONFIG,
  type E2EESession,
  type EncryptedPayload,
  type E2EEConfig,
  type E2EEEvent,
} from '../e2ee.js';
import {
  generateKeyPair,
} from '../crypto.js';
import nacl from 'tweetnacl';

// ============================================================================
// Test Setup
// ============================================================================

describe('E2EE Module', () => {
  let manager: E2EESessionManager;
  let localKeyPair: nacl.SignKeyPair;
  let remoteKeyPair: nacl.SignKeyPair;

  beforeEach(() => {
    // Reset singleton before each test
    resetE2EEManager();
    
    // Generate test key pairs
    localKeyPair = generateKeyPair();
    remoteKeyPair = generateKeyPair();
    
    // Create fresh manager instance
    manager = new E2EESessionManager({
      sessionTimeoutMs: 60000, // 1 minute for testing
      maxSessions: 10,
      enableForwardSecrecy: false,
      keyRotationIntervalMs: 300000,
    });
  });

  afterEach(() => {
    manager.stop();
    resetE2EEManager();
  });

  // ============================================================================
  // Initialization Tests
  // ============================================================================

  describe('Initialization', () => {
    test('should create manager with default config', () => {
      const defaultManager = new E2EESessionManager();
      expect(defaultManager).toBeDefined();
      expect(defaultManager.getStats().totalSessions).toBe(0);
      defaultManager.stop();
    });

    test('should create manager with custom config', () => {
      const customConfig: E2EEConfig = {
        sessionTimeoutMs: 120000,
        maxSessions: 5,
        enableForwardSecrecy: true,
        keyRotationIntervalMs: 60000,
      };
      const customManager = new E2EESessionManager(customConfig);
      expect(customManager).toBeDefined();
      customManager.stop();
    });

    test('should use DEFAULT_E2EE_CONFIG values', () => {
      expect(DEFAULT_E2EE_CONFIG.sessionTimeoutMs).toBe(1800000); // 30 minutes
      expect(DEFAULT_E2EE_CONFIG.maxSessions).toBe(100);
      expect(DEFAULT_E2EE_CONFIG.enableForwardSecrecy).toBe(true);
      expect(DEFAULT_E2EE_CONFIG.keyRotationIntervalMs).toBe(900000); // 15 minutes
    });
  });

  // ============================================================================
  // Singleton Pattern Tests
  // ============================================================================

  describe('Singleton Pattern', () => {
    test('getOrCreateE2EEManager should create singleton instance', () => {
      const instance1 = getOrCreateE2EEManager();
      const instance2 = getOrCreateE2EEManager();
      expect(instance1).toBe(instance2);
    });

    test('getE2EEManager should return null if not initialized', () => {
      resetE2EEManager();
      const instance = getE2EEManager();
      expect(instance).toBeNull();
    });

    test('getE2EEManager should return instance after creation', () => {
      const created = getOrCreateE2EEManager();
      const retrieved = getE2EEManager();
      expect(retrieved).toBe(created);
    });

    test('resetE2EEManager should clear singleton', () => {
      getOrCreateE2EEManager();
      expect(getE2EEManager()).not.toBeNull();
      resetE2EEManager();
      expect(getE2EEManager()).toBeNull();
    });
  });

  // ============================================================================
  // Session Creation Tests
  // ============================================================================

  describe('Session Creation', () => {
    test('should create a new session with valid keys', () => {
      const remoteDid = 'did:key:z6Mktest';
      const session = manager.createSession(remoteDid, remoteKeyPair.publicKey, localKeyPair);

      expect(session).toBeDefined();
      expect(session.remoteDid).toBe(remoteDid);
      expect(session.remotePublicKey).toEqual(remoteKeyPair.publicKey);
      expect(session.localKeyPair).toEqual(localKeyPair);
      expect(session.sharedSecret).toBeDefined();
      expect(session.sharedSecret.length).toBe(32); // 256-bit key
      expect(session.nonceCounter).toBe(0);
    });

    test('should generate unique session IDs for different peers', () => {
      const session1 = manager.createSession('did:key:1', remoteKeyPair.publicKey, localKeyPair);
      
      const anotherRemoteKeyPair = generateKeyPair();
      const anotherLocalKeyPair = generateKeyPair();
      const session2 = manager.createSession('did:key:2', anotherRemoteKeyPair.publicKey, anotherLocalKeyPair);

      expect(session1.id).not.toBe(session2.id);
    });

    test('should return existing session for same public keys', () => {
      const remoteDid = 'did:key:z6Mktest';
      const session1 = manager.createSession(remoteDid, remoteKeyPair.publicKey, localKeyPair);
      const session2 = manager.createSession(remoteDid, remoteKeyPair.publicKey, localKeyPair);

      expect(session1.id).toBe(session2.id);
    });

    test('should enforce maxSessions limit by evicting oldest', () => {
      const limitedManager = new E2EESessionManager({
        sessionTimeoutMs: 60000,
        maxSessions: 3,
        enableForwardSecrecy: false,
        keyRotationIntervalMs: 300000,
      });

      // Create max sessions
      const sessions: E2EESession[] = [];
      for (let i = 0; i < 3; i++) {
        const localKp = generateKeyPair();
        const remoteKp = generateKeyPair();
        const session = limitedManager.createSession(`did:key:${i}`, remoteKp.publicKey, localKp);
        sessions.push(session);
      }

      expect(limitedManager.getStats().totalSessions).toBe(3);

      // Creating one more should evict oldest
      const newLocalKp = generateKeyPair();
      const newRemoteKp = generateKeyPair();
      limitedManager.createSession('did:key:new', newRemoteKp.publicKey, newLocalKp);
      expect(limitedManager.getStats().totalSessions).toBe(3);

      // First session should be evicted
      expect(limitedManager.getSession(sessions[0].id)).toBeNull();

      limitedManager.stop();
    });
  });

  // ============================================================================
  // Session Retrieval Tests
  // ============================================================================

  describe('Session Retrieval', () => {
    test('should retrieve session by ID', () => {
      const remoteDid = 'did:key:z6Mktest';
      const session = manager.createSession(remoteDid, remoteKeyPair.publicKey, localKeyPair);
      const retrieved = manager.getSession(session.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(session.id);
    });

    test('should return null for non-existent session', () => {
      const retrieved = manager.getSession('non-existent-id');
      expect(retrieved).toBeNull();
    });

    test('should check if session exists', () => {
      const session = manager.createSession('did:key:test', remoteKeyPair.publicKey, localKeyPair);
      expect(manager.hasSession(session.id)).toBe(true);
      expect(manager.hasSession('non-existent')).toBe(false);
    });

    test('should return correct session statistics', () => {
      expect(manager.getStats().totalSessions).toBe(0);
      
      manager.createSession('did:key:1', generateKeyPair().publicKey, generateKeyPair());
      expect(manager.getStats().totalSessions).toBe(1);
      
      manager.createSession('did:key:2', generateKeyPair().publicKey, generateKeyPair());
      expect(manager.getStats().totalSessions).toBe(2);
      
      const stats = manager.getStats();
      expect(stats.activeSessions).toBe(2);
      expect(stats.oldestSession).toBeDefined();
      expect(stats.newestSession).toBeDefined();
    });
  });

  // ============================================================================
  // Message Encryption/Decryption Tests
  // ============================================================================

  describe('Message Encryption/Decryption', () => {
    let session: E2EESession;
    const remoteDid = 'did:key:z6Mktest';

    beforeEach(() => {
      session = manager.createSession(remoteDid, remoteKeyPair.publicKey, localKeyPair);
    });

    test('should encrypt and decrypt message successfully', () => {
      const plaintext = 'Hello, secure world!';
      
      const encrypted = manager.encryptMessage(session.id, plaintext);
      expect(encrypted).toBeDefined();
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.nonce).toBeDefined();
      expect(encrypted.sequence).toBeGreaterThanOrEqual(0);

      const decrypted = manager.decryptMessage(session.id, encrypted);
      expect(decrypted).toBe(plaintext);
    });

    test('should increment nonce counter after encryption', () => {
      const plaintext = 'Test message';
      
      const encrypted1 = manager.encryptMessage(session.id, plaintext);
      const seq1 = encrypted1.sequence;
      
      const encrypted2 = manager.encryptMessage(session.id, plaintext);
      const seq2 = encrypted2.sequence;
      
      expect(seq2).toBeGreaterThan(seq1);
    });

    test('should handle empty string messages', () => {
      const encrypted = manager.encryptMessage(session.id, '');
      const decrypted = manager.decryptMessage(session.id, encrypted);
      expect(decrypted).toBe('');
    });

    test('should handle large payloads', () => {
      const largePayload = 'x'.repeat(10000);
      const encrypted = manager.encryptMessage(session.id, largePayload);
      const decrypted = manager.decryptMessage(session.id, encrypted);
      expect(decrypted).toBe(largePayload);
    });

    test('should handle messages with special characters', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?`~ñ中文🔐';
      const encrypted = manager.encryptMessage(session.id, specialChars);
      const decrypted = manager.decryptMessage(session.id, encrypted);
      expect(decrypted).toBe(specialChars);
    });

    test('should handle JSON payloads', () => {
      const jsonPayload = JSON.stringify({
        type: 'test',
        data: [1, 2, 3],
        nested: { key: 'value' },
      });
      const encrypted = manager.encryptMessage(session.id, jsonPayload);
      const decrypted = manager.decryptMessage(session.id, encrypted);
      expect(JSON.parse(decrypted)).toEqual(JSON.parse(jsonPayload));
    });

    test('should throw error for non-existent session', () => {
      expect(() => {
        manager.encryptMessage('non-existent', 'test');
      }).toThrow('Session not found');
    });

    test('should throw error when decrypting with wrong session', () => {
      // Create another manager with different keys
      const anotherManager = new E2EESessionManager();
      const anotherLocalKp = generateKeyPair();
      const anotherRemoteKp = generateKeyPair();
      const anotherSession = anotherManager.createSession(
        'did:key:another',
        anotherRemoteKp.publicKey,
        anotherLocalKp
      );

      const encrypted = manager.encryptMessage(session.id, 'test');
      
      // Should fail because different shared secret
      expect(() => {
        anotherManager.decryptMessage(anotherSession.id, encrypted);
      }).toThrow('Decryption failed');

      anotherManager.stop();
    });
  });

  // ============================================================================
  // Encrypted Envelope Tests
  // ============================================================================

  describe('Encrypted Envelopes', () => {
    const senderDid = 'did:key:z6Mksender';
    const recipientDid = 'did:key:z6Mkrecipient';

    test('should create encrypted envelope with E2EE payload', async () => {
      const payload = { intent: 'test', data: 'secret' };

      const envelope = await createEncryptedEnvelope(
        senderDid,
        recipientDid,
        payload,
        localKeyPair,
        remoteKeyPair.publicKey
      );

      expect(envelope).toBeDefined();
      expect(envelope.payload).toBeDefined();
      expect(envelope.sender.id).toBe(senderDid);
      expect(envelope.recipient.id).toBe(recipientDid);
    });

    test('should decrypt envelope with correct keys', async () => {
      const payload = { message: 'Hello, secure world!' };

      const envelope = await createEncryptedEnvelope(
        senderDid,
        recipientDid,
        payload,
        localKeyPair,
        remoteKeyPair.publicKey
      );

      // The recipient decrypts with their private key
      const decrypted = decryptEnvelope(envelope, remoteKeyPair);
      expect(decrypted).toEqual(payload);
    });

    test('should fail to decrypt with wrong private key', async () => {
      const payload = { message: 'secret' };
      const wrongKeyPair = generateKeyPair();

      const envelope = await createEncryptedEnvelope(
        senderDid,
        recipientDid,
        payload,
        localKeyPair,
        remoteKeyPair.publicKey
      );

      expect(() => {
        decryptEnvelope(envelope, wrongKeyPair);
      }).toThrow();
    });
  });

  // ============================================================================
  // Session Expiration Tests
  // ============================================================================

  describe('Session Expiration', () => {
    test('should expire sessions after timeout', (done) => {
      const shortLivedManager = new E2EESessionManager({
        sessionTimeoutMs: 100, // 100ms for testing
        maxSessions: 10,
        enableForwardSecrecy: false,
        keyRotationIntervalMs: 300000,
      });

      const session = shortLivedManager.createSession(
        'did:key:temp',
        remoteKeyPair.publicKey,
        localKeyPair
      );

      expect(shortLivedManager.getSession(session.id)).toBeDefined();

      // Wait for expiration
      setTimeout(() => {
        // Try to use expired session - should return null
        const expired = shortLivedManager.getSession(session.id);
        expect(expired).toBeNull();

        shortLivedManager.stop();
        done();
      }, 200);
    }, 1000);
  });

  // ============================================================================
  // Session Termination Tests
  // ============================================================================

  describe('Session Termination', () => {
    test('should terminate specific session', () => {
      const session = manager.createSession('did:key:test', remoteKeyPair.publicKey, localKeyPair);
      expect(manager.getSession(session.id)).toBeDefined();

      const terminated = manager.terminateSession(session.id);
      expect(terminated).toBe(true);
      expect(manager.getSession(session.id)).toBeNull();
    });

    test('should return false when terminating non-existent session', () => {
      const terminated = manager.terminateSession('non-existent');
      expect(terminated).toBe(false);
    });
  });

  // ============================================================================
  // Forward Secrecy Tests
  // ============================================================================

  describe('Forward Secrecy', () => {
    test('should have forward secrecy enabled by default', () => {
      const defaultManager = new E2EESessionManager();
      expect(defaultManager).toBeDefined();
      defaultManager.stop();
    });

    test('should work with forward secrecy disabled', () => {
      const noRotationManager = new E2EESessionManager({
        sessionTimeoutMs: 60000,
        maxSessions: 10,
        enableForwardSecrecy: false,
        keyRotationIntervalMs: 300000,
      });

      const session = noRotationManager.createSession(
        'did:key:test',
        remoteKeyPair.publicKey,
        localKeyPair
      );

      const encrypted = noRotationManager.encryptMessage(session.id, 'test');
      const decrypted = noRotationManager.decryptMessage(session.id, encrypted);
      expect(decrypted).toBe('test');

      noRotationManager.stop();
    });
  });

  // ============================================================================
  // Event System Tests
  // ============================================================================

  describe('Event System', () => {
    test('should emit session:created event', (done) => {
      manager.on('session:created', (event: E2EEEvent) => {
        expect(event.type).toBe('session:created');
        expect(event.sessionId).toBeDefined();
        expect(event.metadata?.remoteDid).toBe('did:key:eventtest');
        done();
      });

      manager.createSession('did:key:eventtest', remoteKeyPair.publicKey, localKeyPair);
    }, 1000);

    test('should emit message:encrypted event', (done) => {
      const session = manager.createSession('did:key:test', remoteKeyPair.publicKey, localKeyPair);
      
      manager.on('message:encrypted', (event: E2EEEvent) => {
        expect(event.type).toBe('message:encrypted');
        expect(event.sessionId).toBe(session.id);
        expect(event.metadata?.sequence).toBeDefined();
        done();
      });

      manager.encryptMessage(session.id, 'test message');
    }, 1000);

    test('should emit message:decrypted event', (done) => {
      const session = manager.createSession('did:key:test', remoteKeyPair.publicKey, localKeyPair);
      const encrypted = manager.encryptMessage(session.id, 'test');
      
      manager.on('message:decrypted', (event: E2EEEvent) => {
        expect(event.type).toBe('message:decrypted');
        expect(event.sessionId).toBe(session.id);
        done();
      });

      manager.decryptMessage(session.id, encrypted);
    }, 1000);

    test('should support wildcard event listener', () => {
      const events: string[] = [];
      
      manager.on('*', (event: E2EEEvent) => {
        events.push(event.type);
      });

      const session = manager.createSession('did:key:wildcard', remoteKeyPair.publicKey, localKeyPair);
      manager.encryptMessage(session.id, 'test');

      expect(events).toContain('session:created');
      expect(events).toContain('message:encrypted');
    });

    test('should return unsubscribe function', () => {
      const events: string[] = [];
      const handler = (event: E2EEEvent) => {
        events.push(event.type);
      };
      
      const unsubscribe = manager.on('session:created', handler);
      unsubscribe(); // Unsubscribe immediately
      
      manager.createSession('did:key:test', remoteKeyPair.publicKey, localKeyPair);
      
      expect(events).not.toContain('session:created');
    });
  });

  // ============================================================================
  // Concurrent Session Tests
  // ============================================================================

  describe('Concurrent Sessions', () => {
    test('should handle multiple simultaneous sessions', () => {
      const sessions: E2EESession[] = [];
      
      for (let i = 0; i < 5; i++) {
        const localKp = generateKeyPair();
        const remoteKp = generateKeyPair();
        const session = manager.createSession(`did:key:peer${i}`, remoteKp.publicKey, localKp);
        sessions.push(session);
      }

      expect(manager.getStats().totalSessions).toBe(5);

      // Encrypt different messages for each session
      sessions.forEach((session, i) => {
        const encrypted = manager.encryptMessage(session.id, `message ${i}`);
        const decrypted = manager.decryptMessage(session.id, encrypted);
        expect(decrypted).toBe(`message ${i}`);
      });
    });

    test('should isolate sessions from each other', () => {
      const localKp1 = generateKeyPair();
      const remoteKp1 = generateKeyPair();
      const session1 = manager.createSession('did:key:1', remoteKp1.publicKey, localKp1);

      const localKp2 = generateKeyPair();
      const remoteKp2 = generateKeyPair();
      const session2 = manager.createSession('did:key:2', remoteKp2.publicKey, localKp2);

      const encrypted1 = manager.encryptMessage(session1.id, 'session1 message');
      const encrypted2 = manager.encryptMessage(session2.id, 'session2 message');

      // Decrypt with correct sessions
      expect(manager.decryptMessage(session1.id, encrypted1)).toBe('session1 message');
      expect(manager.decryptMessage(session2.id, encrypted2)).toBe('session2 message');

      // Attempting to decrypt cross-session should fail
      expect(() => {
        manager.decryptMessage(session1.id, encrypted2);
      }).toThrow('Decryption failed');
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    test('should throw on invalid ciphertext format', () => {
      const session = manager.createSession('did:key:test', remoteKeyPair.publicKey, localKeyPair);
      
      const invalidPayload: EncryptedPayload = {
        ciphertext: '!!!invalid-base64!!!',
        nonce: Buffer.from(nacl.randomBytes(24)).toString('base64'),
        sequence: 0,
        timestamp: Date.now(),
      };

      expect(() => {
        manager.decryptMessage(session.id, invalidPayload);
      }).toThrow();
    });

    test('should throw on corrupted ciphertext', () => {
      const session = manager.createSession('did:key:test', remoteKeyPair.publicKey, localKeyPair);
      const encrypted = manager.encryptMessage(session.id, 'test');
      
      // Corrupt the ciphertext by changing some characters
      const corruptedCiphertext = encrypted.ciphertext.slice(0, -4) + 'AAAA';
      encrypted.ciphertext = corruptedCiphertext;

      expect(() => {
        manager.decryptMessage(session.id, encrypted);
      }).toThrow('Decryption failed');
    });

    test('should throw error for missing session', () => {
      expect(() => {
        manager.encryptMessage('non-existent-session', 'test');
      }).toThrow('Session not found');

      expect(() => {
        manager.decryptMessage('non-existent-session', {
          ciphertext: 'test',
          nonce: 'test',
          sequence: 0,
          timestamp: 0,
        });
      }).toThrow('Session not found');
    });
  });

  // ============================================================================
  // Manager Lifecycle Tests
  // ============================================================================

  describe('Manager Lifecycle', () => {
    test('stop should clean up maintenance intervals', () => {
      manager.createSession('did:key:1', generateKeyPair().publicKey, generateKeyPair());
      manager.createSession('did:key:2', generateKeyPair().publicKey, generateKeyPair());

      expect(manager.getStats().totalSessions).toBe(2);

      manager.stop();

      // After stop, sessions should still exist but maintenance stops
      expect(manager.getStats().totalSessions).toBe(2);
    });

    test('should handle multiple start/stop cycles', () => {
      const lifecycleManager = new E2EESessionManager();
      
      lifecycleManager.stop();
      
      // Should be able to create sessions after stop
      const session = lifecycleManager.createSession(
        'did:key:test',
        remoteKeyPair.publicKey,
        localKeyPair
      );
      
      expect(session).toBeDefined();
      lifecycleManager.stop();
    });
  });

  // ============================================================================
  // Shared Secret Consistency Tests
  // ============================================================================

  describe('Shared Secret Derivation', () => {
    test('should derive same shared secret regardless of key order', () => {
      // Create two managers representing two peers
      const aliceManager = new E2EESessionManager();
      const bobManager = new E2EESessionManager();

      const aliceKeyPair = generateKeyPair();
      const bobKeyPair = generateKeyPair();

      // Alice creates session with Bob's public key
      const aliceSession = aliceManager.createSession(
        'did:key:bob',
        bobKeyPair.publicKey,
        aliceKeyPair
      );

      // Bob creates session with Alice's public key
      const bobSession = bobManager.createSession(
        'did:key:alice',
        aliceKeyPair.publicKey,
        bobKeyPair
      );

      // Both sessions should have the same ID (derived from same keys)
      expect(aliceSession.id).toBe(bobSession.id);

      // Both should be able to encrypt/decrypt messages
      const message = 'Secret message between Alice and Bob';
      
      // Alice encrypts
      const encrypted = aliceManager.encryptMessage(aliceSession.id, message);
      
      // Bob decrypts
      const decrypted = bobManager.decryptMessage(bobSession.id, encrypted);
      expect(decrypted).toBe(message);

      aliceManager.stop();
      bobManager.stop();
    });
  });
});
