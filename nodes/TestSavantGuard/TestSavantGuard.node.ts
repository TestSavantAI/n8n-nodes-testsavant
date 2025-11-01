import type { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription, JsonObject } from 'n8n-workflow';
import { NodeApiError, NodeConnectionType, ILoadOptionsFunctions } from 'n8n-workflow';
import { parseSelectedScannerValues } from './scanners';
import { fetchProjects, getProjectScannerDefaults, getScannerOptionsByCategory } from './projectServices';
export class TestSavantGuard implements INodeType {
    description: INodeTypeDescription = {
    displayName: 'TestSavant.AI',
        name: 'testSavantGuard',
        group: ['transform'],
        version: 1,
    description: 'Validates a prompt or output using TestSavant.AI Guard API',
		subtitle: '={{ $parameter["resource"] + ": " + $parameter["operation"] }}',
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
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					noDataExpression: true,
					options: [
						{ name: 'Scan', value: 'scan' },
					],
					default: 'scan',
				},
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					noDataExpression: true,
					options: [
						{ name: 'Validate', value: 'validate', action: 'Validate a scan' },
					],
					default: 'validate',
					displayOptions: {
						show: {
							resource: ['scan'],
						},
					},
				},
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
					displayOptions: {
						show: {
							resource: ['scan'],
							operation: ['validate'],
						},
					},
            },
            {
                displayName: 'Output',
                name: 'output',
                type: 'string',
                default: '',
                placeholder: 'Enter output text here',
                description: 'Output to scan (optional)',
                hint: 'The output of the LLM, required for output scans',
					displayOptions: {
						show: {
							resource: ['scan'],
							operation: ['validate'],
						},
					},
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
                hint: 'Optional: choose a project to auto-select scanners. Select "— No Project —" to clear your choice.',
					displayOptions: {
						show: {
							resource: ['scan'],
							operation: ['validate'],
						},
					},
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
					displayOptions: {
						show: {
							resource: ['scan'],
							operation: ['validate'],
						},
					},
            },
            {
                displayName: 'Scanner Names or IDs',
                name: 'scannersInput',
                type: 'multiOptions',
                typeOptions: {
                    loadOptionsMethod: 'getInputScanners',
                    loadOptionsDependsOn: ['credBaseUrl', 'projectId'],
                },
                default: [],
                description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
                hint: 'Choose one or more scanners to apply. Selecting a project pre-fills its scanners.',
                displayOptions: {
                    show: {
							resource: ['scan'],
							operation: ['validate'],
                        scanType: ['input'],
                    },
                },
            },
            {
                displayName: 'Scanner Names or IDs',
                name: 'scannersOutput',
                type: 'multiOptions',
                typeOptions: {
                    loadOptionsMethod: 'getOutputScanners',
                    loadOptionsDependsOn: ['credBaseUrl', 'projectId'],
                },
                default: [],
                description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
                hint: 'Choose one or more scanners to apply. Selecting a project pre-fills its scanners.',
                displayOptions: {
                    show: {
							resource: ['scan'],
							operation: ['validate'],
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
            async getInputScanners(this: ILoadOptionsFunctions) {
                const options = await getScannerOptionsByCategory.call(this, 'input');
                const currentParams = this.getCurrentNodeParameters?.() ?? {};
                const projectId = (currentParams.projectId as string) ?? '';
                const defaults = projectId
                    ? await getProjectScannerDefaults.call(this, projectId)
                    : { input: [], output: [] };
                const defaultSet = new Set(defaults.input);

                return options.map((option) => ({
                    name: option.name,
                    value: option.value,
                    description: option.description
                        ? defaultSet.has(option.value)
                            ? `${option.description} — Default for project`
                            : option.description
                        : defaultSet.has(option.value)
                            ? 'Default for selected project'
                            : undefined,
                }));
            },
            async getOutputScanners(this: ILoadOptionsFunctions) {
                const options = await getScannerOptionsByCategory.call(this, 'output');
                const currentParams = this.getCurrentNodeParameters?.() ?? {};
                const projectId = (currentParams.projectId as string) ?? '';
                const defaults = projectId
                    ? await getProjectScannerDefaults.call(this, projectId)
                    : { input: [], output: [] };
                const defaultSet = new Set(defaults.output);

                return options.map((option) => ({
                    name: option.name,
                    value: option.value,
                    description: option.description
                        ? defaultSet.has(option.value)
                            ? `${option.description} — Default for project`
                            : option.description
                        : defaultSet.has(option.value)
                            ? 'Default for selected project'
                            : undefined,
                }));
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

            let effectiveScannerValues = selectedUiValues;

            if ((!effectiveScannerValues || effectiveScannerValues.length === 0) && projectId) {
                const defaults = await getProjectScannerDefaults.call(this, projectId);
                effectiveScannerValues = scanType === 'input' ? defaults.input : defaults.output;
            }

            const prompt = promptParam || ((items[i].json.prompt as string) || '');
            const output = outputParam || ((items[i].json.output as string) || '');

            if (scanType === 'input' && !prompt) {
                throw new NodeApiError(this.getNode(), { message: 'Prompt is required for input scans.' });
            }
            if (scanType === 'output' && (!prompt || !output)) {
                throw new NodeApiError(this.getNode(), { message: 'Prompt & Output is required for output scans.' });
            }

            const endpoint = scanType === 'input' ? 'prompt-input' : 'prompt-output';
            const apiUrl = `https://api.testsavant.ai/guard/${endpoint}`;

            // Build "use" list purely from UI selection
            const useList = parseSelectedScannerValues(effectiveScannerValues || []);

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
                    session: `n8n-session-${Date.now()}-${i}`,
                    file: 'n8n-testsavant-guard',
                    tags: [],
                    name: 'n8n TestSavant.AI',
                },
                use: useList.map((scanner) =>
                    scanner.id
                        ? { id: scanner.id, name: scanner.name, type: scanner.type }
                        : { name: scanner.name, type: scanner.type },
                ),
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

                const outputData: INodeExecutionData = {
                    json: {
                        valid: isSafe,
                        prompt,
                        output,
                        result,
                    },
                    pairedItem: {
                        item: i,
                    },
                };

                if (isSafe) {
                    trueOutput.push(outputData);
                } else {
                    falseOutput.push(outputData);
                }
            } catch (error) {
                if (this.continueOnFail?.()) {
                    falseOutput.push({
                    json: { error: (error as Error).message, prompt, output, valid: false },
                    pairedItem: { item: i },
                    });
                    continue;
                }
                throw new NodeApiError(this.getNode(), error as JsonObject);
            }
        }

        return [trueOutput, falseOutput];
    }
}