import { Filter } from 'lucide-react';
import { FilterNode } from './index';
import { processFilter } from './logic';
import { NodeConfig } from '../../registry.types';
import { FilterNodeData } from '../../types';

const config: NodeConfig = {
  type: 'filter',
  label: 'Filter Rows',
  category: 'Data',
  icon: Filter,
  color: 'bg-indigo-500',
  component: FilterNode,
  processor: processFilter,
  initialData: { label: 'Filter Rows', field: '', operator: 'equals', value: '', description: '' } as FilterNodeData,
  inputs: ['in'],
  outputs: ['out'],
};

export default config;
export { config };
