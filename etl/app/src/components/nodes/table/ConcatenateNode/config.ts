import { Layers } from 'lucide-react';
import { ConcatenateNode } from './index';
import { processConcatenate } from './logic';
import { NodeConfig } from '../../registry.types';
import { ConcatenateNodeData } from '../../types';
import { ConcatenateNodeProperties } from './properties';

const config: NodeConfig<ConcatenateNodeData> = {
  type: 'concatenate',
  label: 'Concatenate',
  category: 'Data',
  icon: Layers,
  color: 'bg-sky-600',
  component: ConcatenateNode,
  propertiesComponent: ConcatenateNodeProperties,
  processor: processConcatenate,
  initialData: {
    label: 'Concatenate',
    description: '',
  } as ConcatenateNodeData,
  inputs: ['top', 'bottom'],
  outputs: ['out'],
};

export default config;
export { config };
