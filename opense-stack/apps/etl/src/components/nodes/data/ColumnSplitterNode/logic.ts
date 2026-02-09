import { NodeProcessor } from '../../registry.types';
import { ColumnSplitterNodeData, Row } from '../../types';

const getInputRows = (inputs: Record<string, { rows: Row[] }>, preferred: string[]) => {
  for (const key of preferred) {
    if (inputs[key]) return inputs[key].rows;
  }
  const first = Object.values(inputs)[0];
  return first?.rows || [];
};

export const processColumnSplitter: NodeProcessor<ColumnSplitterNodeData> = async ({ data, inputs, helpers }) => {
  const sourceRows = getInputRows(inputs, ['in']);
  const selected = new Set(data.selectedColumns || []);

  if (!selected.size || !sourceRows.length) {
    return {
      outputs: {
        top: await helpers.persistRows(sourceRows),
        bottom: await helpers.persistRows([]),
      },
    };
  }

  const topRows: Row[] = [];
  const bottomRows: Row[] = [];

  for (const row of sourceRows) {
    const topRow: Row = {};
    const bottomRow: Row = {};
    for (const [key, val] of Object.entries(row)) {
      if (selected.has(key)) {
        topRow[key] = val;
      } else {
        bottomRow[key] = val;
      }
    }
    topRows.push(topRow);
    bottomRows.push(bottomRow);
  }

  return {
    outputs: {
      top: await helpers.persistRows(topRows),
      bottom: await helpers.persistRows(bottomRows),
    },
  };
};
