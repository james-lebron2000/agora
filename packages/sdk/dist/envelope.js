import * as canonicalizeModule from 'canonicalize';
const canonicalize = canonicalizeModule.default || canonicalizeModule;
import * as ed25519 from '@noble/ed25519';
import { didKeyToPublicKey } from './did.js';
export class EnvelopeBuilder {
    envelope = {
        version: '1.0',
        ts: new Date().toISOString(),
    };
    id(id) {
        this.envelope.id = id;
        return this;
    }
    type(type) {
        this.envelope.type = type;
        return this;
    }
    sender(sender) {
        this.envelope.sender = sender;
        return this;
    }
    recipient(recipient) {
        this.envelope.recipient = recipient;
        return this;
    }
    payload(payload) {
        this.envelope.payload = payload;
        return this;
    }
    thread(thread) {
        this.envelope.thread = thread;
        return this;
    }
    meta(meta) {
        this.envelope.meta = meta;
        return this;
    }
    build() {
        if (!this.envelope.id || !this.envelope.type || !this.envelope.sender) {
            throw new Error('Envelope missing required fields: id, type, sender');
        }
        return this.envelope;
    }
}
export class EnvelopeSigner {
    privateKey;
    constructor(privateKey) {
        this.privateKey = privateKey;
        if (privateKey.length !== 32) {
            throw new Error('Ed25519 private key must be 32 bytes');
        }
    }
    async sign(envelope, encryptedPayload) {
        // Create canonical JSON without signature
        const { sig: _, ...envelopeWithoutSig } = envelope;
        // If encrypted payload is provided, use it instead of the plaintext payload
        // This ensures we sign the encrypted content, not the plaintext
        const envelopeToSign = encryptedPayload
            ? { ...envelopeWithoutSig, payload: { encrypted: encryptedPayload } }
            : envelopeWithoutSig;
        const canonical = canonicalize(envelopeToSign);
        if (!canonical) {
            throw new Error('Failed to canonicalize envelope');
        }
        // Sign with Ed25519
        const message = new TextEncoder().encode(canonical);
        const signature = await ed25519.signAsync(message, this.privateKey);
        return {
            ...envelope,
            sig: base64urlEncode(signature),
        };
    }
    /**
     * Sign an envelope with an encrypted payload
     * This is a convenience method for signing encrypted envelopes
     */
    async signEncrypted(envelope, encryptedPayload) {
        return this.sign({
            ...envelope,
            encrypted: true,
        }, encryptedPayload);
    }
}
export class EnvelopeVerifier {
    async verify(envelope) {
        if (!envelope.sig) {
            return false;
        }
        // Get sender's public key
        const publicKey = await this.resolvePublicKey(envelope.sender.id);
        if (!publicKey) {
            return false;
        }
        // Remove signature and canonicalize
        const { sig, ...envelopeWithoutSig } = envelope;
        // For encrypted envelopes with wrapped payload, verify the encrypted content
        let envelopeToVerify = envelopeWithoutSig;
        if (envelope.encrypted && envelope.payload?.encrypted) {
            // Keep the payload as-is (containing encrypted data) for verification
            envelopeToVerify = envelopeWithoutSig;
        }
        const canonical = canonicalize(envelopeToVerify);
        if (!canonical) {
            return false;
        }
        // Verify signature
        const message = new TextEncoder().encode(canonical);
        const signature = base64urlDecode(sig);
        try {
            return await ed25519.verifyAsync(signature, message, publicKey);
        }
        catch {
            return false;
        }
    }
    async resolvePublicKey(senderId) {
        // Support did:key format
        if (senderId.startsWith('did:key:')) {
            try {
                return didKeyToPublicKey(senderId);
            }
            catch {
                return null;
            }
        }
        // For non-did keys, return null (would need external resolution)
        return null;
    }
}
function base64urlEncode(bytes) {
    const base64 = Buffer.from(bytes).toString('base64');
    return base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}
function base64urlDecode(str) {
    const base64 = str
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    return new Uint8Array(Buffer.from(padded, 'base64'));
}
// Generate new Ed25519 keypair
export async function generateKeypair() {
    const privateKey = ed25519.utils.randomSecretKey();
    const publicKey = await ed25519.getPublicKeyAsync(privateKey);
    return { publicKey, privateKey };
}
//# sourceMappingURL=envelope.js.map