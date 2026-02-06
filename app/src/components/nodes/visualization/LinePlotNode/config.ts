import { TrendingUp } from 'lucide-react';
import { LinePlotNode } from './index';
import { processLinePlot } from './logic';
import { NodeConfig } from '../../registry.types';
import { ChartNodeData } from '../../types';
import { LinePlotNodeProperties } from './properties';

const config: NodeConfig<ChartNodeData> = {
  type: 'linePlot',
  label: 'Line Plot',
  category: 'Visualization',
  icon: TrendingUp,
  color: 'bg-green-500',
  component: LinePlotNode,
  propertiesComponent: LinePlotNodeProperties,
  processor: processLinePlot,
  initialData: {
    label: 'Line Plot',
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
