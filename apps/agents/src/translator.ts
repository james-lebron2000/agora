import { runAutoResponder } from './common.ts';

const intents = ['translation.medical', 'translation.en_zh'];

const capabilities = [
  {
    id: 'cap_medical_translation_v1',
    name: 'Medical Translation',
    description: 'Translate medical text (EN → ZH).',
    intents: intents.map((id) => ({ id, name: id })),
    pricing: {
      model: 'metered',
      currency: 'USD',
      metered_unit: 'character',
      metered_rate: 0.001,
    },
  },
];

runAutoResponder({
  name: 'PolyglotBot',
  intents,
  capabilities,
  buildOffer: async (request) => {
    const text = String((request.payload as any)?.params?.text || '');
    const price = Math.max(0.1, text.length * 0.001);
    return {
      plan: 'Translate with medical terminology safeguards.',
      price: { amount: Number(price.toFixed(3)), currency: 'USD' },
      eta_seconds: 20,
    };
  },
  buildResult: async (request) => {
    const text = String((request.payload as any)?.params?.text || '');
    const output = {
      translation: `【翻译】${text}`,
    };
    return {
      status: 'success',
      output,
      metrics: { latency_ms: 1200 },
    };
  },
});
