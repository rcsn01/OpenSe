import React from 'react';
import { ChartNodeData } from '../../types';
import { ChartAxisProperties } from '../_shared/ChartAxisProperties';

interface LinePlotNodePropertiesProps {
  data: ChartNodeData;
  onChange: (key: string, value: any) => void;
}

export const LinePlotNodeProperties: React.FC<LinePlotNodePropertiesProps> = ({ data, onChange }) => {
  return <ChartAxisProperties data={data} onChange={onChange} />;
};
