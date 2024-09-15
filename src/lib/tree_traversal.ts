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

function parseExtractionData(data: NorscaData[]) {
  data.forEach((d) => {
    const inputResource = getResourceByName(d.Input.split(' ')[0]);
    const step: ProcessingStep = {
      input: inputResource,
      tool: d.Tool,
      catalysts: [],
      outputs: [],
    };

    if (d.Catalyst) {
      const [catalystName, catalystAmountRaw] = d.Catalyst.split(' ');
      const catalystAmount = parseInt(catalystAmountRaw.replace(/[()]/g, ''));
      const catalystResource = getResourceByName(catalystName);
      step.catalysts.push({
        resource: catalystResource,
        factor: catalystAmount / 10000,
      });
    }

    for (let i = 1; i <= 5; i++) {
      const output = d[`Output ${i}` as keyof NorscaData];
      if (output) {
        const [outputName, outputAmountRaw] = output.split(' ');
        const outputAmount = parseInt(outputAmountRaw.replace(/[()]/g, ''));
        const outputResource = getResourceByName(outputName);
        step.outputs.push({
          resource: outputResource,
          factor: outputAmount / 10000,
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
      .map((c) => `${Math.ceil(ra.amount * c.factor * OGHMIR)} ${c.resource.name}`)
      .join(' and ');

    result += `${'    '.repeat(depth)}| ${ra.amount} ${s.input.name} in ${s.tool} with ${
      catalysts || 'no catalyst'
    }:\n`;

    s.outputs.forEach((e) => {
      const outputAmount = Math.floor(e.factor * ra.amount * OGHMIR);
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