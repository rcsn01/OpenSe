import { Table } from 'lucide-react';
import { PivotNode } from './index';
import { processPivot } from './logic';
import { NodeConfig } from '../../registry.types';
import { PivotNodeData } from '../../types';

const config: NodeConfig = {
  type: 'pivot',
  label: 'Pivot',
  category: 'Data',
  icon: Table,
  color: 'bg-emerald-700',
  component: PivotNode,
  processor: processPivot,
  initialData: {
    label: 'Pivot',
    indexColumn: '',
    pivotColumn: '',
    valueColumn: '',
    availableFields: [],
    description: '',
  } as PivotNodeData,
  inputs: ['in'],
  outputs: ['out'],
};

export default config;
export { config };
