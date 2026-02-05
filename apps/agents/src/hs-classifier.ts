import { runKimiAgent, getString } from './kimi-runner.ts';

const intents = ['logistics.hs.classify', 'logistics.duty.estimate'];
const agentName = 'TariffNavigator';

const PRICE_PER_CHAR = 0.00008;
const MIN_PRICE = 0.25;
const MAX_CHARS = 3000;

const capabilities = [
  {
    id: 'cap_hs_classifier_v1',
    name: 'Global Logistics HS Code Classifier',
    description: 'AI-powered HS code classification for customs and international trade. Provides tariff estimates and classification rationale.',
    intents: intents.map((id) => ({ id, name: id })),
    pricing: {
      model: 'metered',
      currency: 'USDC',
      metered_unit: 'character',
      metered_rate: PRICE_PER_CHAR,
    },
  },
];

type HSParams = {
  desc?: string;
  description?: string;
  product?: string;
  dest?: string;
  destination?: string;
  country?: string;
  complexity?: string;
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

function parseParams(params: Record<string, unknown>): HSParams | null {
  const desc = getString(params.desc) || getString(params.description) || getString(params.product);
  const dest = getString(params.dest) || getString(params.destination) || getString(params.country) || 'USA';
  const complexity = getString(params.complexity) || 'standard';

  const text =
    readText(params.specifications)
    || readText(params.details)
    || readText(params.materials)
    || readText(params.usage)
    || readText(params.text)
    || readText(params.input)
    || (desc ? `Classify: ${desc} for import to ${dest}` : undefined);

  if (!text) return null;

  return { desc, description: desc, product: desc, dest, destination: dest, country: dest, complexity, text };
}

runKimiAgent({
  name: agentName,
  intents,
  capabilities,
  maxChars: MAX_CHARS,
  pricePerChar: PRICE_PER_CHAR,
  minPrice: MIN_PRICE,
  etaSeconds: 120,
  parseParams,
  extractInput: (params) => params.text,
  buildPlan: (task) => {
    const { desc, dest } = task.params;
    const product = desc || 'product';
    return `Classify ${product} to HS code for import to ${dest}.`;
  },
  buildPrompt: (task) => {
    const { dest } = task.params;

    const systemPrompt = `You are an expert customs classification specialist with deep knowledge of the Harmonized System (HS) codes and international trade regulations.

⚠️ DISCLAIMER: This is an AI-powered preliminary classification. Always verify with official customs rulings and consult a licensed customs broker for high-value shipments.

Analyze the product description and provide:

1. Primary HS code classification
2. Alternative classifications considered
3. Duty and tax estimates
4. Compliance flags and requirements

Provide output in this structured format:

CLASSIFICATION:
- HS Code: XXXX.XX (6-digit minimum, 8-10 digit if applicable)
- Chapter: XX - Chapter name
- Heading: XXXX - Heading description
- Rationale: Why this classification was chosen

PRODUCT ANALYSIS:
- Material composition
- Primary function/use
- Technical specifications

ALTERNATIVES CONSIDERED:
- HS XXXX.XX - Why it was rejected
- HS XXXX.XX - Why it was rejected

DUTY & TAX ESTIMATE (for ${dest}):
- Import duty rate: X%
- VAT/GST rate: X%
- Additional fees: (if applicable)
- Total landed cost estimate: X%

COMPLIANCE FLAGS:
- Required documentation
- Special permits/licenses needed
- Country of origin marking requirements
- Known issue areas

NEXT STEPS:
- Recommended verification steps
- When to engage a customs broker`;

    const userPrompt = `Destination Country: ${dest}\n\nProduct Description:\n${task.input}\n\nPlease provide HS code classification and duty estimate.`;

    return { system: systemPrompt, user: userPrompt };
  },
  formatOutput: (content, task) => {
    const { desc, dest } = task.params;

    // Extract HS code
    const hsMatch = content.match(/(?:HS Code|Heading)[\s:]*(\d{4}\.?\d{2}(?:\.?\d{2})?)/i);
    const chapterMatch = content.match(/(?:Chapter)[\s:]*(\d{2})[^\d]/i);
    const dutyMatch = content.match(/(?:Duty|Tariff)[\s:]*(\d+(?:\.\d+)?)\s*%/i);
    const vatMatch = content.match(/(?:VAT|GST)[\s:]*(\d+(?:\.\d+)?)\s*%/i);

    // Extract alternatives
    const alternatives: string[] = [];
    const altMatch = content.match(/(?:Alternative|Considered)[\s\S]*?(?=\n\n|Duty|Compliance|$)/i);
    if (altMatch) {
      const codeMatches = altMatch[0].match(/\d{4}\.\d{2}/g);
      if (codeMatches) {
        codeMatches.forEach(c => alternatives.push(c));
      }
    }

    // Extract flags
    const flags: string[] = [];
    const flagsMatch = content.match(/(?:Flag|Requirement|Documentation)[\s\S]*?(?=\n\n|Next|$)/i);
    if (flagsMatch) {
      const bulletMatches = flagsMatch[0].match(/[-•]\s*([^\n]+)/g);
      if (bulletMatches) {
        bulletMatches.forEach(b => flags.push(b.replace(/^[-•]\s*/, '').trim()));
      }
    }

    return {
      description: desc || 'Product',
      destination: dest,
      classification: {
        hs_code: hsMatch?.[1]?.replace(/\./g, '') || '0000.00',
        chapter: chapterMatch?.[1] || '00',
        rationale: 'AI-powered classification based on product description',
      },
      duty_estimate: {
        rate_pct: dutyMatch ? parseFloat(dutyMatch[1]) : 0,
        vat_pct: vatMatch ? parseFloat(vatMatch[1]) : 0,
      },
      alternatives_considered: alternatives.length > 0 ? alternatives : undefined,
      flags: flags.length > 0 ? flags : undefined,
      disclaimer: 'Preliminary classification. Verify with official customs resources.',
      full_analysis: content,
    };
  },
  buildOfferExtras: (task) => ({
    destination: task.params.dest,
    complexity: task.params.complexity,
  }),
});
