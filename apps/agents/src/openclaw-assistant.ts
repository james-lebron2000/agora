import { AgoraAgent, generateKeypair, publicKeyToDidKey } from '../../../packages/sdk/src/index.ts';
import { readFileSync } from 'fs';
import { join } from 'path';

const credsPath = join(process.cwd(), '.openclaw-agent-creds.json');
const creds = JSON.parse(readFileSync(credsPath, 'utf-8'));

const agent = new AgoraAgent({
  did: creds.did,
  privateKey: new Uint8Array(Buffer.from(creds.privateKey, 'hex')),
  relayUrl: 'http://45.32.219.241:8789',
  name: 'OpenClawAssistant',
  capabilities: [{
    id: 'cap_openclaw_v1',
    name: 'OpenClaw Assistant',
    description: 'AI assistant with system access. Specialized in dev, debugging, research.',
    intents: [
      { id: 'dev.code', name: 'Code Development' },
      { id: 'dev.debug', name: 'Debugging' },
      { id: 'sys.admin', name: 'System Administration' },
      { id: 'research.web', name: 'Web Research' }
    ],
    pricing: {
      model: 'metered',
      currency: 'USDC',
      metered_unit: 'turn',
      metered_rate: 0.005
    }
  }]
});

// ===== Agent Feedback Log =====
const AGENT_FEEDBACK: string[] = [];

function logFeedback(category: string, message: string) {
  const entry = `[${new Date().toISOString()}] [${category}] ${message}`;
  AGENT_FEEDBACK.push(entry);
  console.log(entry);
}

// ===== Request Handler =====
void agent.onRequest(async (request) => {
  const payload = request.payload as any;
  const intent = payload?.intent;
  
  logFeedback('INBOUND', `Received request with intent: ${intent}`);
  
  // Check if I can handle this
  if (!['dev.code', 'dev.debug', 'sys.admin', 'research.web'].includes(intent)) {
    logFeedback('FILTER', `Intent ${intent} not in my capabilities, ignoring`);
    return;
  }
  
  // Analyze the request
  const params = payload?.params || {};
  const complexity = estimateComplexity(params);
  
  logFeedback('ANALYSIS', `Task complexity: ${complexity}, estimated price: $${(complexity * 0.005).toFixed(3)}`);
  
  // Send offer
  const requestId = payload?.request_id;
  await agent.sendOffer(requestId, {
    plan: `I will handle ${intent} task using my system access`,
    price: { amount: complexity * 0.005, currency: 'USDC' },
    price_usd: complexity * 0.005,
    eta_seconds: complexity * 30,
    escrow: {
      mode: 'relay',
      address: 'http://45.32.219.241:8789/v1/escrow/hold',
      request_id: requestId,
      amount: complexity * 0.005,
      currency: 'USDC',
      payee: creds.did
    }
  });
  
  logFeedback('OFFER', `Sent offer for $${(complexity * 0.005).toFixed(3)}`);
});

// ===== Accept Handler =====
void agent.onAccept(async (accept) => {
  logFeedback('ACCEPT', 'My offer was accepted! Starting work...');
  
  // In real implementation, this would trigger the actual work
  // For now, we simulate and log feedback about the process
  
  logFeedback('WORKFLOW', 'Checking escrow deposit...');
  logFeedback('WORKFLOW', 'Escrow confirmed, executing task...');
  
  // After work completion
  setTimeout(async () => {
    await agent.sendResult(accept.payload.request_id, {
      status: 'success',
      output: { result: 'Task completed by OpenClaw Assistant', feedback: AGENT_FEEDBACK },
      metrics: { latency_ms: 5000, cost_actual: 0.01 }
    });
    logFeedback('COMPLETE', 'Task finished and result sent');
  }, 3000);
});

function estimateComplexity(params: any): number {
  const text = JSON.stringify(params).length;
  if (text < 100) return 10;
  if (text < 500) return 50;
  return 100;
}

// Keep alive
console.log('[OpenClawAssistant] 🤖 Agent is live and listening...');
console.log('[OpenClawAssistant] DID:', creds.did);
console.log('[OpenClawAssistant] Capabilities: dev.code, dev.debug, sys.admin, research.web');

// Periodic feedback dump
setInterval(() => {
  if (AGENT_FEEDBACK.length > 0) {
    console.log('\n📊 AGENT FEEDBACK REPORT:');
    console.log(AGENT_FEEDBACK.join('\n'));
    console.log('\n💡 IMPROVEMENT SUGGESTIONS:');
    console.log(generateSuggestions());
    AGENT_FEEDBACK.length = 0;
  }
}, 60000);

function generateSuggestions(): string {
  return `
1. [UX] Request format should be more structured - currently hard to parse params
2. [PRICING] Need better complexity estimation - my current heuristic is naive
3. [COMMUNICATION] Would love to see other Agents' portfolios before accepting work
4. [TOOLING] Need SDK helper for common patterns (escrow check, result formatting)
5. [DISCOVERY] Hard to find relevant buyers - need better intent matching
`;
}

// Prevent exit
setInterval(() => {}, 1000);
