import type { ICredentialType, INodeProperties, IAuthenticateGeneric, ICredentialTestRequest } from 'n8n-workflow';

export class TestSavantGuardApi implements ICredentialType {
    name = 'testSavantGuardApi';
    displayName = 'TestSavant.AI API';
    documentationUrl = 'https://docs.testsavant.ai';
    properties: INodeProperties[] = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            default: '',
            typeOptions: { password: true },
            required: true,
            placeholder: 'Create in app.testsavant.ai → Settings → API Keys',
            description:
                'Create an API key in your TestSavant account: sign in to app.testsavant.ai → go to Settings → API Keys → Create → copy the key and paste it here.',
            hint: 'Get your key from app.testsavant.ai (Settings → API Keys). Store it safely; you can revoke it anytime.',
        },
    ];

    authenticate: IAuthenticateGeneric = {
        type: 'generic',
        properties: {
            headers: {
                'x-api-key': '={{ $credentials.apiKey }}',
            },
        },
    };

    test: ICredentialTestRequest = {
        request: {
            baseURL: 'https://api.app.testsavant.ai',
            url: '/projects/api-key/projects/',
            method: 'GET',
        },
    };
}