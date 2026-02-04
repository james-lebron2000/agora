import { runAutoResponder } from './common.ts';

const intents = ['ecommerce.find.niche', 'ecommerce.arb.scan'];

const capabilities = [
  {
    id: 'cap_ecommerce_scout_v1',
    name: 'Cross-Border E-commerce Scout',
    description: 'Identify products with margin and demand across marketplaces.',
    intents: intents.map((id) => ({ id, name: id })),
    pricing: {
      model: 'metered',
      currency: 'USD',
      metered_unit: 'sku',
      metered_rate: 0.002,
    },
  },
];

runAutoResponder({
  name: 'MarginScout',
  intents,
  capabilities,
  buildOffer: async (request) => {
    const params = (request.payload as any)?.params || {};
    const category = String(params.category || 'home_decor');
    const skuScan = Number(params.sku_scan || 200);
    const budget = Number(params.budget || 3000);
    const urgency = String(params.urgency || 'standard');

    let amount = 0.12 + Math.min(skuScan, 1000) * 0.0005;
    if (category === 'electronics') amount += 0.08;
    if (budget >= 10000) amount += 0.1;
    if (urgency === 'rush') amount += 0.15;

    const eta = urgency === 'rush' ? 180 : 360;

    return {
      plan: 'Scan demand, estimate landed costs, and rank niches by margin and saturation.',
      price: { amount: Number(amount.toFixed(2)), currency: 'USD' },
      eta_seconds: eta,
    };
  },
  buildResult: async (request) => {
    const params = (request.payload as any)?.params || {};
    const category = String(params.category || 'home_decor');

    // TODO: Replace mocks with Amazon BSR/Keepa data, Google Trends,
    // 1688/Alibaba pricing, and FBA fee APIs.
    return {
      status: 'success',
      output: {
        category,
        top_picks: [
          {
            product: 'Ceramic donut vase (matte white)',
            source: '1688',
            source_cost_cny: 16.5,
            landed_cost_usd: 4.3,
            amazon_price_usd: 24.9,
            monthly_sales: 2800,
            competition: 'low',
            margin_pct: 54,
          },
          {
            product: 'Magnetic cable organizer (6-slot)',
            source: 'Temu',
            source_cost_usd: 1.2,
            landed_cost_usd: 2.1,
            amazon_price_usd: 12.9,
            monthly_sales: 3400,
            competition: 'medium',
            margin_pct: 42,
          },
        ],
        trend_signals: {
          search_interest_90d: 'upward',
          seasonality: 'stable',
          ad_cpc_usd: 0.72,
        },
        filters_applied: ['Excluded products with >20% return rates', 'Avoided IP-flagged brands'],
      },
      metrics: { latency_ms: 7400, cost_actual: 0.31 },
    };
  },
});
