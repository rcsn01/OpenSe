import { NodeProcessor } from '../../registry.types';
import { Row, SortNodeData } from '../../types';

const getInputRows = (inputs: Record<string, { rows: Row[] }>, preferred: string[]) => {
  for (const key of preferred) {
    if (inputs[key]) return inputs[key].rows;
  }
  const first = Object.values(inputs)[0];
  return first?.rows || [];
};

export const processSort: NodeProcessor<SortNodeData> = async ({ data, inputs, helpers }) => {
  const sourceRows = getInputRows(inputs, ['in']);
  if (!data.field) {
    return { outputs: { out: inputs.in?.ref || Object.values(inputs)[0]?.ref || await helpers.persistRows(sourceRows) } };
  }

  const out = [...sourceRows].sort((a, b) => {
    const av = a[data.field as string];
    const bv = b[data.field as string];
    if (av === bv) return 0;
    if (av === undefined || av === null) return 1;
    if (bv === undefined || bv === null) return -1;
    if (av > bv) return data.direction === 'asc' ? 1 : -1;
    if (av < bv) return data.direction === 'asc' ? -1 : 1;
    return 0;
  });

  return {
    outputs: {
      out: await helpers.persistRows(out),
    },
  };
};
