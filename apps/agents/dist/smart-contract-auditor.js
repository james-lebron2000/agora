import { runKimiAgent, getString } from './kimi-runner.ts';
const intents = ['smartcontract.audit', 'smartcontract.security.scan'];
const agentName = 'AuditForge';
const PRICE_PER_CHAR = 0.00008;
const MIN_PRICE = 0.25;
const MAX_CHARS = 15_000;
const capabilities = [
    {
        id: 'cap_smart_contract_audit_v1',
        name: 'Smart Contract Security Auditor',
        description: 'AI-powered preliminary security analysis for smart contracts. Identifies common vulnerabilities and provides remediation guidance. NOTE: This is not a replacement for professional security audits.',
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
    const sourceUrl = getString(params.source_url) || getString(params.repo) || getString(params.url);
    const contractName = getString(params.contract_name) || getString(params.contract) || getString(params.name);
    const language = getString(params.language) || 'solidity';
    const complexity = getString(params.complexity) || 'standard';
    const urgency = getString(params.urgency) || 'standard';
    // Extract contract code or description
    const text = readText(params.code)
        || readText(params.source)
        || readText(params.contract_code)
        || readText(params.solidity)
        || readText(params.rust)
        || readText(params.text)
        || readText(params.input);
    if (!text)
        return null;
    return { source_url: sourceUrl, contract_name: contractName, language, complexity, urgency, text };
}
runKimiAgent({
    name: agentName,
    intents,
    capabilities,
    maxChars: MAX_CHARS,
    pricePerChar: PRICE_PER_CHAR,
    minPrice: MIN_PRICE,
    etaSeconds: (task) => {
        const complexity = (task.params.complexity || 'standard').toLowerCase();
        const urgency = (task.params.urgency || 'standard').toLowerCase();
        const baseEta = urgency === 'rush' ? 180 : complexity === 'advanced' ? 300 : 240;
        return Math.min(600, baseEta + Math.round(task.charCount / 150));
    },
    parseParams,
    extractInput: (params) => params.text,
    buildPlan: (task) => {
        const { contract_name, language, complexity } = task.params;
        const nameLabel = contract_name || 'Smart Contract';
        const langLabel = language.toUpperCase();
        const complexityLabel = complexity === 'advanced' ? 'advanced' : 'standard';
        return `Perform ${complexityLabel} security audit on ${langLabel} contract "${nameLabel}" using AI analysis.`;
    },
    buildPrompt: (task) => {
        const { contract_name, language, complexity } = task.params;
        const systemPrompt = `You are an expert smart contract security auditor specializing in ${language.toUpperCase()}.

⚠️ DISCLAIMER: This is an AI-powered preliminary analysis only. It does NOT replace professional security audits by specialized firms.

Analyze the provided code for common vulnerabilities including:
- Reentrancy attacks
- Integer overflow/underflow
- Access control issues
- Unchecked external calls
- Oracle manipulation
- Front-running vulnerabilities
- Timestamp dependence
- Denial of service vectors
- Logic errors

Provide output in this structured format:

SUMMARY:
- Severity: CRITICAL | HIGH | MEDIUM | LOW | INFO
- Total findings: N
- Quick verdict: Brief assessment

FINDINGS: (list each as)
- ID: SC-XXX
- Severity: CRITICAL | HIGH | MEDIUM | LOW
- Location: File:Line
- Issue: Description
- Impact: What could go wrong
- Recommendation: Fix suggestion

SECURE PATTERNS FOUND: (positive findings)

RECOMMENDATIONS:
- Priority actions
- Further audit needs
- Testing suggestions`;
        const userPrompt = `Contract to audit:
${contract_name ? `Name: ${contract_name}` : 'Unnamed Contract'}
Language: ${language.toUpperCase()}
Complexity Level: ${complexity === 'advanced' ? 'Advanced' : 'Standard'}

Source Code:
\`\`\`
${task.input}
\`\`\`

Please provide a thorough security analysis.`;
        return { system: systemPrompt, user: userPrompt };
    },
    formatOutput: (content, task) => {
        const { source_url, contract_name, language } = task.params;
        // Parse findings from the structured output
        const findings = [];
        // Try to extract findings from the AI output
        const findingMatches = content.match(/(?:FINDING|Issue|Vulnerability)[\s\S]*?(?=\n\n|FINDING|Issue|Vulnerability|$)/gi);
        if (findingMatches) {
            findingMatches.forEach((match, idx) => {
                const severityMatch = match.match(/severity[\s:]*?(critical|high|medium|low)/i);
                const locationMatch = match.match(/(?:location|file|line)[\s:]*?([^\n]+)/i);
                const issueMatch = match.match(/(?:issue|problem|vulnerability)[\s:]*?([^\n]+(?:\n(?![A-Z][\w\s]+:)[^\n]+)*)/i);
                if (severityMatch || issueMatch) {
                    findings.push({
                        id: `SC-${String(idx + 1).padStart(3, '0')}`,
                        severity: severityMatch?.[1]?.toLowerCase() || 'medium',
                        location: locationMatch?.[1]?.trim() || 'Unknown',
                        issue: issueMatch?.[1]?.trim() || match.slice(0, 200),
                        impact: 'See analysis',
                        recommendation: 'See analysis',
                    });
                }
            });
        }
        // Count severities
        const critical = findings.filter(f => f.severity === 'critical').length;
        const high = findings.filter(f => f.severity === 'high').length;
        const medium = findings.filter(f => f.severity === 'medium').length;
        const low = findings.filter(f => f.severity === 'low').length;
        // Determine overall severity
        let overallSeverity = 'info';
        if (critical > 0)
            overallSeverity = 'critical';
        else if (high > 0)
            overallSeverity = 'high';
        else if (medium > 0)
            overallSeverity = 'medium';
        else if (low > 0)
            overallSeverity = 'low';
        return {
            source_url: source_url || 'inline_code',
            contract_name: contract_name || 'Unnamed',
            language: language.toLowerCase(),
            disclaimer: 'This is an AI-powered preliminary analysis. For production systems, engage a professional security audit firm.',
            summary: {
                severity: overallSeverity,
                total_findings: findings.length,
                critical_findings: critical,
                high_findings: high,
                medium_findings: medium,
                low_findings: low,
            },
            findings: findings.length > 0 ? findings : undefined,
            full_analysis: content,
            tool_reports: ['ai_preliminary_scan'],
        };
    },
    buildOfferExtras: (task) => ({
        source_url: task.params.source_url,
        contract_name: task.params.contract_name,
        language: task.params.language,
        complexity: task.params.complexity,
        urgency: task.params.urgency,
        disclaimer: 'AI preliminary scan only. Professional audit recommended for production.',
    }),
});
//# sourceMappingURL=smart-contract-auditor.js.map