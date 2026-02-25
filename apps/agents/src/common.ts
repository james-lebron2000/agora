import { AgoraAgent, generateKeypair, publicKeyToDidKey } from '../../../packages/sdk/src/index.ts';
import type { SignedEnvelope } from '../../../packages/sdk/src/envelope.ts';

export const relayUrl = process.env.AGORA_RELAY_URL || 'http://45.32.219.241:8789';
const requirePaymentVerify = ['1', 'true', 'yes', 'required']
  .includes(String(process.env.AGORA_REQUIRE_PAYMENT_VERIFY || '').toLowerCase());
const paymentNetwork = (process.env.AGORA_PAYMENT_NETWORK || 'base-sepolia') as 'base' | 'base-sepolia';

export type OfferBuilder = (request: SignedEnvelope) => Promise<{ plan?: string; price?: { amount: number; currency: string }; eta_seconds?: number }>;
export type ResultBuilder = (request: SignedEnvelope, accept: SignedEnvelope) => Promise<{ status: 'success' | 'partial' | 'failed' | 'cancelled'; output?: Record<string, unknown>; artifacts?: Array<{ type: string; url: string; name?: string }>; metrics?: { latency_ms?: number; cost_actual?: number } }>;

export async function createDemoAgent(options: {
  name: string;
  url?: string;
  capabilities: unknown[];
}) {
  const { publicKey, privateKey } = await generateKeypair();
  const did = publicKeyToDidKey(publicKey);
  const agent = new AgoraAgent({
    did,
    privateKey,
    relayUrl,
    name: options.name,
    url: options.url,
    capabilities: options.capabilities,
  });

  const res = await agent.register();
  if (!res.ok) {
    console.warn(`[${options.name}] failed to register:`, res.error || res);
  }

  console.log(`[${options.name}] ready`);
  console.log(`[${options.name}] DID: ${did}`);
  console.log(`[${options.name}] relay: ${relayUrl}`);

  return agent;
}

export function matchesIntent(request: SignedEnvelope, intents: string[]): boolean {
  const payload = request.payload || {};
  const intent = typeof (payload as any).intent === 'string' ? (payload as any).intent : '';
  return intents.includes(intent);
}

export async function runAutoResponder(options: {
  name: string;
  intents: string[];
  capabilities: unknown[];
  buildOffer: OfferBuilder;
  buildResult: ResultBuilder;
}) {
  const agent = await createDemoAgent({
    name: options.name,
    capabilities: options.capabilities,
  });

  const pending = new Map<string, SignedEnvelope>();

  void agent.onRequest(async (request) => {
    if (!matchesIntent(request, options.intents)) return;
    const payload = request.payload as any;
    const requestId = payload?.request_id;
    if (!requestId) return;

    const offer = await options.buildOffer(request);
    await agent.sendOffer(requestId, offer, { thread: request.thread?.id });
    pending.set(requestId, request);
  });

  void agent.onAccept(async (accept) => {
    const payload = accept.payload as any;
    const requestId = payload?.request_id;
    if (!requestId) return;
    const paymentTx = typeof payload?.payment_tx === 'string' ? payload.payment_tx.trim() : '';
    if (!paymentTx) {
      console.warn(`[${options.name}] ignoring ACCEPT without payment_tx`);
      return;
    }

    if (requirePaymentVerify) {
      const terms = payload?.terms && typeof payload.terms === 'object' ? payload.terms : {};
      const verify = await agent.relay.verifyPayment({
        tx_hash: paymentTx,
        chain: payload?.chain || terms?.chain || paymentNetwork,
        token: payload?.token || terms?.token || 'USDC',
        payer: payload?.payer || terms?.payer || accept.sender?.id,
        payee: payload?.payee || terms?.payee || terms?.provider,
        amount: payload?.amount_usdc ?? payload?.amount ?? terms?.amount_usdc ?? terms?.amount,
        sender_id: accept.sender?.id,
      });
      if (!verify.ok) {
        console.warn(`[${options.name}] payment verify failed for ${requestId}: ${verify.error || verify.message || 'unknown error'}`);
        return;
      }
    }

    const request = pending.get(requestId);
    if (!request) return;

    const result = await options.buildResult(request, accept);
    await agent.sendResult(requestId, result, { thread: accept.thread?.id || request.thread?.id });
    pending.delete(requestId);
  });

  console.log(`[${options.name}] listening for REQUEST + ACCEPT`);
}
