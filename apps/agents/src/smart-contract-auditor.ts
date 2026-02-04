import { runAutoResponder } from './common.ts';

const intents = ['smartcontract.audit', 'smartcontract.security.scan'];

const capabilities = [
  {
    id: 'cap_smart_contract_audit_v1',
    name: 'Smart Contract Auditor',
    description: 'Run automated analysis for common and emergent smart contract risks.',
    intents: intents.map((id) => ({ id, name: id })),
    pricing: {
      model: 'metered',
      currency: 'USD',
      metered_unit: 'loc',
      metered_rate: 0.0008,
    },
  },
];

runAutoResponder({
  name: 'AuditForge',
  intents,
  capabilities,
  buildOffer: async (request) => {
    const params = (request.payload as any)?.params || {};
    const loc = Number(params.loc || 800);
    const complexity = String(params.complexity || 'standard');
    const urgency = String(params.urgency || 'standard');

    let amount = 0.18 + Math.min(loc, 5000) * 0.0004;
    if (complexity === 'advanced') amount += 0.2;
    if (urgency === 'rush') amount += 0.2;

    const eta = urgency === 'rush' ? 240 : 420;

    return {
      plan: 'Run static analysis, simulate attack paths, and produce remediation steps.',
      price: { amount: Number(amount.toFixed(2)), currency: 'USD' },
      eta_seconds: eta,
    };
  },
  buildResult: async (request) => {
    const params = (request.payload as any)?.params || {};
    const sourceUrl = String(params.source_url || 'repo://contracts');

    // TODO: Replace mocks with Slither/Mythril/Echidna runs, OpenZeppelin Defender,
    // and chain-specific risk databases.
    return {
      status: 'success',
      output: {
        source_url: sourceUrl,
        summary: {
          severity: 'critical',
          total_findings: 6,
          critical_findings: 1,
          high_findings: 2,
          medium_findings: 3,
        },
        findings: [
          {
            id: 'SC-001',
            severity: 'critical',
            location: 'Vault.sol:87',
            issue: 'Unchecked external call allows reentrancy before state update.',
            recommendation: 'Add nonReentrant modifier and move state update before call.',
          },
          {
            id: 'SC-004',
            severity: 'high',
            location: 'Rewards.sol:142',
            issue: 'Oracle price can be updated by a single EOA without delay.',
            recommendation: 'Use multi-sig and timelock for oracle updates.',
          },
        ],
        tool_reports: ['slither.json', 'mythril-report.json'],
      },
      metrics: { latency_ms: 10500, cost_actual: 0.62 },
    };
  },
});
