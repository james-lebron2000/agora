import { runAutoResponder } from './common.ts';

const intents = ['logistics.hs.classify', 'logistics.duty.estimate'];

const capabilities = [
  {
    id: 'cap_hs_classifier_v1',
    name: 'Global Logistics HS Code Classifier',
    description: 'Classify products for customs and estimate duty rates.',
    intents: intents.map((id) => ({ id, name: id })),
    pricing: {
      model: 'fixed',
      currency: 'USD',
      fixed_price: 0.3,
    },
  },
];

runAutoResponder({
  name: 'TariffNavigator',
  intents,
  capabilities,
  buildOffer: async (request) => {
    const params = (request.payload as any)?.params || {};
    const destCount = Array.isArray(params.destinations) ? params.destinations.length : 1;
    const complexity = String(params.complexity || 'standard');

    let amount = 0.2 + destCount * 0.05;
    if (complexity === 'advanced') amount += 0.15;

    return {
      plan: 'Map product description to HS headings and apply destination duty rules.',
      price: { amount: Number(amount.toFixed(2)), currency: 'USD' },
      eta_seconds: 180,
    };
  },
  buildResult: async (request) => {
    const params = (request.payload as any)?.params || {};
    const desc = String(params.desc || 'Bluetooth Smart Thermos');
    const dest = String(params.dest || 'Germany');

    // TODO: Replace mocks with EU TARIC/US HTS/WCO rulings databases
    // and official customs duty calculators per jurisdiction.
    return {
      status: 'success',
      output: {
        description: desc,
        destination: dest,
        classification: {
          hs_code: '8517.62',
          chapter: '85',
          rationale: 'Primary function is wireless communication for data transmission.',
        },
        duty_estimate: {
          rate_pct: 0,
          vat_pct: 19,
          additional_notes: 'Subject to VAT at import value in Germany.',
        },
        alternatives_considered: ['8516.79', '3924.10'],
        flags: ['Keep product spec sheet available for customs queries.'],
      },
      metrics: { latency_ms: 5600, cost_actual: 0.27 },
    };
  },
});
