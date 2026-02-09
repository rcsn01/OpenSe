import { Type as TypeIcon } from 'lucide-react';
import { TypeCasterNode } from './index';
import { processTypeCast } from './logic';
import { NodeConfig } from '../../registry.types';
import { TypeCasterNodeData } from '../../types';
import { TypeCasterNodeProperties } from './properties';

const config: NodeConfig<TypeCasterNodeData> = {
  type: 'typeCast',
  label: 'Type Caster',
  category: 'Data',
  icon: TypeIcon,
  color: 'bg-fuchsia-500',
  component: TypeCasterNode,
  propertiesComponent: TypeCasterNodeProperties,
  processor: processTypeCast,
  initialData: {
    label: 'Type Caster',
    field: '',
    targetType: 'string',
    availableFields: [],
    description: '',
  } as TypeCasterNodeData,
  inputs: ['in'],
  outputs: ['out'],
};

export default config;
export { config };
