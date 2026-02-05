import { runKimiAgent, getString } from './kimi-runner.ts';

const intents = ['ecommerce.find.niche', 'ecommerce.arb.scan'];
const agentName = 'MarginScout';

const PRICE_PER_CHAR = 0.00008;
const MIN_PRICE = 0.25;
const MAX_CHARS = 5000;

const capabilities = [
  {
    id: 'cap_ecommerce_scout_v1',
    name: 'Cross-Border E-commerce Scout',
    description: 'AI-powered analysis for identifying cross-border e-commerce opportunities. Evaluates product niches, margin potential, and market demand patterns.',
    intents: intents.map((id) => ({ id, name: id })),
    pricing: {
      model: 'metered',
      currency: 'USDC',
      metered_unit: 'character',
      metered_rate: PRICE_PER_CHAR,
    },
  },
];

type EcommerceParams = {
  category?: string;
  sku_scan?: number;
  budget?: number;
  urgency?: string;
  marketplace?: string;
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

function parseParams(params: Record<string, unknown>): EcommerceParams | null {
  const category = getString(params.category) || getString(params.niche);
  const skuScan = typeof params.sku_scan === 'number' ? params.sku_scan : 200;
  const budget = typeof params.budget === 'number' ? params.budget : 3000;
  const urgency = getString(params.urgency) || 'standard';
  const marketplace = getString(params.marketplace) || 'amazon';

  const text =
    readText(params.description)
    || readText(params.product)
    || readText(params.details)
    || readText(params.criteria)
    || readText(params.text)
    || readText(params.input)
    || (category ? `Analyze ${category} category for e-commerce opportunities` : undefined);

  if (!text) return null;

  return { category, sku_scan: skuScan, budget, urgency, marketplace, text };
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
    const baseEta = urgency === 'rush' ? 120 : 180;
    return Math.min(360, baseEta + Math.round(task.charCount / 80));
  },
  parseParams,
  extractInput: (params) => params.text,
  buildPlan: (task) => {
    const { category, budget } = task.params;
    const catLabel = category || 'specified category';
    const budgetLabel = budget ? `$${budget} budget` : 'flexible budget';
    return `Scan ${catLabel} for cross-border e-commerce opportunities (${budgetLabel}).`;
  },
  buildPrompt: (task) => {
    const { category, budget, marketplace } = task.params;

    const systemPrompt = `You are an expert cross-border e-commerce analyst specializing in product sourcing and margin optimization.

Analyze the product category/niche and identify opportunities by evaluating:

1. Demand indicators and trend momentum
2. Margin potential (source cost vs. selling price)
3. Competition level assessment
4. Seasonality factors
5. Sourcing feasibility
6. Risk factors (returns, IP issues, compliance)

Provide output in this structured format:

CATEGORY ANALYSIS:
- Market overview
- Trend direction (rising/falling/stable)
- Key demand drivers

TOP PRODUCT OPPORTUNITIES: (2-4 products)
For each:
- Product name/description
- Suggested source platform (1688, Temu, Alibaba, etc.)
- Estimated source cost
- Estimated landed cost (including shipping/duties)
- Target selling price
- Estimated monthly sales volume
- Competition level: Low/Medium/High
- Margin percentage
- Key selling points
- Risk factors

TREND SIGNALS:
- Search interest trend
- Seasonality
- Market saturation

SOURCING RECOMMENDATIONS:
- Best practices
- Red flags to avoid
- Quality verification tips`;

    let userPrompt = '';

    if (category) {
      userPrompt += `Category/Niche: ${category}\n\n`;
    }

    if (budget) {
      userPrompt += `Available Budget: $${budget}\n\n`;
    }

    userPrompt += `Target Marketplace: ${marketplace?.toUpperCase() || 'Amazon'}\n\n`;

    userPrompt += `Analysis Request:\n${task.input}\n\n`;

    userPrompt += `Please identify the best product opportunities with strong margins.`;

    return { system: systemPrompt, user: userPrompt };
  },
  formatOutput: (content, task) => {
    const { category } = task.params;

    // Parse top picks from AI output
    const topPicks: Array<{
      product: string;
      source?: string;
      source_cost_cny?: number;
      source_cost_usd?: number;
      landed_cost_usd?: number;
      amazon_price_usd?: number;
      monthly_sales?: number;
      competition: string;
      margin_pct?: number;
    }> = [];

    const productMatches = content.match(/(?:Product|Item)[\s\S]*?(?=\n\n|Product|Item|$)/gi);
    if (productMatches) {
      productMatches.forEach((match) => {
        const nameMatch = match.match(/(?:Product|Item|Name)[\s:]*([^\n]+)/i);
        const sourceMatch = match.match(/(?:Source|Platform)[\s:]*([^\n]+)/i);
        const priceMatch = match.match(/(?:Price|Cost)[\s:]*\$?(\d+(?:\.\d+)?)/i);
        const marginMatch = match.match(/(?:Margin)[\s:]*(\d+)%/i);
        const salesMatch = match.match(/(?:Sales|Volume)[\s:]*(\d+)/i);
        const compMatch = match.match(/(?:Competition)[\s:]*(low|medium|high)/i);

        if (nameMatch) {
          topPicks.push({
            product: nameMatch[1].trim(),
            source: sourceMatch?.[1]?.trim(),
            source_cost_usd: priceMatch ? parseFloat(priceMatch[1]) : undefined,
            monthly_sales: salesMatch ? parseInt(salesMatch[1]) : undefined,
            competition: compMatch?.[1]?.toLowerCase() || 'medium',
            margin_pct: marginMatch ? parseInt(marginMatch[1]) : undefined,
          });
        }
      });
    }

    return {
      category: category || 'general',
      top_picks: topPicks.length > 0 ? topPicks : undefined,
      trend_signals: {
        search_interest_90d: 'stable',
        seasonality: 'stable',
      },
      filters_applied: [
        'AI-powered opportunity assessment',
        'Margin analysis included',
        'Competition evaluation',
      ],
      full_analysis: content,
    };
  },
  buildOfferExtras: (task) => ({
    category: task.params.category,
    sku_scan: task.params.sku_scan,
    budget: task.params.budget,
    urgency: task.params.urgency,
  }),
});
