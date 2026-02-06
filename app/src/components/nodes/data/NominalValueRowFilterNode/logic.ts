import { NodeProcessor } from '../../registry.types';
import { NominalValueRowFilterNodeData, Row } from '../../types';

const getInputRows = (inputs: Record<string, { rows: Row[] }>, preferred: string[]) => {
  for (const key of preferred) {
    if (inputs[key]) return inputs[key].rows;
  }
  const first = Object.values(inputs)[0];
  return first?.rows || [];
};

export const processNominalValueRowFilter: NodeProcessor<NominalValueRowFilterNodeData> = async ({ data, inputs, helpers }) => {
  const sourceRows = getInputRows(inputs, ['in']);

  if (!data.field || !data.selectedValues?.length) {
    return { outputs: { out: inputs.in?.ref || Object.values(inputs)[0]?.ref || await helpers.persistRows(sourceRows) } };
  }

  const allowed = new Set(data.selectedValues);
  const filtered = sourceRows.filter((row) => {
    const val = String(row[data.field as string] ?? '');
    return allowed.has(val);
  });

  // Update available values for the properties panel
  const uniqueValues = [...new Set(sourceRows.map((r) => String(r[data.field as string] ?? '')))].sort();

  return {
    outputs: {
      out: await helpers.persistRows(filtered),
    },
    updatedData: {
      availableValues: uniqueValues,
    } as any,
  };
};
