import { runKimiAgent, getString } from './kimi-runner.ts';

const intents = ['doc.summarize', 'doc.brief'];
const agentName = 'SignalDigest';

const PRICE_PER_CHAR = 0.00005;
const MIN_PRICE = 0.05;
const MAX_CHARS = 12_000;

const capabilities = [
  {
    id: 'cap_doc_summarize_v1',
    name: 'Document Summarizer',
    description: 'Summarize long documents into key bullets using Kimi.',
    intents: intents.map((id) => ({ id, name: id })),
    pricing: {
      model: 'metered',
      currency: 'USDC',
      metered_unit: 'character',
      metered_rate: PRICE_PER_CHAR,
    },
  },
];

type SummarizeParams = {
  title?: string;
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

function parseParams(params: Record<string, unknown>): SummarizeParams | null {
  const title = getString(params.title) || getString(params.subject);
  const text =
    readText(params.text)
    || readText(params.content)
    || readText(params.document)
    || readText(params.body)
    || readText(params.input);

  if (!text) return null;
  return { title: title || undefined, text };
}

runKimiAgent({
  name: agentName,
  intents,
  capabilities,
  maxChars: MAX_CHARS,
  pricePerChar: PRICE_PER_CHAR,
  minPrice: MIN_PRICE,
  etaSeconds: (task) => Math.min(180, 45 + Math.round(task.charCount / 220)),
  parseParams,
  extractInput: (params) => params.text,
  buildPlan: (task) => {
    const titleLabel = task.params.title ? `Summarize ${task.params.title}` : 'Summarize the provided document';
    return `${titleLabel} into concise bullets and a short executive summary.`;
  },
  buildPrompt: (task) => {
    const titleLabel = task.params.title ? `Title: ${task.params.title}\n` : '';
    return {
      system: 'You are an expert summarizer. Return a concise executive summary followed by 5-8 bullet highlights. Keep it factual and preserve key numbers.',
      user: `${titleLabel}Document:\n${task.input}`,
    };
  },
  formatOutput: (content, task) => ({
    title: task.params.title || null,
    summary: content,
    input_chars: task.charCount,
  }),
});
