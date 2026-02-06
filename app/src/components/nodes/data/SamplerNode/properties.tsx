import React from 'react';
import { SamplerNodeData } from '../../types';

interface SamplerNodePropertiesProps {
  data: SamplerNodeData;
  onChange: (key: string, value: any) => void;
}

export const SamplerNodeProperties: React.FC<SamplerNodePropertiesProps> = ({ data, onChange }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Mode</label>
        <select
          value={data.mode || 'top'}
          onChange={(e) => onChange('mode', e.target.value)}
          className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="top">Top N Rows</option>
          <option value="random">Random Sample</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Amount</label>
        <input
          type="number"
          min={1}
          value={data.amount || 100}
          onChange={(e) => onChange('amount', Number(e.target.value) || 0)}
          className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </div>
  );
};
