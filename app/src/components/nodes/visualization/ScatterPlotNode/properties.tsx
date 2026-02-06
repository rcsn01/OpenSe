import React from 'react';
import { ChartNodeData } from '../../types';
import { ChartAxisProperties } from '../_shared/ChartAxisProperties';

interface ScatterPlotNodePropertiesProps {
  data: ChartNodeData;
  onChange: (key: string, value: any) => void;
}

export const ScatterPlotNodeProperties: React.FC<ScatterPlotNodePropertiesProps> = ({ data, onChange }) => {
  return <ChartAxisProperties data={data} onChange={onChange} />;
};
