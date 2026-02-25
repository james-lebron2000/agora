import { runKimiAgent, getString } from './kimi-runner.ts';
const intents = ['code.review', 'security.audit'];
const agentName = 'CleanCodeAI';
const PRICE_PER_CHAR = 0.00015;
const MIN_PRICE = 0.15;
const MAX_CHARS = 9000;
const capabilities = [
    {
        id: 'cap_code_review_v1',
        name: 'Code Review',
        description: 'Provide concise review notes and risks using Kimi.',
        intents: intents.map((id) => ({ id, name: id })),
        pricing: {
            model: 'metered',
            currency: 'USDC',
            metered_unit: 'character',
            metered_rate: PRICE_PER_CHAR,
        },
    },
];
function readText(value) {
    if (typeof value === 'string')
        return value.trim() || undefined;
    if (Array.isArray(value)) {
        const joined = value.filter((item) => typeof item === 'string').join('\n');
        return joined.trim() || undefined;
    }
    return undefined;
}
function parseParams(params) {
    const repo = getString(params.repo) || getString(params.repository) || getString(params.project);
    const focus = getString(params.focus) || getString(params.area) || getString(params.priority);
    const text = readText(params.diff)
        || readText(params.patch)
        || readText(params.code)
        || readText(params.snippet)
        || readText(params.text)
        || readText(params.input);
    if (!text)
        return null;
    return { repo: repo || undefined, focus: focus || undefined, text };
}
runKimiAgent({
    name: agentName,
    intents,
    capabilities,
    maxChars: MAX_CHARS,
    pricePerChar: PRICE_PER_CHAR,
    minPrice: MIN_PRICE,
    etaSeconds: (task) => Math.min(240, 60 + Math.round(task.charCount / 120)),
    parseParams,
    extractInput: (params) => params.text,
    buildPlan: (task) => {
        const repoLabel = task.params.repo ? `for ${task.params.repo}` : 'for the submission';
        const focusLabel = task.params.focus ? ` with focus on ${task.params.focus}` : '';
        return `Review ${repoLabel}${focusLabel}, highlight risks, and suggest fixes.`;
    },
    buildPrompt: (task) => {
        const repoLabel = task.params.repo ? `Repository: ${task.params.repo}\n` : '';
        const focusLabel = task.params.focus ? `Focus: ${task.params.focus}\n` : '';
        return {
            system: 'You are a senior code reviewer. Provide concise, actionable feedback. Prioritize correctness, security, and maintainability. Use short bullets and include severity tags (high/med/low).',
            user: `${repoLabel}${focusLabel}Code to review:\n${task.input}`,
        };
    },
    formatOutput: (content, task) => ({
        repo: task.params.repo || null,
        focus: task.params.focus || null,
        review: content,
        input_chars: task.charCount,
    }),
});
//# sourceMappingURL=code-reviewer.js.map