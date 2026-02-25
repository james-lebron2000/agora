#!/usr/bin/env node
import { Command } from 'commander';
import * as ed25519 from '@noble/ed25519';
import canonicalize from 'canonicalize';
import bs58 from 'bs58';
import fs from 'node:fs';
import path from 'node:path';
import {
  PerformanceMonitor,
  benchmark,
  generateOptimizationReport,
  trackMemory,
} from '@agora/sdk/performance';

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

program
  .command('execute')
  .option('--relay <url>', 'Relay URL', DEFAULT_RELAY)
  .option('--agent-id <did>', 'Executor agent DID')
  .option('--request-id <id>', 'Request ID')
  .option('--intent <intent>', 'Intent (optional)')
  .option('--thread-id <id>', 'Thread ID (optional)')
  .option('--code-file <path>', 'Path to source code file')
  .option('--code <source>', 'Inline source code')
  .option('--timeout-ms <ms>', 'Execution timeout in ms', '5000')
  .option('--max-memory-mb <mb>', 'Max memory in MB', '128')
  .option('--artifact <path...>', 'Artifact file paths (relative to writable dir)')
  .option('--readonly-files <path>', 'JSON file containing readonly_files array')
  .option('--allow-network', 'Allow network egress in sandbox', false)
  .option('--no-publish-result', 'Do not publish RESULT event to relay')
  .action(async (opts) => {
    if (!opts.agentId || !opts.requestId) {
      console.error('Missing --agent-id or --request-id');
      process.exit(1);
    }

    const inlineCode = typeof opts.code === 'string' ? opts.code : '';
    const fileCode = opts.codeFile ? fs.readFileSync(path.resolve(process.cwd(), opts.codeFile), 'utf-8') : '';
    const code = inlineCode || fileCode;
    if (!code) {
      console.error('Missing code: provide --code or --code-file');
      process.exit(1);
    }

    const readonlyFiles = opts.readonlyFiles
      ? (() => {
          const raw = readJsonFile(opts.readonlyFiles);
          if (!Array.isArray(raw)) {
            console.error('--readonly-files must point to a JSON array');
            process.exit(1);
          }
          return raw;
        })()
      : [];

    const payload = {
      agent_id: opts.agentId,
      request_id: opts.requestId,
      intent: opts.intent || undefined,
      thread_id: opts.threadId || undefined,
      publish_result: opts.publishResult,
      job: {
        language: 'nodejs',
        code,
        timeout_ms: Number(opts.timeoutMs),
        max_memory_mb: Number(opts.maxMemoryMb),
        network: { enabled: !!opts.allowNetwork },
        artifacts: Array.isArray(opts.artifact) ? opts.artifact : [],
        readonly_files: readonlyFiles,
      },
    };

    const { json } = await fetchJson(`${opts.relay.replace(/\/$/, '')}/v1/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log(JSON.stringify(json, null, 2));
  });

// Escrow commands
const escrowProgram = program
  .command('escrow')
  .description('Escrow operations for payments');

escrowProgram
  .command('deposit')
  .description('Deposit USDC into escrow')
  .option('--relay <url>', 'Relay URL', DEFAULT_RELAY)
  .option('--request-id <id>', 'Request ID')
  .option('--seller <address>', 'Seller address')
  .option('--amount <number>', 'Amount in USDC')
  .option('--private-key <hex>', 'Private key for signing')
  .action(async (opts) => {
    if (!opts.requestId || !opts.seller || !opts.amount) {
      console.error('Missing --request-id, --seller, or --amount');
      process.exit(1);
    }
    const payload = {
      request_id: opts.requestId,
      seller: opts.seller,
      amount: opts.amount,
      type: 'ESCROW_DEPOSIT',
    };
    const { json } = await fetchJson(`${opts.relay.replace(/\/$/, '')}/v1/escrow/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log(JSON.stringify(json, null, 2));
  });

escrowProgram
  .command('release')
  .description('Release escrow to seller')
  .option('--relay <url>', 'Relay URL', DEFAULT_RELAY)
  .option('--request-id <id>', 'Request ID')
  .option('--private-key <hex>', 'Private key for signing')
  .action(async (opts) => {
    if (!opts.requestId) {
      console.error('Missing --request-id');
      process.exit(1);
    }
    const payload = {
      request_id: opts.requestId,
      type: 'ESCROW_RELEASE',
    };
    const { json } = await fetchJson(`${opts.relay.replace(/\/$/, '')}/v1/escrow/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log(JSON.stringify(json, null, 2));
  });

escrowProgram
  .command('refund')
  .description('Refund escrow to buyer')
  .option('--relay <url>', 'Relay URL', DEFAULT_RELAY)
  .option('--request-id <id>', 'Request ID')
  .option('--private-key <hex>', 'Private key for signing')
  .action(async (opts) => {
    if (!opts.requestId) {
      console.error('Missing --request-id');
      process.exit(1);
    }
    const payload = {
      request_id: opts.requestId,
      type: 'ESCROW_REFUND',
    };
    const { json } = await fetchJson(`${opts.relay.replace(/\/$/, '')}/v1/escrow/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log(JSON.stringify(json, null, 2));
  });

escrowProgram
  .command('batch-release')
  .description('Release multiple escrows (gas efficient)')
  .option('--relay <url>', 'Relay URL', DEFAULT_RELAY)
  .option('--request-ids <ids>', 'Comma-separated request IDs')
  .option('--file <path>', 'File with request IDs (JSON array)')
  .option('--private-key <hex>', 'Private key for signing')
  .action(async (opts) => {
    let requestIds = [];
    if (opts.file) {
      requestIds = readJsonFile(opts.file);
      if (!Array.isArray(requestIds)) {
        console.error('File must contain a JSON array of request IDs');
        process.exit(1);
      }
    } else if (opts.requestIds) {
      requestIds = opts.requestIds.split(',').map(id => id.trim());
    } else {
      console.error('Missing --request-ids or --file');
      process.exit(1);
    }
    
    const payload = {
      request_ids: requestIds,
      type: 'ESCROW_BATCH_RELEASE',
    };
    const { json } = await fetchJson(`${opts.relay.replace(/\/$/, '')}/v1/escrow/batch-release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log(JSON.stringify(json, null, 2));
  });

escrowProgram
  .command('batch-refund')
  .description('Refund multiple escrows (gas efficient)')
  .option('--relay <url>', 'Relay URL', DEFAULT_RELAY)
  .option('--request-ids <ids>', 'Comma-separated request IDs')
  .option('--file <path>', 'File with request IDs (JSON array)')
  .option('--private-key <hex>', 'Private key for signing')
  .action(async (opts) => {
    let requestIds = [];
    if (opts.file) {
      requestIds = readJsonFile(opts.file);
      if (!Array.isArray(requestIds)) {
        console.error('File must contain a JSON array of request IDs');
        process.exit(1);
      }
    } else if (opts.requestIds) {
      requestIds = opts.requestIds.split(',').map(id => id.trim());
    } else {
      console.error('Missing --request-ids or --file');
      process.exit(1);
    }
    
    const payload = {
      request_ids: requestIds,
      type: 'ESCROW_BATCH_REFUND',
    };
    const { json } = await fetchJson(`${opts.relay.replace(/\/$/, '')}/v1/escrow/batch-refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log(JSON.stringify(json, null, 2));
  });

escrowProgram
  .command('status')
  .description('Check escrow status')
  .option('--relay <url>', 'Relay URL', DEFAULT_RELAY)
  .option('--request-id <id>', 'Request ID')
  .action(async (opts) => {
    if (!opts.requestId) {
      console.error('Missing --request-id');
      process.exit(1);
    }
    const { json } = await fetchJson(`${opts.relay.replace(/\/$/, '')}/v1/escrow/status?request_id=${opts.requestId}`);
    console.log(JSON.stringify(json, null, 2));
  });

// Bridge commands
const bridgeProgram = program
  .command('bridge')
  .description('Cross-chain bridge operations for USDC transfers');

bridgeProgram
  .command('quote')
  .description('Get bridge quote for cross-chain transfer')
  .argument('<amount>', 'Amount to bridge')
  .argument('<fromChain>', 'Source chain (base, optimism, arbitrum, ethereum)')
  .argument('<toChain>', 'Destination chain (base, optimism, arbitrum, ethereum)')
  .option('--token <token>', 'Token to bridge (USDC or ETH)', 'USDC')
  .option('--relay <url>', 'Relay URL', DEFAULT_RELAY)
  .action(async (amount, fromChain, toChain, opts) => {
    const validChains = ['base', 'optimism', 'arbitrum', 'ethereum'];
    
    if (!validChains.includes(fromChain)) {
      console.error(`Invalid fromChain: ${fromChain}. Must be one of: ${validChains.join(', ')}`);
      process.exit(1);
    }
    
    if (!validChains.includes(toChain)) {
      console.error(`Invalid toChain: ${toChain}. Must be one of: ${validChains.join(', ')}`);
      process.exit(1);
    }
    
    if (fromChain === toChain) {
      console.error('Source and destination chains must be different');
      process.exit(1);
    }
    
    const validTokens = ['USDC', 'ETH'];
    if (!validTokens.includes(opts.token)) {
      console.error(`Invalid token: ${opts.token}. Must be one of: ${validTokens.join(', ')}`);
      process.exit(1);
    }
    
    const payload = {
      amount,
      source_chain: fromChain,
      destination_chain: toChain,
      token: opts.token,
      type: 'BRIDGE_QUOTE'
    };
    
    try {
      const { json } = await fetchJson(`${opts.relay.replace(/\/$/, '')}/v1/bridge/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      console.log(JSON.stringify(json, null, 2));
    } catch (error) {
      // Fallback to local quote if relay endpoint doesn't exist
      console.log(JSON.stringify({
        quote: {
          sourceChain: fromChain,
          destinationChain: toChain,
          token: opts.token,
          amount,
          estimatedFee: '0.001',
          estimatedTime: fromChain === 'ethereum' || toChain === 'ethereum' ? 900 : 60,
          path: [fromChain, 'layerzero', toChain],
          note: 'This is an estimated quote. Actual fees may vary.'
        }
      }, null, 2));
    }
  });

bridgeProgram
  .command('send')
  .description('Execute cross-chain bridge transfer')
  .argument('<amount>', 'Amount to bridge')
  .argument('<fromChain>', 'Source chain (base, optimism, arbitrum)')
  .argument('<toChain>', 'Destination chain (base, optimism, arbitrum)')
  .option('--private-key <hex>', 'Private key for signing transaction')
  .option('--recipient <address>', 'Recipient address (defaults to sender)')
  .option('--relay <url>', 'Relay URL', DEFAULT_RELAY)
  .action(async (amount, fromChain, toChain, opts) => {
    const validL2Chains = ['base', 'optimism', 'arbitrum'];
    
    if (!validL2Chains.includes(fromChain)) {
      console.error(`Invalid fromChain: ${fromChain}. Must be one of: ${validL2Chains.join(', ')}`);
      process.exit(1);
    }
    
    if (!validL2Chains.includes(toChain)) {
      console.error(`Invalid toChain: ${toChain}. Must be one of: ${validL2Chains.join(', ')}`);
      process.exit(1);
    }
    
    if (fromChain === toChain) {
      console.error('Source and destination chains must be different');
      process.exit(1);
    }
    
    if (!opts.privateKey) {
      console.error('Missing --private-key for transaction signing');
      process.exit(1);
    }
    
    const payload = {
      amount,
      source_chain: fromChain,
      destination_chain: toChain,
      recipient: opts.recipient,
      private_key: opts.privateKey,
      type: 'BRIDGE_SEND'
    };
    
    try {
      const { json } = await fetchJson(`${opts.relay.replace(/\/$/, '')}/v1/bridge/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      console.log(JSON.stringify(json, null, 2));
    } catch (error) {
      console.log(JSON.stringify({
        error: 'Bridge send requires a running relay with bridge support',
        message: error.message,
        hint: 'Make sure the relay is running and supports bridge operations'
      }, null, 2));
    }
  });

bridgeProgram
  .command('history')
  .description('View bridge transaction history')
  .option('--address <address>', 'Wallet address to query')
  .option('--chain <chain>', 'Filter by chain (base, optimism, arbitrum, ethereum)')
  .option('--status <status>', 'Filter by status (pending, completed, failed)')
  .option('--limit <limit>', 'Limit results', '20')
  .option('--relay <url>', 'Relay URL', DEFAULT_RELAY)
  .action(async (opts) => {
    if (!opts.address) {
      console.error('Missing --address');
      process.exit(1);
    }
    
    const params = new URLSearchParams();
    params.set('address', opts.address);
    if (opts.chain) params.set('chain', opts.chain);
    if (opts.status) params.set('status', opts.status);
    if (opts.limit) params.set('limit', String(opts.limit));
    
    try {
      const { json } = await fetchJson(`${opts.relay.replace(/\/$/, '')}/v1/bridge/history?${params}`);
      console.log(JSON.stringify(json, null, 2));
    } catch (error) {
      // Fallback: return empty history
      console.log(JSON.stringify({
        address: opts.address,
        transactions: [],
        count: 0,
        note: 'No history found or relay does not support bridge history'
      }, null, 2));
    }
  });

bridgeProgram
  .command('status')
  .description('Check bridge transaction status')
  .argument('<txHash>', 'Transaction hash to query')
  .option('--chain <chain>', 'Chain where transaction was submitted (base, optimism, arbitrum, ethereum)')
  .option('--relay <url>', 'Relay URL', DEFAULT_RELAY)
  .action(async (txHash, opts) => {
    if (!txHash || !txHash.match(/^0x[a-fA-F0-9]{64}$/)) {
      console.error('Invalid transaction hash format');
      process.exit(1);
    }
    
    const params = new URLSearchParams();
    params.set('tx_hash', txHash);
    if (opts.chain) params.set('chain', opts.chain);
    
    try {
      const { json } = await fetchJson(`${opts.relay.replace(/\/$/, '')}/v1/bridge/status?${params}`);
      console.log(JSON.stringify(json, null, 2));
    } catch (error) {
      console.log(JSON.stringify({
        txHash,
        status: 'unknown',
        error: 'Could not query transaction status',
        message: error.message,
        hint: 'Verify the transaction hash and ensure the relay supports bridge status queries'
      }, null, 2));
    }
  });

bridgeProgram
  .command('balances')
  .description('Check USDC and native balances across all chains')
  .argument('<address>', 'Wallet address to query')
  .option('--relay <url>', 'Relay URL', DEFAULT_RELAY)
  .action(async (address, opts) => {
    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      console.error('Invalid Ethereum address format');
      process.exit(1);
    }
    
    try {
      const { json } = await fetchJson(`${opts.relay.replace(/\/$/, '')}/v1/bridge/balances?address=${address}`);
      console.log(JSON.stringify(json, null, 2));
    } catch (error) {
      // Fallback with empty balances
      console.log(JSON.stringify({
        address,
        balances: [
          { chain: 'ethereum', nativeBalance: '0', usdcBalance: '0' },
          { chain: 'base', nativeBalance: '0', usdcBalance: '0' },
          { chain: 'optimism', nativeBalance: '0', usdcBalance: '0' },
          { chain: 'arbitrum', nativeBalance: '0', usdcBalance: '0' }
        ],
        totalUsdc: '0',
        note: 'Balances unavailable - relay may not support balance queries'
      }, null, 2));
    }
  });

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

const perfProgram = program
  .command('perf')
  .description('Performance monitoring and optimization commands');

perfProgram
  .command('monitor')
  .description('Start real-time performance monitoring using PerformanceMonitor')
  .option('-d, --duration <seconds>', 'Monitoring duration in seconds', '60')
  .option('-i, --interval <ms>', 'Sampling interval in milliseconds', '5000')
  .option('-o, --output <file>', 'Save results to JSON file')
  .option('--json', 'Output results as JSON only')
  .action(async (options) => {
    const duration = parseInt(options.duration, 10) * 1000;
    const interval = parseInt(options.interval, 10);
    
    if (isNaN(duration) || duration <= 0) {
      console.error('Invalid --duration, expected positive number');
      process.exit(1);
    }
    
    if (isNaN(interval) || interval < 100) {
      console.error('Invalid --interval, expected at least 100ms');
      process.exit(1);
    }
    
    const monitor = new PerformanceMonitor({
      sampleIntervalMs: interval,
      maxSamples: 1000,
    });
    
    const startTime = Date.now();
    const metricsHistory = [];
    
    if (!options.json) {
      console.log('📊 Starting performance monitor...');
      console.log(`Duration: ${options.duration}s | Interval: ${interval}ms`);
      console.log('Press Ctrl+C to stop early\n');
      console.log('Time (s) | Memory (MB) | RPS    | Latency (p95) | Errors');
      console.log('-'.repeat(60));
    }
    
    monitor.start();
    
    const printInterval = setInterval(() => {
      const metrics = monitor.getMetrics();
      metricsHistory.push(metrics);
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const memUsed = (metrics.memory.heapUsed / 1024 / 1024).toFixed(2);
      const rps = metrics.throughput.rps.toFixed(2);
      const p95 = metrics.latency.p95.toFixed(2);
      const errors = metrics.errorCount;
      
      if (!options.json) {
        console.log(`${elapsed.padStart(8)} | ${memUsed.padStart(11)} | ${rps.padStart(6)} | ${p95.padStart(13)} | ${errors}`);
      }
    }, interval);
    
    await new Promise(resolve => setTimeout(resolve, duration));
    
    clearInterval(printInterval);
    monitor.stop();
    
    const finalMetrics = monitor.getMetrics();
    
    const result = {
      duration: options.duration + 's',
      interval: interval + 'ms',
      finalMetrics,
      history: metricsHistory,
      summary: {
        totalOperations: finalMetrics.throughput.total,
        avgRPS: finalMetrics.throughput.rps.toFixed(2),
        peakMemoryMB: (finalMetrics.memory.heapUsed / 1024 / 1024).toFixed(2),
        errorRate: (finalMetrics.errorRate * 100).toFixed(2) + '%',
      }
    };
    
    if (options.output) {
      fs.writeFileSync(options.output, JSON.stringify(result, null, 2));
      if (!options.json) {
        console.log(`\n✅ Results saved to ${options.output}`);
      }
    }
    
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('\n--- Summary ---');
      console.log(`Total Operations: ${result.summary.totalOperations}`);
      console.log(`Average RPS: ${result.summary.avgRPS}`);
      console.log(`Peak Memory: ${result.summary.peakMemoryMB} MB`);
      console.log(`Error Rate: ${result.summary.errorRate}`);
    }
  });

perfProgram
  .command('benchmark')
  .description('Run benchmark tests using benchmark() function')
  .argument('<code>', 'JavaScript code or file path to benchmark')
  .option('-n, --iterations <count>', 'Number of iterations', '1000')
  .option('--file', 'Treat code argument as file path')
  .option('-o, --output <file>', 'Save results to JSON file')
  .option('--json', 'Output results as JSON only')
  .action(async (code, options) => {
    const iterations = parseInt(options.iterations, 10);
    
    if (isNaN(iterations) || iterations <= 0) {
      console.error('Invalid --iterations, expected positive number');
      process.exit(1);
    }
    
    let fn;
    try {
      if (options.file) {
        const filePath = path.resolve(process.cwd(), code);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        fn = new Function(fileContent + '; return typeof run === "function" ? run : (typeof benchmark === "function" ? benchmark : eval);')();
      } else {
        fn = new Function(`return (${code})`)();
      }
      
      if (typeof fn !== 'function') {
        console.error('Provided code must evaluate to a function');
        process.exit(1);
      }
    } catch (err) {
      console.error('Failed to parse benchmark function:', err.message);
      process.exit(1);
    }
    
    if (!options.json) {
      console.log(`🏃 Running benchmark (${iterations} iterations)...`);
    }
    
    try {
      const result = await benchmark('cli-benchmark', fn, iterations);
      
      const output = {
        name: result.name,
        iterations: result.iterations,
        totalTime: result.totalTime.toFixed(2) + 'ms',
        avgTime: result.avgTime.toFixed(4) + 'ms',
        minTime: result.minTime.toFixed(4) + 'ms',
        maxTime: result.maxTime.toFixed(4) + 'ms',
        stdDev: result.stdDev.toFixed(4),
        opsPerSecond: Math.floor(result.opsPerSecond),
      };
      
      if (options.output) {
        fs.writeFileSync(options.output, JSON.stringify({ ...output, raw: result }, null, 2));
      }
      
      if (options.json) {
        console.log(JSON.stringify(output, null, 2));
      } else {
        console.log('\n╔════════════════════════════════════════╗');
        console.log('║         🏃 Benchmark Results           ║');
        console.log('╠════════════════════════════════════════╣');
        console.log(`║ Iterations: ${String(output.iterations).padEnd(27)} ║`);
        console.log(`║ Total Time: ${output.totalTime.padEnd(27)} ║`);
        console.log(`║ Avg Time:   ${output.avgTime.padEnd(27)} ║`);
        console.log(`║ Min Time:   ${output.minTime.padEnd(27)} ║`);
        console.log(`║ Max Time:   ${output.maxTime.padEnd(27)} ║`);
        console.log(`║ Std Dev:    ${output.stdDev.padEnd(27)} ║`);
        console.log(`║ Ops/Sec:    ${String(output.opsPerSecond.toLocaleString()).padEnd(27)} ║`);
        console.log('╚════════════════════════════════════════╝');
        
        if (options.output) {
          console.log(`\n✅ Full results saved to ${options.output}`);
        }
      }
    } catch (err) {
      console.error('Benchmark failed:', err.message);
      process.exit(1);
    }
  });

perfProgram
  .command('report')
  .description('Generate optimization report using generateOptimizationReport()')
  .option('-d, --duration <seconds>', 'Monitoring duration for metrics collection', '30')
  .option('-o, --output <file>', 'Save report to JSON file')
  .option('--json', 'Output report as JSON only')
  .action(async (options) => {
    const duration = parseInt(options.duration, 10) * 1000;
    
    if (isNaN(duration) || duration <= 0) {
      console.error('Invalid --duration, expected positive number');
      process.exit(1);
    }
    
    if (!options.json) {
      console.log('📋 Collecting performance metrics...');
    }
    
    const monitor = new PerformanceMonitor();
    const metricsHistory = [];
    
    monitor.start();
    
    // Collect metrics for the specified duration
    const collectionInterval = setInterval(() => {
      metricsHistory.push(monitor.getMetrics());
    }, 5000);
    
    await new Promise(resolve => setTimeout(resolve, duration));
    
    clearInterval(collectionInterval);
    monitor.stop();
    
    // Generate optimization report
    const report = generateOptimizationReport(monitor, metricsHistory);
    
    if (options.output) {
      fs.writeFileSync(options.output, JSON.stringify(report, null, 2));
    }
    
    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log('\n╔════════════════════════════════════════╗');
      console.log('║    📋 Performance Optimization Report  ║');
      console.log('╠════════════════════════════════════════╣');
      console.log(`║ Health Score: ${String(report.summary.healthScore + '/100').padEnd(25)} ║`);
      console.log(`║ Recommendations: ${String(report.summary.totalRecommendations).padEnd(22)} ║`);
      console.log(`║   Critical: ${String(report.summary.criticalCount).padEnd(27)} ║`);
      console.log(`║   Warnings: ${String(report.summary.warningCount).padEnd(27)} ║`);
      console.log(`║   Info: ${String(report.summary.infoCount).padEnd(31)} ║`);
      console.log('╠════════════════════════════════════════╣');
      console.log('║ Trends:                                ║');
      console.log(`║   Latency:  ${report.trends.latency.padEnd(27)} ║`);
      console.log(`║   Throughput: ${report.trends.throughput.padEnd(25)} ║`);
      console.log(`║   Memory: ${report.trends.memory.padEnd(29)} ║`);
      console.log('╠════════════════════════════════════════╣');
      console.log('║ Current Metrics:                       ║');
      console.log(`║   Memory: ${String((report.metrics.memory.usagePercent * 100).toFixed(1) + '%').padEnd(29)} ║`);
      console.log(`║   Error Rate: ${String((report.metrics.errorRate * 100).toFixed(2) + '%').padEnd(25)} ║`);
      console.log(`║   Throughput: ${String(report.metrics.throughput.rps.toFixed(2) + ' RPS').padEnd(25)} ║`);
      console.log(`║   P95 Latency: ${String(report.metrics.latency.p95.toFixed(2) + 'ms').padEnd(24)} ║`);
      console.log('╚════════════════════════════════════════╝');
      
      if (report.recommendations.length > 0) {
        console.log('\n--- Recommendations ---');
        report.recommendations.forEach((rec, i) => {
          const icon = rec.severity === 'critical' ? '🔴' : rec.severity === 'warning' ? '🟡' : 'ℹ️';
          console.log(`\n${icon} [${rec.severity.toUpperCase()}] ${rec.title}`);
          console.log(`   Category: ${rec.category} | Impact: ${rec.impact} | Effort: ${rec.effort}`);
          console.log(`   ${rec.description}`);
          console.log(`   Action: ${rec.action}`);
        });
      }
      
      if (options.output) {
        console.log(`\n✅ Full report saved to ${options.output}`);
      }
    }
  });

perfProgram
  .command('memory')
  .description('Capture memory snapshots and detect leaks using trackMemory()')
  .option('-d, --duration <seconds>', 'Monitoring duration in seconds', '60')
  .option('-i, --interval <ms>', 'Snapshot interval in milliseconds', '5000')
  .option('-o, --output <file>', 'Save snapshots to JSON file')
  .option('--json', 'Output results as JSON only')
  .action(async (options) => {
    const duration = parseInt(options.duration, 10) * 1000;
    const interval = parseInt(options.interval, 10);
    
    if (isNaN(duration) || duration <= 0) {
      console.error('Invalid --duration, expected positive number');
      process.exit(1);
    }
    
    if (isNaN(interval) || interval < 1000) {
      console.error('Invalid --interval, expected at least 1000ms');
      process.exit(1);
    }
    
    const monitor = new PerformanceMonitor({
      enableLeakDetection: true,
      leakDetectionIntervalMs: interval,
    });
    
    const snapshots = [];
    
    if (!options.json) {
      console.log('🧠 Starting memory profiler...');
      console.log(`Duration: ${options.duration}s | Interval: ${interval}ms`);
      console.log('Press Ctrl+C to stop early\n');
      console.log('Time (s) | Heap Used (MB) | Heap Total (MB) | Usage %');
      console.log('-'.repeat(60));
    }
    
    const startTime = Date.now();
    
    const snapshotInterval = setInterval(() => {
      const snapshot = monitor.recordMemory();
      snapshots.push(snapshot);
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const heapUsed = (snapshot.heapUsed / 1024 / 1024).toFixed(2);
      const heapTotal = (snapshot.heapTotal / 1024 / 1024).toFixed(2);
      const usage = (snapshot.usagePercent * 100).toFixed(1);
      
      if (!options.json) {
        console.log(`${elapsed.padStart(8)} | ${heapUsed.padStart(14)} | ${heapTotal.padStart(15)} | ${usage.padStart(6)}`);
      }
    }, interval);
    
    await new Promise(resolve => setTimeout(resolve, duration));
    
    clearInterval(snapshotInterval);
    
    // Run leak detection on collected snapshots
    const leakResult = monitor.detectMemoryLeak();
    
    const result = {
      duration: options.duration + 's',
      interval: interval + 'ms',
      snapshots: snapshots.length,
      leakDetection: leakResult,
      finalSnapshot: snapshots[snapshots.length - 1],
      memoryGrowth: snapshots.length >= 2 ? {
        startMB: snapshots[0].heapUsed / 1024 / 1024,
        endMB: snapshots[snapshots.length - 1].heapUsed / 1024 / 1024,
        diffMB: (snapshots[snapshots.length - 1].heapUsed - snapshots[0].heapUsed) / 1024 / 1024,
      } : null,
    };
    
    if (options.output) {
      fs.writeFileSync(options.output, JSON.stringify(result, null, 2));
      if (!options.json) {
        console.log(`\n✅ Results saved to ${options.output}`);
      }
    }
    
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('\n╔════════════════════════════════════════╗');
      console.log('║         🧠 Memory Analysis             ║');
      console.log('╠════════════════════════════════════════╣');
      
      if (result.memoryGrowth) {
        console.log(`║ Start Memory: ${String(result.memoryGrowth.startMB.toFixed(2) + ' MB').padEnd(23)} ║`);
        console.log(`║ End Memory: ${String(result.memoryGrowth.endMB.toFixed(2) + ' MB').padEnd(25)} ║`);
        console.log(`║ Growth: ${String(result.memoryGrowth.diffMB.toFixed(2) + ' MB').padEnd(29)} ║`);
      }
      
      console.log('╠════════════════════════════════════════╣');
      console.log('║ Leak Detection:                        ║');
      console.log(`║   Potential Leak: ${String(leakResult.hasLeak ? 'YES ⚠️' : 'No ✅').padEnd(21)} ║`);
      console.log(`║   Confidence: ${String(leakResult.confidence.toFixed(1) + '%').padEnd(25)} ║`);
      console.log('╚════════════════════════════════════════╝');
      
      if (leakResult.hasLeak) {
        console.log(`\n⚠️  Potential memory leak detected!`);
        console.log(`Growth Rate: ${(leakResult.growthRate / 1024 / 1024).toFixed(2)} MB/min`);
        console.log('\nSuspected Sources:');
        leakResult.suspectedSources.forEach(source => {
          console.log(`  - ${source}`);
        });
        console.log(`\n💡 Recommendation: ${leakResult.recommendation}`);
      } else {
        console.log('\n✅ No significant memory leak patterns detected.');
      }
    }
  });

program.parseAsync(process.argv);
