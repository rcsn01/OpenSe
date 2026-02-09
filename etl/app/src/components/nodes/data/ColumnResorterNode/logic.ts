import { NodeProcessor } from '../../registry.types';
import { ColumnResorterNodeData, Row } from '../../types';

const getInputRows = (inputs: Record<string, { rows: Row[] }>, preferred: string[]) => {
  for (const key of preferred) {
    if (inputs[key]) return inputs[key].rows;
  }
  const first = Object.values(inputs)[0];
  return first?.rows || [];
};

export const processColumnResorter: NodeProcessor<ColumnResorterNodeData> = async ({ data, inputs, helpers }) => {
  const sourceRows = getInputRows(inputs, ['in']);
  if (!data.columnOrder?.length || !sourceRows.length) {
    return { outputs: { out: inputs.in?.ref || Object.values(inputs)[0]?.ref || await helpers.persistRows(sourceRows) } };
  }

  const reordered = sourceRows.map((row) => {
    const newRow: Row = {};
    // First add columns in the specified order
    for (const col of data.columnOrder) {
      if (col in row) {
        newRow[col] = row[col];
      }
    }
    // Then add any remaining columns not in the order
    for (const col of Object.keys(row)) {
      if (!(col in newRow)) {
        newRow[col] = row[col];
      }
    }
    return newRow;
  });

  return {
    outputs: {
      out: await helpers.persistRows(reordered),
    },
  };
};
