import React from 'react';
import { GroupByNodeData } from '../../types';

interface GroupByNodePropertiesProps {
  data: GroupByNodeData;
  onChange: (key: string, value: any) => void;
}

type AggFunction = 'sum' | 'count' | 'avg' | 'min' | 'max';

export const GroupByNodeProperties: React.FC<GroupByNodePropertiesProps> = ({ data, onChange }) => {
  const available = data.availableFields || [];
  const groupBy = data.groupByColumns || [];
  const aggregations = data.aggregations || [];

  const toggleGroupBy = (col: string) => {
    const next = groupBy.includes(col)
      ? groupBy.filter((c) => c !== col)
      : [...groupBy, col];
    onChange('groupByColumns', next);
  };

  const addAggregation = () => {
    onChange('aggregations', [...aggregations, { column: available[0] || '', function: 'sum' as AggFunction }]);
  };

  const updateAggregation = (index: number, key: string, value: string) => {
    const updated = aggregations.map((agg, i) =>
      i === index ? { ...agg, [key]: value } : agg
    );
    onChange('aggregations', updated);
  };

  const removeAggregation = (index: number) => {
    onChange('aggregations', aggregations.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-5">
      {/* Group By Columns */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-2">Group By Columns</label>
        {available.length > 0 ? (
          <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-md bg-slate-50 p-2 space-y-1">
            {available.map((col) => (
              <label key={col} className="flex items-center gap-2 p-1 hover:bg-white rounded cursor-pointer group">
                <input
                  type="checkbox"
                  checked={groupBy.includes(col)}
                  onChange={() => toggleGroupBy(col)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-700 truncate group-hover:text-slate-900">{col}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Connect an input to see available columns</p>
        )}
      </div>

      {/* Aggregations */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-semibold text-slate-500">Aggregations</label>
          <button
            onClick={addAggregation}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            + Add
          </button>
        </div>

        {aggregations.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No aggregations defined</p>
        ) : (
          <div className="space-y-2">
            {aggregations.map((agg, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <select
                  value={agg.column}
                  onChange={(e) => updateAggregation(idx, 'column', e.target.value)}
                  className="flex-1 rounded-md border border-slate-300 py-1 px-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {available.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
                <select
                  value={agg.function}
                  onChange={(e) => updateAggregation(idx, 'function', e.target.value)}
                  className="w-20 rounded-md border border-slate-300 py-1 px-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="sum">Sum</option>
                  <option value="count">Count</option>
                  <option value="avg">Avg</option>
                  <option value="min">Min</option>
                  <option value="max">Max</option>
                </select>
                <button
                  onClick={() => removeAggregation(idx)}
                  className="text-red-400 hover:text-red-600 text-xs px-1"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
