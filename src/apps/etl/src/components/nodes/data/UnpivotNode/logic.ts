import { NodeProcessor } from '../../registry.types';
import { Row, UnpivotNodeData } from '../../types';

const getInputRows = (inputs: Record<string, { rows: Row[] }>, preferred: string[]) => {
  for (const key of preferred) {
    if (inputs[key]) return inputs[key].rows;
  }
  const first = Object.values(inputs)[0];
  return first?.rows || [];
};

export const processUnpivot: NodeProcessor<UnpivotNodeData> = async ({ data, inputs, helpers }) => {
  const sourceRows = getInputRows(inputs, ['in']);
  const keeps = data.keepColumns || [];
  const melts = data.pivotColumns || [];

  if (!melts.length) {
    return { outputs: { out: inputs.in?.ref || Object.values(inputs)[0]?.ref || await helpers.persistRows(sourceRows) } };
  }

  const out: Row[] = [];
  sourceRows.forEach((r) => {
    melts.forEach((col) => {
      const base: Row = {};
      keeps.forEach((k) => { base[k] = r[k]; });
      base.Variable = col;
      base.Value = r[col];
      out.push(base);
    });
  });

  return {
    outputs: {
      out: await helpers.persistRows(out),
    },
  };
};
