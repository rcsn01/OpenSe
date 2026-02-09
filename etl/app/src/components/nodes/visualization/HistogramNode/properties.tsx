import React from 'react';
import { HistogramNodeData } from '../../types';

interface HistogramNodePropertiesProps {
  data: HistogramNodeData;
  onChange: (key: string, value: any) => void;
}

export const HistogramNodeProperties: React.FC<HistogramNodePropertiesProps> = ({ data, onChange }) => {
  const available = data.availableFields || [];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Column</label>
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
        <label className="block text-xs font-semibold text-slate-500 mb-1">Number of Bins</label>
        <input
          type="number"
          min={2}
          max={100}
          value={data.bins || 10}
          onChange={(e) => onChange('bins', Number(e.target.value) || 10)}
          className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </div>
  );
};
