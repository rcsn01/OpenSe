import { NodeProcessor, ProcessorInput } from '../../registry.types';
import { MultiPivotNodeData, Row } from '../../types';

const collectInputEntries = (inputs: Record<string, ProcessorInput>) => Object.values(inputs);

export const processMultiPivot: NodeProcessor<MultiPivotNodeData> = async ({ data, inputs, helpers }) => {
  const inputEntries = collectInputEntries(inputs);
  const sourceRows = inputEntries.flatMap((entry) => entry.rows);

  const availableFields = sourceRows.length > 0 ? Object.keys(sourceRows[0]) : [];

  if (!data.pivotColumn || !data.indexColumns?.length || !data.valueColumns?.length) {
    return {
      outputs: {
        out: inputEntries[0]?.ref || (await helpers.persistRows(sourceRows)),
      },
      updatedData: {
        availableFields,
      },
    };
  }

  const groups = new Map<string, Row>();
  sourceRows.forEach((row) => {
    const indexKey = JSON.stringify(data.indexColumns.map((col) => row[col]));
    if (!groups.has(indexKey)) {
      const baseRow: Row = {};
      data.indexColumns.forEach((col) => {
        baseRow[col] = row[col];
      });
      groups.set(indexKey, baseRow);
    }
    const groupRow = groups.get(indexKey)!;
    const pivotValue = row[data.pivotColumn];
    if (pivotValue === undefined || pivotValue === null) {
      return;
    }
    const prefix = String(pivotValue);
    data.valueColumns.forEach((valueCol) => {
      const columnName = `${prefix} ${valueCol}`;
      groupRow[columnName] = row[valueCol];
    });
  });

  const result = Array.from(groups.values());
  return {
    outputs: {
      out: await helpers.persistRows(result),
    },
    updatedData: {
      availableFields,
    },
  };
};
