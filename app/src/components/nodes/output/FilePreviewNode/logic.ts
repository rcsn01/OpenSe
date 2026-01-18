import { NodeProcessor } from '../../registry.types';
import { PreviewNodeData } from '../../types';

export const processPreview: NodeProcessor<PreviewNodeData> = async ({ inputs, helpers, node }) => {
  const key = Object.keys(inputs)[0];
  const input = key ? inputs[key] : undefined;
  const rows = input?.rows || [];
  const ref = input?.ref || (key ? undefined : await helpers.persistRows(rows));

  return {
    outputs: {
      out: ref || await helpers.persistRows(rows),
    },
    updatedData: {
      ...(node.data as PreviewNodeData),
      previewRows: rows,
    },
  };
};
