import React, { useMemo } from 'react';
import { RemoveNodeData } from '../../types';
import { Input } from '../../../ui/Input';

interface FilterColumnPropertiesProps {
    data: RemoveNodeData;
    onChange: (key: string, value: any) => void;
}

export const FilterColumnProperties: React.FC<FilterColumnPropertiesProps> = ({ data, onChange }) => {
    const available = data.availableFields || [];
    const selectedFields = useMemo(() => data.selectedFields || (data.field ? [data.field] : []), [data.selectedFields, data.field]);

    const toggle = (field: string) => {
        const current = selectedFields;
        const next = current.includes(field) ? current.filter((f) => f !== field) : [...current, field];
        onChange('selectedFields', next);
        onChange('field', undefined);
    };

    const selectAll = () => {
        if (!available.length) return;
        onChange('selectedFields', [...available]);
        onChange('field', undefined);
    };

    const deselectAll = () => {
        onChange('selectedFields', []);
        onChange('field', undefined);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-500">Columns to Keep</label>
                <span className="text-xs text-slate-400">{selectedFields.length} selected</span>
            </div>

            {available.length > 0 ? (
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <button
                            onClick={selectAll}
                            className="flex-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 py-1.5 rounded transition-colors"
                        >
                            Select All
                        </button>
                        <button
                            onClick={deselectAll}
                            className="flex-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 py-1.5 rounded transition-colors"
                        >
                            Clear
                        </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-md bg-slate-50 p-2 space-y-1">
                        {available.map((field) => (
                            <label key={field} className="flex items-center gap-2 p-1 hover:bg-white rounded cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={selectedFields.includes(field)}
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
                <div className="space-y-2">
                    <p className="text-xs text-slate-400 italic">No columns provided from input yet. Enter manual fallback:</p>
                    <Input
                        value={selectedFields[0] || ''}
                        onChange={(e) => {
                            onChange('field', e.target.value);
                            onChange('selectedFields', undefined);
                        }}
                        placeholder="Column name"
                    />
                </div>
            )}
        </div>
    );
};
