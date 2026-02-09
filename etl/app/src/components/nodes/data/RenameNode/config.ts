import { Edit3 } from 'lucide-react';
import { RenameNode } from './index';
import { processRenameMap } from './logic';
import { NodeConfig } from '../../registry.types';
import { RenameNodeData } from '../../types';

import { RenameProperties } from './properties';

const config: NodeConfig<RenameNodeData> = {
  type: 'renameMap',
  label: 'Rename (Mappings)',
  category: 'Data',
  icon: Edit3,
  color: 'bg-yellow-600',
  component: RenameNode,
  propertiesComponent: RenameProperties,
  processor: processRenameMap,
  initialData: {
    label: 'Rename (Mappings)',
    mappings: [],
    availableFields: [],
    description: '',
  } as RenameNodeData,
  inputs: ['in'],
  outputs: ['out'],
};

export default config;
export { config };
