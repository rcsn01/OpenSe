import { Info } from 'lucide-react';
import { FilePreviewNode } from './index';
import { processPreview } from './logic';
import { NodeConfig } from '../../registry.types';
import { PreviewNodeData } from '../../types';

const config: NodeConfig = {
  type: 'preview',
  label: 'File Preview',
  category: 'Output',
  icon: Info,
  color: 'bg-teal-500',
  component: FilePreviewNode,
  processor: processPreview,
  initialData: { label: 'Preview', previewRows: [], description: '' } as PreviewNodeData,
  inputs: ['in'],
  outputs: ['out'],
  initialWidth: 400,
  initialHeight: 300,
};

export default config;
export { config };
