// src/lib/tree_traversal.ts
//
// "What Can I Make?" — walk downstream from a resource and list everything
// it can be processed into. Graph and bonus math come from model.ts.

import {
	type BonusOptions,
	type Resource,
	catalystNeeded,
	getResourceByName,
	outputProduced,
	yieldMultiplier
} from './model';

export { getResourceByName };

interface ResourceAmount {
	resource: Resource;
	amount: number;
}

export function traverseDownstream(
	ra: ResourceAmount,
	maxDepth: number = Infinity,
	bonuses: BonusOptions = {},
	depth: number = 0
): string {
	let result = '';
	if (depth === maxDepth) return result;

	for (const step of ra.resource.downstream) {
		const mult = yieldMultiplier(step.tool, bonuses);

		const catalysts = step.catalysts
			.map((c) => `${catalystNeeded(ra.amount, c.factor)} ${c.resource.name}`)
			.join(' and ');

		result += `${'    '.repeat(depth)}| ${ra.amount} ${step.input.name} in ${step.tool} with ${
			catalysts || 'no catalyst'
		}:\n`;

		for (const output of step.outputs) {
			const outputAmount = outputProduced(ra.amount, output.factor, mult);
			result += `${'    '.repeat(depth)} -> ${outputAmount} ${output.resource.name}\n`;

			result += traverseDownstream(
				{ resource: output.resource, amount: outputAmount },
				maxDepth,
				bonuses,
				depth + 1
			);
		}
	}

	return result;
}
