import React from 'react';
import { ChartNodeData } from '../../types';
import { ChartAxisProperties } from '../_shared/ChartAxisProperties';

interface BarChartNodePropertiesProps {
  data: ChartNodeData;
  onChange: (key: string, value: any) => void;
}

export const BarChartNodeProperties: React.FC<BarChartNodePropertiesProps> = ({ data, onChange }) => {
  return <ChartAxisProperties data={data} onChange={onChange} xLabel="Category (X Axis)" yLabel="Value (Y Axis)" />;
};
