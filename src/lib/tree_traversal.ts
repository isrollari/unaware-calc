// src/lib/tree_traversal.ts

import type { NorscaData, RefiningData } from './types';
import norscaData from './norsca.json';
import refiningData from './refining.json';

interface Resource {
  name: string;
  downstream: ProcessingStep[];
}

interface ProcessingStep {
  input: Resource;
  tool: string;
  catalysts: ResourceEfficiency[];
  outputs: ResourceEfficiency[];
}

interface ResourceEfficiency {
  resource: Resource;
  factor: number;
}

interface ResourceAmount {
  resource: Resource;
  amount: number;
}

const resources: { [key: string]: Resource } = {};

export function getResourceByName(name: string): Resource {
    if (!resources[name]) {
      resources[name] = { name, downstream: [] };
    }
    return resources[name];
  }

function parseNameAndAmount(input: string): [Resource, number] {
  const parts = input.split(' ');
  const amountStr = parts[parts.length - 1].replace(/[()]/g, '');
  let amount = parseInt(amountStr);
  if (amountStr.endsWith('k')) {
    amount *= 1000;
  }
  const name = parts.slice(0, -1).join(' ');
  return [getResourceByName(name), amount];
}

function parseExtractionData(data: NorscaData[]) {
  data.forEach((d) => {
    const [inputResource, inputAmount] = parseNameAndAmount(d.Input);
    const step: ProcessingStep = {
      input: inputResource,
      tool: d.Tool,
      catalysts: [],
      outputs: [],
    };

    if (d.Catalyst) {
      const [catalystResource, catalystAmount] = parseNameAndAmount(d.Catalyst);
      step.catalysts.push({
        resource: catalystResource,
        factor: catalystAmount / inputAmount,
      });
    }

    for (let i = 1; i <= 5; i++) {
      const output = d[`Output ${i}` as keyof NorscaData];
      if (output) {
        const [outputResource, outputAmount] = parseNameAndAmount(output);
        step.outputs.push({
          resource: outputResource,
          factor: outputAmount / inputAmount,
        });
      }
    }

    inputResource.downstream.push(step);
  });
}

function parseRefiningData(data: RefiningData[]) {
  data.forEach((d) => {
    const inputResource = getResourceByName(d.Input);
    const outputResource = getResourceByName(d.Output);
    const step: ProcessingStep = {
      input: inputResource,
      tool: 'Refining Oven',
      catalysts: [
        { resource: getResourceByName(d['Catalyst 1']), factor: 0.5 },
        { resource: getResourceByName(d['Catalyst 2']), factor: 0.5 },
      ],
      outputs: [{ resource: outputResource, factor: 0.7 }],
    };
    inputResource.downstream.push(step);
  });
}

parseExtractionData(norscaData);
parseRefiningData(refiningData);

export function traverseDownstream(
  ra: ResourceAmount,
  maxDepth: number = Infinity,
  asOghmir: boolean = false,
  depth: number = 0
): string {
  let result = '';
  const OGHMIR = asOghmir ? 1.03 : 1;

  if (depth === maxDepth) {
    return result;
  }

  ra.resource.downstream.forEach((s) => {
    const catalysts = s.catalysts
      .map((c) => `${Math.ceil(ra.amount * c.factor * (s.tool !== 'Refining Oven' ? OGHMIR : 1))} ${c.resource.name}`)
      .join(' and ');

    result += `${'    '.repeat(depth)}| ${ra.amount} ${s.input.name} in ${s.tool} with ${
      catalysts || 'no catalyst'
    }:\n`;

    s.outputs.forEach((e) => {
      const outputAmount = Math.floor(e.factor * ra.amount * (s.tool !== 'Refining Oven' ? OGHMIR : 1));
      result += `${'    '.repeat(depth)} -> ${outputAmount} ${e.resource.name}\n`;

      result += traverseDownstream(
        { resource: e.resource, amount: outputAmount },
        maxDepth,
        asOghmir,
        depth + 1
      );
    });
  });

  return result;
}