import { NodeProcessor, ProcessorContext, ProcessorResult } from '../../registry.types';
import { Row } from '../../types';

const getInputRows = (inputs: Record<string, { rows: Row[] }>, preferred: string[]) => {
  for (const key of preferred) {
    if (inputs[key]) return inputs[key].rows;
  }
  const first = Object.values(inputs)[0];
  return first?.rows || [];
};

/**
 * Shared chart processor: passes data through and stores preview rows for rendering.
 * Caps preview at 500 rows for performance.
 */
export const createChartProcessor = <T extends { previewRows?: Row[] }>(): NodeProcessor<T> => {
  return async (ctx: ProcessorContext<T>): Promise<ProcessorResult> => {
    const { inputs, helpers } = ctx;
    const sourceRows = getInputRows(inputs, ['in']);
    const previewRows = sourceRows.slice(0, 500);

    return {
      outputs: {
        out: await helpers.persistRows(sourceRows),
      },
      updatedData: {
        previewRows,
      } as any,
    };
  };
};
