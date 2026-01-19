import { Table } from 'lucide-react';
import { MultiPivotNode } from './index';
import { processMultiPivot } from './logic';
import { NodeConfig } from '../../registry.types';
import { MultiPivotNodeData } from '../../types';

const config: NodeConfig = {
  type: 'multiPivot',
  label: 'Multi-Pivot',
  category: 'Data',
  icon: Table,
  color: 'bg-emerald-800',
  component: MultiPivotNode,
  processor: processMultiPivot,
  initialData: {
    label: 'Multi-Pivot',
    indexColumns: [],
    pivotColumn: '',
    valueColumns: [],
    availableFields: [],
    description: '',
  } as MultiPivotNodeData,
  inputs: ['in'],
  outputs: ['out'],
};

export default config;
export { config };
