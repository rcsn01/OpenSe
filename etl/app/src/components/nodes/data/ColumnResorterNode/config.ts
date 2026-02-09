import { ArrowUpDown } from 'lucide-react';
import { ColumnResorterNode } from './index';
import { processColumnResorter } from './logic';
import { NodeConfig } from '../../registry.types';
import { ColumnResorterNodeData } from '../../types';
import { ColumnResorterNodeProperties } from './properties';

const config: NodeConfig<ColumnResorterNodeData> = {
  type: 'columnResorter',
  label: 'Column Resorter',
  category: 'Data',
  icon: ArrowUpDown,
  color: 'bg-violet-500',
  component: ColumnResorterNode,
  propertiesComponent: ColumnResorterNodeProperties,
  processor: processColumnResorter,
  initialData: {
    label: 'Column Resorter',
    columnOrder: [],
    availableFields: [],
    description: '',
  } as ColumnResorterNodeData,
  inputs: ['in'],
  outputs: ['out'],
};

export default config;
export { config };
