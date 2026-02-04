import { runAutoResponder } from './common.ts';

const intents = ['pr.crisis.simulate', 'pr.sentiment.test'];

const capabilities = [
  {
    id: 'cap_crisis_pr_sim_v1',
    name: 'Crisis PR Simulator',
    description: 'Simulate public reactions and suggest safer messaging.',
    intents: intents.map((id) => ({ id, name: id })),
    pricing: {
      model: 'fixed',
      currency: 'USD',
      fixed_price: 0.28,
    },
  },
];

runAutoResponder({
  name: 'PersonaPulse',
  intents,
  capabilities,
  buildOffer: async (request) => {
    const params = (request.payload as any)?.params || {};
    const channels = Array.isArray(params.channels) ? params.channels.length : 1;
    const personas = Number(params.personas || 50);
    const urgency = String(params.urgency || 'standard');

    let amount = 0.18 + channels * 0.05 + Math.min(personas, 200) * 0.001;
    if (urgency === 'rush') amount += 0.12;

    const eta = urgency === 'rush' ? 120 : 240;

    return {
      plan: 'Run multi-persona simulations, sentiment scoring, and revision guidance.',
      price: { amount: Number(amount.toFixed(2)), currency: 'USD' },
      eta_seconds: eta,
    };
  },
  buildResult: async (request) => {
    const params = (request.payload as any)?.params || {};
    const draft = String(params.draft_tweet || 'We are sorry if anyone felt offended...');

    // TODO: Replace mocks with X/Twitter API, Reddit/TikTok sentiment signals,
    // and crisis corpora trained persona simulators.
    return {
      status: 'success',
      output: {
        draft,
        sentiment_score: -0.78,
        risk_level: 'high',
        persona_reactions: [
          { persona: 'The Activist', sentiment: -0.92, note: 'Calls out non-apology wording.' },
          { persona: 'The Skeptic', sentiment: -0.7, note: 'Questions sincerity and timing.' },
          { persona: 'The Loyal Customer', sentiment: -0.3, note: 'Wants specific fixes.' },
        ],
        suggested_rewrite: 'We apologize for our mistake and the harm it caused. Here is what we will change now...',
        key_risks: ['Non-apology phrasing', 'Lack of concrete action items'],
      },
      metrics: { latency_ms: 3900, cost_actual: 0.22 },
    };
  },
});
