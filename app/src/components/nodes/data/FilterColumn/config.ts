import { Scissors } from 'lucide-react';
import { FilterColumn } from './index';
import { processFilterColumns } from './logic';
import { NodeConfig } from '../../registry.types';
import { RemoveNodeData } from '../../types';

const config: NodeConfig = {
  type: 'remove',
  label: 'Filter Columns',
  category: 'Data',
  icon: Scissors,
  color: 'bg-orange-500',
  component: FilterColumn,
  processor: processFilterColumns,
  initialData: {
    label: 'Filter Columns',
    field: '',
    selectedFields: [],
    availableFields: [],
    description: '',
  } as RemoveNodeData,
  inputs: ['in'],
  outputs: ['out'],
};

export default config;
export { config };
