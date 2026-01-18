import { NodeProcessor } from '../../registry.types';
import { Row } from '../../types';

const getInputRows = (inputs: Record<string, { rows: Row[] }>, preferred: string[]) => {
  for (const key of preferred) {
    if (inputs[key]) return inputs[key].rows;
  }
  const first = Object.values(inputs)[0];
  return first?.rows || [];
};

export const processSplit: NodeProcessor = async ({ inputs, helpers }) => {
  const sourceRows = getInputRows(inputs, ['input']);
  const evens = sourceRows.filter((_, i) => i % 2 === 0);
  const odds = sourceRows.filter((_, i) => i % 2 !== 0);

  return {
    outputs: {
      'output-even': await helpers.persistRows(evens),
      'output-odd': await helpers.persistRows(odds),
    },
  };
};
