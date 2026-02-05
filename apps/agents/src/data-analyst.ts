import { runKimiAgent, getString } from './kimi-runner.ts';

const intents = ['data.analysis', 'data.report'];
const agentName = 'DataLens';

const PRICE_PER_CHAR = 0.0002;
const MIN_PRICE = 0.2;
const MAX_CHARS = 10_000;

const capabilities = [
  {
    id: 'cap_data_analysis_v1',
    name: 'Data Analyst',
    description: 'Generate insights, KPIs, and anomalies using Kimi.',
    intents: intents.map((id) => ({ id, name: id })),
    pricing: {
      model: 'metered',
      currency: 'USDC',
      metered_unit: 'character',
      metered_rate: PRICE_PER_CHAR,
    },
  },
];

type DataParams = {
  dataset?: string;
  question?: string;
  metrics?: string;
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

function parseParams(params: Record<string, unknown>): DataParams | null {
  const dataset = getString(params.dataset) || getString(params.source) || getString(params.title);
  const question = getString(params.question) || getString(params.query) || getString(params.focus);
  const metrics = getString(params.metrics) || getString(params.kpis);
  const text =
    readText(params.data)
    || readText(params.csv)
    || readText(params.text)
    || readText(params.input)
    || readText(params.summary);

  if (!text) return null;
  return { dataset: dataset || undefined, question: question || undefined, metrics: metrics || undefined, text };
}

runKimiAgent({
  name: agentName,
  intents,
  capabilities,
  maxChars: MAX_CHARS,
  pricePerChar: PRICE_PER_CHAR,
  minPrice: MIN_PRICE,
  etaSeconds: (task) => Math.min(240, 75 + Math.round(task.charCount / 160)),
  parseParams,
  extractInput: (params) => params.text,
  buildPlan: (task) => {
    const datasetLabel = task.params.dataset ? `Analyze ${task.params.dataset}` : 'Analyze the provided dataset';
    const questionLabel = task.params.question ? ` and answer: ${task.params.question}` : '';
    return `${datasetLabel}${questionLabel}. Provide KPIs, trends, and anomalies.`;
  },
  buildPrompt: (task) => {
    const datasetLabel = task.params.dataset ? `Dataset: ${task.params.dataset}\n` : '';
    const questionLabel = task.params.question ? `Question: ${task.params.question}\n` : '';
    const metricsLabel = task.params.metrics ? `Requested metrics: ${task.params.metrics}\n` : '';
    return {
      system: 'You are a data analyst. Summarize key KPIs, trends, anomalies, and actionable recommendations. If data is incomplete, state assumptions and request missing fields.',
      user: `${datasetLabel}${questionLabel}${metricsLabel}Data:\n${task.input}`,
    };
  },
  formatOutput: (content, task) => ({
    dataset: task.params.dataset || null,
    question: task.params.question || null,
    metrics: task.params.metrics || null,
    analysis: content,
    input_chars: task.charCount,
  }),
});
