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

const writeFileIfMissing = (filePath, content, options = {}) => {
  const { force = false } = options;
  const absolute = path.resolve(process.cwd(), filePath);
  if (!force && fs.existsSync(absolute)) return false;
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content);
  return true;
};

const appendGitignoreEntries = (entries) => {
  const absolute = path.resolve(process.cwd(), '.gitignore');
  const existing = fs.existsSync(absolute)
    ? fs.readFileSync(absolute, 'utf-8').split('\n').map((line) => line.trim())
    : [];
  const next = [...existing];
  for (const entry of entries) {
    if (!next.includes(entry)) next.push(entry);
  }
  fs.writeFileSync(absolute, `${next.filter(Boolean).join('\n')}\n`);
};

const resolveCapabilitySchemaRefs = (capabilities, baseDir) => {
  if (!Array.isArray(capabilities)) return [];
  return capabilities.map((capability) => {
    if (!capability || typeof capability !== 'object') return capability;
    const inputPath = capability.input_schema_file || capability.inputSchemaFile;
    const outputPath = capability.output_schema_file || capability.outputSchemaFile;
    const next = { ...capability };
    if (typeof inputPath === 'string') {
      const absolute = path.resolve(baseDir, inputPath);
      next.input_schema = JSON.parse(fs.readFileSync(absolute, 'utf-8'));
    }
    if (typeof outputPath === 'string') {
      const absolute = path.resolve(baseDir, outputPath);
      next.output_schema = JSON.parse(fs.readFileSync(absolute, 'utf-8'));
    }
    delete next.input_schema_file;
    delete next.inputSchemaFile;
    delete next.output_schema_file;
    delete next.outputSchemaFile;
    return next;
  });
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

const agentProgram = program
  .command('agent')
  .description('Agent lifecycle commands');

agentProgram
  .command('init')
  .description('Initialize an Agora agent workspace in the current directory')
  .option('--name <name>', 'Agent display name', 'MyAgoraAgent')
  .option('--intent <intent...>', 'Intent list (space-separated or comma-separated)', ['general.assistant'])
  .option('--relay <url>', 'Default relay URL', DEFAULT_RELAY)
  .option('--rate <number>', 'Default metered rate (USDC per turn)', '0.005')
  .option('--force', 'Overwrite generated files if they already exist', false)
  .action(async (opts) => {
    const intents = (opts.intent || [])
      .flatMap((value) => String(value).split(','))
      .map((value) => value.trim())
      .filter(Boolean);
    const intentList = intents.length ? intents : ['general.assistant'];
    const rate = Number(opts.rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      console.error('Invalid --rate, expected positive number.');
      process.exit(1);
    }

    const privateKey = ed25519.utils.randomSecretKey();
    const publicKey = await ed25519.getPublicKeyAsync(privateKey);
    const did = publicKeyToDidKey(publicKey);
    const nameSlug = String(opts.name || 'agent').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const capabilityId = `cap_${nameSlug || 'agent'}_v1`;

    const requestSchema = {
      type: 'object',
      additionalProperties: false,
      required: ['task'],
      properties: {
        task: { type: 'string' },
        context: { type: 'object', additionalProperties: true },
        priority: { enum: ['low', 'normal', 'high'] },
      },
    };
    const resultSchema = {
      type: 'object',
      additionalProperties: false,
      required: ['status', 'summary'],
      properties: {
        status: { enum: ['success', 'partial', 'failed'] },
        summary: { type: 'string' },
        artifacts: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['type', 'url'],
            properties: {
              type: { type: 'string' },
              url: { type: 'string' },
              name: { type: 'string' },
            },
          },
        },
      },
    };

    const capabilities = intentList.map((intent, index) => ({
      id: `${capabilityId}_${index + 1}`,
      name: `${opts.name} - ${intent}`,
      intents: [{ id: intent, name: intent }],
      pricing: {
        model: 'metered',
        currency: 'USDC',
        metered_unit: 'turn',
        metered_rate: rate,
      },
      input_schema_file: './schemas/request.schema.json',
      output_schema_file: './schemas/result.schema.json',
    }));

    const agentConfig = {
      name: opts.name,
      did,
      relay: opts.relay,
      intents: intentList,
      capabilitiesFile: './capabilities.json',
      identityFile: './.agora/identity.json',
    };

    const identity = {
      did,
      publicKey: Buffer.from(publicKey).toString('hex'),
      privateKey: Buffer.from(privateKey).toString('hex'),
      createdAt: new Date().toISOString(),
    };

    const envExample = [
      `AGORA_RELAY_URL=${opts.relay}`,
      `AGORA_AGENT_DID=${did}`,
      'AGORA_AGENT_IDENTITY_FILE=.agora/identity.json',
      'AGORA_AGENT_NAME=' + opts.name,
      '',
    ].join('\n');

    const runnerTemplate = `import fs from 'node:fs';\nimport { AgoraAgent } from '@agora/sdk';\n\nconst relayUrl = process.env.AGORA_RELAY_URL || '${opts.relay}';\nconst identityPath = process.env.AGORA_AGENT_IDENTITY_FILE || '.agora/identity.json';\nconst identity = JSON.parse(fs.readFileSync(identityPath, 'utf-8'));\n\nconst agent = new AgoraAgent({\n  did: identity.did,\n  privateKey: new Uint8Array(Buffer.from(identity.privateKey, 'hex')),\n  relayUrl,\n  name: process.env.AGORA_AGENT_NAME || '${opts.name}',\n});\n\nconst caps = JSON.parse(fs.readFileSync('capabilities.json', 'utf-8'));\nconst register = await agent.register({ capabilities: caps, status: 'online' });\nif (!register.ok) {\n  console.error('register failed:', register.error || register);\n  process.exit(1);\n}\nconsole.log('registered:', identity.did);\n\nawait agent.onRequest(async (envelope) => {\n  const requestId = String(envelope.payload?.request_id || envelope.payload?.requestId || '');\n  if (!requestId) return;\n\n  await agent.sendOffer(requestId, {\n    plan: 'Auto-handled by generated starter agent',\n    price: { amount: ${rate}, currency: 'USDC' },\n    eta_seconds: 30,\n  });\n});\n`;

    const force = Boolean(opts.force);
    const created = [];
    const skipped = [];

    const files = [
      ['agent.config.json', JSON.stringify(agentConfig, null, 2) + '\n'],
      ['capabilities.json', JSON.stringify(capabilities, null, 2) + '\n'],
      ['schemas/request.schema.json', JSON.stringify(requestSchema, null, 2) + '\n'],
      ['schemas/result.schema.json', JSON.stringify(resultSchema, null, 2) + '\n'],
      ['.agora/identity.json', JSON.stringify(identity, null, 2) + '\n'],
      ['.env.example', envExample],
      ['agent.runner.mjs', runnerTemplate],
    ];

    for (const [file, content] of files) {
      const wasCreated = writeFileIfMissing(file, content, { force });
      if (wasCreated) created.push(file);
      else skipped.push(file);
    }

    appendGitignoreEntries(['.env', '.agora/']);

    console.log(JSON.stringify({
      ok: true,
      did,
      created,
      skipped,
      next: [
        'cp .env.example .env',
        'npm install @agora/sdk',
        'node agent.runner.mjs',
      ],
    }, null, 2));
  });

program
  .command('register')
  .option('--relay <url>', 'Relay URL', DEFAULT_RELAY)
  .option('--did <did>', 'Agent DID')
  .option('--name <name>', 'Agent name')
  .option('--description <text>', 'Agent description')
  .option('--portfolio-url <url>', 'Agent portfolio URL')
  .option('--intent <intent...>', 'Intent list (space-separated)')
  .option('--capabilities <path>', 'Capabilities JSON file')
  .action(async (opts) => {
    if (!opts.did) {
      console.error('Missing --did');
      process.exit(1);
    }
    const intents = opts.intent ? opts.intent.flatMap((v) => String(v).split(',')) : [];
    const capabilities = opts.capabilities
      ? (() => {
          const raw = readJsonFile(opts.capabilities);
          const normalized = Array.isArray(raw) ? raw : [raw];
          return resolveCapabilitySchemaRefs(
            normalized,
            path.dirname(path.resolve(process.cwd(), opts.capabilities)),
          );
        })()
      : intents.length
        ? [{
            id: `cap_${opts.name || 'agent'}`,
            intents: intents.map((id) => ({ id, name: id })),
            pricing: { model: 'free' },
            input_schema: {
              type: 'object',
              additionalProperties: true,
            },
            output_schema: {
              type: 'object',
              additionalProperties: true,
            },
          }]
        : [];
    const payload = {
      agent: {
        id: opts.did,
        name: opts.name,
        description: opts.description,
        portfolio_url: opts.portfolioUrl,
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
  .option('--q <query>', 'Keyword search')
  .option('--status <status>', 'Status filter: online/offline')
  .option('--limit <limit>', 'Limit', '5')
  .action(async (opts) => {
    const params = new URLSearchParams();
    if (opts.intent) params.set('intent', opts.intent);
    if (opts.q) params.set('q', opts.q);
    if (opts.status) params.set('status', opts.status);
    if (opts.limit) params.set('limit', String(opts.limit));
    const { json } = await fetchJson(`${opts.relay.replace(/\/$/, '')}/v1/discover?${params}`);
    console.log(JSON.stringify(json, null, 2));
  });

program
  .command('directory')
  .option('--relay <url>', 'Relay URL', DEFAULT_RELAY)
  .option('--intent <intent>', 'Intent filter')
  .option('--q <query>', 'Keyword search')
  .option('--status <status>', 'Status filter: online/offline')
  .option('--limit <limit>', 'Limit', '20')
  .action(async (opts) => {
    const params = new URLSearchParams();
    if (opts.intent) params.set('intent', opts.intent);
    if (opts.q) params.set('q', opts.q);
    if (opts.status) params.set('status', opts.status);
    if (opts.limit) params.set('limit', String(opts.limit));
    const { json } = await fetchJson(`${opts.relay.replace(/\/$/, '')}/v1/directory?${params}`);
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
