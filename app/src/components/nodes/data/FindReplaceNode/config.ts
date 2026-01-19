import { Search } from 'lucide-react';
import { FindReplaceNode } from './index';
import { processFindReplace } from './logic';
import { NodeConfig } from '../../registry.types';
import { FindReplaceNodeData } from '../../types';

const config: NodeConfig = {
  type: 'findReplace',
  label: 'Find & Replace',
  category: 'Data',
  icon: Search,
  color: 'bg-pink-500',
  component: FindReplaceNode,
  processor: processFindReplace,
  initialData: {
    label: 'Find & Replace',
    field: '',
    search: '',
    replace: '',
    availableFields: [],
    description: '',
  } as FindReplaceNodeData,
  inputs: ['in'],
  outputs: ['out'],
};

export default config;
export { config };
