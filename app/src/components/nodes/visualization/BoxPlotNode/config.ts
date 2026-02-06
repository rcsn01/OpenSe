import { BoxSelect } from 'lucide-react';
import { BoxPlotNode } from './index';
import { processBoxPlot } from './logic';
import { NodeConfig } from '../../registry.types';
import { BoxPlotNodeData } from '../../types';
import { BoxPlotNodeProperties } from './properties';

const config: NodeConfig<BoxPlotNodeData> = {
  type: 'boxPlot',
  label: 'Box Plot',
  category: 'Visualization',
  icon: BoxSelect,
  color: 'bg-emerald-500',
  component: BoxPlotNode,
  propertiesComponent: BoxPlotNodeProperties,
  processor: processBoxPlot,
  initialData: {
    label: 'Box Plot',
    field: '',
    groupBy: '',
    previewRows: [],
    availableFields: [],
    description: '',
  } as BoxPlotNodeData,
  inputs: ['in'],
  outputs: ['out'],
  initialWidth: 400,
  initialHeight: 300,
};

export default config;
export { config };
