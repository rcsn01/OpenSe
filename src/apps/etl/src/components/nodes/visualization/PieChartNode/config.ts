import { PieChart as PieChartIcon } from 'lucide-react';
import { PieChartNode } from './index';
import { processPieChart } from './logic';
import { NodeConfig } from '../../registry.types';
import { PieChartNodeData } from '../../types';
import { PieChartNodeProperties } from './properties';

const config: NodeConfig<PieChartNodeData> = {
  type: 'pieChart',
  label: 'Pie Chart',
  category: 'Visualization',
  icon: PieChartIcon,
  color: 'bg-purple-500',
  component: PieChartNode,
  propertiesComponent: PieChartNodeProperties,
  processor: processPieChart,
  initialData: {
    label: 'Pie Chart',
    nameKey: '',
    valueKey: '',
    previewRows: [],
    availableFields: [],
    description: '',
  } as PieChartNodeData,
  inputs: ['in'],
  outputs: ['out'],
  initialWidth: 400,
  initialHeight: 350,
};

export default config;
export { config };
