// src/lib/model.ts
//
// Single source of truth for the crafting model:
//  - the resource graph parsed from norsca.json / refining.json
//  - which resources count as base (gatherable) ore
//  - yield bonuses (Oghmir clade, extraction Masteries)
//  - the rounding rules used everywhere
//
// Both calculations.ts and tree_traversal.ts build on this module, so
// bonus math and data parsing are never duplicated again.

import norscaData from './norsca.json';
import refiningData from './refining.json';
import type { NorscaData, RefiningData } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Resource {
	name: string;
	/** Steps that consume this resource as input. */
	downstream: ProcessingStep[];
	/** Steps that produce this resource as an output. */
	upstream: ProcessingStep[];
}

export interface ResourceEfficiency {
	resource: Resource;
	/** Amount per 1 unit of step input. */
	factor: number;
}

export interface ProcessingStep {
	input: Resource;
	tool: string;
	catalysts: ResourceEfficiency[];
	outputs: ResourceEfficiency[];
}

/** Character bonuses that affect yields. */
export interface BonusOptions {
	/** Oghmir clade gift: +3% yield when extracting from ore. */
	isOghmir?: boolean;
	/** Extraction Masteries trained: +6% yield when extracting from ore. */
	hasMasteries?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Raw, gatherable ores — recursion stops here. */
export const BASE_ORES = ['Granum', 'Calx', 'Saburra', 'Tephra', 'Gabore'] as const;

export const REFINING_TOOL = 'Refining Oven';

export const OGHMIR_BONUS = 1.03;
export const MASTERIES_BONUS = 1.06;

export function isBaseOre(name: string): boolean {
	return (BASE_ORES as readonly string[]).includes(name);
}

/**
 * Yield multiplier for a step. Bonuses only apply when extracting from ore
 * (i.e. any tool other than the Refining Oven). Oghmir and Masteries stack
 * multiplicatively: 1.03 x 1.06 ~= +9.2% combined.
 */
export function yieldMultiplier(tool: string, bonuses: BonusOptions = {}): number {
	if (tool === REFINING_TOOL) return 1;
	return (bonuses.isOghmir ? OGHMIR_BONUS : 1) * (bonuses.hasMasteries ? MASTERIES_BONUS : 1);
}

// ---------------------------------------------------------------------------
// Rounding rules (kept in one place so every calculator agrees)
// ---------------------------------------------------------------------------

/** How much input is needed to hit a target output at a given factor. */
export function inputNeeded(targetOutput: number, factor: number, multiplier: number): number {
	return Math.ceil(targetOutput / (factor * multiplier));
}

/**
 * Catalyst consumed for a given input amount.
 * NOTE: intentionally NOT multiplied by the yield bonus. (The old code
 * inflated catalyst usage by the Oghmir bonus — a yield buff should never
 * increase catalyst consumption. Catalyst use scales with input only.)
 */
export function catalystNeeded(inputAmount: number, factor: number): number {
	return Math.ceil(inputAmount * factor);
}

/** Output produced from a given input amount. */
export function outputProduced(inputAmount: number, factor: number, multiplier: number): number {
	return Math.floor(inputAmount * factor * multiplier);
}

// ---------------------------------------------------------------------------
// Resource graph (parsed once at module load)
// ---------------------------------------------------------------------------

const resources: { [key: string]: Resource } = {};

export function getResourceByName(name: string): Resource {
	if (!resources[name]) {
		resources[name] = { name, downstream: [], upstream: [] };
	}
	return resources[name];
}

export function hasResource(name: string): boolean {
	return name in resources;
}

/** Strip a trailing quantity like " (10k)" from a data-file name. */
export function stripQuantity(input: string): string {
	return input.replace(/\s*\(\d+k?\)\s*$/, '').trim();
}

function parseNameAndAmount(input: string): [Resource, number] {
	const match = input.trim().match(/^(.*?)\s*\((\d+)(k?)\)$/);
	if (!match) {
		// No quantity suffix: treat as a bare name with amount 1.
		return [getResourceByName(input.trim()), 1];
	}
	const [, name, num, k] = match;
	return [getResourceByName(name.trim()), parseInt(num) * (k ? 1000 : 1)];
}

function parseExtractionData() {
	for (const d of norscaData as NorscaData[]) {
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
			const output = d[`Output ${i}` as keyof NorscaData];
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
			tool: REFINING_TOOL,
			catalysts: [
				{ resource: getResourceByName(d['Catalyst 1']), factor: 0.5 },
				{ resource: getResourceByName(d['Catalyst 2']), factor: 0.5 }
			],
			outputs: [{ resource: outputResource, factor: 0.7 }]
		};
		inputResource.downstream.push(step);
		outputResource.upstream.push(step);
	}
}

parseExtractionData();
parseRefiningData();

/**
 * Upstream steps that can produce `resource`, best yield first,
 * excluding removed tools/resources.
 */
export function getBestUpstream(
	resource: Resource,
	removedTools: Set<string>,
	removedResources: Set<string>,
	values?: Map<string, number>
): ProcessingStep[] {
	return resource.upstream
		.filter(
			(step) =>
				!removedTools.has(step.tool) &&
				!removedResources.has(step.input.name) &&
				step.catalysts.every((c) => !removedResources.has(c.resource.name))
		)
		.sort((a, b) => {
			if (values) {
				const totalValue = (step: ProcessingStep) =>
					step.outputs.reduce(
						(sum, o) => sum + o.factor * (values.get(o.resource.name) ?? 1),
						0
					);
				return totalValue(b) - totalValue(a);
			}
			const aEff = a.outputs.find((o) => o.resource === resource)?.factor || 0;
			const bEff = b.outputs.find((o) => o.resource === resource)?.factor || 0;
			return bEff - aEff;
		});
}
