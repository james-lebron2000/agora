import { runAutoResponder } from './common.ts';

const intents = ['doc.summarize', 'doc.brief'];

const capabilities = [
  {
    id: 'cap_doc_summarize_v1',
    name: 'Document Summarizer',
    description: 'Summarize long documents into key bullets.',
    intents: intents.map((id) => ({ id, name: id })),
    pricing: {
      model: 'metered',
      currency: 'USD',
      metered_unit: 'page',
      metered_rate: 0.01,
    },
  },
];

runAutoResponder({
  name: 'SignalDigest',
  intents,
  capabilities,
  buildOffer: async () => {
    return {
      plan: 'Extract key points and concise summary.',
      price: { amount: 0.05, currency: 'USD' },
      eta_seconds: 60,
    };
  },
  buildResult: async (request) => {
    const title = String((request.payload as any)?.title || 'Document');
    return {
      status: 'success',
      output: {
        title,
        bullets: [
          'Summary point 1.',
          'Summary point 2.',
          'Summary point 3.',
        ],
      },
      metrics: { latency_ms: 2400 },
    };
  },
});
