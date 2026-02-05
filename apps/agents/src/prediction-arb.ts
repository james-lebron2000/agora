import { runKimiAgent, getString } from './kimi-runner.ts';

const intents = ['prediction.arb.find', 'prediction.market.spread'];
const agentName = 'EventArbDesk';

const PRICE_PER_CHAR = 0.0001;
const MIN_PRICE = 0.35;
const MAX_CHARS = 6000;

const capabilities = [
  {
    id: 'cap_prediction_arb_v1',
    name: 'Prediction Market Arbitrage Analyst',
    description: 'AI-powered analysis of prediction market opportunities. Evaluates pricing discrepancies, probability assessments, and arbitrage potential across markets.',
    intents: intents.map((id) => ({ id, name: id })),
    pricing: {
      model: 'metered',
      currency: 'USDC',
      metered_unit: 'character',
      metered_rate: PRICE_PER_CHAR,
    },
  },
];

type ArbParams = {
  category?: string;
  event?: string;
  market_count?: number;
  min_spread?: number;
  urgency?: string;
  markets?: Array<{
    platform: string;
    price: number;
    side: string;
  }>;
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

function parseParams(params: Record<string, unknown>): ArbParams | null {
  const category = getString(params.category) || 'politics';
  const event = getString(params.event) || getString(params.market);
  const marketCount = typeof params.market_count === 'number' ? params.market_count : 3;
  const minSpread = typeof params.min_spread === 'number' ? params.min_spread : 0.03;
  const urgency = getString(params.urgency) || 'standard';

  const markets = Array.isArray(params.markets)
    ? params.markets.filter((m): m is { platform: string; price: number; side: string } =>
        typeof m === 'object' && m !== null &&
        typeof (m as any).platform === 'string' &&
        typeof (m as any).price === 'number'
      )
    : undefined;

  // Extract event/market information
  const text =
    readText(params.description)
    || readText(params.details)
    || readText(params.odds)
    || readText(params.prices)
    || readText(params.text)
    || readText(params.input)
    || (event ? `Analyze arbitrage for: ${event}` : undefined);

  if (!text) return null;

  return { category, event, market_count: marketCount, min_spread: minSpread, urgency, markets, text };
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
    const { category, event, min_spread } = task.params;
    const eventLabel = event || `${category} events`;
    const spreadLabel = min_spread ? `${Math.round(min_spread * 100)}% min spread` : 'standard spread';
    return `Analyze prediction market arbitrage for ${eventLabel} (${spreadLabel}).`;
  },
  buildPrompt: (task) => {
    const { category, event, markets, min_spread } = task.params;

    const systemPrompt = `You are an expert prediction market analyst specializing in arbitrage opportunities and probability assessment.

⚠️ DISCLAIMER: This analysis is for informational purposes only. Trading involves risk. Always verify current prices and liquidity before trading.

Analyze the provided market data and identify:

1. Pricing discrepancies across platforms
2. Arbitrage opportunities (guaranteed profit vs statistical edge)
3. Risk factors and execution considerations
4. Market efficiency assessment

Provide output in this structured format:

EVENT ANALYSIS:
- Event description
- Category context
- Key resolution criteria
- Resolution timeline

MARKET SNAPSHOT:
Platform | Side | Price | Implied Prob | Liquidity Assessment

ARBITRAGE OPPORTUNITIES:
For each opportunity:
- Strategy: Description
- Buy: Platform @ Price
- Sell/Counter: Platform @ Price
- Implied ROI: X%
- Confidence: High/Medium/Low
- Size estimate: Suggested position size
- Execution risk: Factors to consider

RISK ANALYSIS:
- Liquidity constraints
- Settlement timing differences
- Fee impact
- Counterparty risk
- Market movement risk

RECOMMENDATIONS:
- Priority opportunities
- Position sizing guidance
- Execution timing
- Exit considerations`;

    let userPrompt = '';

    if (event) {
      userPrompt += `Event: ${event}\n\n`;
    }

    userPrompt += `Category: ${category}\n\n`;

    if (markets && markets.length > 0) {
      userPrompt += `Current Market Prices:\n`;
      markets.forEach((m) => {
        userPrompt += `- ${m.platform}: ${m.side} @ ${m.price}\n`;
      });
      userPrompt += `\n`;
    }

    if (min_spread) {
      userPrompt += `Minimum Spread Threshold: ${Math.round(min_spread * 100)}%\n\n`;
    }

    userPrompt += `Market Information:\n${task.input}\n\n`;

    userPrompt += `Please identify arbitrage opportunities and provide trading recommendations.`;

    return { system: systemPrompt, user: userPrompt };
  },
  formatOutput: (content, task) => {
    const { category, event } = task.params;

    // Parse opportunities from AI output
    const opportunities: Array<{
      event: string;
      strategy: string;
      buy?: { platform: string; side: string; price: number };
      sell?: { platform: string; side: string; price: number };
      implied_roi: number;
      confidence: string;
      size_limit_usd?: number;
      risks?: string[];
    }> = [];

    // Extract opportunity sections
    const oppMatches = content.match(/(?:Opportunity|Arbitrage|Strategy)[\s\S]*?(?=\n\n|Opportunity|Arbitrage|Strategy|Risk|Recommendation|$)/gi);

    if (oppMatches) {
      oppMatches.forEach((match) => {
        const strategyMatch = match.match(/(?:Strategy|Description)[\s:]*([^\n]+)/i);
        const roiMatch = match.match(/(?:ROI|Return)[\s:]*(\d+(?:\.\d+)?)\s*%/i);
        const confidenceMatch = match.match(/(?:Confidence)[\s:]*(high|medium|low)/i);
        const sizeMatch = match.match(/(?:Size|Position)[\s:]*\$?([\d,]+)/i);

        // Extract buy/sell platforms
        const buyMatch = match.match(/(?:Buy|Long)[\s:]*([^@]+)@\s*(\d+(?:\.\d+)?)/i);
        const sellMatch = match.match(/(?:Sell|Short)[\s:]*([^@]+)@\s*(\d+(?:\.\d+)?)/i);

        if (strategyMatch || roiMatch) {
          opportunities.push({
            event: event || `${category} market`,
            strategy: strategyMatch?.[1]?.trim() || 'Arbitrage opportunity',
            buy: buyMatch ? {
              platform: buyMatch[1].trim(),
              side: 'YES',
              price: parseFloat(buyMatch[2]),
            } : undefined,
            sell: sellMatch ? {
              platform: sellMatch[1].trim(),
              side: 'NO',
              price: parseFloat(sellMatch[2]),
            } : undefined,
            implied_roi: roiMatch ? parseFloat(roiMatch[1]) / 100 : 0,
            confidence: confidenceMatch?.[1]?.toLowerCase() || 'medium',
            size_limit_usd: sizeMatch ? parseInt(sizeMatch[1].replace(/,/g, '')) : undefined,
          });
        }
      });
    }

    // Extract risk flags
    const riskFlags: string[] = [];
    const riskMatch = content.match(/(?:Risk|Warning|Caution)[\s\S]*?(?=\n\n|Recommendation|$)/i);
    if (riskMatch) {
      const bulletMatches = riskMatch[0].match(/[-•]\s*([^\n]+)/g);
      if (bulletMatches) {
        bulletMatches.forEach(b => riskFlags.push(b.replace(/^[-•]\s*/, '').trim()));
      }
    }

    return {
      category: category || 'general',
      event: event || 'Unspecified',
      opportunities: opportunities.length > 0 ? opportunities : undefined,
      risk_flags: riskFlags.length > 0 ? riskFlags : undefined,
      normalization_notes: [
        'Verify current prices before execution',
        'Check liquidity on both sides',
        'Account for fees in ROI calculation',
      ],
      full_analysis: content,
    };
  },
  buildOfferExtras: (task) => ({
    category: task.params.category,
    event: task.params.event,
    min_spread: task.params.min_spread,
    urgency: task.params.urgency,
    disclaimer: 'Analysis for informational purposes only. Trading involves risk.',
  }),
});
