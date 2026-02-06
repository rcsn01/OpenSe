import React from 'react';
import { TypeCasterNodeData } from '../../types';

interface TypeCasterNodePropertiesProps {
  data: TypeCasterNodeData;
  onChange: (key: string, value: any) => void;
}

export const TypeCasterNodeProperties: React.FC<TypeCasterNodePropertiesProps> = ({ data, onChange }) => {
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
        <label className="block text-xs font-semibold text-slate-500 mb-1">Target Type</label>
        <select
          value={data.targetType || 'string'}
          onChange={(e) => onChange('targetType', e.target.value)}
          className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="boolean">Boolean</option>
          <option value="date">Date</option>
        </select>
      </div>
    </div>
  );
};
