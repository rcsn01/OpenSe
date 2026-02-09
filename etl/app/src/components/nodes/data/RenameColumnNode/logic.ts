import { NodeProcessor } from '../../registry.types';
import { RenameColumnNodeData, Row } from '../../types';

const getInputRows = (inputs: Record<string, { rows: Row[] }>, preferred: string[]) => {
  for (const key of preferred) {
    if (inputs[key]) return inputs[key].rows;
  }
  const first = Object.values(inputs)[0];
  return first?.rows || [];
};

export const processRenameColumn: NodeProcessor<RenameColumnNodeData> = async ({ data, inputs, helpers }) => {
  const sourceRows = getInputRows(inputs, ['in']);
  if (!data.field || !data.newName) {
    return { outputs: { out: inputs.in?.ref || Object.values(inputs)[0]?.ref || await helpers.persistRows(sourceRows) } };
  }

  const out = sourceRows.map((r) => {
    if (!(data.field as string in r)) return r;
    const { [data.field as string]: val, ...rest } = r;
    return { ...rest, [data.newName]: val };
  });

  return {
    outputs: {
      out: await helpers.persistRows(out),
    },
  };
};
