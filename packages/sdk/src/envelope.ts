import canonicalize from 'canonicalize';
import * as ed25519 from '@noble/ed25519';

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
}

export type MessageType = 
  | 'HELLO' | 'WELCOME' | 'STATUS' 
  | 'REQUEST' | 'OFFER' | 'ACCEPT' | 'RESULT' 
  | 'DEBATE' | 'ERROR' | 'REVOKE';

export interface Sender {
  id: string;
  name?: string;
  url?: string;
}

export interface Recipient {
  id: string;
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
}

export class EnvelopeBuilder {
  private envelope: Partial<Envelope> = {
    version: '1.0',
    ts: new Date().toISOString(),
  };

  id(id: string): this {
    this.envelope.id = id;
    return this;
  }

  type(type: MessageType): this {
    this.envelope.type = type;
    return this;
  }

  sender(sender: Sender): this {
    this.envelope.sender = sender;
    return this;
  }

  recipient(recipient: Recipient): this {
    this.envelope.recipient = recipient;
    return this;
  }

  payload(payload: Record<string, unknown>): this {
    this.envelope.payload = payload;
    return this;
  }

  thread(thread: Thread): this {
    this.envelope.thread = thread;
    return this;
  }

  meta(meta: Meta): this {
    this.envelope.meta = meta;
    return this;
  }

  build(): Envelope {
    if (!this.envelope.id || !this.envelope.type || !this.envelope.sender) {
      throw new Error('Envelope missing required fields: id, type, sender');
    }
    return this.envelope as Envelope;
  }
}

export class EnvelopeSigner {
  constructor(private privateKey: Uint8Array) {
    if (privateKey.length !== 32) {
      throw new Error('Ed25519 private key must be 32 bytes');
    }
  }

  async sign(envelope: Envelope): Promise<SignedEnvelope> {
    // Create canonical JSON without signature
    const { sig: _, ...envelopeWithoutSig } = envelope;
    const canonical = canonicalize(envelopeWithoutSig);
    
    if (!canonical) {
      throw new Error('Failed to canonicalize envelope');
    }

    // Sign with Ed25519
    const message = new TextEncoder().encode(canonical);
    const signature = await ed25519.sign(message, this.privateKey);
    
    return {
      ...envelope,
      sig: base64urlEncode(signature),
    };
  }
}

export class EnvelopeVerifier {
  async verify(envelope: SignedEnvelope): Promise<boolean> {
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
    const canonical = canonicalize(envelopeWithoutSig);
    
    if (!canonical) {
      return false;
    }

    // Verify signature
    const message = new TextEncoder().encode(canonical);
    const signature = base64urlDecode(sig);
    
    try {
      return await ed25519.verify(signature, message, publicKey);
    } catch {
      return false;
    }
  }

  private async resolvePublicKey(senderId: string): Promise<Uint8Array | null> {
    // TODO: Implement did:key resolution
    // For now, this is a placeholder
    return null;
  }
}

function base64urlEncode(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64urlDecode(str: string): Uint8Array {
  const base64 = str
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  const binary = atob(padded);
  return new Uint8Array(binary.split('').map(c => c.charCodeAt(0)));
}

// Generate new Ed25519 keypair
export async function generateKeypair(): Promise<{ publicKey: Uint8Array; privateKey: Uint8Array }> {
  const privateKey = ed25519.utils.randomPrivateKey();
  const publicKey = await ed25519.getPublicKey(privateKey);
  return { publicKey, privateKey };
}
