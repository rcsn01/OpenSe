import { Save } from 'lucide-react';
import { SaveFileNode } from './index';
import { processSave } from './logic';
import { NodeConfig } from '../../registry.types';
import { SaveNodeData } from '../../types';

const config: NodeConfig = {
  type: 'save',
  label: 'Save CSV',
  category: 'Output',
  icon: Save,
  color: 'bg-green-500',
  component: SaveFileNode,
  processor: processSave,
  initialData: { label: 'Save CSV' } as SaveNodeData,
  inputs: ['in'],
  outputs: [],
};

export default config;
export { config };
