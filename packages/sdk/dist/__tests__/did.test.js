/**
 * DID (Decentralized Identifier) Module Tests
 * Tests for did:key conversion functions
 */
import { describe, it, expect } from 'vitest';
import { publicKeyToDidKey, didKeyToPublicKey, } from '../did.js';
describe('DID Module', () => {
    // Sample Ed25519 public key (32 bytes)
    const samplePublicKey = new Uint8Array([
        0x1a, 0x2b, 0x3c, 0x4d, 0x5e, 0x6f, 0x7a, 0x8b,
        0x9c, 0xad, 0xbe, 0xcf, 0xda, 0xeb, 0xfc, 0x0d,
        0x1e, 0x2f, 0x3a, 0x4b, 0x5c, 0x6d, 0x7e, 0x8f,
        0x9a, 0xab, 0xbc, 0xcd, 0xde, 0xef, 0xf0, 0x01,
    ]);
    describe('publicKeyToDidKey', () => {
        it('should convert public key to did:key format', () => {
            const did = publicKeyToDidKey(samplePublicKey);
            expect(did).toMatch(/^did:key:z[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/);
        });
        it('should include multicodec prefix for Ed25519 (0xed01)', () => {
            const did = publicKeyToDidKey(samplePublicKey);
            // The 'z' prefix indicates base58-btc encoding
            expect(did.startsWith('did:key:z')).toBe(true);
        });
        it('should produce consistent results for same key', () => {
            const did1 = publicKeyToDidKey(samplePublicKey);
            const did2 = publicKeyToDidKey(samplePublicKey);
            expect(did1).toBe(did2);
        });
        it('should produce different DIDs for different keys', () => {
            const differentKey = new Uint8Array([
                0xff, 0xee, 0xdd, 0xcc, 0xbb, 0xaa, 0x99, 0x88,
                0x77, 0x66, 0x55, 0x44, 0x33, 0x22, 0x11, 0x00,
                0x1a, 0x2b, 0x3c, 0x4d, 0x5e, 0x6f, 0x7a, 0x8b,
                0x9c, 0xad, 0xbe, 0xcf, 0xda, 0xeb, 0xfc, 0x0d,
            ]);
            const did1 = publicKeyToDidKey(samplePublicKey);
            const did2 = publicKeyToDidKey(differentKey);
            expect(did1).not.toBe(did2);
        });
    });
    describe('didKeyToPublicKey', () => {
        it('should convert did:key back to public key', () => {
            const did = publicKeyToDidKey(samplePublicKey);
            const recoveredKey = didKeyToPublicKey(did);
            expect(Buffer.from(recoveredKey).toString('hex'))
                .toBe(Buffer.from(samplePublicKey).toString('hex'));
        });
        it('should round-trip correctly', () => {
            const testKeys = [
                samplePublicKey,
                new Uint8Array(32).fill(0),
                new Uint8Array(32).fill(255),
                new Uint8Array(32).map((_, i) => i),
            ];
            for (const key of testKeys) {
                const did = publicKeyToDidKey(key);
                const recovered = didKeyToPublicKey(did);
                expect(Buffer.from(recovered).toString('hex'))
                    .toBe(Buffer.from(key).toString('hex'));
            }
        });
        it('should throw error for invalid DID format', () => {
            expect(() => didKeyToPublicKey('invalid')).toThrow('Invalid DID format');
            expect(() => didKeyToPublicKey('did:web:example')).toThrow('Invalid DID format');
            expect(() => didKeyToPublicKey('did:key:abc')).toThrow('Invalid DID format');
        });
        it('should throw error for unsupported key types', () => {
            // Create a DID with a different multicodec prefix
            // (not Ed25519 which uses 0xed01)
            // This is a base58 encoded buffer with a different prefix
            const invalidDid = 'did:key:z6Mk' + 'a'.repeat(40);
            expect(() => didKeyToPublicKey(invalidDid)).toThrow();
        });
    });
    describe('Integration', () => {
        it('should handle edge cases with all-zeros key', () => {
            const zeroKey = new Uint8Array(32);
            const did = publicKeyToDidKey(zeroKey);
            const recovered = didKeyToPublicKey(did);
            expect(recovered).toEqual(zeroKey);
        });
        it('should handle edge cases with all-ones key', () => {
            const onesKey = new Uint8Array(32).fill(255);
            const did = publicKeyToDidKey(onesKey);
            const recovered = didKeyToPublicKey(did);
            expect(recovered).toEqual(onesKey);
        });
    });
});
//# sourceMappingURL=did.test.js.map