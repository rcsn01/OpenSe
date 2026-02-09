import React from 'react';
import { PieChartNodeData } from '../../types';

interface PieChartNodePropertiesProps {
  data: PieChartNodeData;
  onChange: (key: string, value: any) => void;
}

export const PieChartNodeProperties: React.FC<PieChartNodePropertiesProps> = ({ data, onChange }) => {
  const available = data.availableFields || [];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Name / Label Column</label>
        <select
          value={data.nameKey || ''}
          onChange={(e) => onChange('nameKey', e.target.value)}
          className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select column...</option>
          {available.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Value Column</label>
        <select
          value={data.valueKey || ''}
          onChange={(e) => onChange('valueKey', e.target.value)}
          className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select column...</option>
          {available.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>
    </div>
  );
};
