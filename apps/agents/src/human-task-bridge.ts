import { runKimiAgent, getString } from './kimi-runner.ts';

const intents = ['physical.action', 'human.verify'];
const agentName = 'HumanBridge';

const PRICE_PER_CHAR = 0.00015;
const MIN_PRICE = 0.5;
const MAX_CHARS = 3000;

const capabilities = [
  {
    id: 'cap_human_task_bridge_v1',
    name: 'Human Task Bridge',
    description: 'AI-powered task planning and coordination for physical-world actions requiring human execution. Creates detailed task specifications for human operators.',
    intents: intents.map((id) => ({ id, name: id })),
    pricing: {
      model: 'metered',
      currency: 'USDC',
      metered_unit: 'character',
      metered_rate: PRICE_PER_CHAR,
    },
  },
];

type HumanTaskParams = {
  task?: string;
  location?: string;
  urgency?: string;
  complexity?: number;
  proof_type?: string;
  requirements?: string[];
  text: string;
};

function readText(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined;
  if (Array.isArray(value)) {
    const joined = value.filter((item) => typeof item === 'string').join('\n');
    return joined.trim() || undefined;
  }
  return undefined;
}

function parseParams(params: Record<string, unknown>): HumanTaskParams | null {
  const task = getString(params.task) || getString(params.action) || getString(params.job);
  const location = getString(params.location) || getString(params.city) || 'remote';
  const urgency = getString(params.urgency) || 'standard';
  const complexity = typeof params.complexity === 'number' ? params.complexity : 1;
  const proofType = getString(params.proof_type) || getString(params.proof) || 'description';

  const requirements = Array.isArray(params.requirements)
    ? params.requirements.filter((r): r is string => typeof r === 'string')
    : [];

  const text =
    readText(params.details)
    || readText(params.instructions)
    || readText(params.description)
    || readText(params.text)
    || readText(params.input)
    || (task ? `Human task: ${task} at ${location}` : undefined);

  if (!text) return null;

  return { task, location, urgency, complexity, proof_type: proofType, requirements, text };
}

runKimiAgent({
  name: agentName,
  intents,
  capabilities,
  maxChars: MAX_CHARS,
  pricePerChar: PRICE_PER_CHAR,
  minPrice: MIN_PRICE,
  etaSeconds: (task) => {
    const urgency = (task.params.urgency || 'standard').toLowerCase();
    const complexity = task.params.complexity || 1;
    const baseEta = urgency === 'rush' ? 60 : 120;
    return baseEta + complexity * 30;
  },
  parseParams,
  extractInput: (params) => params.text,
  buildPlan: (task) => {
    const { task: taskName, location } = task.params;
    const taskLabel = taskName || 'physical task';
    const locLabel = location || 'specified location';
    return `Plan and coordinate human execution of ${taskLabel} at ${locLabel}.`;
  },
  buildPrompt: (task) => {
    const { task: taskName, location, complexity, proof_type } = task.params;

    const systemPrompt = `You are an expert operations coordinator specializing in planning and specifying human-executed tasks.

⚠️ NOTE: This agent plans and specifies tasks for human operators. Actual execution requires integration with human task marketplaces (e.g., TaskRabbit, MTurk, Field Agent).

Analyze the task requirements and create:

1. Detailed task specification
2. Required skills and qualifications
3. Estimated time and cost
4. Verification/proof requirements
5. Risk assessment

Provide output in this structured format:

TASK SPECIFICATION:
- Task name
- Detailed description
- Success criteria
- Deliverables

OPERATIONAL PLAN:
- Location: Address or area
- Time estimate: Hours
- Skill level required: Basic/Intermediate/Expert
- Equipment/tools needed

PERSONNEL REQUIREMENTS:
- Required skills
- Certifications (if any)
- Background checks needed
- Estimated labor cost

VERIFICATION PROTOCOL:
- Proof of completion type
- Documentation required
- Quality checkpoints
- Approval process

RISK & COMPLIANCE:
- Safety considerations
- Legal requirements
- Insurance implications
- Contingency plans`;

    let userPrompt = '';

    if (taskName) userPrompt += `Task: ${taskName}\n`;
    if (location) userPrompt += `Location: ${location}\n`;
    if (complexity) userPrompt += `Complexity Level: ${complexity}/5\n`;
    if (proof_type) userPrompt += `Proof Type: ${proof_type}\n`;

    userPrompt += `\nTask Details:\n${task.input}\n\n`;

    userPrompt += `Please create a complete task specification for human execution.`;

    return { system: systemPrompt, user: userPrompt };
  },
  formatOutput: (content, task) => {
    const { task: taskName, location, complexity, proof_type } = task.params;

    // Extract time estimate
    const timeMatch = content.match(/(?:Time estimate|Duration)[\s:]*(\d+(?:\.\d+)?)\s*(hour|hr|h)/i);
    const costMatch = content.match(/(?:Cost|Budget|Price)[\s:]*\$?(\d+(?:\.\d+)?)/i);

    // Extract deliverables
    const deliverables: string[] = [];
    const deliverMatch = content.match(/(?:Deliverable|Output|Result)[\s\S]*?(?=\n\n|Verification|Risk|$)/i);
    if (deliverMatch) {
      const bulletMatches = deliverMatch[0].match(/[-•]\s*([^\n]+)/g);
      if (bulletMatches) {
        bulletMatches.forEach(b => deliverables.push(b.replace(/^[-•]\s*/, '').trim()));
      }
    }

    // Generate task ID
    const taskId = `HTB-${Date.now().toString(36).toUpperCase()}`;

    return {
      task: taskName || 'Unspecified Task',
      location: location || 'remote',
      task_specification: {
        complexity: complexity || 1,
        estimated_hours: timeMatch ? parseFloat(timeMatch[1]) : undefined,
        estimated_cost_usd: costMatch ? parseFloat(costMatch[1]) : undefined,
        proof_required: proof_type || 'description',
      },
      deliverables: deliverables.length > 0 ? deliverables : undefined,
      task_id: taskId,
      status: 'planned',
      notes: [
        'Task specification complete',
        'Requires human operator assignment',
        'Integration with task marketplace pending',
      ],
      full_specification: content,
    };
  },
  buildOfferExtras: (task) => ({
    task_type: task.params.task,
    location: task.params.location,
    complexity: task.params.complexity,
    proof_type: task.params.proof_type,
    note: 'Task planning only - human execution marketplace integration required',
  }),
});
