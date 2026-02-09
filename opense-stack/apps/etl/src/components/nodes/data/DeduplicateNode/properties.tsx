import React, { useMemo } from 'react';
import { DeduplicateNodeData } from '../../types';

interface DeduplicateNodePropertiesProps {
  data: DeduplicateNodeData;
  onChange: (key: string, value: any) => void;
}

export const DeduplicateNodeProperties: React.FC<DeduplicateNodePropertiesProps> = ({ data, onChange }) => {
  const available = data.availableFields || [];
  const selectedKeys = useMemo(() => data.keys || [], [data.keys]);

  const toggle = (field: string) => {
    const next = selectedKeys.includes(field)
      ? selectedKeys.filter((f) => f !== field)
      : [...selectedKeys, field];
    onChange('keys', next);
  };

  const selectAll = () => onChange('keys', [...available]);
  const deselectAll = () => onChange('keys', []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-500">Deduplication Keys</label>
        <span className="text-xs text-slate-400">{selectedKeys.length} selected</span>
      </div>

      <p className="text-[10px] text-slate-400">
        Select columns to determine uniqueness. If none are selected, the entire row is used.
      </p>

      {available.length > 0 ? (
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
            {available.map((field) => (
              <label key={field} className="flex items-center gap-2 p-1 hover:bg-white rounded cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedKeys.includes(field)}
                  onChange={() => toggle(field)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-700 truncate group-hover:text-slate-900" title={field}>
                  {field}
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">Connect an input to see available columns</p>
      )}
    </div>
  );
};
