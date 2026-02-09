import { NodeProcessor } from '../../registry.types';
import { GroupByNodeData, Row } from '../../types';

const getInputRows = (inputs: Record<string, { rows: Row[] }>, preferred: string[]) => {
  for (const key of preferred) {
    if (inputs[key]) return inputs[key].rows;
  }
  const first = Object.values(inputs)[0];
  return first?.rows || [];
};

export const processGroupBy: NodeProcessor<GroupByNodeData> = async ({ data, inputs, helpers }) => {
  const sourceRows = getInputRows(inputs, ['in']);

  if (!data.groupByColumns?.length) {
    return { outputs: { out: inputs.in?.ref || Object.values(inputs)[0]?.ref || await helpers.persistRows(sourceRows) } };
  }

  // Group rows
  const groups = new Map<string, Row[]>();
  for (const row of sourceRows) {
    const key = data.groupByColumns.map((col) => String(row[col] ?? '')).join('||');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  // Aggregate
  const result: Row[] = [];
  for (const [, rows] of groups) {
    const aggregated: Row = {};

    // Copy group-by columns from first row
    for (const col of data.groupByColumns) {
      aggregated[col] = rows[0][col];
    }

    // Apply aggregations
    for (const agg of data.aggregations || []) {
      const colName = `${agg.column}_${agg.function}`;
      const values = rows.map((r) => Number(r[agg.column])).filter((n) => !Number.isNaN(n));

      switch (agg.function) {
        case 'sum':
          aggregated[colName] = values.reduce((a, b) => a + b, 0);
          break;
        case 'count':
          aggregated[colName] = rows.length;
          break;
        case 'avg':
          aggregated[colName] = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
          break;
        case 'min':
          aggregated[colName] = values.length ? Math.min(...values) : 0;
          break;
        case 'max':
          aggregated[colName] = values.length ? Math.max(...values) : 0;
          break;
      }
    }

    result.push(aggregated);
  }

  return {
    outputs: {
      out: await helpers.persistRows(result),
    },
  };
};
