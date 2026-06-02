import { NodeProcessor } from '../../registry.types';
import { ConditionalRouterNodeData, Row } from '../../types';

const getInputRows = (inputs: Record<string, { rows: Row[] }>, preferred: string[]) => {
  for (const key of preferred) {
    if (inputs[key]) return inputs[key].rows;
  }
  const first = Object.values(inputs)[0];
  return first?.rows || [];
};

export const processRouter: NodeProcessor<ConditionalRouterNodeData> = async ({ data, inputs, helpers }) => {
  const sourceRows = getInputRows(inputs, ['in']);
  const yes: Row[] = [];
  const no: Row[] = [];

  sourceRows.forEach((r) => {
    const val = (data.field ? r[data.field] : undefined)?.toString() ?? '';
    const match = data.operator === 'equals'
      ? val === data.value
      : val.toLowerCase().includes((data.value || '').toLowerCase());
    (match ? yes : no).push(r);
  });

  return {
    outputs: {
      'out-yes': await helpers.persistRows(yes),
      'out-no': await helpers.persistRows(no),
    },
  };
};
