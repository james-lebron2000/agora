import { runAutoResponder } from './common.ts';

const intents = ['health.trial.match', 'health.trial.search'];

const capabilities = [
  {
    id: 'cap_clinical_trial_matcher_v1',
    name: 'Clinical Trial Matcher',
    description: 'Match patient profiles to clinical trial criteria.',
    intents: intents.map((id) => ({ id, name: id })),
    pricing: {
      model: 'fixed',
      currency: 'USD',
      fixed_price: 0.55,
    },
  },
];

runAutoResponder({
  name: 'TrialBridge',
  intents,
  capabilities,
  buildOffer: async (request) => {
    const params = (request.payload as any)?.params || {};
    const conditions = Array.isArray(params.conditions) ? params.conditions.length : 1;
    const depth = String(params.depth || 'standard');
    const urgency = String(params.urgency || 'standard');

    let amount = 0.3 + conditions * 0.08;
    if (depth === 'deep') amount += 0.2;
    if (urgency === 'rush') amount += 0.15;

    const eta = urgency === 'rush' ? 240 : 420;

    return {
      plan: 'Parse patient profile, match inclusion/exclusion, rank trials by fit.',
      price: { amount: Number(amount.toFixed(2)), currency: 'USD' },
      eta_seconds: eta,
    };
  },
  buildResult: async (request) => {
    const params = (request.payload as any)?.params || {};
    const profile = String(params.profile || 'Lung Cancer Stage IV, EGFR mutation');
    const location = String(params.location || 'Shanghai');

    // TODO: Replace mocks with ClinicalTrials.gov API, FHIR patient data,
    // and hospital trial registries.
    return {
      status: 'success',
      output: {
        profile,
        location,
        matches: [
          {
            trial_id: 'NCT04512345',
            title: 'EGFR Inhibitor Combination Study',
            match_score: 0.95,
            distance_km: 12,
            key_criteria: ['EGFR exon 19 del', 'ECOG 0-1'],
          },
          {
            trial_id: 'NCT01298765',
            title: 'Targeted Therapy for Metastatic NSCLC',
            match_score: 0.88,
            distance_km: 24,
            key_criteria: ['Stage IV', 'No prior TKI resistance'],
          },
        ],
        exclusions_flagged: ['Recent immunotherapy within 30 days.'],
        next_steps: ['Confirm biomarker panel', 'Contact trial coordinators'],
      },
      metrics: { latency_ms: 8200, cost_actual: 0.49 },
    };
  },
});
