import { NodeProcessor } from '../../registry.types';
import { ConcatenateNodeData, Row } from '../../types';

export const processConcatenate: NodeProcessor<ConcatenateNodeData> = async ({ inputs, helpers }) => {
  const topRows = inputs.top?.rows || [];
  const bottomRows = inputs.bottom?.rows || [];

  // Union all columns from both tables
  const allColumns = new Set<string>();
  for (const row of topRows) Object.keys(row).forEach((k) => allColumns.add(k));
  for (const row of bottomRows) Object.keys(row).forEach((k) => allColumns.add(k));

  // Merge: fill missing columns with null
  const merged: Row[] = [];
  for (const row of topRows) {
    const newRow: Row = {};
    for (const col of allColumns) {
      newRow[col] = col in row ? row[col] : null;
    }
    merged.push(newRow);
  }
  for (const row of bottomRows) {
    const newRow: Row = {};
    for (const col of allColumns) {
      newRow[col] = col in row ? row[col] : null;
    }
    merged.push(newRow);
  }

  return {
    outputs: {
      out: await helpers.persistRows(merged),
    },
  };
};
