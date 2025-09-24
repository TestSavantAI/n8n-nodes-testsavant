import type { ILoadOptionsFunctions } from 'n8n-workflow';

interface Project {
    id: string | number;
    name: string;
    [key: string]: unknown;
}

export async function fetchProjects(this: ILoadOptionsFunctions) {
    // Build URL from credential baseUrl to support local/cloud
    const url = 'https://api.app.testsavant.ai/projects/api-key/projects/';
    const response = await this.helpers.httpRequestWithAuthentication.call(
        this,
        'testSavantGuardApi',
        {
            method: 'GET',
            url,
            json: true,
        },
    );

    // Try common shapes: array directly, or under data/projects
    const list: Project[] =
        (Array.isArray(response) && response) ||
        response?.projects ||
        response?.data ||
        response?.data?.projects ||
        [];

    return (list as Project[])
        .filter((p) => p && (p.name ?? p.id) !== undefined)
        .map((p) => ({
            name: String(p.name ?? p.id),
            value: String(p.id),
        }));
}