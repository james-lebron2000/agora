import { AgoraAgent, generateKeypair, publicKeyToDidKey } from '../packages/sdk/src/index.ts';
import { setTimeout as sleep } from 'node:timers/promises';
import { randomUUID } from 'node:crypto';

// Configuration
const RELAY_URL = 'http://45.32.219.241:8789';
const TEST_AGENTS = [
  {
    name: 'Crypto Hunter',
    intent: 'crypto.token.check',
    params: {
      symbol: 'TEST',
      chain: 'ethereum',
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
      text: 'Analyze USDT contract for risks. Is it safe to hold? Check for blacklist function.',
      depth: 2,
    }
  },
  {
    name: 'Clinical Trial',
    intent: 'health.trial.match',
    params: {
      profile: 'Male, 55, NSCLC Stage III',
      text: 'Looking for immunotherapy trials in Shanghai for non-small cell lung cancer. Previous treatment with cisplatin.',
      depth: 'standard'
    }
  }
];

async function main() {
  console.log('🚀 Starting End-to-End Test for Real Agents...');
  
  // 1. Setup Buyer Identity
  const buyerKeys = await generateKeypair();
  const buyerDid = publicKeyToDidKey(buyerKeys.publicKey);
  const buyer = new AgoraAgent({
    did: buyerDid,
    privateKey: buyerKeys.privateKey,
    relayUrl: RELAY_URL,
    name: 'TestBuyer',
  });
  
  const reg = await buyer.register();
  if (!reg.ok) throw new Error(`Buyer registration failed: ${reg.error}`);
  console.log(`👤 Buyer registered: ${buyerDid.slice(0, 16)}...`);

  // 2. Listen for offers/results
  const offers = new Map();
  const results = new Map();

  void buyer.onOffer(async (offer) => {
    const requestId = offer.payload.request_id;
    console.log(`\n💰 Received OFFER for ${requestId.slice(0, 8)}...`);
    console.log(`   Price: $${offer.payload.price_usd} (ETA: ${offer.payload.eta_seconds}s)`);
    console.log(`   Plan: ${offer.payload.plan}`);
    offers.set(requestId, offer);
  });

  void buyer.onResult(async (result) => {
    const requestId = result.payload.request_id;
    console.log(`\n✅ Received RESULT for ${requestId.slice(0, 8)}...`);
    console.log(`   Status: ${result.payload.status}`);
    if (result.payload.status === 'success') {
      console.log('   Output Summary:', JSON.stringify(result.payload.output).slice(0, 150) + '...');
      console.log('   Metrics:', result.payload.metrics);
    } else {
      console.error('   Error:', result.payload.output);
    }
    results.set(requestId, result);
  });

  console.log('👂 Listening for responses...');

  // 3. Send Requests
  for (const test of TEST_AGENTS) {
    console.log(`\n📤 Sending REQUEST to [${test.name}]...`);
    const requestId = randomUUID();
    const req = await buyer.sendRequest({
      request_id: requestId,
      intent: test.intent,
      params: test.params,
      constraints: { max_cost_usd: 5.0 },
    });
    
    if (!req.ok) {
      console.error(`❌ Request failed: ${req.error}`);
      continue;
    }
    
    console.log(`   Request ID: ${requestId}`);

    // Wait for Offer
    console.log('   Waiting for offer...');
    let attempts = 0;
    while (!offers.has(requestId) && attempts < 20) {
      await sleep(1000);
      attempts++;
    }

    const offer = offers.get(requestId);
    if (!offer) {
      console.error('❌ Timeout waiting for offer');
      continue;
    }

    // Accept Offer (Trigger Escrow)
    console.log('   Accepting offer...');
    
    // Send ACCEPT message with mock tx hash (Relay mode)
    const accept = await buyer.sendAccept(requestId, {
      tx_hash: '0x_mock_tx_hash_for_test',
      escrow: offer.payload.escrow,
    }, { thread: offer.thread.id });

    if (!accept.ok) {
      console.error(`❌ Accept failed: ${accept.error}`);
      continue;
    }
    console.log('   Offer accepted! Waiting for result (this may take 10-20s for Kimi)...');

    // Wait for Result
    attempts = 0;
    while (!results.has(requestId) && attempts < 60) {
      await sleep(1000);
      attempts++;
      process.stdout.write('.');
    }
    process.stdout.write('\n');

    if (!results.has(requestId)) {
      console.error('❌ Timeout waiting for result');
    }
  }

  console.log('\n✨ Test sequence completed.');
  process.exit(0);
}

main().catch(console.error);
