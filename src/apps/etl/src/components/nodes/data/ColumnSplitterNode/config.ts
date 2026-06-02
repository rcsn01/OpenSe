import { Columns } from 'lucide-react';
import { ColumnSplitterNode } from './index';
import { processColumnSplitter } from './logic';
import { NodeConfig } from '../../registry.types';
import { ColumnSplitterNodeData } from '../../types';
import { ColumnSplitterNodeProperties } from './properties';

const config: NodeConfig<ColumnSplitterNodeData> = {
  type: 'columnSplitter',
  label: 'Column Splitter',
  category: 'Data',
  icon: Columns,
  color: 'bg-amber-500',
  component: ColumnSplitterNode,
  propertiesComponent: ColumnSplitterNodeProperties,
  processor: processColumnSplitter,
  initialData: {
    label: 'Column Splitter',
    selectedColumns: [],
    availableFields: [],
    description: '',
  } as ColumnSplitterNodeData,
  inputs: ['in'],
  outputs: ['top', 'bottom'],
};

export default config;
export { config };
