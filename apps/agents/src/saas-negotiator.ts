import { runKimiAgent, getString } from './kimi-runner.ts';

const intents = ['saas.negotiate.quote', 'saas.renewal.plan'];
const agentName = 'DealDeskAI';

const PRICE_PER_CHAR = 0.0001;
const MIN_PRICE = 0.3;
const MAX_CHARS = 4000;

const capabilities = [
  {
    id: 'cap_saas_negotiator_v1',
    name: 'SaaS Procurement Negotiator',
    description: 'AI-powered SaaS pricing benchmark analysis and negotiation strategy development.',
    intents: intents.map((id) => ({ id, name: id })),
    pricing: {
      model: 'metered',
      currency: 'USDC',
      metered_unit: 'character',
      metered_rate: PRICE_PER_CHAR,
    },
  },
];

type SaaSParams = {
  product?: string;
  vendor?: string;
  seats?: number;
  annual_value?: number;
  urgency?: string;
  current_price?: number;
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

function parseParams(params: Record<string, unknown>): SaaSParams | null {
  const product = getString(params.product) || getString(params.software) || getString(params.tool);
  const vendor = getString(params.vendor) || getString(params.company);
  const seats = typeof params.seats === 'number' ? params.seats : 25;
  const annualValue = typeof params.annual_value === 'number' ? params.annual_value : 5000;
  const urgency = getString(params.urgency) || 'standard';
  const currentPrice = typeof params.current_price === 'number' ? params.current_price : undefined;

  const text =
    readText(params.requirements)
    || readText(params.description)
    || readText(params.context)
    || readText(params.quote)
    || readText(params.text)
    || readText(params.input)
    || (product ? `Negotiate ${product} pricing for ${seats} seats` : undefined);

  if (!text) return null;

  return { product, vendor, seats, annual_value: annualValue, urgency, current_price: currentPrice, text };
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
    return urgency === 'rush' ? 90 : 150;
  },
  parseParams,
  extractInput: (params) => params.text,
  buildPlan: (task) => {
    const { product, seats } = task.params;
    const prodLabel = product || 'SaaS tool';
    return `Benchmark ${prodLabel} pricing for ${seats} seats and develop negotiation strategy.`;
  },
  buildPrompt: (task) => {
    const { product, vendor, seats, annual_value, current_price } = task.params;

    const systemPrompt = `You are an expert SaaS procurement negotiator with deep knowledge of software pricing benchmarks and vendor negotiation tactics.

Analyze the SaaS purchase/renewal and provide:

1. Market pricing benchmarks
2. Realistic discount targets
3. Negotiation strategy playbook
4. Leverage points and concessions
5. Contract term recommendations

Provide output in this structured format:

PRODUCT ANALYSIS:
- Vendor/product overview
- Market position
- Typical pricing model

BENCHMARK DATA:
- List price per seat (if known)
- Street price range (typical discount)
- Aggressive discount potential
- Top quartile pricing

TARGET NEGOTIATION:
- Target price per seat
- Expected discount percentage
- Recommended term length
- Payment terms to request

NEGOTIATION PLAYBOOK:
- Opening position
- Key leverage points
- Competitor alternatives to mention
- Timing considerations
- Team/executive involvement

CONCESSIONS TO OFFER:
- What you can give (longer term, case study, etc.)

CONCESSIONS TO REQUEST:
- Price, terms, add-ons, support tier

RED FLAGS:
- Auto-renewal clauses
- Usage-based overages
- Price increase caps`;

    let userPrompt = '';

    if (product) {
      userPrompt += `SaaS Product: ${product}\n\n`;
    }

    if (vendor) {
      userPrompt += `Vendor: ${vendor}\n\n`;
    }

    userPrompt += `License Size: ${seats} seats\n\n`;

    if (annual_value) {
      userPrompt += `Annual Budget: $${annual_value}\n\n`;
    }

    if (current_price) {
      userPrompt += `Current Price Quoted: $${current_price}/year\n\n`;
    }

    userPrompt += `Negotiation Context:\n${task.input}\n\n`;

    userPrompt += `Please provide benchmark pricing and negotiation strategy.`;

    return { system: systemPrompt, user: userPrompt };
  },
  formatOutput: (content, task) => {
    const { product, seats } = task.params;

    // Extract benchmark data
    const listPriceMatch = content.match(/(?:List price|MSRP)[\s:]*\$?(\d+(?:\.\d+)?)/i);
    const streetPriceMatch = content.match(/(?:Street price|Typical)[\s:]*\$?(\d+(?:\.\d+)?)/i);
    const targetPriceMatch = content.match(/(?:Target price|Goal)[\s:]*\$?(\d+(?:\.\d+)?)/i);
    const discountMatch = content.match(/(?:Discount|Save)[\s:]*(\d+)%/i);

    // Extract playbook items
    const playbook: string[] = [];
    const playbookMatch = content.match(/(?:Playbook|Strategy|Tactics)[\s\S]*?(?=\n\n|Concession|Red Flag|$)/i);
    if (playbookMatch) {
      const bulletMatches = playbookMatch[0].match(/[-•\d]\.?\s*([^\n]+)/g);
      if (bulletMatches) {
        bulletMatches.forEach(b => playbook.push(b.replace(/^[-•\d]\.?\s*/, '').trim()));
      }
    }

    // Extract concessions
    const concessions: string[] = [];
    const concessionMatch = content.match(/(?:Concession|Give)[\s\S]*?(?=\n\n|Red Flag|$)/i);
    if (concessionMatch) {
      const bulletMatches = concessionMatch[0].match(/[-•\d]\.?\s*([^\n]+)/g);
      if (bulletMatches) {
        bulletMatches.forEach(b => concessions.push(b.replace(/^[-•\d]\.?\s*/, '').trim()));
      }
    }

    return {
      product: product || 'SaaS Product',
      seats,
      benchmark: {
        list_price_per_seat_year: listPriceMatch ? parseFloat(listPriceMatch[1]) : undefined,
        median_street_price: streetPriceMatch ? parseFloat(streetPriceMatch[1]) : undefined,
      },
      target_offer: {
        target_price_per_seat_year: targetPriceMatch ? parseFloat(targetPriceMatch[1]) : undefined,
        expected_discount_pct: discountMatch ? parseInt(discountMatch[1]) : 20,
        recommended_term_months: 12,
      },
      negotiation_playbook: playbook.length > 0 ? playbook : undefined,
      concessions: concessions.length > 0 ? concessions : undefined,
      full_analysis: content,
    };
  },
  buildOfferExtras: (task) => ({
    product: task.params.product,
    seats: task.params.seats,
    annual_value: task.params.annual_value,
    urgency: task.params.urgency,
  }),
});
