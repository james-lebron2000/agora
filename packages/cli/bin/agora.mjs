#!/usr/bin/env node
import { Command } from 'commander';
import * as ed25519 from '@noble/ed25519';
import canonicalize from 'canonicalize';
import bs58 from 'bs58';
import fs from 'node:fs';
import path from 'node:path';

const program = new Command();
const DEFAULT_RELAY = process.env.AGORA_RELAY_URL || 'http://localhost:8789';

const MULTICODEC_ED25519_PUB = new Uint8Array([0xed, 0x01]);

const base64urlEncode = (bytes) => {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

const publicKeyToDidKey = (publicKey) => {
  const buffer = new Uint8Array(2 + publicKey.length);
  buffer.set(MULTICODEC_ED25519_PUB, 0);
  buffer.set(publicKey, 2);
  const encoded = bs58.encode(buffer);
  return `did:key:z${encoded}`;
};

const parseJson = (input) => {
  if (!input) return null;
  try {
    return JSON.parse(input);
  } catch (err) {
    console.error('Invalid JSON:', err.message);
    process.exit(1);
  }
};

const readJsonFile = (filePath) => {
  const absolute = path.resolve(process.cwd(), filePath);
  return JSON.parse(fs.readFileSync(absolute, 'utf-8'));
};

const signEnvelope = async (envelope, privateKeyHex) => {
  if (!privateKeyHex) return envelope;
  const privateKey = new Uint8Array(Buffer.from(privateKeyHex, 'hex'));
  if (privateKey.length !== 32) {
    console.error('Private key must be 32 bytes (64 hex chars).');
    process.exit(1);
  }
  const { sig, ...withoutSig } = envelope;
  const canonical = canonicalize(withoutSig);
  const message = new TextEncoder().encode(canonical);
  const signature = await ed25519.sign(message, privateKey);
  return { ...envelope, sig: base64urlEncode(signature) };
};

const fetchJson = async (url, options) => {
  const res = await fetch(url, options);
  const json = await res.json();
  return { ok: res.ok, json };
};

program.name('agora').description('Agora CLI (M2)').version('0.1.0');

program
  .command('health')
  .option('--relay <url>', 'Relay URL', DEFAULT_RELAY)
  .action(async (opts) => {
    const { json } = await fetchJson(`${opts.relay.replace(/\/$/, '')}/health`);
    console.log(JSON.stringify(json, null, 2));
  });

program
  .command('keygen')
  .action(async () => {
    const privateKey = ed25519.utils.randomSecretKey();
    const publicKey = await ed25519.getPublicKeyAsync(privateKey);
    const did = publicKeyToDidKey(publicKey);
    console.log(JSON.stringify({
      did,
      publicKey: Buffer.from(publicKey).toString('hex'),
      privateKey: Buffer.from(privateKey).toString('hex'),
    }, null, 2));
  });

program
  .command('register')
  .option('--relay <url>', 'Relay URL', DEFAULT_RELAY)
  .option('--did <did>', 'Agent DID')
  .option('--name <name>', 'Agent name')
  .option('--intent <intent...>', 'Intent list (space-separated)')
  .option('--capabilities <path>', 'Capabilities JSON file')
  .action(async (opts) => {
    if (!opts.did) {
      console.error('Missing --did');
      process.exit(1);
    }
    const intents = opts.intent ? opts.intent.flatMap((v) => String(v).split(',')) : [];
    const capabilities = opts.capabilities
      ? readJsonFile(opts.capabilities)
      : intents.length
        ? [{
            id: `cap_${opts.name || 'agent'}`,
            intents: intents.map((id) => ({ id, name: id })),
            pricing: { model: 'free' },
          }]
        : [];
    const payload = {
      agent: {
        id: opts.did,
        name: opts.name,
      },
      capabilities: Array.isArray(capabilities) ? capabilities : [capabilities],
    };
    const { json } = await fetchJson(`${opts.relay.replace(/\/$/, '')}/v1/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log(JSON.stringify(json, null, 2));
  });

program
  .command('discover')
  .option('--relay <url>', 'Relay URL', DEFAULT_RELAY)
  .option('--intent <intent>', 'Intent filter')
  .option('--limit <limit>', 'Limit', '5')
  .action(async (opts) => {
    const params = new URLSearchParams();
    if (opts.intent) params.set('intent', opts.intent);
    if (opts.limit) params.set('limit', String(opts.limit));
    const { json } = await fetchJson(`${opts.relay.replace(/\/$/, '')}/v1/discover?${params}`);
    console.log(JSON.stringify(json, null, 2));
  });

program
  .command('recommend')
  .option('--relay <url>', 'Relay URL', DEFAULT_RELAY)
  .option('--requester <did>', 'Requester DID')
  .option('--intent <intent>', 'Intent filter')
  .option('--limit <limit>', 'Limit', '5')
  .action(async (opts) => {
    const params = new URLSearchParams();
    if (opts.requester) params.set('requester', opts.requester);
    if (opts.intent) params.set('intent', opts.intent);
    if (opts.limit) params.set('limit', String(opts.limit));
    const { json } = await fetchJson(`${opts.relay.replace(/\/$/, '')}/v1/recommend?${params}`);
    console.log(JSON.stringify(json, null, 2));
  });

program
  .command('request')
  .option('--relay <url>', 'Relay URL', DEFAULT_RELAY)
  .option('--did <did>', 'Sender DID')
  .option('--intent <intent>', 'Intent')
  .option('--params <json>', 'Params JSON string')
  .option('--request-id <id>', 'Request ID')
  .option('--private-key <hex>', 'Ed25519 private key hex for signing')
  .action(async (opts) => {
    if (!opts.did || !opts.intent) {
      console.error('Missing --did or --intent');
      process.exit(1);
    }
    const requestId = opts.requestId || `req_${Date.now()}`;
    const envelope = {
      version: '1.0',
      id: `msg_${Date.now()}`,
      ts: new Date().toISOString(),
      type: 'REQUEST',
      sender: { id: opts.did },
      payload: {
        request_id: requestId,
        intent: opts.intent,
        params: parseJson(opts.params) || {},
      },
    };
    const signed = await signEnvelope(envelope, opts.privateKey);
    const { json } = await fetchJson(`${opts.relay.replace(/\/$/, '')}/v1/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ envelope: signed }),
    });
    console.log(JSON.stringify(json, null, 2));
  });

program.parseAsync(process.argv);
