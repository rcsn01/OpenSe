import { GitBranch } from 'lucide-react';
import { UnpivotNode } from './index';
import { processUnpivot } from './logic';
import { NodeConfig } from '../../registry.types';
import { UnpivotNodeData } from '../../types';

const config: NodeConfig = {
  type: 'unpivot',
  label: 'Unpivot (Melt)',
  category: 'Data',
  icon: GitBranch,
  color: 'bg-rose-600',
  component: UnpivotNode,
  processor: processUnpivot,
  initialData: {
    label: 'Unpivot (Melt)',
    keepColumns: [],
    pivotColumns: [],
    availableFields: [],
    description: '',
  } as UnpivotNodeData,
  inputs: ['in'],
  outputs: ['out'],
};

export default config;
export { config };
