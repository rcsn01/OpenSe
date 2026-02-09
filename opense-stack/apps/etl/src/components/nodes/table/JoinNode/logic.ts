import { NodeProcessor } from '../../registry.types';
import { Row } from '../../types';

export const processJoin: NodeProcessor = async ({ inputs, helpers }) => {
  const left = inputs['input-left']?.rows || [];
  const right = inputs['input-right']?.rows || [];
  const minLength = Math.min(left.length, right.length);
  const merged: Row[] = [];

  for (let i = 0; i < minLength; i++) {
    merged.push({ ...left[i], ...right[i] });
  }

  return {
    outputs: {
      'output-merged': await helpers.persistRows(merged),
    },
  };
};
