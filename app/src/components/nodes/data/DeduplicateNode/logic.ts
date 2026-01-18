import { NodeProcessor } from '../../registry.types';
import { DeduplicateNodeData, Row } from '../../types';

const getInputRows = (inputs: Record<string, { rows: Row[] }>, preferred: string[]) => {
  for (const key of preferred) {
    if (inputs[key]) return inputs[key].rows;
  }
  const first = Object.values(inputs)[0];
  return first?.rows || [];
};

export const processDeduplicate: NodeProcessor<DeduplicateNodeData> = async ({ data, inputs, helpers }) => {
  const sourceRows = getInputRows(inputs, ['in']);
  const keys = data.keys && data.keys.length ? data.keys : undefined;
  const seen = new Set<string>();
  const out: Row[] = [];

  for (const r of sourceRows) {
    const key = keys ? JSON.stringify(keys.map((k) => r[k])) : JSON.stringify(r);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }

  return {
    outputs: {
      out: await helpers.persistRows(out),
    },
  };
};
