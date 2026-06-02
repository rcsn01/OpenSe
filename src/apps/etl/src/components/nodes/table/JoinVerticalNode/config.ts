import { Layers } from 'lucide-react';
import { JoinVerticalNode } from './index';
import { processJoinVertical } from './logic';
import { NodeConfig } from '../../registry.types';
import { BaseNodeData } from '../../types';

const config: NodeConfig = {
  type: 'joinVertical',
  label: 'Stack Tables',
  category: 'Data',
  icon: Layers,
  color: 'bg-emerald-700',
  component: JoinVerticalNode,
  processor: processJoinVertical,
  initialData: { label: 'Stack Tables' } as BaseNodeData,
  inputs: ['input-top', 'input-bottom'],
  outputs: ['output-stacked'],
};

export default config;
export { config };
