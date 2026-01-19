import { Copy } from 'lucide-react';
import { DeduplicateNode } from './index';
import { processDeduplicate } from './logic';
import { NodeConfig } from '../../registry.types';
import { DeduplicateNodeData } from '../../types';

const config: NodeConfig = {
  type: 'deduplicate',
  label: 'Deduplicate',
  category: 'Data',
  icon: Copy,
  color: 'bg-amber-500',
  component: DeduplicateNode,
  processor: processDeduplicate,
  initialData: { label: 'Deduplicate', keys: [], availableFields: [], description: '' } as DeduplicateNodeData,
  inputs: ['in'],
  outputs: ['out'],
};

export default config;
export { config };
