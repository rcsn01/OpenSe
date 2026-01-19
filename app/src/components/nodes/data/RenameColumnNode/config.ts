import { Edit3 } from 'lucide-react';
import { RenameColumnNode } from './index';
import { processRenameColumn } from './logic';
import { NodeConfig } from '../../registry.types';
import { RenameColumnNodeData } from '../../types';

const config: NodeConfig = {
  type: 'rename',
  label: 'Rename Column',
  category: 'Data',
  icon: Edit3,
  color: 'bg-yellow-500',
  component: RenameColumnNode,
  processor: processRenameColumn,
  initialData: {
    label: 'Rename Column',
    field: '',
    newName: '',
    availableFields: [],
    description: '',
  } as RenameColumnNodeData,
  inputs: ['in'],
  outputs: ['out'],
};

export default config;
export { config };
