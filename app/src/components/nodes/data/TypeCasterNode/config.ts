import { Type as TypeIcon } from 'lucide-react';
import { TypeCasterNode } from './index';
import { processTypeCast } from './logic';
import { NodeConfig } from '../../registry.types';
import { TypeCasterNodeData } from '../../types';

const config: NodeConfig = {
  type: 'typeCast',
  label: 'Type Caster',
  category: 'Data',
  icon: TypeIcon,
  color: 'bg-fuchsia-500',
  component: TypeCasterNode,
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
