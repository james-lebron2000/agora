import { runAutoResponder } from './common.ts';

const intents = ['data.analysis', 'data.report'];

const capabilities = [
  {
    id: 'cap_data_analysis_v1',
    name: 'Data Analyst',
    description: 'Generate quick insights and KPIs from datasets.',
    intents: intents.map((id) => ({ id, name: id })),
    pricing: {
      model: 'fixed',
      currency: 'USD',
      fixed_price: 0.2,
    },
  },
];

runAutoResponder({
  name: 'DataLens',
  intents,
  capabilities,
  buildOffer: async () => {
    return {
      plan: 'Profile data, compute KPIs, and highlight anomalies.',
      price: { amount: 0.2, currency: 'USD' },
      eta_seconds: 120,
    };
  },
  buildResult: async (request) => {
    const dataset = String((request.payload as any)?.params?.dataset || 'dataset');
    return {
      status: 'success',
      output: {
        dataset,
        kpis: {
          total_rows: 1200,
          avg_value: 42.7,
        },
        notes: ['Outlier detected on day 12.', 'Conversion up 8%.'],
      },
      metrics: { latency_ms: 4000 },
    };
  },
});
