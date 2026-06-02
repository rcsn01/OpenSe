import React from 'react';
import { PivotNodeData } from '../../types';

interface PivotNodePropertiesProps {
  data: PivotNodeData;
  onChange: (key: string, value: any) => void;
}

export const PivotNodeProperties: React.FC<PivotNodePropertiesProps> = ({ data, onChange }) => {
  const available = data.availableFields || [];

  const renderSelect = (label: string, value: string, key: string, placeholder: string) => (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
      {available.length > 0 ? (
        <select
          value={value || ''}
          onChange={(e) => onChange(key, e.target.value)}
          className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="">{placeholder}</option>
          {available.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      ) : (
        <input
          value={value || ''}
          onChange={(e) => onChange(key, e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {renderSelect('Index Column', data.indexColumn, 'indexColumn', 'Select index column...')}
      {renderSelect('Pivot Column', data.pivotColumn, 'pivotColumn', 'Select column to pivot...')}
      {renderSelect('Value Column', data.valueColumn, 'valueColumn', 'Select value column...')}

      <div className="p-3 bg-slate-50 rounded-md text-[10px] text-slate-500">
        <p><strong>Index</strong>: groups rows (becomes row key)</p>
        <p><strong>Pivot</strong>: unique values become new column headers</p>
        <p><strong>Value</strong>: fills the new columns</p>
      </div>
    </div>
  );
};
