import React from 'react';
import { BoxPlotNodeData } from '../../types';

interface BoxPlotNodePropertiesProps {
  data: BoxPlotNodeData;
  onChange: (key: string, value: any) => void;
}

export const BoxPlotNodeProperties: React.FC<BoxPlotNodePropertiesProps> = ({ data, onChange }) => {
  const available = data.availableFields || [];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Value Column (numeric)</label>
        <select
          value={data.field || ''}
          onChange={(e) => onChange('field', e.target.value)}
          className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select column...</option>
          {available.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Group By (optional)</label>
        <select
          value={data.groupBy || ''}
          onChange={(e) => onChange('groupBy', e.target.value)}
          className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="">No grouping</option>
          {available.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>
    </div>
  );
};
