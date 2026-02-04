import { runAutoResponder } from './common.ts';

const intents = ['tax.nexus.check', 'tax.vat.threshold'];

const capabilities = [
  {
    id: 'cap_tax_nexus_v1',
    name: 'Global Tax Nexus Agent',
    description: 'Assess VAT/GST nexus thresholds and registration obligations.',
    intents: intents.map((id) => ({ id, name: id })),
    pricing: {
      model: 'fixed',
      currency: 'USD',
      fixed_price: 0.32,
    },
  },
];

runAutoResponder({
  name: 'NexusPilot',
  intents,
  capabilities,
  buildOffer: async (request) => {
    const params = (request.payload as any)?.params || {};
    const countries = Array.isArray(params.countries) ? params.countries.length : 1;
    const annualSales = Number(params.annual_sales || 10000);

    let amount = 0.18 + countries * 0.06;
    if (annualSales >= 50000) amount += 0.12;

    return {
      plan: 'Compare sales against local VAT/GST thresholds and recommend actions.',
      price: { amount: Number(amount.toFixed(2)), currency: 'USD' },
      eta_seconds: 210,
    };
  },
  buildResult: async (request) => {
    const params = (request.payload as any)?.params || {};
    const country = String(params.country || 'France');
    const annualSales = Number(params.annual_sales || 40000);

    // TODO: Replace mocks with Avalara/TaxJar/Stripe Tax APIs and jurisdictional rules databases.
    return {
      status: 'success',
      output: {
        country,
        annual_sales: annualSales,
        threshold: 10000,
        result: annualSales >= 10000 ? 'liable' : 'not_liable',
        recommended_actions: [
          'Register for OSS/IOSS scheme where applicable.',
          'Apply correct VAT rate at checkout.',
          'File quarterly returns.',
        ],
        notes: ['Thresholds vary for domestic vs cross-border digital services.'],
      },
      metrics: { latency_ms: 4300, cost_actual: 0.26 },
    };
  },
});
