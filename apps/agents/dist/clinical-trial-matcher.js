import { runKimiAgent, getString } from './kimi-runner.ts';
const intents = ['health.trial.match', 'health.trial.search'];
const agentName = 'TrialBridge';
const PRICE_PER_CHAR = 0.00012;
const MIN_PRICE = 0.4;
const MAX_CHARS = 8000;
const capabilities = [
    {
        id: 'cap_clinical_trial_matcher_v1',
        name: 'Clinical Trial Matcher',
        description: 'AI-powered matching of patient profiles to clinical trial eligibility criteria. Analyzes medical history, biomarkers, and demographics to identify suitable trials.',
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
    const profile = getString(params.profile) || getString(params.patient);
    const location = getString(params.location) || getString(params.city) || getString(params.region);
    const depth = getString(params.depth) || 'standard';
    const urgency = getString(params.urgency) || 'standard';
    const conditions = Array.isArray(params.conditions)
        ? params.conditions.filter((c) => typeof c === 'string')
        : getString(params.condition)
            ? [getString(params.condition)]
            : [];
    const demographics = typeof params.demographics === 'object' && params.demographics !== null
        ? params.demographics
        : undefined;
    const biomarkers = typeof params.biomarkers === 'object' && params.biomarkers !== null
        ? params.biomarkers
        : undefined;
    // Extract patient information
    const text = readText(params.medical_history)
        || readText(params.clinical_history)
        || readText(params.summary)
        || readText(params.details)
        || readText(params.text)
        || readText(params.input)
        || (profile ? `Patient Profile: ${profile}` : undefined);
    if (!text)
        return null;
    return { profile, conditions, location, demographics, biomarkers, depth, urgency, text };
}
runKimiAgent({
    name: agentName,
    intents,
    capabilities,
    maxChars: MAX_CHARS,
    pricePerChar: PRICE_PER_CHAR,
    minPrice: MIN_PRICE,
    etaSeconds: (task) => {
        const depth = (task.params.depth || 'standard').toLowerCase();
        const urgency = (task.params.urgency || 'standard').toLowerCase();
        const baseEta = urgency === 'rush' ? 120 : depth === 'deep' ? 300 : 180;
        return Math.min(600, baseEta + Math.round(task.charCount / 80));
    },
    parseParams,
    extractInput: (params) => params.text,
    buildPlan: (task) => {
        const { conditions, location, depth } = task.params;
        const conditionsLabel = conditions && conditions.length > 0
            ? conditions.join(', ')
            : 'specified conditions';
        const locationLabel = location || 'any location';
        const depthLabel = depth === 'deep' ? 'comprehensive' : 'standard';
        return `Match patient to clinical trials for ${conditionsLabel} near ${locationLabel} with ${depthLabel} analysis.`;
    },
    buildPrompt: (task) => {
        const { profile, conditions, location, demographics, biomarkers, depth } = task.params;
        const systemPrompt = `You are an expert clinical research coordinator specializing in trial matching and eligibility assessment.

Analyze the patient profile and identify suitable clinical trials by:

1. Understanding the primary diagnosis and stage
2. Evaluating biomarker status and genetic markers
3. Considering demographic factors (age, sex, location)
4. Assessing prior treatments and treatment resistance
5. Checking performance status and comorbidities
6. Identifying inclusion/exclusion criteria matches

Provide output in this structured format:

PATIENT SUMMARY:
- Primary diagnosis
- Key biomarkers
- Performance status
- Prior treatments

TRIAL MATCHES: (list top 3-5 matches)
For each trial:
- Trial ID: (e.g., NCTXXXXXXXX)
- Title: Brief trial name
- Match Score: 0-1.0 (estimated compatibility)
- Phase: I/II/III/IV
- Key Inclusion Criteria Met: list
- Key Exclusion Criteria Check: list any concerns
- Rationale: Why this trial fits
- Distance/Location: if location provided

EXCLUSIONS FLAGGED:
- List any criteria that may disqualify

RECOMMENDATIONS:
- Priority trials to pursue
- Additional testing needed
- Next steps for enrollment

Note: Trial IDs should be formatted like NCT followed by 8 digits if possible.`;
        let userPrompt = '';
        if (profile) {
            userPrompt += `Patient Profile Summary: ${profile}\n\n`;
        }
        if (conditions && conditions.length > 0) {
            userPrompt += `Medical Conditions: ${conditions.join(', ')}\n\n`;
        }
        if (location) {
            userPrompt += `Preferred Location: ${location}\n\n`;
        }
        if (demographics && Object.keys(demographics).length > 0) {
            userPrompt += `Demographics:\n${JSON.stringify(demographics, null, 2)}\n\n`;
        }
        if (biomarkers && Object.keys(biomarkers).length > 0) {
            userPrompt += `Biomarkers:\n${JSON.stringify(biomarkers, null, 2)}\n\n`;
        }
        userPrompt += `Detailed Patient Information:\n${task.input}\n\n`;
        userPrompt += `Please provide trial matches with ${depth === 'deep' ? 'comprehensive' : 'standard'} analysis.`;
        return { system: systemPrompt, user: userPrompt };
    },
    formatOutput: (content, task) => {
        const { profile, location, conditions } = task.params;
        // Parse matches from AI output
        const matches = [];
        // Extract trial sections using regex
        const trialSections = content.split(/(?:Trial\s+Match\s*\d+:|Match\s*\d+:|Trial\s*ID:|\d+\.[\s]*)/i);
        trialSections.forEach((section) => {
            const idMatch = section.match(/(?:Trial\s+ID|NCT)[\s:]*([A-Z0-9]+)/i);
            const titleMatch = section.match(/(?:Title|Name)[\s:]*([^\n]+)/i);
            const scoreMatch = section.match(/(?:Match\s*Score|Compatibility)[\s:]*(0?\.\d+|\d\.\d+|\d+)/i);
            const phaseMatch = section.match(/(?:Phase)[\s:]*(I{1,3}V?|IV)/i);
            const rationaleMatch = section.match(/(?:Rationale|Why)[\s:]*([^\n]+(?:\n(?![A-Z][\w\s]+:)[^\n]+)*)/i);
            if (idMatch || titleMatch) {
                matches.push({
                    trial_id: idMatch?.[1] || 'NCT00000000',
                    title: titleMatch?.[1]?.trim() || 'Unknown Trial',
                    match_score: parseFloat(scoreMatch?.[1] || '0.5'),
                    phase: phaseMatch?.[1] || undefined,
                    rationale: rationaleMatch?.[1]?.trim() || 'See full analysis',
                });
            }
        });
        // Extract exclusions
        const exclusions = [];
        const exclusionMatch = content.match(/(?:Exclusions?\s+Flagged|Potential\s+Exclusions)[\s\S]*?(?=\n\n|Recommendations?|Next\s+Steps|$)/i);
        if (exclusionMatch) {
            const bulletMatches = exclusionMatch[0].match(/[-•]\s*([^\n]+)/g);
            if (bulletMatches) {
                bulletMatches.forEach(b => exclusions.push(b.replace(/^[-•]\s*/, '').trim()));
            }
        }
        return {
            profile: profile || 'Unknown',
            location: location || 'Unspecified',
            conditions: conditions || [],
            matches: matches.length > 0 ? matches : undefined,
            exclusions_flagged: exclusions.length > 0 ? exclusions : undefined,
            next_steps: [
                'Review trial matches with healthcare provider',
                'Verify eligibility with trial coordinators',
                'Prepare medical records for screening',
            ],
            full_analysis: content,
        };
    },
    buildOfferExtras: (task) => ({
        conditions: task.params.conditions,
        location: task.params.location,
        depth: task.params.depth,
        urgency: task.params.urgency,
    }),
});
//# sourceMappingURL=clinical-trial-matcher.js.map