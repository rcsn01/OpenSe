import React from 'react';
import { ColumnResorterNodeData } from '../../types';

interface ColumnResorterNodePropertiesProps {
  data: ColumnResorterNodeData;
  onChange: (key: string, value: any) => void;
}

export const ColumnResorterNodeProperties: React.FC<ColumnResorterNodePropertiesProps> = ({ data, onChange }) => {
  const available = data.availableFields || [];
  const order = data.columnOrder || [];

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...order];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    onChange('columnOrder', newOrder);
  };

  const moveDown = (index: number) => {
    if (index === order.length - 1) return;
    const newOrder = [...order];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    onChange('columnOrder', newOrder);
  };

  const resetOrder = () => {
    onChange('columnOrder', [...available]);
  };

  // Auto-initialize from available fields if empty
  React.useEffect(() => {
    if (available.length > 0 && order.length === 0) {
      onChange('columnOrder', [...available]);
    }
  }, [available.length]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-500">Column Order</label>
        <button
          onClick={resetOrder}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          Reset
        </button>
      </div>

      {order.length > 0 ? (
        <div className="border border-slate-200 rounded-md bg-slate-50 divide-y divide-slate-200 max-h-72 overflow-y-auto">
          {order.map((col, idx) => (
            <div key={col} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white">
              <span className="text-[10px] text-slate-400 w-4 text-right">{idx + 1}</span>
              <span className="text-xs text-slate-700 flex-1 truncate">{col}</span>
              <button
                onClick={() => moveUp(idx)}
                disabled={idx === 0}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-30 text-xs"
              >
                ↑
              </button>
              <button
                onClick={() => moveDown(idx)}
                disabled={idx === order.length - 1}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-30 text-xs"
              >
                ↓
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">Connect an input to see available columns</p>
      )}
    </div>
  );
};
