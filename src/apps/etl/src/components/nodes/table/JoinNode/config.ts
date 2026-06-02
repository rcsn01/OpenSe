import { MousePointer2 } from 'lucide-react';
import { JoinNode } from './index';
import { processJoin } from './logic';
import { NodeConfig } from '../../registry.types';
import { BaseNodeData } from '../../types';

const config: NodeConfig = {
  type: 'join',
  label: 'Join Tables',
  category: 'Data',
  icon: MousePointer2,
  color: 'bg-emerald-500',
  component: JoinNode,
  processor: processJoin,
  initialData: { label: 'Join Tables' } as BaseNodeData,
  inputs: ['input-left', 'input-right'],
  outputs: ['output-merged'],
};

export default config;
export { config };
