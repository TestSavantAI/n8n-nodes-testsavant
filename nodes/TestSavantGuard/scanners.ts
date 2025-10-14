export type ScannerCategory = 'input' | 'output' | 'unknown';

export interface ScannerSelection {
    id?: string;
    name: string;
    type: string;
    category?: ScannerCategory;
}

export function normalizeScannerCategory(category?: string | null): ScannerCategory {
    if (!category) return 'unknown';
    const normalized = String(category).toLowerCase();
    if (normalized === 'input' || normalized === 'output') {
        return normalized;
    }
    return 'unknown';
}

export function createScannerValue(selection: ScannerSelection): string {
    const payload: Record<string, string> = {};
    if (selection.id) {
        payload.id = selection.id;
    }
    payload.name = selection.name;
    payload.type = selection.type;
    if (selection.category && selection.category !== 'unknown') {
        payload.category = selection.category;
    }
    return JSON.stringify(payload);
}

export function parseSelectedScannerValues(values: string[]): ScannerSelection[] {
    if (!Array.isArray(values)) return [];

    const parsed: ScannerSelection[] = [];
    for (const value of values) {
        try {
            const obj = JSON.parse(value);
            if (obj && typeof obj.name === 'string' && typeof obj.type === 'string') {
                const selection: ScannerSelection = {
                    name: obj.name,
                    type: obj.type,
                };

                if (obj.id && typeof obj.id === 'string') {
                    selection.id = obj.id;
                }

                if (obj.category && typeof obj.category === 'string') {
                    selection.category = normalizeScannerCategory(obj.category);
                }

                parsed.push(selection);
            }
        } catch {
            // ignore malformed entries
        }
    }

    return parsed;
}