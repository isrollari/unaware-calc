// src/lib/calculations.ts

import norscaData from './norsca.json';
import refiningData from './refining.json';
import vendorData from './vendor.json';

interface Resource {
	name: string;
	downstream: ProcessingStep[];
	upstream: ProcessingStep[];
}

interface ResourceAmount {
	resource: Resource;
	amount: number;
}

interface ResourceEfficiency {
	resource: Resource;
	factor: number;
}

interface ProcessingStep {
	input: Resource;
	tool: string;
	catalysts: ResourceEfficiency[];
	outputs: ResourceEfficiency[];
}

interface ExtractionData {
	Input: string;
	Catalyst: string | null;
	Tool: string;
	'Output 1': string | null;
	'Output 2': string | null;
	'Output 3': string | null;
	'Output 4': string | null;
	'Output 5': string | null;
}

interface RefiningData {
	Input: string;
	'Catalyst 1': string;
	'Catalyst 2': string;
	Output: string;
}

interface VendorData {
	Catalyst: string;
	Price: number;
}

const resources: { [key: string]: Resource } = {};

function getResourceByName(name: string): Resource {
	if (!resources[name]) {
		resources[name] = {
			name,
			downstream: [],
			upstream: []
		};
	}
	return resources[name];
}

function parseNameAndAmount(input: string): [Resource, number] {
	const parts = input.split(' ');
	const quantity = parseInt(parts[parts.length - 1].replace(/[^\d]/g, ''));
	const name = parts.slice(0, -1).join(' ');
	const resource = getResourceByName(name);
	return [resource, quantity * (parts[parts.length - 1].includes('k') ? 1000 : 1)];
}

function parseExtractionData() {
	for (const d of norscaData as ExtractionData[]) {
		const [inputResource, inputAmount] = parseNameAndAmount(d.Input);
		const step: ProcessingStep = {
			input: inputResource,
			tool: d.Tool.trim(),
			catalysts: [],
			outputs: []
		};

		if (d.Catalyst) {
			const [catalystResource, catalystAmount] = parseNameAndAmount(d.Catalyst);
			step.catalysts.push({
				resource: catalystResource,
				factor: catalystAmount / inputAmount
			});
		}

		for (let i = 1; i <= 5; i++) {
			const output = d[`Output ${i}` as keyof ExtractionData];
			if (output) {
				const [outputResource, outputAmount] = parseNameAndAmount(output);
				step.outputs.push({
					resource: outputResource,
					factor: outputAmount / inputAmount
				});
				outputResource.upstream.push(step);
			}
		}

		inputResource.downstream.push(step);
	}
}

function parseRefiningData() {
	for (const d of refiningData as RefiningData[]) {
		const inputResource = getResourceByName(d.Input);
		const outputResource = getResourceByName(d.Output);
		const step: ProcessingStep = {
			input: inputResource,
			tool: 'Refining Oven',
			catalysts: [
				{
					resource: getResourceByName(d['Catalyst 1']),
					factor: 0.5
				},
				{
					resource: getResourceByName(d['Catalyst 2']),
					factor: 0.5
				}
			],
			outputs: [
				{
					resource: outputResource,
					factor: 0.7
				}
			]
		};
		inputResource.downstream.push(step);
		outputResource.upstream.push(step);
	}
}

parseExtractionData();
parseRefiningData();

function getBestUpstream(
	resource: Resource,
	removedTools: Set<string>,
	removedResources: Set<string>
): ProcessingStep[] {
	return resource.upstream
		.filter(
			(step) =>
				!removedTools.has(step.tool) &&
				!removedResources.has(step.input.name) &&
				step.catalysts.every((c) => !removedResources.has(c.resource.name))
		)
		.sort((a, b) => {
			const aEfficiency = a.outputs.find((o) => o.resource === resource)?.factor || 0;
			const bEfficiency = b.outputs.find((o) => o.resource === resource)?.factor || 0;
			return bEfficiency - aEfficiency;
		});
}

function calculateBaseMaterials(
	targetResource: string,
	targetAmount: number,
	removedTools: Set<string>,
	removedResources: Set<string>,
	isOghmir: boolean,
	useVendor: boolean
): { [key: string]: number } {
	const baseMaterials: { [key: string]: number } = {};
	const intermediateProducts: { [key: string]: number } = {};
	const stack: [string, number][] = [[targetResource, targetAmount]];
	const OGHMIR = isOghmir ? 1.03 : 1.0;

	const vendorItems = new Map(vendorData.map((item: VendorData) => [item.Catalyst, item.Price]));

	while (stack.length > 0) {
		const [resourceName, amount] = stack.pop()!;

		if (['Granum', 'Calx', 'Saburra', 'Tephra', 'Gabore'].includes(resourceName)) {
			baseMaterials[resourceName] = (baseMaterials[resourceName] || 0) + amount;
			continue;
		}

		if (useVendor && vendorItems.has(resourceName)) {
			baseMaterials[resourceName] = (baseMaterials[resourceName] || 0) + amount;
			continue;
		}

		const resource = resources[resourceName];
		if (!resource) {
			throw new Error(`Unknown resource: ${resourceName}`);
		}

		if ((intermediateProducts[resourceName] || 0) >= amount) {
			intermediateProducts[resourceName] -= amount;
			continue;
		}

		const amountToProduce = amount - (intermediateProducts[resourceName] || 0);
		intermediateProducts[resourceName] = 0;

		const upstreamSteps = getBestUpstream(resource, removedTools, removedResources);

		if (upstreamSteps.length === 0) {
			baseMaterials[resourceName] = (baseMaterials[resourceName] || 0) + amountToProduce;
			continue;
		}

		const bestStep = upstreamSteps[0];
		const inputEfficiency = bestStep.outputs.find((o) => o.resource.name === resourceName)!;
		const inputAmount = Math.ceil(
			amountToProduce / (inputEfficiency.factor * (bestStep.tool !== 'Refining Oven' ? OGHMIR : 1))
		);

		stack.push([bestStep.input.name, inputAmount]);
		for (const catalyst of bestStep.catalysts) {
			const catalystAmount = Math.ceil(
				inputAmount * catalyst.factor * (bestStep.tool !== 'Refining Oven' ? OGHMIR : 1)
			);
			stack.push([catalyst.resource.name, catalystAmount]);
		}

		for (const output of bestStep.outputs) {
			if (output.resource.name !== resourceName) {
				const producedAmount = Math.floor(
					inputAmount * output.factor * (bestStep.tool !== 'Refining Oven' ? OGHMIR : 1)
				);
				intermediateProducts[output.resource.name] =
					(intermediateProducts[output.resource.name] || 0) + producedAmount;
			}
		}
	}

	return baseMaterials;
}
function getFullProductionChain(
	targetResource: string,
	targetAmount: number,
	removedTools: Set<string>,
	removedResources: Set<string>,
	isOghmir: boolean,
	useVendor: boolean
): [string, number, string, [string, number][], string, number][] {
	const chain: [string, number, string, [string, number][], string, number][] = [];
	const stack: [string, number][] = [[targetResource, targetAmount]];
	const intermediateProducts: { [key: string]: number } = {};
	const OGHMIR = isOghmir ? 1.03 : 1.0;

	const vendorItems = new Map(vendorData.map((item: VendorData) => [item.Catalyst, item.Price]));

	while (stack.length > 0) {
		const [resourceName, amount] = stack.pop()!;

		if (
			['Granum', 'Calx', 'Saburra', 'Tephra', 'Gabore'].includes(resourceName) ||
			!resources[resourceName]
		) {
			continue;
		}

		if (useVendor && vendorItems.has(resourceName)) {
			const price = vendorItems.get(resourceName)! * amount;
			chain.push([resourceName, amount, 'Vendor', [], 'Buy', price]);
			continue;
		}

		if ((intermediateProducts[resourceName] || 0) >= amount) {
			intermediateProducts[resourceName] -= amount;
			continue;
		}

		const amountToProduce = amount - (intermediateProducts[resourceName] || 0);
		intermediateProducts[resourceName] = 0;

		const resource = resources[resourceName];
		const upstreamSteps = getBestUpstream(resource, removedTools, removedResources);

		if (upstreamSteps.length === 0) {
			continue;
		}

		const bestStep = upstreamSteps[0];
		const inputEfficiency = bestStep.outputs.find((o) => o.resource.name === resourceName)!;
		const inputAmount = Math.ceil(
			amountToProduce / (inputEfficiency.factor * (bestStep.tool !== 'Refining Oven' ? OGHMIR : 1))
		);

		const catalysts: [string, number][] = bestStep.catalysts.map((c) => [
			c.resource.name,
			Math.ceil(inputAmount * c.factor * (bestStep.tool !== 'Refining Oven' ? OGHMIR : 1))
		]);

		chain.push([
			resourceName,
			amountToProduce,
			bestStep.input.name,
			catalysts,
			bestStep.tool,
			inputEfficiency.factor * (bestStep.tool !== 'Refining Oven' ? OGHMIR : 1)
		]);

		stack.push([bestStep.input.name, inputAmount]);
		stack.push(...catalysts);

		for (const output of bestStep.outputs) {
			if (output.resource.name !== resourceName) {
				const producedAmount = Math.floor(
					inputAmount * output.factor * (bestStep.tool !== 'Refining Oven' ? OGHMIR : 1)
				);
				intermediateProducts[output.resource.name] =
					(intermediateProducts[output.resource.name] || 0) + producedAmount;
			}
		}
	}

	return chain.reverse();
}

function combineSteps(
	chain: [string, number, string, [string, number][], string, number][]
): [{ [key: string]: number }, number, string, [string, number][], string, number][] {
	const combinedSteps: { [key: string]: [{ [key: string]: number }, [string, number][], number, number] } =
		{};

	for (const [output, amount, inputResource, catalysts, tool, efficiency] of chain) {
		const key = `${inputResource}|${tool}`;
		if (!combinedSteps[key]) {
			combinedSteps[key] = [{}, [], 0, 0];
		}

		const [outputs, combinedCatalysts, maxEfficiency, totalOutput] = combinedSteps[key];
		outputs[output] = (outputs[output] || 0) + amount;

		for (const [catalyst, cAmount] of catalysts) {
			const existingCatalyst = combinedCatalysts.find((c) => c[0] === catalyst);
			if (existingCatalyst) {
				existingCatalyst[1] += cAmount;
			} else {
				combinedCatalysts.push([catalyst, cAmount]);
			}
		}

		combinedSteps[key][2] = Math.max(maxEfficiency, efficiency);
		combinedSteps[key][3] += amount;
	}

	return Object.entries(combinedSteps).map(([key, [outputs, catalysts, efficiency, totalOutput]]) => {
		const [inputResource, tool] = key.split('|');
		return [outputs, totalOutput, inputResource, catalysts, tool, efficiency];
	});
}

function cuprumToGold(cuprumAmount: number): string {
    const goldCoins = cuprumAmount / 10000;
    return `${goldCoins.toFixed(3)} Gold`;
}

function formatProductionSteps(
    chain: [string, number, string, [string, number][], string, number][],
    useVendor: boolean
): string {
    const combinedChain = combineSteps(chain);
    let result = 'Production steps:\n';

    for (const [outputs, totalOutput, inputResource, catalysts, tool, efficiency] of combinedChain) {
        if (useVendor && tool === 'Buy') {
            const outputStr = Object.entries(outputs)
                .map(([resource, amount]) => `${amount} ${resource}`)
                .join(', ');
            const goldAmount = cuprumToGold(efficiency);
            result += `To make ${outputStr}: Buy from Vendor for ${goldAmount}\n\n`;
        } else {
            const catalystStr =
                catalysts.length > 0
                    ? ` with ${catalysts.map(([name, amount]) => `${amount} ${name}`).join(' and ')}`
                    : '';
            const inputAmount = Math.ceil(totalOutput / efficiency);
            const outputStr = Object.entries(outputs)
                .map(([resource, amount]) => `${amount} ${resource}`)
                .join(', ');
            result += `To make ${outputStr}:\n`;
            result += `  Use ${inputAmount} ${inputResource} in a ${tool}${catalystStr}\n\n`;
        }
    }

    return result;
}

export function calculateResources(
	targetResource: string,
	targetAmount: number,
	isOghmir: boolean = false,
	removedTools: string[] = [],
	removedResources: string[] = [],
	useVendor: boolean = false
): string {
	try {
		const removedToolsSet = new Set(removedTools);
		const removedResourcesSet = new Set(removedResources);

		const baseMaterials = calculateBaseMaterials(
			targetResource,
			targetAmount,
			removedToolsSet,
			removedResourcesSet,
			isOghmir,
			useVendor
		);
		const chain = getFullProductionChain(
			targetResource,
			targetAmount,
			removedToolsSet,
			removedResourcesSet,
			isOghmir,
			useVendor
		);

		let result = `To produce ${targetAmount} ${targetResource}, you need:\n`;
		for (const [resource, amount] of Object.entries(baseMaterials)) {
			result += `  ${amount} ${resource} --> ${(amount / 10000).toFixed(4)} Stacks\n`;
		}
		result += '\n';
		result += formatProductionSteps(chain, useVendor);

		return result;
	} catch (error) {
		if (error instanceof Error) {
			return `Error: ${error.message}`;
		}
		return 'An unknown error occurred';
	}
}

export function getAllProductionPaths(targetResource: string): Set<string> {
    const allResources = new Set<string>();
    const visited = new Set<string>();

    function getFullResourceName(input: string): string {
        // Remove quantity indicators like (10k) from the end
        return input.replace(/\s*\(\d+k?\)\s*$/, '').trim();
    }

    function dfs(resource: string) {
        if (visited.has(resource)) return;
        visited.add(resource);

        // Add base resources
        if (['Granum', 'Calx', 'Saburra', 'Tephra', 'Gabore'].includes(resource)) {
            allResources.add(resource);
            return;
        }

        // Check norsca.json data
        for (const item of norscaData) {
            for (let i = 1; i <= 5; i++) {
                const output = item[`Output ${i}` as keyof typeof item];
                if (output && getFullResourceName(output) === resource) {
                    const input = getFullResourceName(item.Input);
                    allResources.add(input);
                    if (item.Catalyst) {
                        allResources.add(getFullResourceName(item.Catalyst));
                    }

                    dfs(input);
                }
            }
        }

        // Check refining.json data
        for (const item of refiningData) {
            if (item.Output === resource) {
                allResources.add(getFullResourceName(item.Input));
                allResources.add(getFullResourceName(item['Catalyst 1']));
                allResources.add(getFullResourceName(item['Catalyst 2']));

                dfs(getFullResourceName(item.Input));
                dfs(getFullResourceName(item['Catalyst 1']));
                dfs(getFullResourceName(item['Catalyst 2']));
            }
        }
    }

    dfs(targetResource);
    return new Set([...allResources].sort());
}

export function calculateOptimizedResources(
    targetResource: string,
    targetAmount: number,
    availableResources: Set<string>,
    isOghmir: boolean = false,
    removedTools: string[] = [],
    removedResources: string[] = [],
    useVendor: boolean = false
): string {
    const removedToolsSet = new Set(removedTools);
    const removedResourcesSet = new Set(removedResources);
    const baseMaterials: { [key: string]: number } = {};

    function getOptimalPath(
        resource: string,
        amount: number,
        visited: Set<string> = new Set()
    ): [string, number, string, [string, number][], string, number][] {
        if (visited.has(resource)) {
            return [[resource, amount, 'Circular Dependency', [], 'Error', 0]];
        }

        visited.add(resource);

        if (['Granum', 'Calx', 'Saburra', 'Tephra', 'Gabore'].includes(resource) || availableResources.has(resource)) {
            baseMaterials[resource] = (baseMaterials[resource] || 0) + amount;
            return [];
        }

        const upstreamSteps = getBestUpstream(
            getResourceByName(resource),
            removedToolsSet,
            removedResourcesSet
        );

        if (upstreamSteps.length === 0) {
            baseMaterials[resource] = (baseMaterials[resource] || 0) + amount;
            return [];
        }

        // Prioritize steps that use available resources
        const prioritizedSteps = upstreamSteps.sort((a, b) => {
			const aUsesAvailable = availableResources.has(a.input.name) || a.catalysts.some(c => availableResources.has(c.resource.name));
			const bUsesAvailable = availableResources.has(b.input.name) || b.catalysts.some(c => availableResources.has(c.resource.name));
			return Number(bUsesAvailable) - Number(aUsesAvailable);
		});

        const bestStep = prioritizedSteps[0];
        const inputEfficiency = bestStep.outputs.find((o) => o.resource.name === resource)!;
        const inputAmount = Math.ceil(
            amount / (inputEfficiency.factor * (bestStep.tool !== 'Refining Oven' ? (isOghmir ? 1.03 : 1) : 1))
        );

        const catalysts: [string, number][] = bestStep.catalysts.map((c) => [
            c.resource.name,
            Math.ceil(inputAmount * c.factor * (bestStep.tool !== 'Refining Oven' ? (isOghmir ? 1.03 : 1) : 1))
        ]);

        const inputPath = getOptimalPath(bestStep.input.name, inputAmount, new Set(visited));
        const catalystPaths = catalysts.flatMap(([name, cAmount]) =>
            getOptimalPath(name, cAmount, new Set(visited))
        );

        return [
            ...inputPath,
            ...catalystPaths,
            [
                resource,
                amount,
                bestStep.input.name,
                catalysts,
                bestStep.tool,
                inputEfficiency.factor * (bestStep.tool !== 'Refining Oven' ? (isOghmir ? 1.03 : 1) : 1)
            ]
        ];
    }

    const chain = getOptimalPath(targetResource, targetAmount);
    let result = `To produce ${targetAmount} ${targetResource}, you need:\n`;
    for (const [resource, amount] of Object.entries(baseMaterials)) {
        result += `  ${amount} ${resource} --> ${(amount / 10000).toFixed(4)} Stacks\n`;
    }
    result += '\n';
    result += formatProductionSteps(chain, useVendor);

    return result;
}