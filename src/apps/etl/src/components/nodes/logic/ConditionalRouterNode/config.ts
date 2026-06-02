import { GitBranch } from 'lucide-react';
import { ConditionalRouterNode } from './index';
import { processRouter } from './logic';
import { NodeConfig } from '../../registry.types';
import { ConditionalRouterNodeData } from '../../types';
import { ConditionalRouterNodeProperties } from './properties';

const config: NodeConfig<ConditionalRouterNodeData> = {
  type: 'router',
  label: 'Conditional Router',
  category: 'Logic',
  icon: GitBranch,
  color: 'bg-rose-500',
  component: ConditionalRouterNode,
  propertiesComponent: ConditionalRouterNodeProperties,
  processor: processRouter,
  initialData: {
    label: 'Conditional Router',
    field: '',
    operator: 'equals',
    value: '',
    availableFields: [],
    description: '',
  } as ConditionalRouterNodeData,
  inputs: ['in'],
  outputs: ['out-yes', 'out-no'],
};

export default config;
export { config };
