// Centralized scanners list for easy updates

export type Scanner = { name: string; type: string };

// Update these lists as needed
export const inputScanners: Scanner[] = [
    { name: 'PromptInjection:base', type: 'PromptInjection' },
    { name: 'Regex:default', type: 'Regex' },
    { name: 'Gibberish:base', type: 'Gibberish' },
    { name: 'BanSubstrings:default', type: 'BanSubstrings' },
    { name: 'BanTopics:base', type: 'BanTopics' },
    { name: 'Language:base', type: 'Language' },
    { name: 'Toxicity:base', type: 'Toxicity' },
    { name: 'Anonymize:base', type: 'Anonymize' },
    { name: 'InvisibleText:default', type: 'InvisibleText' },
    { name: 'Secrets:default', type: 'Secrets' },
    { name: 'LLM:default', type: 'LLM' },
    { name: 'TokenLimit:default', type: 'TokenLimit' },
];

export const outputScanners: Scanner[] = [
    { name: 'Toxicity:base', type: 'Toxicity' },
    { name: 'Bias:base', type: 'Bias' },
    { name: 'Anonymize:base', type: 'Anonymize' },
    { name: 'BanCode:small', type: 'BanCode' },
    { name: 'BanSubstrings:default', type: 'BanSubstrings' },
    { name: 'LanguageSame:base', type: 'LanguageSame' },
    { name: 'Language:base', type: 'Language' },
    { name: 'BanCompetitors:base', type: 'BanCompetitors' },
    { name: 'FactualConsistency:base', type: 'FactualConsistency' },
    { name: 'ReadingTime:default', type: 'ReadingTime' },
    { name: 'MaliciousURLs:base', type: 'MaliciousURLs' },
    { name: 'JSON:default', type: 'JSON' },
    { name: 'NoRefusalLight:default', type: 'NoRefusalLight' },
    { name: 'NoRefusal:base', type: 'NoRefusal' },
    { name: 'Sentiment:default', type: 'Sentiment' },
];

// Multi-select options; value is a JSON string for safe roundtrip
export const inputScannerOptions = inputScanners.map((s) => ({
    name: s.name,
    value: JSON.stringify({ name: s.name, type: s.type }),
    description: s.type,
}));

export const outputScannerOptions = outputScanners.map((s) => ({
    name: s.name,
    value: JSON.stringify({ name: s.name, type: s.type }),
    description: s.type,
}));

export function parseSelectedScannerValues(values: string[]): Scanner[] {
    if (!Array.isArray(values)) return [];
    const out: Scanner[] = [];
    for (const v of values) {
        try {
            const obj = JSON.parse(v);
            if (obj && typeof obj.name === 'string' && typeof obj.type === 'string') {
                out.push({ name: obj.name, type: obj.type });
            }
        } catch {
            // ignore malformed entries
        }
    }
    return out;
}