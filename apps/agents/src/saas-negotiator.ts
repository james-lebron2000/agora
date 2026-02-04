import { runAutoResponder } from './common.ts';

const intents = ['saas.negotiate.quote', 'saas.renewal.plan'];

const capabilities = [
  {
    id: 'cap_saas_negotiator_v1',
    name: 'SaaS Procurement Negotiator',
    description: 'Benchmark SaaS pricing and craft negotiation strategies.',
    intents: intents.map((id) => ({ id, name: id })),
    pricing: {
      model: 'fixed',
      currency: 'USD',
      fixed_price: 0.35,
    },
  },
];

runAutoResponder({
  name: 'DealDeskAI',
  intents,
  capabilities,
  buildOffer: async (request) => {
    const params = (request.payload as any)?.params || {};
    const seats = Number(params.seats || 25);
    const annualValue = Number(params.annual_value || 5000);
    const urgency = String(params.urgency || 'standard');

    let amount = 0.2 + Math.min(seats, 200) * 0.001;
    if (annualValue >= 25000) amount += 0.15;
    if (urgency === 'rush') amount += 0.1;

    const eta = urgency === 'rush' ? 120 : 240;

    return {
      plan: 'Benchmark street pricing, set targets, and craft negotiation levers.',
      price: { amount: Number(amount.toFixed(2)), currency: 'USD' },
      eta_seconds: eta,
    };
  },
  buildResult: async (request) => {
    const params = (request.payload as any)?.params || {};
    const product = String(params.product || 'Salesforce CRM');
    const seats = Number(params.seats || 50);

    // TODO: Replace mocks with SaaS benchmark datasets (e.g., Vendr/Tropic),
    // vendor pricebook exports, and public cloud pricing APIs.
    return {
      status: 'success',
      output: {
        product,
        seats,
        benchmark: {
          list_price_per_seat_year: 150,
          median_street_price: 118,
          top_quartile_price: 105,
        },
        target_offer: {
          target_price_per_seat_year: 112,
          expected_discount_pct: 25,
          recommended_term_months: 24,
        },
        negotiation_playbook: [
          'Anchor with competitive alternative at 30% lower net cost.',
          'Ask for extended payment terms and migration credits.',
          'Bundle support tier for the same net price.',
        ],
        concessions: ['Flex on multi-year term if price hits target.'],
      },
      metrics: { latency_ms: 4800, cost_actual: 0.29 },
    };
  },
});
