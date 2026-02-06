import { Droplet } from 'lucide-react';
import { FillMissingNode } from './index';
import { processFillMissing } from './logic';
import { NodeConfig } from '../../registry.types';
import { FillMissingNodeData } from '../../types';
import { FillMissingNodeProperties } from './properties';

const config: NodeConfig<FillMissingNodeData> = {
  type: 'fillMissing',
  label: 'Fill Missing',
  category: 'Data',
  icon: Droplet,
  color: 'bg-cyan-500',
  component: FillMissingNode,
  propertiesComponent: FillMissingNodeProperties,
  processor: processFillMissing,
  initialData: {
    label: 'Fill Missing',
    field: '',
    strategy: 'static',
    value: '',
    availableFields: [],
    description: '',
  } as FillMissingNodeData,
  inputs: ['in'],
  outputs: ['out'],
};

export default config;
export { config };
