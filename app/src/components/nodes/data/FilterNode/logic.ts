import { NodeProcessor } from '../../registry.types';
import { FilterNodeData } from '../../types';

const getInputRows = (inputs: Record<string, { rows: any[] }>, preferred: string[]) => {
  for (const key of preferred) {
    if (inputs[key]) return inputs[key].rows;
  }
  const first = Object.values(inputs)[0];
  return first?.rows || [];
};

export const processFilter: NodeProcessor<FilterNodeData> = async ({ data, inputs, helpers }) => {
  const sourceRows = getInputRows(inputs, ['in']);
  const filtered = !data.field || data.value === undefined
    ? sourceRows
    : sourceRows.filter((r) => {
        const val = (r[data.field] ?? '').toString();
        if (data.operator === 'equals') return val === data.value;
        return val.toLowerCase().includes((data.value || '').toLowerCase());
      });

  return {
    outputs: {
      out: await helpers.persistRows(filtered),
    },
  };
};
