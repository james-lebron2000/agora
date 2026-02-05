import { runKimiAgent, getString } from './kimi-runner.ts';

const intents = ['crypto.token.check', 'crypto.token.risk'];
const agentName = 'AlphaSniper';

const PRICE_PER_CHAR = 0.0001;
const MIN_PRICE = 0.35;
const MAX_CHARS = 3000;

const capabilities = [
  {
    id: 'cap_crypto_alpha_hunter_v1',
    name: 'Crypto Alpha Hunter',
    description: 'Assess new tokens for contract risk, liquidity safety, and smart-money signals using AI analysis.',
    intents: intents.map((id) => ({ id, name: id })),
    pricing: {
      model: 'metered',
      currency: 'USDC',
      metered_unit: 'character',
      metered_rate: PRICE_PER_CHAR,
    },
  },
];

type CryptoParams = {
  chain?: string;
  address?: string;
  symbol?: string;
  depth?: number;
  urgency?: string;
  text: string;
};

function readText(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined;
  if (Array.isArray(value)) {
    const joined = value.filter((item) => typeof item === 'string').join('\n');
    return joined.trim() || undefined;
  }
  return undefined;
}

function parseParams(params: Record<string, unknown>): CryptoParams | null {
  const chain = getString(params.chain) || 'ethereum';
  const address = getString(params.address) || getString(params.contract);
  const symbol = getString(params.symbol) || getString(params.token) || 'TOKEN';
  const depth = typeof params.depth === 'number' ? params.depth : 1;
  const urgency = getString(params.urgency) || 'standard';

  // Extract context/information to analyze
  const text =
    readText(params.context)
    || readText(params.info)
    || readText(params.data)
    || readText(params.description)
    || readText(params.text)
    || readText(params.input)
    || `Analyze ${symbol} on ${chain}${address ? ` at ${address}` : ''}`;

  if (!text) return null;

  return { chain, address, symbol, depth, urgency, text };
}

runKimiAgent({
  name: agentName,
  intents,
  capabilities,
  maxChars: MAX_CHARS,
  pricePerChar: PRICE_PER_CHAR,
  minPrice: MIN_PRICE,
  etaSeconds: (task) => {
    const urgency = (task.params.urgency || 'standard').toLowerCase();
    const baseEta = urgency === 'rush' ? 60 : 120;
    return Math.min(300, baseEta + Math.round(task.charCount / 100));
  },
  parseParams,
  extractInput: (params) => params.text,
  buildPlan: (task) => {
    const { chain, symbol, depth, urgency } = task.params;
    const depthLabel = depth >= 3 ? 'deep' : depth === 2 ? 'moderate' : 'basic';
    const urgencyLabel = urgency === 'rush' ? 'rush' : 'standard';
    return `Analyze ${symbol} on ${chain} with ${depthLabel} risk assessment (${urgencyLabel} priority).`;
  },
  buildPrompt: (task) => {
    const { chain, address, symbol, depth } = task.params;

    const systemPrompt = `You are an expert crypto token analyst specializing in risk assessment and smart-money signals.

Analyze the provided token information and return a structured JSON-like response with:

1. risk_score: 0-100 (higher = more risky)
2. action: "BUY", "CONSIDER", or "DONT_BUY"
3. signals object with:
   - honeypot_risk: "low" | "medium" | "high"
   - liquidity_status: "locked" | "partial" | "unverified" | "none"
   - mint_authority: "burned" | "renounced" | "present"
   - tax_changeable: boolean
4. holder_distribution: array of {holder, percent}
5. liquidity: {pool, liquidity_usd, lp_locked, lock_expiry_days}
6. dev_wallet: {previous_tokens_launched, prior_rug_count, risk_level}
7. smart_money: {wallets_watching, net_flow_24h, sentiment}
8. rationale: array of string explanations

Be conservative in your assessment. Flag any red flags clearly.`;

    const userPrompt = `Token to analyze:
- Symbol: ${symbol}
- Chain: ${chain}${address ? `\n- Contract: ${address}` : ''}
- Analysis depth: ${depth >= 3 ? 'Deep' : depth === 2 ? 'Moderate' : 'Basic'}

Context/Information provided:
${task.input}

Provide your analysis in a structured format.`;

    return { system: systemPrompt, user: userPrompt };
  },
  formatOutput: (content, task) => {
    const { chain, address, symbol } = task.params;

    // Try to parse structured output, fallback to raw content
    let parsed;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || content.match(/({[\s\S]*})/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = null;
    }

    if (parsed && (parsed.risk_score !== undefined || parsed.action)) {
      return {
        chain,
        address: address || 'N/A',
        symbol,
        risk_score: parsed.risk_score ?? 50,
        action: parsed.action || 'CONSIDER',
        signals: parsed.signals || {},
        holder_distribution: parsed.holder_distribution || [],
        liquidity: parsed.liquidity || {},
        dev_wallet: parsed.dev_wallet || {},
        smart_money: parsed.smart_money || {},
        rationale: parsed.rationale || [content],
        ai_analysis: content,
      };
    }

    // Fallback: return raw AI output wrapped in expected structure
    return {
      chain,
      address: address || 'N/A',
      symbol,
      risk_score: 50,
      action: 'CONSIDER',
      signals: { analysis_type: 'ai_text' },
      ai_analysis: content,
      raw_response: content,
    };
  },
  buildOfferExtras: (task) => ({
    chain: task.params.chain,
    symbol: task.params.symbol,
    depth: task.params.depth,
    urgency: task.params.urgency,
  }),
});
