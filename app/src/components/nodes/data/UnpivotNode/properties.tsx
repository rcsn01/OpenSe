import React, { useMemo } from 'react';
import { UnpivotNodeData } from '../../types';

interface UnpivotNodePropertiesProps {
  data: UnpivotNodeData;
  onChange: (key: string, value: any) => void;
}

export const UnpivotNodeProperties: React.FC<UnpivotNodePropertiesProps> = ({ data, onChange }) => {
  const available = data.availableFields || [];
  const keep = useMemo(() => data.keepColumns || [], [data.keepColumns]);
  const melt = useMemo(() => data.pivotColumns || [], [data.pivotColumns]);

  const toggleKeep = (field: string) => {
    const next = keep.includes(field)
      ? keep.filter((f) => f !== field)
      : [...keep, field];
    onChange('keepColumns', next);
  };

  const toggleMelt = (field: string) => {
    const next = melt.includes(field)
      ? melt.filter((f) => f !== field)
      : [...melt, field];
    onChange('pivotColumns', next);
  };

  return (
    <div className="space-y-5">
      {/* Keep Columns */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-semibold text-slate-500">Keep Columns</label>
          <span className="text-xs text-slate-400">{keep.length}</span>
        </div>
        <p className="text-[10px] text-slate-400 mb-2">
          These columns are preserved as-is in each unpivoted row.
        </p>
        {available.length > 0 ? (
          <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-md bg-slate-50 p-2 space-y-1">
            {available.map((field) => (
              <label key={field} className="flex items-center gap-2 p-1 hover:bg-white rounded cursor-pointer group">
                <input
                  type="checkbox"
                  checked={keep.includes(field)}
                  onChange={() => toggleKeep(field)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-700 truncate group-hover:text-slate-900" title={field}>
                  {field}
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Connect an input to see available columns</p>
        )}
      </div>

      {/* Melt Columns */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-semibold text-slate-500">Melt Columns</label>
          <span className="text-xs text-slate-400">{melt.length}</span>
        </div>
        <p className="text-[10px] text-slate-400 mb-2">
          These columns are unpivoted into "Variable" and "Value" rows.
        </p>
        {available.length > 0 ? (
          <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-md bg-slate-50 p-2 space-y-1">
            {available.map((field) => (
              <label key={field} className="flex items-center gap-2 p-1 hover:bg-white rounded cursor-pointer group">
                <input
                  type="checkbox"
                  checked={melt.includes(field)}
                  onChange={() => toggleMelt(field)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-700 truncate group-hover:text-slate-900" title={field}>
                  {field}
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Connect an input to see available columns</p>
        )}
      </div>
    </div>
  );
};
