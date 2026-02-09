import { NodeProcessor } from '../../registry.types';
import { RemoveNodeData, Row } from '../../types';

const getInputRows = (inputs: Record<string, { rows: Row[] }>, preferred: string[]) => {
  for (const key of preferred) {
    if (inputs[key]) return inputs[key].rows;
  }
  const first = Object.values(inputs)[0];
  return first?.rows || [];
};

export const processFilterColumns: NodeProcessor<RemoveNodeData> = async ({ data, inputs, helpers }) => {
  const sourceRows = getInputRows(inputs, ['in']);
  const targets = data.selectedFields?.length ? data.selectedFields : data.field ? [data.field] : [];

  const projected = !targets.length
    ? sourceRows
    : sourceRows.map((r) => {
        const kept: Row = {};
        targets.forEach((col) => {
          kept[col] = r[col];
        });
        return kept;
      });

  return {
    outputs: {
      out: await helpers.persistRows(projected),
    },
  };
};
