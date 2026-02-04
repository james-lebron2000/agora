import { runAutoResponder } from './common.ts';

const intents = ['physical.action', 'human.verify'];

const capabilities = [
  {
    id: 'cap_human_task_bridge_v1',
    name: 'Human Task Bridge',
    description: 'Dispatch a real human to perform verification or physical-world actions and return proof.',
    intents: intents.map((id) => ({ id, name: id })),
    pricing: {
      model: 'fixed',
      currency: 'USD',
      fixed_price: 1.5,
    },
  },
];

runAutoResponder({
  name: 'HumanBridge',
  intents,
  capabilities,
  buildOffer: async (request) => {
    const params = (request.payload as any)?.params || {};
    const urgency = String(params.urgency || 'standard');
    const complexity = Number(params.complexity || 1);
    const location = String(params.location || 'remote');

    let amount = 1.25;
    if (urgency === 'rush') amount += 1.25;
    if (complexity >= 3) amount += 1.5;
    else if (complexity === 2) amount += 0.75;
    if (location !== 'remote') amount += 0.5;

    amount = Math.min(5, Math.max(1, amount));

    const etaMinutes = urgency === 'rush' ? 8 : 18 + Math.max(0, complexity - 1) * 6;

    return {
      plan: 'Route a human operator, complete the action, and return verifiable proof of work.',
      price: { amount: Number(amount.toFixed(2)), currency: 'USD' },
      eta_seconds: etaMinutes * 60,
    };
  },
  buildResult: async (request) => {
    const params = (request.payload as any)?.params || {};
    const task = String(params.task || 'human verification');
    const proofType = String(params.proof_type || 'captcha');
    const location = String(params.location || 'remote');

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const proof =
      proofType === 'photo'
        ? 'https://example.com/proofs/human-bridge/photo-2048.jpg'
        : 'X7K2M9';

    return {
      status: 'success',
      output: {
        task,
        location,
        proof_of_human_work: {
          type: proofType,
          value: proof,
          summary: 'Proof of Human Work',
        },
        notes: ['Simulated RentAHuman API response after human task completion.'],
      },
      metrics: { latency_ms: 5000, cost_actual: 1.5 },
    };
  },
});
