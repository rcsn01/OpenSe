import { FileInput } from 'lucide-react';
import { FileInputNode } from './index';
import { processFileInput } from './logic';
import { NodeConfig } from '../../registry.types';
import { FileNodeData } from '../../types';

const config: NodeConfig = {
  type: 'file',
  label: 'File Input',
  category: 'Input',
  icon: FileInput,
  color: 'bg-blue-500',
  component: FileInputNode,
  processor: processFileInput,
  initialData: { label: 'File Input', rows: [], description: '' } as FileNodeData,
  inputs: [],
  outputs: ['out'],
};

export default config;
export { config };
