import { ArrowDownUp } from 'lucide-react';
import { SortNode } from './index';
import { processSort } from './logic';
import { NodeConfig } from '../../registry.types';
import { SortNodeData } from '../../types';

const config: NodeConfig = {
  type: 'sort',
  label: 'Sort',
  category: 'Data',
  icon: ArrowDownUp,
  color: 'bg-indigo-600',
  component: SortNode,
  processor: processSort,
  initialData: {
    label: 'Sort',
    field: '',
    direction: 'asc',
    availableFields: [],
    description: '',
  } as SortNodeData,
  inputs: ['in'],
  outputs: ['out'],
};

export default config;
export { config };
