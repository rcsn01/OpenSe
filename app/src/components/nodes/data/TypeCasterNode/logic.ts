import { NodeProcessor } from '../../registry.types';
import { Row, TypeCasterNodeData } from '../../types';

const getInputRows = (inputs: Record<string, { rows: Row[] }>, preferred: string[]) => {
  for (const key of preferred) {
    if (inputs[key]) return inputs[key].rows;
  }
  const first = Object.values(inputs)[0];
  return first?.rows || [];
};

export const processTypeCast: NodeProcessor<TypeCasterNodeData> = async ({ data, inputs, helpers }) => {
  const sourceRows = getInputRows(inputs, ['in']);
  if (!data.field) {
    return { outputs: { out: inputs.in?.ref || Object.values(inputs)[0]?.ref || await helpers.persistRows(sourceRows) } };
  }

  const out = sourceRows.map((r) => {
    const val = r[data.field as string];
    let casted: any = val;
    switch (data.targetType) {
      case 'number':
        casted = Number(val);
        break;
      case 'boolean':
        casted = typeof val === 'boolean' ? val : ['true', '1', 'yes'].includes(String(val).toLowerCase());
        break;
      case 'date':
        casted = val ? new Date(val) : null;
        break;
      default:
        casted = val?.toString();
    }
    return { ...r, [data.field as string]: casted };
  });

  return {
    outputs: {
      out: await helpers.persistRows(out),
    },
  };
};
