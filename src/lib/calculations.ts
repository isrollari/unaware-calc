// src/lib/calculations.ts
//
// Planning logic for the Shopping List and Smart Planner calculators.
// All data parsing, bonus math, and rounding rules live in model.ts.

import norscaData from './norsca.json';
import refiningData from './refining.json';
import vendorData from './vendor.json';
import {
	type BonusOptions,
	type ProcessingStep,
	getBestUpstream,
	getResourceByName,
	hasResource,
	isBaseOre,
	inputNeeded,
	catalystNeeded,
	outputProduced,
	stripQuantity,
	yieldMultiplier
} from './model';

interface VendorItem {
	Catalyst: string;
	Price: number;
}

const vendorPrices = new Map((vendorData as VendorItem[]).map((v) => [v.Catalyst, v.Price]));

/** One entry in a production chain. */
interface ChainStep {
	kind: 'craft' | 'buy';
	output: string;
	amount: number;
	/** craft: input resource name; buy: 'Vendor'. */
	source: string;
	catalysts: [string, number][];
	tool: string;
	/** craft: effective output factor (incl. bonuses); buy: total price in cuprum. */
	value: number;
}

// ---------------------------------------------------------------------------
// Shopping List: everything needed to produce a target from scratch
// ---------------------------------------------------------------------------

function calculateBaseMaterials(
	targetResource: string,
	targetAmount: number,
	removedTools: Set<string>,
	removedResources: Set<string>,
	bonuses: BonusOptions,
	useVendor: boolean,
	values?: Map<string, number>
): { [key: string]: number } {
	const baseMaterials: { [key: string]: number } = {};
	const intermediateProducts: { [key: string]: number } = {};
	const stack: [string, number][] = [[targetResource, targetAmount]];

	while (stack.length > 0) {
		const [resourceName, amount] = stack.pop()!;

		if (isBaseOre(resourceName)) {
			baseMaterials[resourceName] = (baseMaterials[resourceName] || 0) + amount;
			continue;
		}

		if (useVendor && vendorPrices.has(resourceName)) {
			baseMaterials[resourceName] = (baseMaterials[resourceName] || 0) + amount;
			continue;
		}

		if (!hasResource(resourceName)) {
			throw new Error(`Unknown resource: ${resourceName}`);
		}
		const resource = getResourceByName(resourceName);

		// Use byproducts from earlier steps before producing more.
		if ((intermediateProducts[resourceName] || 0) >= amount) {
			intermediateProducts[resourceName] -= amount;
			continue;
		}
		const amountToProduce = amount - (intermediateProducts[resourceName] || 0);
		intermediateProducts[resourceName] = 0;

		const upstreamSteps = getBestUpstream(resource, removedTools, removedResources, values);
		if (upstreamSteps.length === 0) {
			baseMaterials[resourceName] = (baseMaterials[resourceName] || 0) + amountToProduce;
			continue;
		}

		const step = upstreamSteps[0];
		const mult = yieldMultiplier(step.tool, bonuses);
		const factor = step.outputs.find((o) => o.resource.name === resourceName)!.factor;
		const inputAmount = inputNeeded(amountToProduce, factor, mult);

		stack.push([step.input.name, inputAmount]);
		for (const catalyst of step.catalysts) {
			stack.push([catalyst.resource.name, catalystNeeded(inputAmount, catalyst.factor)]);
		}

		for (const output of step.outputs) {
			if (output.resource.name !== resourceName) {
				const produced = outputProduced(inputAmount, output.factor, mult);
				intermediateProducts[output.resource.name] =
					(intermediateProducts[output.resource.name] || 0) + produced;
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
	bonuses: BonusOptions,
	useVendor: boolean,
	values?: Map<string, number>
): ChainStep[] {
	const chain: ChainStep[] = [];
	const stack: [string, number][] = [[targetResource, targetAmount]];
	const intermediateProducts: { [key: string]: number } = {};

	while (stack.length > 0) {
		const [resourceName, amount] = stack.pop()!;

		if (isBaseOre(resourceName) || !hasResource(resourceName)) {
			continue;
		}

		if (useVendor && vendorPrices.has(resourceName)) {
			chain.push({
				kind: 'buy',
				output: resourceName,
				amount,
				source: 'Vendor',
				catalysts: [],
				tool: 'Buy',
				value: vendorPrices.get(resourceName)! * amount
			});
			continue;
		}

		if ((intermediateProducts[resourceName] || 0) >= amount) {
			intermediateProducts[resourceName] -= amount;
			continue;
		}
		const amountToProduce = amount - (intermediateProducts[resourceName] || 0);
		intermediateProducts[resourceName] = 0;

		const upstreamSteps = getBestUpstream(
			getResourceByName(resourceName),
			removedTools,
			removedResources,
			values
		);
		if (upstreamSteps.length === 0) continue;

		const step = upstreamSteps[0];
		const mult = yieldMultiplier(step.tool, bonuses);
		const factor = step.outputs.find((o) => o.resource.name === resourceName)!.factor;
		const inputAmount = inputNeeded(amountToProduce, factor, mult);

		const catalysts: [string, number][] = step.catalysts.map((c) => [
			c.resource.name,
			catalystNeeded(inputAmount, c.factor)
		]);

		chain.push({
			kind: 'craft',
			output: resourceName,
			amount: amountToProduce,
			source: step.input.name,
			catalysts,
			tool: step.tool,
			value: factor * mult
		});

		stack.push([step.input.name, inputAmount]);
		stack.push(...catalysts);

		for (const output of step.outputs) {
			if (output.resource.name !== resourceName) {
				const produced = outputProduced(inputAmount, output.factor, mult);
				intermediateProducts[output.resource.name] =
					(intermediateProducts[output.resource.name] || 0) + produced;
			}
		}
	}

	return chain.reverse();
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

interface CombinedStep {
	kind: 'craft' | 'buy';
	outputs: { [key: string]: number };
	totalOutput: number;
	source: string;
	catalysts: [string, number][];
	tool: string;
	/** craft: best effective factor; buy: summed price in cuprum. */
	value: number;
}

function combineSteps(chain: ChainStep[]): CombinedStep[] {
	const combined: { [key: string]: CombinedStep } = {};

	for (const step of chain) {
		const key = `${step.source}|${step.tool}`;
		if (!combined[key]) {
			combined[key] = {
				kind: step.kind,
				outputs: {},
				totalOutput: 0,
				source: step.source,
				catalysts: [],
				tool: step.tool,
				value: 0
			};
		}
		const c = combined[key];
		c.outputs[step.output] = (c.outputs[step.output] || 0) + step.amount;
		c.totalOutput += step.amount;

		for (const [name, amount] of step.catalysts) {
			const existing = c.catalysts.find(([n]) => n === name);
			if (existing) existing[1] += amount;
			else c.catalysts.push([name, amount]);
		}

		// Craft steps keep the best factor; buy steps accumulate total price.
		c.value = step.kind === 'buy' ? c.value + step.value : Math.max(c.value, step.value);
	}

	return Object.values(combined);
}

function cuprumToGold(cuprumAmount: number): string {
	return `${(cuprumAmount / 10000).toFixed(3)} Gold`;
}

function formatProductionSteps(chain: ChainStep[]): string {
	let result = 'Production steps:\n';

	for (const step of combineSteps(chain)) {
		const outputStr = Object.entries(step.outputs)
			.map(([resource, amount]) => `${amount} ${resource}`)
			.join(', ');

		if (step.kind === 'buy') {
			result += `To get ${outputStr}: Buy from Vendor for ${cuprumToGold(step.value)}\n\n`;
		} else {
			const catalystStr =
				step.catalysts.length > 0
					? ` with ${step.catalysts.map(([name, amount]) => `${amount} ${name}`).join(' and ')}`
					: '';
			const inputAmount = Math.ceil(step.totalOutput / step.value);
			result += `To make ${outputStr}:\n`;
			result += `  Use ${inputAmount} ${step.source} in a ${step.tool}${catalystStr}\n\n`;
		}
	}

	return result;
}

function formatBaseMaterials(baseMaterials: { [key: string]: number }): string {
	let result = '';
	for (const [resource, amount] of Object.entries(baseMaterials)) {
		result += `  ${amount} ${resource} --> ${(amount / 10000).toFixed(4)} Stacks\n`;
	}
	return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function calculateResources(
	targetResource: string,
	targetAmount: number,
	bonuses: BonusOptions = {},
	removedTools: string[] = [],
	removedResources: string[] = [],
	useVendor: boolean = false,
	values?: Map<string, number>
): string {
	try {
		const removedToolsSet = new Set(removedTools);
		const removedResourcesSet = new Set(removedResources);

		const baseMaterials = calculateBaseMaterials(
			targetResource,
			targetAmount,
			removedToolsSet,
			removedResourcesSet,
			bonuses,
			useVendor,
			values
		);
		const chain = getFullProductionChain(
			targetResource,
			targetAmount,
			removedToolsSet,
			removedResourcesSet,
			bonuses,
			useVendor,
			values
		);

		let result = `To produce ${targetAmount} ${targetResource}, you need:\n`;
		result += formatBaseMaterials(baseMaterials);
		result += '\n';
		result += formatProductionSteps(chain);
		return result;
	} catch (error) {
		return error instanceof Error ? `Error: ${error.message}` : 'An unknown error occurred';
	}
}

export function getAllProductionPaths(targetResource: string): Set<string> {
	const allResources = new Set<string>();
	const visited = new Set<string>();

	function dfs(resource: string) {
		if (visited.has(resource)) return;
		visited.add(resource);

		if (isBaseOre(resource)) {
			allResources.add(resource);
			return;
		}

		for (const item of norscaData) {
			for (let i = 1; i <= 5; i++) {
				const output = item[`Output ${i}` as keyof typeof item];
				if (output && stripQuantity(output as string) === resource) {
					const input = stripQuantity(item.Input);
					allResources.add(input);
					if (item.Catalyst) allResources.add(stripQuantity(item.Catalyst));
					dfs(input);
				}
			}
		}

		for (const item of refiningData) {
			if (item.Output === resource) {
				for (const name of [item.Input, item['Catalyst 1'], item['Catalyst 2']]) {
					allResources.add(name);
					dfs(name);
				}
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
	bonuses: BonusOptions = {},
	removedTools: string[] = [],
	removedResources: string[] = [],
	useVendor: boolean = false,
	values?: Map<string, number>
): string {
	const removedToolsSet = new Set(removedTools);
	const removedResourcesSet = new Set(removedResources);
	const baseMaterials: { [key: string]: number } = {};

	function getOptimalPath(
		resource: string,
		amount: number,
		visited: Set<string> = new Set()
	): ChainStep[] {
		if (visited.has(resource)) {
			return [
				{
					kind: 'craft',
					output: resource,
					amount,
					source: 'Circular Dependency',
					catalysts: [],
					tool: 'Error',
					value: 0
				}
			];
		}
		visited.add(resource);

		if (isBaseOre(resource) || availableResources.has(resource)) {
			baseMaterials[resource] = (baseMaterials[resource] || 0) + amount;
			return [];
		}

		const upstreamSteps = getBestUpstream(
			getResourceByName(resource),
			removedToolsSet,
			removedResourcesSet,
			values
		);
		if (upstreamSteps.length === 0) {
			baseMaterials[resource] = (baseMaterials[resource] || 0) + amount;
			return [];
		}

		// Prefer steps whose input or catalysts we already have.
		const prioritized = [...upstreamSteps].sort((a, b) => {
			const usesAvailable = (s: ProcessingStep) =>
				availableResources.has(s.input.name) ||
				s.catalysts.some((c) => availableResources.has(c.resource.name));
			return Number(usesAvailable(b)) - Number(usesAvailable(a));
		});

		const step = prioritized[0];
		const mult = yieldMultiplier(step.tool, bonuses);
		const factor = step.outputs.find((o) => o.resource.name === resource)!.factor;
		const inputAmount = inputNeeded(amount, factor, mult);

		const catalysts: [string, number][] = step.catalysts.map((c) => [
			c.resource.name,
			catalystNeeded(inputAmount, c.factor)
		]);

		const inputPath = getOptimalPath(step.input.name, inputAmount, new Set(visited));
		const catalystPaths = catalysts.flatMap(([name, cAmount]) =>
			getOptimalPath(name, cAmount, new Set(visited))
		);

		return [
			...inputPath,
			...catalystPaths,
			{
				kind: 'craft',
				output: resource,
				amount,
				source: step.input.name,
				catalysts,
				tool: step.tool,
				value: factor * mult
			}
		];
	}

	const chain = getOptimalPath(targetResource, targetAmount);

	let result = `To produce ${targetAmount} ${targetResource}, you need:\n`;
	result += formatBaseMaterials(baseMaterials);
	result += '\n';
	result += formatProductionSteps(chain);
	return result;
}
