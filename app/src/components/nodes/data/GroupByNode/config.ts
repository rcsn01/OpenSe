import { Group } from 'lucide-react';
import { GroupByNode } from './index';
import { processGroupBy } from './logic';
import { NodeConfig } from '../../registry.types';
import { GroupByNodeData } from '../../types';
import { GroupByNodeProperties } from './properties';

const config: NodeConfig<GroupByNodeData> = {
  type: 'groupBy',
  label: 'Group By',
  category: 'Data',
  icon: Group,
  color: 'bg-blue-600',
  component: GroupByNode,
  propertiesComponent: GroupByNodeProperties,
  processor: processGroupBy,
  initialData: {
    label: 'Group By',
    groupByColumns: [],
    aggregations: [],
    availableFields: [],
    description: '',
  } as GroupByNodeData,
  inputs: ['in'],
  outputs: ['out'],
};

export default config;
export { config };
