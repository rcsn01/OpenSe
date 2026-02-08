import { NodeProcessor } from '../../registry.types';
import { FileNodeData } from '../../types';
import type { DataRef } from '../../../../lib/execution/utils';

export const processFileInput: NodeProcessor<FileNodeData> = async ({ data, helpers }) => {
  let ref: DataRef | undefined = data.datasetId
    ? {
        datasetId: data.datasetId,
        schema: data.schema,
        preview: data.rows,
        count: data.count,
      }
    : undefined;

  let nextData: Partial<FileNodeData> = {};

  if (!ref && data.rows && data.rows.length) {
    ref = await helpers.persistRows(data.rows);
    if (ref) {
      nextData = {
        datasetId: ref.datasetId,
        schema: ref.schema,
        count: ref.count,
        rows: ref.preview,
      };
    }
  }

  const outputRef = ref ?? (await helpers.persistRows(data.rows ?? []));

  return {
    outputs: {
      out: outputRef,
    },
    updatedData: nextData,
  };
};
