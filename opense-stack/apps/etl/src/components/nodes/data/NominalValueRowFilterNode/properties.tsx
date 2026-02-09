import React from 'react';
import { NominalValueRowFilterNodeData } from '../../types';

interface NominalValueRowFilterNodePropertiesProps {
  data: NominalValueRowFilterNodeData;
  onChange: (key: string, value: any) => void;
}

export const NominalValueRowFilterNodeProperties: React.FC<NominalValueRowFilterNodePropertiesProps> = ({ data, onChange }) => {
  const available = data.availableFields || [];
  const values = data.availableValues || [];
  const selected = data.selectedValues || [];

  const toggleValue = (val: string) => {
    const next = selected.includes(val)
      ? selected.filter((v) => v !== val)
      : [...selected, val];
    onChange('selectedValues', next);
  };

  const selectAll = () => onChange('selectedValues', [...values]);
  const deselectAll = () => onChange('selectedValues', []);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Column</label>
        {available.length > 0 ? (
          <select
            value={data.field || ''}
            onChange={(e) => {
              onChange('field', e.target.value);
              onChange('selectedValues', []);
            }}
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

      {data.field && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-slate-500">Values to Include</label>
            <span className="text-xs text-slate-400">{selected.length} selected</span>
          </div>

          {values.length > 0 ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <button onClick={selectAll} className="flex-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 py-1.5 rounded transition-colors">
                  Select All
                </button>
                <button onClick={deselectAll} className="flex-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 py-1.5 rounded transition-colors">
                  Clear
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-md bg-slate-50 p-2 space-y-1">
                {values.map((val) => (
                  <label key={val} className="flex items-center gap-2 p-1 hover:bg-white rounded cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selected.includes(val)}
                      onChange={() => toggleValue(val)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-700 truncate group-hover:text-slate-900" title={val}>
                      {val || '(empty)'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Run the workflow to discover unique values</p>
          )}
        </div>
      )}
    </div>
  );
};
