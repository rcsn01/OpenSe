import React, { useMemo } from 'react';
import { MultiPivotNodeData } from '../../types';

interface MultiPivotPropertiesProps {
    data: MultiPivotNodeData;
    onChange: (key: string, value: any) => void;
}

export const MultiPivotProperties: React.FC<MultiPivotPropertiesProps> = ({ data, onChange }) => {
    const available = data.availableFields || [];
    const indexCols = useMemo(() => data.indexColumns || [], [data.indexColumns]);
    const valueCols = useMemo(() => data.valueColumns || [], [data.valueColumns]);

    const toggle = (field: string, listKey: 'indexColumns' | 'valueColumns') => {
        const current = data[listKey] || [];
        const next = current.includes(field)
            ? current.filter((f) => f !== field)
            : [...current, field];
        onChange(listKey, next);
    };

    return (
        <div className="space-y-6">
            <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">Pivot Column (New Headers)</label>
                <select
                    value={data.pivotColumn || ''}
                    onChange={(e) => onChange('pivotColumn', e.target.value)}
                    className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-xs focus:ring-emerald-500 focus:border-emerald-500"
                >
                    <option value="">Select column...</option>
                    {available.map((f) => (
                        <option key={f} value={f}>{f}</option>
                    ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                    Values in this column will become the new column headers.
                </p>
            </div>

            <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-500">Index Columns (Group By)</label>
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-md bg-slate-50 p-2 space-y-1">
                    {available.map((field) => (
                        <label key={`idx-${field}`} className="flex items-center gap-2 p-1 hover:bg-white rounded cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={indexCols.includes(field)}
                                onChange={() => toggle(field, 'indexColumns')}
                                className="rounded border-slate-300 w-3 h-3 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-xs text-slate-700 truncate group-hover:text-slate-900" title={field}>
                                {field}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-500">Value Columns (Cell Data)</label>
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-md bg-slate-50 p-2 space-y-1">
                    {available.map((field) => (
                        <label key={`val-${field}`} className="flex items-center gap-2 p-1 hover:bg-white rounded cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={valueCols.includes(field)}
                                onChange={() => toggle(field, 'valueColumns')}
                                className="rounded border-slate-300 w-3 h-3 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-xs text-slate-700 truncate group-hover:text-slate-900" title={field}>
                                {field}
                            </span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
};
