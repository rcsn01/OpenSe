import React from 'react';
import { HeatmapNodeData } from '../../types';

interface HeatmapNodePropertiesProps {
  data: HeatmapNodeData;
  onChange: (key: string, value: any) => void;
}

export const HeatmapNodeProperties: React.FC<HeatmapNodePropertiesProps> = ({ data, onChange }) => {
  const available = data.availableFields || [];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">X Axis (category)</label>
        <select
          value={data.xAxis || ''}
          onChange={(e) => onChange('xAxis', e.target.value)}
          className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select column...</option>
          {available.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Y Axis (category)</label>
        <select
          value={data.yAxis || ''}
          onChange={(e) => onChange('yAxis', e.target.value)}
          className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select column...</option>
          {available.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Value Column (numeric)</label>
        <select
          value={data.valueField || ''}
          onChange={(e) => onChange('valueField', e.target.value)}
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
