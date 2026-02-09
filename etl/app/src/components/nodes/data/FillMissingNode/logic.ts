import { NodeProcessor } from '../../registry.types';
import { FillMissingNodeData, Row } from '../../types';

const getInputRows = (inputs: Record<string, { rows: Row[] }>, preferred: string[]) => {
  for (const key of preferred) {
    if (inputs[key]) return inputs[key].rows;
  }
  const first = Object.values(inputs)[0];
  return first?.rows || [];
};

export const processFillMissing: NodeProcessor<FillMissingNodeData> = async ({ data, inputs, helpers }) => {
  const sourceRows = getInputRows(inputs, ['in']);
  if (!data.field) {
    return { outputs: { out: inputs.in?.ref || Object.values(inputs)[0]?.ref || await helpers.persistRows(sourceRows) } };
  }

  let fillVal: any = data.value;
  if (data.strategy === 'mean' || data.strategy === 'median') {
    const nums = sourceRows.map((r) => Number(r[data.field as string])).filter((n) => !Number.isNaN(n));
    if (nums.length) {
      nums.sort((a, b) => a - b);
      fillVal = data.strategy === 'mean'
        ? nums.reduce((a, b) => a + b, 0) / nums.length
        : nums[Math.floor(nums.length / 2)];
    }
  }

  const out: Row[] = [];
  sourceRows.forEach((r, idx) => {
    const val = r[data.field as string];
    if (val === null || val === undefined || val === '') {
      if (data.strategy === 'ffill' && idx > 0) {
        out.push({ ...r, [data.field as string]: out[idx - 1]?.[data.field as string] ?? fillVal });
      } else {
        out.push({ ...r, [data.field as string]: fillVal });
      }
    } else {
      out.push(r);
    }
  });

  return {
    outputs: {
      out: await helpers.persistRows(out),
    },
  };
};
