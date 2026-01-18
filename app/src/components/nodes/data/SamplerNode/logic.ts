import { NodeProcessor } from '../../registry.types';
import { SamplerNodeData, Row } from '../../types';

const getInputRows = (inputs: Record<string, { rows: Row[] }>, preferred: string[]) => {
  for (const key of preferred) {
    if (inputs[key]) return inputs[key].rows;
  }
  const first = Object.values(inputs)[0];
  return first?.rows || [];
};

export const processSampler: NodeProcessor<SamplerNodeData> = async ({ data, inputs, helpers }) => {
  const sourceRows = getInputRows(inputs, ['in']);
  let out: Row[] = [];
  const amt = Math.max(0, Math.min(sourceRows.length, Math.floor(data.amount)));

  if (data.mode === 'top') {
    out = sourceRows.slice(0, amt);
  } else {
    const shuffled = [...sourceRows];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    out = shuffled.slice(0, amt);
  }

  return {
    outputs: {
      out: await helpers.persistRows(out),
    },
  };
};
