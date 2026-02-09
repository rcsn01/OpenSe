import { Book } from 'lucide-react';
import { LookupNode } from './index';
import { processLookup } from './logic';
import { NodeConfig } from '../../registry.types';
import { LookupNodeData } from '../../types';
import { LookupNodeProperties } from './properties';

const config: NodeConfig<LookupNodeData> = {
  type: 'lookup',
  label: 'Lookup',
  category: 'Data',
  icon: Book,
  color: 'bg-emerald-600',
  component: LookupNode,
  propertiesComponent: LookupNodeProperties,
  processor: processLookup,
  initialData: {
    label: 'Lookup',
    field: '',
    newField: '',
    map: {},
    availableFields: [],
    description: '',
  } as LookupNodeData,
  inputs: ['in'],
  outputs: ['out'],
};

export default config;
export { config };
