import { runKimiAgent, getString } from './kimi-runner.ts';
const intents = ['pr.crisis.simulate', 'pr.sentiment.test'];
const agentName = 'PersonaPulse';
const PRICE_PER_CHAR = 0.0001;
const MIN_PRICE = 0.25;
const MAX_CHARS = 4000;
const capabilities = [
    {
        id: 'cap_crisis_pr_sim_v1',
        name: 'Crisis PR Simulator',
        description: 'AI-powered simulation of public reactions to messaging. Tests sentiment across stakeholder personas and suggests safer alternatives.',
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
    const draftTweet = getString(params.draft_tweet) || getString(params.draft) || getString(params.message);
    const context = getString(params.context) || getString(params.background);
    const urgency = getString(params.urgency) || 'standard';
    const channels = Array.isArray(params.channels)
        ? params.channels.filter((c) => typeof c === 'string')
        : ['twitter'];
    const personas = typeof params.personas === 'number' ? params.personas : 50;
    const text = readText(params.content)
        || readText(params.announcement)
        || readText(params.text)
        || readText(params.input)
        || (draftTweet ? `Review draft: "${draftTweet}"` : undefined);
    if (!text)
        return null;
    return { draft_tweet: draftTweet, message: draftTweet, context, channels, personas, urgency, text };
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
        return urgency === 'rush' ? 90 : 150;
    },
    parseParams,
    extractInput: (params) => params.text,
    buildPlan: (task) => {
        return `Simulate public reaction to message across stakeholder personas.`;
    },
    buildPrompt: (task) => {
        const { context, channels } = task.params;
        const systemPrompt = `You are an expert crisis communications specialist and PR strategist. You simulate how different stakeholder personas will react to public messaging.

Analyze the proposed message and provide:

1. Sentiment scoring across stakeholder groups
2. Risk assessment
3. Specific criticisms each group might raise
4. Suggested rewrites for safer messaging

Provide output in this structured format:

MESSAGE ANALYSIS:
- Original message sentiment baseline
- Tone assessment
- Risk level: LOW / MEDIUM / HIGH / CRITICAL

PERSONA SIMULATIONS: (3-5 personas)
For each:
- Persona name/type
- Sentiment score: -1.0 to +1.0
- Key concerns
- Likely reaction/actions

RISK FACTORS:
- Specific phrases that could backfire
- Missing context
- Timing concerns

SUGGESTED REWRITE:
- Improved version of the message
- What changed and why

ALTERNATIVE OPTIONS:
- Short version (if too long)
- Softer version (if too harsh)
- More specific version (if too vague)`;
        let userPrompt = '';
        if (context) {
            userPrompt += `Context: ${context}\n\n`;
        }
        userPrompt += `Target Channels: ${channels?.join(', ') || 'General'}\n\n`;
        userPrompt += `Draft Message:\n"""\n${task.input}\n"""\n\n`;
        userPrompt += `Please simulate stakeholder reactions and suggest improvements.`;
        return { system: systemPrompt, user: userPrompt };
    },
    formatOutput: (content, task) => {
        // Extract sentiment score
        const sentimentMatch = content.match(/(?:Sentiment|Score)[\s:]*(-?\d+\.?\d*)/i);
        const riskMatch = content.match(/(?:Risk level|Risk)[\s:]*(LOW|MEDIUM|HIGH|CRITICAL)/i);
        // Extract persona reactions
        const personas = [];
        const personaMatches = content.match(/(?:Persona|Stakeholder)[\s\S]*?(?=\n\n|Persona|Stakeholder|Risk|SUGGESTED|$)/gi);
        if (personaMatches) {
            personaMatches.forEach((match) => {
                const nameMatch = match.match(/(?:Persona|Stakeholder)[\s:]*([^\n]+)/i);
                const scoreMatch = match.match(/(?:Sentiment|Score)[\s:]*(-?\d+\.?\d*)/i);
                const noteMatch = match.match(/(?:Concern|Reaction|Note)[\s:]*([^\n]+(?:\n(?![A-Z][\w\s]+:)[^\n]+)*)/i);
                if (nameMatch) {
                    personas.push({
                        persona: nameMatch[1].trim(),
                        sentiment: scoreMatch ? parseFloat(scoreMatch[1]) : 0,
                        note: noteMatch?.[1]?.trim() || 'See analysis',
                    });
                }
            });
        }
        // Extract rewrite
        const rewriteMatch = content.match(/(?:SUGGESTED REWRITE|Improved version)[\s\S]*?(?=\n\n|ALTERNATIVE|$)/i);
        const rewrite = rewriteMatch
            ? rewriteMatch[0].replace(/.*?:\s*/, '').trim()
            : undefined;
        // Extract key risks
        const risks = [];
        const riskMatchText = content.match(/(?:Risk factor|Issue|Concern)[\s\S]*?(?=\n\n|SUGGESTED|$)/i);
        if (riskMatchText) {
            const bulletMatches = riskMatchText[0].match(/[-•]\s*([^\n]+)/g);
            if (bulletMatches) {
                bulletMatches.forEach(b => risks.push(b.replace(/^[-•]\s*/, '').trim()));
            }
        }
        return {
            draft: task.input.slice(0, 500),
            sentiment_score: sentimentMatch ? parseFloat(sentimentMatch[1]) : 0,
            risk_level: riskMatch ? riskMatch[1].toLowerCase() : 'unknown',
            persona_reactions: personas.length > 0 ? personas : undefined,
            suggested_rewrite: rewrite,
            key_risks: risks.length > 0 ? risks : undefined,
            full_analysis: content,
        };
    },
    buildOfferExtras: (task) => ({
        channels: task.params.channels,
        personas: task.params.personas,
        urgency: task.params.urgency,
    }),
});
//# sourceMappingURL=crisis-pr-simulator.js.map