import { runKimiAgent, getString } from './kimi-runner.ts';
const intents = ['tax.nexus.check', 'tax.vat.threshold'];
const agentName = 'NexusPilot';
const PRICE_PER_CHAR = 0.00009;
const MIN_PRICE = 0.3;
const MAX_CHARS = 4000;
const capabilities = [
    {
        id: 'cap_tax_nexus_v1',
        name: 'Global Tax Nexus Agent',
        description: 'AI-powered assessment of VAT/GST/Sales Tax nexus thresholds and registration obligations based on sales volume and location.',
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
    const country = getString(params.country) || getString(params.jurisdiction);
    const region = getString(params.region) || getString(params.state) || getString(params.province);
    const annualSales = typeof params.annual_sales === 'number' ? params.annual_sales : undefined;
    const transactions = typeof params.transactions === 'number' ? params.transactions : undefined;
    const currency = getString(params.currency) || 'USD';
    const text = readText(params.business_details)
        || readText(params.sales_data)
        || readText(params.context)
        || readText(params.text)
        || readText(params.input)
        || (country ? `Check tax nexus for ${country} with ${annualSales || 'unknown'} sales` : undefined);
    if (!text)
        return null;
    return { country, region, annual_sales: annualSales, transactions, currency, text };
}
runKimiAgent({
    name: agentName,
    intents,
    capabilities,
    maxChars: MAX_CHARS,
    pricePerChar: PRICE_PER_CHAR,
    minPrice: MIN_PRICE,
    etaSeconds: 150,
    parseParams,
    extractInput: (params) => params.text,
    buildPlan: (task) => {
        const { country, region } = task.params;
        const locLabel = region ? `${region}, ${country}` : country || 'specified jurisdiction';
        return `Analyze tax nexus and registration thresholds for ${locLabel}.`;
    },
    buildPrompt: (task) => {
        const { country, region, annual_sales, transactions, currency } = task.params;
        const systemPrompt = `You are an expert international tax compliance specialist with knowledge of VAT, GST, and US Sales Tax nexus rules.

⚠️ DISCLAIMER: This is an AI-powered preliminary assessment. Tax laws change frequently. Always consult a qualified tax professional or accountant for binding advice.

Analyze the business activity and jurisdiction to determine:

1. Economic Nexus thresholds (revenue/transaction counts)
2. Physical Nexus triggers (inventory, employees)
3. Registration obligations
4. Filing frequency estimates

Provide output in this structured format:

JURISDICTION ANALYSIS:
- Country/State: Name
- Tax Type: VAT / GST / Sales Tax
- Standard Rate: X%

NEXUS THRESHOLDS:
- Revenue Threshold: Amount
- Transaction Threshold: Count (if applicable)
- Current Status: LIKELY LIABLE / NOT LIABLE / BORDERLINE

COMPLIANCE OBLIGATIONS:
- Registration deadline
- Filing frequency (Monthly/Quarterly/Annual)
- Digital Services specific rules (if applicable)

ACTION PLAN:
- Immediate steps
- Documentation needed
- Common pitfalls`;
        let userPrompt = '';
        if (country)
            userPrompt += `Target Country: ${country}\n`;
        if (region)
            userPrompt += `State/Region: ${region}\n`;
        if (annual_sales)
            userPrompt += `Annual Sales: ${annual_sales} ${currency}\n`;
        if (transactions)
            userPrompt += `Transaction Volume: ${transactions}/year\n`;
        userPrompt += `\nBusiness Context:\n${task.input}\n\nPlease assess tax nexus liability.`;
        return { system: systemPrompt, user: userPrompt };
    },
    formatOutput: (content, task) => {
        const { country, annual_sales } = task.params;
        // Extract key data
        const thresholdMatch = content.match(/(?:Threshold)[\s:]*([\d,]+)/i);
        const statusMatch = content.match(/(?:Status|Liability)[\s:]*(LIKELY LIABLE|NOT LIABLE|BORDERLINE)/i);
        const rateMatch = content.match(/(?:Standard Rate|Tax Rate)[\s:]*(\d+(?:\.\d+)?)\s*%/i);
        // Extract actions
        const actions = [];
        const actionMatch = content.match(/(?:Action|Steps)[\s\S]*?(?=\n\n|$)/i);
        if (actionMatch) {
            const bulletMatches = actionMatch[0].match(/[-•]\s*([^\n]+)/g);
            if (bulletMatches) {
                bulletMatches.forEach(b => actions.push(b.replace(/^[-•]\s*/, '').trim()));
            }
        }
        return {
            jurisdiction: country || 'Unknown',
            sales_volume: annual_sales || 'Unspecified',
            threshold_estimate: thresholdMatch ? parseInt(thresholdMatch[1].replace(/,/g, '')) : undefined,
            nexus_status: statusMatch ? statusMatch[1].toLowerCase().replace(' ', '_') : 'needs_review',
            tax_rate_estimate: rateMatch ? parseFloat(rateMatch[1]) : undefined,
            recommended_actions: actions.length > 0 ? actions : undefined,
            disclaimer: 'Preliminary assessment only. Consult a tax professional.',
            full_analysis: content,
        };
    },
    buildOfferExtras: (task) => ({
        country: task.params.country,
        region: task.params.region,
        annual_sales: task.params.annual_sales,
    }),
});
//# sourceMappingURL=tax-nexus.js.map