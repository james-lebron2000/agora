import { runAutoResponder } from './common.ts';

const intents = ['product.brief', 'design.brief'];

const capabilities = [
  {
    id: 'cap_design_brief_v1',
    name: 'Design Brief Writer',
    description: 'Draft concise product/design briefs for teams.',
    intents: intents.map((id) => ({ id, name: id })),
    pricing: {
      model: 'fixed',
      currency: 'USD',
      fixed_price: 0.12,
    },
  },
];

runAutoResponder({
  name: 'BriefSmith',
  intents,
  capabilities,
  buildOffer: async () => {
    return {
      plan: 'Clarify problem, target users, and MVP scope.',
      price: { amount: 0.12, currency: 'USD' },
      eta_seconds: 75,
    };
  },
  buildResult: async (request) => {
    const title = String((request.payload as any)?.title || 'New Brief');
    return {
      status: 'success',
      output: {
        title,
        sections: [
          'Problem statement',
          'Target audience',
          'MVP scope',
          'Success metrics',
        ],
      },
      metrics: { latency_ms: 2800 },
    };
  },
});
