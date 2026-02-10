import React from 'react';
import { Plus, X } from 'lucide-react';
import { RenameNodeData } from '../../types';
import { Input } from '@repo/ui';

interface RenamePropertiesProps {
    data: RenameNodeData;
    onChange: (key: string, value: any) => void;
}

export const RenameProperties: React.FC<RenamePropertiesProps> = ({ data, onChange }) => {
    const mappings = data.mappings || [];
    const available = data.availableFields || [];

    const updateMapping = (idx: number, key: 'oldColumn' | 'newColumn', value: string) => {
        const next = [...mappings];
        next[idx] = { ...next[idx], [key]: value };
        onChange('mappings', next);
    };

    const addMapping = () => {
        const next = [...mappings, { oldColumn: '', newColumn: '' }];
        onChange('mappings', next);
    };

    const removeMapping = (idx: number) => {
        const next = [...mappings];
        next.splice(idx, 1);
        onChange('mappings', next);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-500">Column Mappings</label>
                <button
                    onClick={addMapping}
                    className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                >
                    <Plus className="w-3 h-3" /> Add
                </button>
            </div>

            <div className="space-y-3">
                {mappings.map((mapping, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-md border border-slate-200 space-y-3 relative group">
                        <button
                            onClick={() => removeMapping(idx)}
                            className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X className="w-3 h-3" />
                        </button>

                        <div>
                            <label className="block text-[10px] uppercase text-slate-400 font-bold mb-1">From</label>
                            {available.length > 0 ? (
                                <select
                                    value={mapping.oldColumn}
                                    onChange={(e) => updateMapping(idx, 'oldColumn', e.target.value)}
                                    className="w-full rounded-md border border-slate-300 py-1.5 px-2 text-xs"
                                >
                                    <option value="">Select column...</option>
                                    {available.map((f) => (
                                        <option key={f} value={f}>{f}</option>
                                    ))}
                                </select>
                            ) : (
                                <Input
                                    value={mapping.oldColumn}
                                    onChange={(e) => updateMapping(idx, 'oldColumn', e.target.value)}
                                    placeholder="Old column name"
                                    className="text-xs"
                                />
                            )}
                        </div>

                        <div>
                            <label className="block text-[10px] uppercase text-slate-400 font-bold mb-1">To</label>
                            <Input
                                value={mapping.newColumn}
                                onChange={(e) => updateMapping(idx, 'newColumn', e.target.value)}
                                placeholder="New column name"
                                className="text-xs"
                            />
                        </div>
                    </div>
                ))}
                {mappings.length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-4 border border-dashed border-slate-200 rounded-md">
                        No mappings configured. Click "Add" to start renaming columns.
                    </p>
                )}
            </div>
        </div>
    );
};
