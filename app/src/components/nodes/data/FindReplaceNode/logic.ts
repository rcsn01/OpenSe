import { NodeProcessor } from '../../registry.types';
import { FindReplaceNodeData, Row } from '../../types';

const getInputRows = (inputs: Record<string, { rows: Row[] }>, preferred: string[]) => {
  for (const key of preferred) {
    if (inputs[key]) return inputs[key].rows;
  }
  const first = Object.values(inputs)[0];
  return first?.rows || [];
};

export const processFindReplace: NodeProcessor<FindReplaceNodeData> = async ({ data, inputs, helpers }) => {
  const sourceRows = getInputRows(inputs, ['in']);
  const out = sourceRows.map((r) => {
    if (!data.field || !(data.field in r)) return r;
    const val = r[data.field];
    if (val === null || val === undefined) return r;
    const str = val.toString();
    const needle = data.search || '';
    if (!needle) return r;
    const replaced = data.caseSensitive
      ? str.split(needle).join(data.replace)
      : str.replace(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), data.replace);
    return { ...r, [data.field]: replaced };
  });

  return {
    outputs: {
      out: await helpers.persistRows(out),
    },
  };
};
