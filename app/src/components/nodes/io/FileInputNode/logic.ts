import { NodeProcessor } from '../../registry.types';
import { FileNodeData } from '../../types';

export const processFileInput: NodeProcessor<FileNodeData> = async ({ data, helpers }) => {
  let ref = data.datasetId
    ? {
        datasetId: data.datasetId,
        schema: data.schema,
        preview: data.rows,
        count: data.count,
      }
    : undefined;

  let nextData: Partial<FileNodeData> = {};

  if (!ref?.datasetId && data.rows && data.rows.length) {
    ref = await helpers.persistRows(data.rows);
    nextData = {
      datasetId: ref.datasetId,
      schema: ref.schema,
      count: ref.count,
      rows: ref.preview,
    };
  }

  return {
    outputs: {
      out: ref || {},
    },
    updatedData: nextData,
  };
};
