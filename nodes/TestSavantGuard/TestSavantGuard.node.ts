import type { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription, JsonObject } from 'n8n-workflow';
import { NodeApiError, NodeConnectionType, 
    NodeOperationError, ILoadOptionsFunctions } from 'n8n-workflow';
import { inputScannerOptions, outputScannerOptions, parseSelectedScannerValues } from './scanners';
import { fetchProjects } from './projectServices';
export class TestSavantGuard implements INodeType {
    description: INodeTypeDescription = {
    displayName: 'TestSavant.AI',
        name: 'testSavantGuard',
        group: ['transform'],
        version: 1,
    description: 'Validates a prompt or output using TestSavant.AI Guard API',
        subtitle: 'Validate prompts and outputs for safety',
        icon: 'file:icons/ts_icon.svg',
        defaults: {
            name: 'TestSavant.AI',
        },
        credentials: [
            {
                name: 'testSavantGuardApi',
                required: true,
            },
        ],
        inputs: [NodeConnectionType.Main],
    outputs: [NodeConnectionType.Main, NodeConnectionType.Main],
    outputNames: ['valid', 'not valid'],
        properties: [
            {
                displayName: 'Credential Marker',
                name: 'credBaseUrl',
                type: 'string',
                default: '={{ $credentials.testSavantGuardApi?.apiKey ? $credentials.testSavantGuardApi.apiKey.length : 0 }}',
                description: 'Internal field to refresh project list when credentials change',
                displayOptions: {
                    show: {
                        scanType: ['__never__'],
                    },
                },
            },
            {
                displayName: 'Prompt',
                name: 'prompt',
                type: 'string',
                default: '',
                placeholder: 'Enter prompt text here',
                description: 'Prompt to scan; can be blank if coming from input',
                hint: 'The input prompt to the LLM, required for input scans',
            },
            {
                displayName: 'Output',
                name: 'output',
                type: 'string',
                default: '',
                placeholder: 'Enter output text here',
                description: 'Output to scan (optional)',
                hint: 'The output of the LLM, required for output scans',
            },
            {
                displayName: 'Project Name or ID',
                name: 'projectId',
                type: 'options',
                typeOptions: {
                    loadOptionsMethod: 'getProjects',
                    loadOptionsDependsOn: ['credBaseUrl'],
                },
                default: '',
                description:
                    'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
                placeholder: '— Select a project —',
                hint: 'Choose one of your projects. The list shows how many were fetched after you select a credential.',
            },
            {
                displayName: 'Scan Type',
                name: 'scanType',
                type: 'options',
                options: [
                    { name: 'Input', value: 'input' },
                    { name: 'Output', value: 'output' },
                ],
                default: 'input',
                hint: 'Select whether to scan the input prompt or the output',
                description: 'Whether this is an input or output scan',
            },
            {
                displayName: 'Scanners',
                name: 'scannersInput',
                type: 'multiOptions',
                options: inputScannerOptions,
                default: [],
                description: 'Select scanners to run for input scans',
                hint: 'Choose one or more scanners to apply',
                displayOptions: {
                    show: {
                        scanType: ['input'],
                    },
                },
            },
            {
                displayName: 'Scanners',
                name: 'scannersOutput',
                type: 'multiOptions',
                options: outputScannerOptions,
                default: [],
                description: 'Select scanners to run for output scans',
                displayOptions: {
                    show: {
                        scanType: ['output'],
                    },
                },
            },
        ],
    };

    methods = {
        loadOptions: {
            async getProjects(this: ILoadOptionsFunctions) {
                return await fetchProjects.call(this);
            },
        },
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const trueOutput: INodeExecutionData[] = [];
        const falseOutput: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            const scanType = this.getNodeParameter('scanType', i) as string;
            const projectId = this.getNodeParameter('projectId', i, '') as string;
            const promptParam = this.getNodeParameter('prompt', i, '') as string;
            const outputParam = this.getNodeParameter('output', i, '') as string;

            const selectedUiValues =
                (scanType === 'input'
                    ? (this.getNodeParameter('scannersInput', i, []) as string[])
                    : (this.getNodeParameter('scannersOutput', i, []) as string[])) || [];

            const prompt = promptParam || ((items[i].json.prompt as string) || '');
            const output = outputParam || ((items[i].json.output as string) || '');

            const endpoint = scanType === 'input' ? 'prompt-input' : 'prompt-output';
            const apiUrl = `https://api.testsavant.ai/guard/${endpoint}`;

            // Build "use" list purely from UI selection
            const useList = parseSelectedScannerValues(selectedUiValues);

            // Require a project to be selected explicitly for now
            if (!projectId) {
                throw new NodeOperationError(
                    this.getNode(),
                    'Please select a Project from the dropdown.',
                );
            }

            const payload: any = {
                prompt,
                config: {
                    project_id: projectId || null,
                    fail_fast: false,
                    cache: {
                        enabled: true,
                        ttl: 3600,
                    },
                },
                metadata: {
                    'project-type': 'n8n Workflow',
                    session: `session-${Date.now()}`,
                    file: 'n8n-testsavant-guard',
                    tags: [],
                    name: 'n8n TestSavant.AI',
                },
                use: useList,
            };

            if (scanType === 'output' && output) {
                payload.output = output;
            }

            try {
                const response = await this.helpers.httpRequestWithAuthentication.call(this, 'testSavantGuardApi', {
                    method: 'POST',
                    url: apiUrl,
                    body: payload,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    json: true,
                });

                const result = (response as JsonObject) || {};
                const isSafe = (result as any)?.is_valid === true;

                const outputData = {
                    json: {
                        valid: isSafe,
                        prompt,
                        output,
                        result,
                    },
                };

                if (isSafe) {
                    trueOutput.push(outputData);
                } else {
                    falseOutput.push(outputData);
                }
            } catch (error) {
                throw new NodeApiError(this.getNode(), error as JsonObject);
            }
        }

        return [trueOutput, falseOutput];
    }
}