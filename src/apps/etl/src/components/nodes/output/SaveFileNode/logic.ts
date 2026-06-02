import { NodeProcessor } from '../../registry.types';
import { SaveNodeData } from '../../types';

export const processSave: NodeProcessor<SaveNodeData> = async ({ inputs, helpers }) => {
  const key = Object.keys(inputs)[0];
  const input = key ? inputs[key] : undefined;
  const rows = input?.rows || [];
  const csv = helpers.toCsv(rows);
  const ref = input?.ref || (key ? undefined : await helpers.persistRows(rows));

  return {
    outputs: {
      out: ref || await helpers.persistRows(rows),
    },
    updatedData: {
      lastSavedCsv: csv,
    },
    downloads: [
      {
        csv,
        filename: `${helpers.workflowName || 'workflow'}.csv`,
      },
    ],
  };
};
