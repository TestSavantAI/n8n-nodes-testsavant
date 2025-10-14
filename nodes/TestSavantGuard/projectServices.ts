import type { IDataObject, IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

import { createScannerValue, normalizeScannerCategory, type ScannerSelection } from './scanners';

const API_URL = 'https://api.app.testsavant.ai/projects/api-key/projects/';
const STATIC_CACHE_KEY = '__testsavantScannerCache';

type NodeContext = IExecuteFunctions | ILoadOptionsFunctions;

interface ApiScanner {
    id?: string;
    name?: string;
    type?: string;
    tag?: string;
    category?: string;
    description?: string;
    default_config?: {
        type?: string;
        params?: IDataObject;
    };
    groups?: IDataObject[];
}

interface ApiProjectScannerConfig {
    id?: string;
    config?: {
        type?: string;
        params?: IDataObject;
    };
    scanner?: ApiScanner;
}

interface ApiProject {
    id: string | number;
    name?: string;
    description?: string;
    active_configuration?: {
        id?: string;
        scanners?: ApiProjectScannerConfig[];
    };
}

export interface ProjectOption {
    id: string;
    name: string;
    description?: string;
}

export interface ScannerOption {
    id?: string;
    name: string;
    type: string;
    category: 'input' | 'output';
    description?: string;
    tag?: string;
    value: string;
}

export interface ProjectScannerDefaults {
    input: string[];
    output: string[];
}

interface ScannerCache {
    projects: ProjectOption[];
    scannerOptions: ScannerOption[];
    projectDefaults: Record<string, ProjectScannerDefaults>;
    fetchedAt: number;
}

function asArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
}

function pickArray<T>(...candidates: unknown[]): T[] {
    for (const candidate of candidates) {
        if (Array.isArray(candidate) && candidate.length > 0) {
            return candidate as T[];
        }
    }

    for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
            return candidate as T[];
        }
    }

    return [];
}

function getStaticStore(context: NodeContext): IDataObject {
    return context.getWorkflowStaticData('node');
}

function readCache(context: NodeContext): ScannerCache | undefined {
    const store = getStaticStore(context);
    return store[STATIC_CACHE_KEY] as ScannerCache | undefined;
}

function writeCache(context: NodeContext, cache: ScannerCache) {
    const store = getStaticStore(context);
    store[STATIC_CACHE_KEY] = cache;
}

function ensureCacheFresh(context: NodeContext): ScannerCache | undefined {
    const cache = readCache(context);
    if (!cache) return undefined;

    // Cache is considered fresh for 5 minutes
    const FIVE_MINUTES = 5 * 60 * 1000;
    if (Date.now() - cache.fetchedAt > FIVE_MINUTES) {
        return undefined;
    }
    return cache;
}

async function requestProjectsAndScanners(this: NodeContext) {
    const response = await this.helpers.httpRequestWithAuthentication.call(
        this,
        'testSavantGuardApi',
        {
            method: 'GET',
            url: API_URL,
            json: true,
        },
    );

    if (Array.isArray(response)) {
        return {
            projects: response as ApiProject[],
            scanners: [] as ApiScanner[],
        };
    }

    const projects = pickArray<ApiProject>(
        response?.projects,
        response?.data?.projects,
        response?.data,
    );

    const scanners = pickArray<ApiScanner>(
        response?.scanners,
        response?.data?.scanners,
    );

    return {
        projects,
        scanners,
    };
}

function toProjectOption(project: ApiProject): ProjectOption | undefined {
    if (!project) return undefined;
    const id = project.id ?? project?.name;
    const name = project.name ?? String(project.id ?? '');
    if (!id || !name) return undefined;

    return {
        id: String(id),
        name: String(name),
        description: project.description ?? undefined,
    };
}

function createScannerOption(
    optionMap: Map<string, ScannerOption>,
    rawScanner: ApiScanner | undefined,
    defaults: { type?: unknown; category?: unknown; description?: string },
): ScannerOption | undefined {
    if (!rawScanner) return undefined;

    const name = rawScanner.name ?? '';
    const key = rawScanner.id ? String(rawScanner.id) : name;
    const existing = key ? optionMap.get(key) : undefined;

    const resolvedType =
        (typeof defaults.type === 'string' && defaults.type)
        || rawScanner.default_config?.type
        || rawScanner.type
        || '';

    if (!name || !resolvedType) {
        return existing;
    }

    const rawCategory = (typeof defaults.category === 'string' && defaults.category) || rawScanner.category;
    const normalizedCategory = normalizeScannerCategory(rawCategory);
    const category: 'input' | 'output' = normalizedCategory === 'output' ? 'output' : 'input';

    const selection: ScannerSelection = {
        id: rawScanner.id ? String(rawScanner.id) : undefined,
        name,
        type: resolvedType,
        category,
    };
    const value = createScannerValue(selection);

    if (existing) {
        // Update description/tag if we previously lacked them
        if (!existing.description && (rawScanner.description || defaults.description)) {
            existing.description = (rawScanner.description ?? defaults.description) ?? undefined;
        }
        if (!existing.tag && rawScanner.tag) {
            existing.tag = rawScanner.tag;
        }
        return existing;
    }

    const option: ScannerOption = {
        id: selection.id,
        name: selection.name,
        type: selection.type,
        category,
        description: (rawScanner.description ?? defaults.description) ?? undefined,
        tag: rawScanner.tag ?? undefined,
        value,
    };

    if (key) {
        optionMap.set(key, option);
    }

    return option;
}

function buildCache(projects: ApiProject[], scanners: ApiScanner[]): ScannerCache {
    const optionMap = new Map<string, ScannerOption>();
    const projectDefaults: Record<string, ProjectScannerDefaults> = {};

    for (const scanner of scanners) {
        createScannerOption(optionMap, scanner, {
            type: scanner?.default_config?.type,
            category: scanner?.category,
        });
    }

    for (const project of projects) {
        if (!project) continue;
        const projectId = String(project.id ?? '');
        if (!projectId) continue;

        const defaults: ProjectScannerDefaults = {
            input: [],
            output: [],
        };

        const configScanners = asArray<ApiProjectScannerConfig>(project.active_configuration?.scanners);
        for (const config of configScanners) {
            if (!config) continue;
            const scannerMeta = config.scanner;
            const option = createScannerOption(optionMap, scannerMeta, {
                type: config?.config?.type ?? scannerMeta?.default_config?.type,
                category: scannerMeta?.category,
            });
            if (!option) continue;

            const categoryKey = option.category === 'output' ? 'output' : 'input';
            if (!defaults[categoryKey].includes(option.value)) {
                defaults[categoryKey].push(option.value);
            }
        }

        projectDefaults[projectId] = defaults;
    }

    const scannerOptions = Array.from(optionMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    // Ensure defaults only contain scanners that still exist in the option list
    const availableValues = new Set(scannerOptions.map((option) => option.value));
    for (const projectId of Object.keys(projectDefaults)) {
        const defaults = projectDefaults[projectId];
        defaults.input = defaults.input.filter((value) => availableValues.has(value));
        defaults.output = defaults.output.filter((value) => availableValues.has(value));
    }

    const projectOptions: ProjectOption[] = projects
        .map(toProjectOption)
        .filter((option): option is ProjectOption => option !== undefined)
        .sort((a, b) => a.name.localeCompare(b.name));

    return {
        projects: projectOptions,
        scannerOptions,
        projectDefaults,
        fetchedAt: Date.now(),
    };
}

export async function ensureProjectAndScannerCache(this: NodeContext): Promise<ScannerCache> {
    const freshCache = ensureCacheFresh(this);
    if (freshCache) {
        return freshCache;
    }

    const { projects, scanners } = await requestProjectsAndScanners.call(this);
    const cache = buildCache(projects, scanners);
    writeCache(this, cache);
    return cache;
}

export async function fetchProjects(this: ILoadOptionsFunctions) {
    const cache = await ensureProjectAndScannerCache.call(this);
    const options = cache.projects.map((project) => ({
        name: project.name,
        value: project.id,
        description: project.description,
    }));

    return [
        {
            name: '— No Project —',
            value: '',
            description: 'Skip project defaults and manage scanners manually',
        },
        ...options,
    ];
}

export async function getScannerOptionsByCategory(
    this: NodeContext,
    category: 'input' | 'output',
): Promise<ScannerOption[]> {
    const cache = await ensureProjectAndScannerCache.call(this);
    return cache.scannerOptions.filter((option) => option.category === category);
}

export async function getProjectScannerDefaults(
    this: NodeContext,
    projectId: string,
): Promise<ProjectScannerDefaults> {
    if (!projectId) {
        return { input: [], output: [] };
    }

    const cache = await ensureProjectAndScannerCache.call(this);
    return cache.projectDefaults[projectId] ?? { input: [], output: [] };
}