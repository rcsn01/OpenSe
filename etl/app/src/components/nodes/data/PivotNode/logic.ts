import { NodeProcessor } from '../../registry.types';
import { PivotNodeData, Row } from '../../types';

const getInputRows = (inputs: Record<string, { rows: Row[] }>, preferred: string[]) => {
  for (const key of preferred) {
    if (inputs[key]) return inputs[key].rows;
  }
  const first = Object.values(inputs)[0];
  return first?.rows || [];
};

export const processPivot: NodeProcessor<PivotNodeData> = async ({ data, inputs, helpers }) => {
  const sourceRows = getInputRows(inputs, ['in']);
  if (!data.indexColumn || !data.pivotColumn || !data.valueColumn) {
    return { outputs: { out: inputs.in?.ref || Object.values(inputs)[0]?.ref || await helpers.persistRows(sourceRows) } };
  }

  const groups = new Map<string, Row>();
  sourceRows.forEach((r) => {
    const idxVal = r[data.indexColumn];
    const pivotKey = r[data.pivotColumn];
    const val = r[data.valueColumn];
    const key = JSON.stringify(idxVal);
    const bucket = groups.get(key) || { [data.indexColumn]: idxVal };
    if (pivotKey !== undefined && pivotKey !== null) {
      bucket[String(pivotKey)] = val;
    }
    groups.set(key, bucket);
  });

  const out = Array.from(groups.values());
  return {
    outputs: {
      out: await helpers.persistRows(out),
    },
  };
};
