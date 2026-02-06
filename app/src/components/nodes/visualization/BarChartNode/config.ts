import { BarChart3 } from 'lucide-react';
import { BarChartNode } from './index';
import { processBarChart } from './logic';
import { NodeConfig } from '../../registry.types';
import { ChartNodeData } from '../../types';
import { BarChartNodeProperties } from './properties';

const config: NodeConfig<ChartNodeData> = {
  type: 'barChart',
  label: 'Bar Chart',
  category: 'Visualization',
  icon: BarChart3,
  color: 'bg-blue-500',
  component: BarChartNode,
  propertiesComponent: BarChartNodeProperties,
  processor: processBarChart,
  initialData: {
    label: 'Bar Chart',
    xAxis: '',
    yAxis: '',
    previewRows: [],
    availableFields: [],
    description: '',
  } as ChartNodeData,
  inputs: ['in'],
  outputs: ['out'],
  initialWidth: 400,
  initialHeight: 300,
};

export default config;
export { config };
