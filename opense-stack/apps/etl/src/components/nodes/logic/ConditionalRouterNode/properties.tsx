import React from 'react';
import { ConditionalRouterNodeData } from '../../types';

interface ConditionalRouterNodePropertiesProps {
  data: ConditionalRouterNodeData;
  onChange: (key: string, value: any) => void;
}

export const ConditionalRouterNodeProperties: React.FC<ConditionalRouterNodePropertiesProps> = ({ data, onChange }) => {
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
        <label className="block text-xs font-semibold text-slate-500 mb-1">Condition</label>
        <select
          value={data.operator || 'equals'}
          onChange={(e) => onChange('operator', e.target.value)}
          className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="equals">Equals</option>
          <option value="contains">Contains</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Value</label>
        <input
          value={data.value || ''}
          onChange={(e) => onChange('value', e.target.value)}
          placeholder="Value to match..."
          className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </div>
  );
};
