import { NodeProcessor } from '../../registry.types';
import { LookupNodeData, Row } from '../../types';

const getInputRows = (inputs: Record<string, { rows: Row[] }>, preferred: string[]) => {
  for (const key of preferred) {
    if (inputs[key]) return inputs[key].rows;
  }
  const first = Object.values(inputs)[0];
  return first?.rows || [];
};

export const processLookup: NodeProcessor<LookupNodeData> = async ({ data, inputs, helpers }) => {
  const sourceRows = getInputRows(inputs, ['in']);
  const map = data.map || {};
  const newField = data.newField || data.field || 'lookup';
  const out = data.field
    ? sourceRows.map((r) => ({ ...r, [newField as string]: map[r[data.field as string]] ?? r[newField as string] }))
    : sourceRows;

  return {
    outputs: {
      out: await helpers.persistRows(out),
    },
  };
};
