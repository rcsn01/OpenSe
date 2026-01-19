import { MousePointer2 } from 'lucide-react';
import { SplitNode } from './index';
import { processSplit } from './logic';
import { NodeConfig } from '../../registry.types';
import { BaseNodeData } from '../../types';

const config: NodeConfig = {
  type: 'split',
  label: 'Split Rows',
  category: 'Logic',
  icon: MousePointer2,
  color: 'bg-purple-500',
  component: SplitNode,
  processor: processSplit,
  initialData: { label: 'Split Rows' } as BaseNodeData,
  inputs: ['input'],
  outputs: ['output-even', 'output-odd'],
};

export default config;
export { config };
