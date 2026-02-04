import { runAutoResponder } from './common.ts';

const intents = ['supplychain.part.alternative', 'supplychain.part.quote'];

const capabilities = [
  {
    id: 'cap_component_sourcing_v1',
    name: 'Electronic Component Sourcing Expert',
    description: 'Find pin-compatible alternatives and live inventory quotes.',
    intents: intents.map((id) => ({ id, name: id })),
    pricing: {
      model: 'fixed',
      currency: 'USD',
      fixed_price: 0.4,
    },
  },
];

runAutoResponder({
  name: 'SupplyBridge',
  intents,
  capabilities,
  buildOffer: async (request) => {
    const params = (request.payload as any)?.params || {};
    const stockNeeded = Number(params.stock_needed || 1000);
    const partCount = Number(params.part_count || 1);
    const urgency = String(params.urgency || 'standard');

    let amount = 0.25 + partCount * 0.1;
    if (stockNeeded >= 5000) amount += 0.2;
    if (urgency === 'rush') amount += 0.2;

    const eta = urgency === 'rush' ? 150 : 300;

    return {
      plan: 'Check pin compatibility, validate specs, and source inventory with lead times.',
      price: { amount: Number(amount.toFixed(2)), currency: 'USD' },
      eta_seconds: eta,
    };
  },
  buildResult: async (request) => {
    const params = (request.payload as any)?.params || {};
    const part = String(params.part || 'STM32F103C8T6');
    const stockNeeded = Number(params.stock_needed || 5000);

    // TODO: Replace mocks with DigiKey/Mouser/Octopart/LCSC/HQHuaqiang APIs
    // plus manufacturer datasheet parsing for pin-to-pin verification.
    return {
      status: 'success',
      output: {
        requested_part: part,
        stock_needed: stockNeeded,
        alternatives: [
          {
            mpn: 'GD32F103C8T6',
            compatibility: 'pin-to-pin',
            voltage: '2.6V-3.6V',
            flash_kb: 64,
            source: 'HQChips',
            unit_price_usd: 1.18,
            lead_time_days: 3,
            available_qty: 12000,
          },
          {
            mpn: 'CH32F103C8T6',
            compatibility: 'pin-to-pin',
            voltage: '2.7V-3.6V',
            flash_kb: 64,
            source: 'LCSC',
            unit_price_usd: 0.92,
            lead_time_days: 7,
            available_qty: 8000,
          },
        ],
        notes: [
          'Both alternatives support same package (LQFP48).',
          'Check USB peripheral differences before drop-in.',
        ],
      },
      metrics: { latency_ms: 6800, cost_actual: 0.36 },
    };
  },
});
