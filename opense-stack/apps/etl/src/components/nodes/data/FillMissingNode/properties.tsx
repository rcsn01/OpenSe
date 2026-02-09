import React from 'react';
import { FillMissingNodeData } from '../../types';

interface FillMissingNodePropertiesProps {
  data: FillMissingNodeData;
  onChange: (key: string, value: any) => void;
}

export const FillMissingNodeProperties: React.FC<FillMissingNodePropertiesProps> = ({ data, onChange }) => {
  const available = data.availableFields || [];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Column</label>
        {available.length > 0 ? (
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
        ) : (
          <input
            value={data.field || ''}
            onChange={(e) => onChange('field', e.target.value)}
            placeholder="Column name"
            className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Strategy</label>
        <select
          value={data.strategy || 'static'}
          onChange={(e) => onChange('strategy', e.target.value)}
          className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="static">Static Value</option>
          <option value="mean">Mean (numeric)</option>
          <option value="median">Median (numeric)</option>
          <option value="ffill">Forward Fill</option>
        </select>
      </div>

      {data.strategy === 'static' && (
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Fill Value</label>
          <input
            value={data.value || ''}
            onChange={(e) => onChange('value', e.target.value)}
            placeholder="Value to fill"
            className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}
    </div>
  );
};
