import { NodeProcessor } from '../../registry.types';
import { RenameNodeData, Row } from '../../types';

const getInputRows = (inputs: Record<string, { rows: Row[] }>, preferred: string[]) => {
  for (const key of preferred) {
    if (inputs[key]) return inputs[key].rows;
  }
  const first = Object.values(inputs)[0];
  return first?.rows || [];
};

export const processRenameMap: NodeProcessor<RenameNodeData> = async ({ data, inputs, helpers }) => {
  const sourceRows = getInputRows(inputs, ['in']);
  const mappings = data.mappings || [];
  if (!mappings.length) {
    return { outputs: { out: inputs.in?.ref || Object.values(inputs)[0]?.ref || await helpers.persistRows(sourceRows) } };
  }

  const mapObj: Record<string, string> = {};
  mappings.forEach((m) => {
    if (m.oldColumn && m.newColumn) mapObj[m.oldColumn] = m.newColumn;
  });

  const out = sourceRows.map((r) => {
    const next: Row = {};
    Object.entries(r).forEach(([k, v]) => {
      const target = mapObj[k] || k;
      next[target] = v;
    });
    return next;
  });

  return {
    outputs: {
      out: await helpers.persistRows(out),
    },
  };
};
