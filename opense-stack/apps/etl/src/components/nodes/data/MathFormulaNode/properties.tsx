import React from 'react';
import { MathFormulaNodeData } from '../../types';

interface MathFormulaNodePropertiesProps {
  data: MathFormulaNodeData;
  onChange: (key: string, value: any) => void;
}

export const MathFormulaNodeProperties: React.FC<MathFormulaNodePropertiesProps> = ({ data, onChange }) => {
  const available = data.availableFields || [];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Expression</label>
        <textarea
          value={data.expression || ''}
          onChange={(e) => onChange('expression', e.target.value)}
          placeholder="e.g. price * quantity"
          rows={3}
          className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm type-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <p className="text-[10px] text-slate-400 mt-1">
          Use column names and operators: +, -, *, /, ()
        </p>
      </div>

      {available.length > 0 && (
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Available Columns</label>
          <div className="flex flex-wrap gap-1">
            {available.map((col) => (
              <button
                key={col}
                onClick={() => {
                  const current = data.expression || '';
                  onChange('expression', current ? `${current} ${col}` : col);
                }}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] rounded border border-slate-200 transition-colors type-mono"
                title={`Insert "${col}"`}
              >
                {col}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">New Column Name</label>
        <input
          value={data.newColumn || ''}
          onChange={(e) => onChange('newColumn', e.target.value)}
          placeholder="e.g. total"
          className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </div>
  );
};
