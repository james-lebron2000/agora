import { randomBytes } from 'node:crypto';
import {
  AgoraAgent,
  generateKeypair,
  publicKeyToDidKey,
} from '../packages/sdk/src/index.ts';
import { runAutoResponder } from '../apps/agents/src/common.ts';
import type { SignedEnvelope } from '../packages/sdk/src/envelope.ts';
import type { RelayClient } from '../packages/sdk/src/relay.ts';
import {
  transferUSDC,
  type BaseNetwork,
} from '../packages/sdk/src/payment.ts';
import {
  toHex,
  type Address,
  type Hash,
  type Hex,
} from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const relayUrl = process.env.AGORA_RELAY_URL || 'http://45.32.219.241:8789';
const network = (process.env.AGORA_BASE_NETWORK || 'base-sepolia') as BaseNetwork;
const rpcUrl = process.env.BASE_RPC_URL;
const runOnchainPayment = process.env.RUN_ONCHAIN_PAYMENT === '1';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForThreadMessage(options: {
  relay: RelayClient;
  threadId: string;
  type: string;
  timeoutMs?: number;
  predicate?: (envelope: SignedEnvelope) => boolean;
}) {
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

async function buildPaymentTx(options: {
  recipient: Address;
  buyerPrivateKey: Hex;
}): Promise<Hash> {
  if (runOnchainPayment && rpcUrl) {
    console.log('[payment] sending onchain USDC transfer...');
    return transferUSDC({
      privateKey: options.buyerPrivateKey,
      recipient: options.recipient,
      amount: '1',
      network,
      rpcUrl,
    });
  }

  const simulated = toHex(randomBytes(32)) as Hash;
  console.log('[payment] using simulated payment tx hash');
  return simulated;
}

async function main() {
  console.log(`[test] relay: ${relayUrl}`);

  const buyerGeneratedKey = generatePrivateKey();
  const buyerPrivateKey = (process.env.BUYER_EVM_PRIVATE_KEY as Hex | undefined) ?? buyerGeneratedKey;
  const buyerAccount = privateKeyToAccount(buyerPrivateKey);

  const agentRecipientAccount = privateKeyToAccount(generatePrivateKey());

  console.log(`[payment] buyer EVM address: ${buyerAccount.address}`);
  console.log(`[payment] agent payout address: ${agentRecipientAccount.address}`);

  const buyerIdentity = await generateKeypair();
  const buyerDid = publicKeyToDidKey(buyerIdentity.publicKey);

  const buyer = new AgoraAgent({
    did: buyerDid,
    privateKey: buyerIdentity.privateKey,
    relayUrl,
    name: 'PaymentFlowBuyer',
  });

  await buyer.register();

  const intent = `test.usdc.payment.${Date.now()}`;

  await runAutoResponder({
    name: 'PaymentFlowAgent',
    intents: [intent],
    capabilities: [
      {
        id: 'cap_payment_test',
        intents: [{ id: intent, name: 'USDC Payment Test' }],
        pricing: { model: 'fixed', unit: 'task', amount: 1, currency: 'USDC' },
      },
    ],
    buildOffer: async () => ({
      plan: 'Pay 1 USDC via Base',
      price: { amount: 1, currency: 'USDC' },
      eta_seconds: 60,
    }),
    buildResult: async () => ({
      status: 'success',
      output: { ok: true },
    }),
  });

  await sleep(1000);

  const requestId = `req_usdc_${Date.now()}`;
  const threadId = `thread_${requestId}`;

  console.log('[test] sending request...');
  await buyer.sendRequest(
    {
      request_id: requestId,
      intent,
      title: 'USDC payment test',
      description: 'Test task with USDC payment on Base',
      params: {
        payment: {
          currency: 'USDC',
          network,
          amount: 1,
          recipient: agentRecipientAccount.address,
        },
      },
    },
    { thread: threadId }
  );

  console.log('[test] waiting for offer...');
  await waitForThreadMessage({
    relay: buyer.relay,
    threadId,
    type: 'OFFER',
    predicate: (envelope) => (envelope.payload as any)?.request_id === requestId,
    timeoutMs: 60_000,
  });

  console.log('[test] offer received');

  console.log('[test] sending ACCEPT without payment_tx to confirm gating...');
  await buyer.sendAccept(requestId, { thread: threadId });

  let resultBeforePayment = false;
  try {
    await waitForThreadMessage({
      relay: buyer.relay,
      threadId,
      type: 'RESULT',
      predicate: (envelope) => (envelope.payload as any)?.request_id === requestId,
      timeoutMs: 5_000,
    });
    resultBeforePayment = true;
  } catch (err) {
    // Timeout expected when payment gating is enforced.
  }

  if (resultBeforePayment) {
    throw new Error('Agent sent RESULT without payment_tx gating');
  }

  console.log('[test] no RESULT before payment_tx (expected)');

  const paymentTx = await buildPaymentTx({
    recipient: agentRecipientAccount.address,
    buyerPrivateKey,
  });

  console.log(`[payment] payment_tx: ${paymentTx}`);

  console.log('[test] sending ACCEPT with payment_tx...');
  await buyer.sendAccept(requestId, {
    thread: threadId,
    payment_tx: paymentTx,
    terms: {
      payment_tx: paymentTx,
      currency: 'USDC',
      network,
      amount: 1,
      recipient: agentRecipientAccount.address,
    },
  });

  console.log('[test] waiting for RESULT...');
  const result = await waitForThreadMessage({
    relay: buyer.relay,
    threadId,
    type: 'RESULT',
    predicate: (envelope) => (envelope.payload as any)?.request_id === requestId,
    timeoutMs: 60_000,
  });

  console.log('[test] RESULT received');
  console.log(JSON.stringify(result.payload, null, 2));
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
