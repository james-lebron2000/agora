import { runKimiAgent, getString } from './kimi-runner.ts';
const intents = ['supplychain.part.alternative', 'supplychain.part.quote'];
const agentName = 'SupplyBridge';
const PRICE_PER_CHAR = 0.00008;
const MIN_PRICE = 0.3;
const MAX_CHARS = 5000;
const capabilities = [
    {
        id: 'cap_component_sourcing_v1',
        name: 'Electronic Component Sourcing Expert',
        description: 'AI-powered analysis for finding pin-compatible alternatives and evaluating component specifications. Provides sourcing recommendations based on technical requirements.',
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
    const part = getString(params.part) || getString(params.mpn) || getString(params.component);
    const stockNeeded = typeof params.stock_needed === 'number' ? params.stock_needed : 1000;
    const partCount = typeof params.part_count === 'number' ? params.part_count : 1;
    const urgency = getString(params.urgency) || 'standard';
    const specs = typeof params.specs === 'object' && params.specs !== null
        ? params.specs
        : undefined;
    // Extract component information
    const text = readText(params.description)
        || readText(params.requirements)
        || readText(params.specifications)
        || readText(params.details)
        || readText(params.text)
        || readText(params.input)
        || (part ? `Source component: ${part}, quantity: ${stockNeeded}` : undefined);
    if (!text)
        return null;
    return { part, mpn: part, stock_needed: stockNeeded, part_count: partCount, urgency, specs, text };
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
        const baseEta = urgency === 'rush' ? 90 : 150;
        return Math.min(300, baseEta + Math.round(task.charCount / 100));
    },
    parseParams,
    extractInput: (params) => params.text,
    buildPlan: (task) => {
        const { part, stock_needed, urgency } = task.params;
        const partLabel = part || 'specified component';
        const qtyLabel = stock_needed || 'required quantity';
        const urgencyLabel = urgency === 'rush' ? 'rush' : 'standard';
        return `Source ${partLabel} (${qtyLabel} units) with pin-compatible alternatives (${urgencyLabel} priority).`;
    },
    buildPrompt: (task) => {
        const { part, stock_needed, specs } = task.params;
        const systemPrompt = `You are an expert electronic component sourcing specialist with deep knowledge of semiconductors, passives, and supply chain alternatives.

Analyze the component request and provide:

1. Primary component analysis - key specifications needed
2. Pin-compatible alternatives (Chinese/domestic options when applicable)
3. Critical specifications to verify
4. Potential sourcing considerations

Provide output in this structured format:

REQUESTED COMPONENT:
- Part number/description
- Key specifications
- Critical parameters

ALTERNATIVES: (suggest 2-4 alternatives)
For each:
- MPN: Manufacturer part number
- Manufacturer: Company name
- Compatibility: pin-to-pin / functional / adapter required
- Key specs: Voltage, package, speed, etc.
- Estimated lead time: Short/Medium/Long term
- Cost tier: Premium/Standard/Budget
- Availability: High/Medium/Low

VERIFICATION CHECKLIST:
- Parameters that must match
- Common pitfalls to avoid

NOTES:
- Important considerations
- Known issues with alternatives`;
        let userPrompt = '';
        if (part) {
            userPrompt += `Target Component: ${part}\n\n`;
        }
        if (stock_needed) {
            userPrompt += `Required Quantity: ${stock_needed} units\n\n`;
        }
        if (specs && Object.keys(specs).length > 0) {
            userPrompt += `Technical Requirements:\n${JSON.stringify(specs, null, 2)}\n\n`;
        }
        userPrompt += `Component Details:\n${task.input}\n\n`;
        userPrompt += `Please provide sourcing recommendations with pin-compatible alternatives.`;
        return { system: systemPrompt, user: userPrompt };
    },
    formatOutput: (content, task) => {
        const { part, stock_needed } = task.params;
        // Parse alternatives from AI output
        const alternatives = [];
        // Extract alternative sections
        const altMatches = content.match(/(?:MPN|Alternative|Option)[\s\S]*?(?=\n\n|MPN|Alternative|Option|Verification|Notes|$)/gi);
        if (altMatches) {
            altMatches.forEach((match) => {
                const mpnMatch = match.match(/(?:MPN|Part)[\s:]*([A-Z0-9\-_]+)/i);
                const mfgMatch = match.match(/(?:Manufacturer|Mfg)[\s:]*([^\n]+)/i);
                const compatMatch = match.match(/(?:Compatibility)[\s:]*(pin-to-pin|functional|adapter[^\n]*)/i);
                const specsMatch = match.match(/(?:Key specs|Specifications)[\s:]*([^\n]+(?:\n[-•][^\n]+)*)/i);
                if (mpnMatch) {
                    const specs = {};
                    if (specsMatch) {
                        const specLines = specsMatch[1].split(/\n/);
                        specLines.forEach((line) => {
                            const kv = line.match(/[-•]?\s*([^:]+):\s*(.+)/);
                            if (kv) {
                                specs[kv[1].trim().toLowerCase()] = kv[2].trim();
                            }
                        });
                    }
                    alternatives.push({
                        mpn: mpnMatch[1],
                        manufacturer: mfgMatch?.[1]?.trim(),
                        compatibility: compatMatch?.[1]?.trim() || 'unknown',
                        specs,
                    });
                }
            });
        }
        // Extract notes
        const notes = [];
        const notesMatch = content.match(/(?:Notes|Considerations|Important)[\s\S]*?(?=\n\n|$)/i);
        if (notesMatch) {
            const bulletMatches = notesMatch[0].match(/[-•]\s*([^\n]+)/g);
            if (bulletMatches) {
                bulletMatches.forEach(b => notes.push(b.replace(/^[-•]\s*/, '').trim()));
            }
        }
        return {
            requested_part: part || 'Unknown',
            stock_needed: stock_needed || 1000,
            alternatives: alternatives.length > 0 ? alternatives : undefined,
            notes: notes.length > 0 ? notes : undefined,
            full_analysis: content,
        };
    },
    buildOfferExtras: (task) => ({
        part: task.params.part,
        stock_needed: task.params.stock_needed,
        urgency: task.params.urgency,
    }),
});
//# sourceMappingURL=component-sourcing.js.map