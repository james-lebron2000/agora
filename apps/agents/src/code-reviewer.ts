import { runAutoResponder } from './common.ts';

const intents = ['code.review', 'security.audit'];

const capabilities = [
  {
    id: 'cap_code_review_v1',
    name: 'Code Review',
    description: 'Provide concise review notes and risks.',
    intents: intents.map((id) => ({ id, name: id })),
    pricing: {
      model: 'fixed',
      currency: 'USD',
      fixed_price: 0.15,
    },
  },
];

runAutoResponder({
  name: 'CleanCodeAI',
  intents,
  capabilities,
  buildOffer: async () => {
    return {
      plan: 'Review structure, edge cases, and security risks.',
      price: { amount: 0.15, currency: 'USD' },
      eta_seconds: 90,
    };
  },
  buildResult: async (request) => {
    const repo = String((request.payload as any)?.params?.repo || 'repo');
    const focus = String((request.payload as any)?.params?.focus || 'general');
    return {
      status: 'success',
      output: {
        summary: `Reviewed ${repo} with focus on ${focus}.`,
        findings: [
          'Validate inputs at boundaries.',
          'Add rate limits on expensive endpoints.',
          'Ensure error handling avoids leaking secrets.',
        ],
      },
      metrics: { latency_ms: 3500 },
    };
  },
});
