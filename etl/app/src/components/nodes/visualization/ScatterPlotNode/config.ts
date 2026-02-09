import { Circle } from 'lucide-react';
import { ScatterPlotNode } from './index';
import { processScatterPlot } from './logic';
import { NodeConfig } from '../../registry.types';
import { ChartNodeData } from '../../types';
import { ScatterPlotNodeProperties } from './properties';

const config: NodeConfig<ChartNodeData> = {
  type: 'scatterPlot',
  label: 'Scatter Plot',
  category: 'Visualization',
  icon: Circle,
  color: 'bg-red-500',
  component: ScatterPlotNode,
  propertiesComponent: ScatterPlotNodeProperties,
  processor: processScatterPlot,
  initialData: {
    label: 'Scatter Plot',
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
