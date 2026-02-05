import { setTimeout as sleep } from 'node:timers/promises';
import {
  AgoraAgent,
  generateKeypair,
  publicKeyToDidKey,
} from '../packages/sdk/src/index.ts';
import type { SignedEnvelope } from '../packages/sdk/src/envelope.ts';
import type { RelayClient, EscrowRecord } from '../packages/sdk/src/relay.ts';

const relayUrl = process.env.AGORA_RELAY_URL || 'http://45.32.219.241:8789';
const intent = process.env.TRANSLATOR_INTENT || 'translate';
const targetLang = process.env.TRANSLATOR_TARGET_LANG || 'zh';
const text = process.env.TRANSLATOR_TEXT || 'Hello Agora, this is a live translation test.';

async function waitForThreadMessage(options: {
  relay: RelayClient;
  threadId: string;
  type: string;
  timeoutMs?: number;
  predicate?: (envelope: SignedEnvelope) => boolean;
}): Promise<SignedEnvelope> {
  const deadline = Date.now() + (options.timeoutMs ?? 60_000);
  for await (const batch of options.relay.subscribeMessages({
    thread: options.threadId,
    type: options.type,
    timeout: 10,
  })) {
    for (const envelope of batch) {
      if (!options.predicate || options.predicate(envelope)) {
        return envelope;
      }
    }
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for ${options.type} on thread ${options.threadId}`);
    }
  }
  throw new Error(`Subscription ended before receiving ${options.type}`);
}

async function waitForEscrowStatus(options: {
  relay: RelayClient;
  requestId: string;
  status: EscrowRecord['status'];
  timeoutMs?: number;
}): Promise<EscrowRecord> {
  const deadline = Date.now() + (options.timeoutMs ?? 60_000);
  while (Date.now() < deadline) {
    const res = await options.relay.getEscrow(options.requestId);
    if (res.ok && res.escrow?.status === options.status) {
      return res.escrow;
    }
    await sleep(1000);
  }
  throw new Error(`Timed out waiting for escrow status ${options.status}`);
}

async function main() {
  console.log(`[test] relay: ${relayUrl}`);

  const identity = await generateKeypair();
  const did = publicKeyToDidKey(identity.publicKey);
  const buyer = new AgoraAgent({
    did,
    privateKey: identity.privateKey,
    relayUrl,
    name: 'TranslatorTestBuyer',
  });

  await buyer.register();

  const requestId = `req_translate_${Date.now()}`;
  const threadId = `thread_${requestId}`;

  console.log('[test] sending REQUEST...');
  await buyer.sendRequest(
    {
      request_id: requestId,
      intent,
      title: 'Translator test',
      description: 'Kimi translation test with escrow',
      params: {
        text,
        target_lang: targetLang,
      },
    },
    { thread: threadId }
  );

  console.log('[test] waiting for OFFER...');
  const offer = await waitForThreadMessage({
    relay: buyer.relay,
    threadId,
    type: 'OFFER',
    predicate: (envelope) => (envelope.payload as any)?.request_id === requestId,
    timeoutMs: 60_000,
  });

  const offerPayload = offer.payload as any;
  const price = Number(offerPayload?.price?.amount || 0);
  const payee = offer.sender?.id;
  if (!payee || !price) {
    throw new Error('Offer missing payee or price');
  }

  console.log(`[test] offer price: ${price} USDC`);
  console.log(`[test] holding escrow for ${requestId}...`);
  const escrowHold = await buyer.relay.holdEscrow({
    request_id: requestId,
    payer: buyer.did,
    payee,
    amount: price,
    currency: 'USDC',
  });

  if (!escrowHold.ok) {
    throw new Error(`Failed to hold escrow: ${escrowHold.error}`);
  }

  await waitForEscrowStatus({ relay: buyer.relay, requestId, status: 'HELD' });
  console.log('[test] escrow held');

  console.log('[test] sending ACCEPT...');
  await buyer.sendAccept(requestId, {
    thread: threadId,
    terms: { escrow: escrowHold.escrow },
  });

  console.log('[test] waiting for RESULT...');
  const result = await waitForThreadMessage({
    relay: buyer.relay,
    threadId,
    type: 'RESULT',
    predicate: (envelope) => (envelope.payload as any)?.request_id === requestId,
    timeoutMs: 120_000,
  });

  const resultPayload = result.payload as any;
  const translation = resultPayload?.output?.translation;
  if (!translation || typeof translation !== 'string') {
    throw new Error('Missing translation in RESULT payload');
  }

  console.log('[test] translation received');
  console.log(translation);

  await waitForEscrowStatus({ relay: buyer.relay, requestId, status: 'RELEASED', timeoutMs: 120_000 });
  console.log('[test] escrow released');
}

main()
  .then(() => {
    console.log('[test] done');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[test] failed:', err);
    process.exit(1);
  });
