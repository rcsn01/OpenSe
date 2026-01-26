import React from 'react';
import { Node } from 'reactflow';
import { Info, X } from 'lucide-react';

import { Input } from '../ui/Input';
import { WorkflowNodeData, FilterNodeData, SortNodeData, RenameColumnNodeData, FindReplaceNodeData, FileNodeData } from '../../components/nodes/types';

interface PropertiesPanelProps {
    selectedNode: Node<WorkflowNodeData> | null;
    onClose: () => void;
    onChange: (nodeId: string, data: any) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ selectedNode, onClose, onChange }) => {
    if (!selectedNode) {
        return (
            <aside className="w-80 bg-white border-l border-slate-200 flex flex-col items-center justify-center p-8 shrink-0 text-slate-400 text-sm text-center">
                <Info className="w-8 h-8 mb-2 opacity-50" />
                <p>Select a node to configure its properties.</p>
            </aside>
        );
    }

    const { data, type } = selectedNode;

    const handleChange = (key: string, value: any) => {
        onChange(selectedNode.id, { ...data, [key]: value });
    };

    const renderContent = () => {
        switch (type) {
            case 'file': {
                const fileData = data as FileNodeData;
                return (
                    <div className="space-y-4">
                        <div className="p-3 bg-slate-50 rounded text-xs text-slate-600">
                            <span className="font-semibold block mb-1">File Status</span>
                            {fileData.datasetId ? (
                                <>
                                    <p>Dataset ID: <span className="font-mono">{fileData.datasetId.slice(0, 8)}...</span></p>
                                    <p>Rows: {fileData.count}</p>
                                    <p>File: {fileData.fileName || 'Uploaded File'}</p>
                                </>
                            ) : (
                                <p>No file loaded. Please run the workflow or upload a JSON.</p>
                            )}
                        </div>
                    </div>
                );
            }
            case 'filter_rows': {
                const filterData = data as FilterNodeData;
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Column</label>
                            <select
                                value={filterData.field || ''}
                                onChange={(e) => handleChange('field', e.target.value)}
                                className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="" disabled>Select column...</option>
                                {filterData.availableFields?.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Condition</label>
                            <select
                                value={filterData.operator || 'equals'}
                                onChange={(e) => handleChange('operator', e.target.value)}
                                className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="equals">Equals</option>
                                <option value="contains">Contains</option>
                                <option value="starts_with">Starts With</option>
                                <option value="ends_with">Ends With</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Value</label>
                            <Input
                                value={filterData.value || ''}
                                onChange={(e) => handleChange('value', e.target.value)}
                                placeholder="Value to match..."
                            />
                        </div>
                    </div>
                );
            }
            case 'sort': {
                const sortData = data as SortNodeData;
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Sort By</label>
                            <select
                                value={sortData.field || ''}
                                onChange={(e) => handleChange('field', e.target.value)}
                                className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="" disabled>Select column...</option>
                                {sortData.availableFields?.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Direction</label>
                            <select
                                value={sortData.direction || 'asc'}
                                onChange={(e) => handleChange('direction', e.target.value)}
                                className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="asc">Ascending (A-Z)</option>
                                <option value="desc">Descending (Z-A)</option>
                            </select>
                        </div>
                    </div>
                );
            }
            case 'rename_column': {
                const renameData = data as RenameColumnNodeData;
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Column to Rename</label>
                            <select
                                value={renameData.field || ''}
                                onChange={(e) => handleChange('field', e.target.value)}
                                className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="" disabled>Select column...</option>
                                {renameData.availableFields?.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">New Name</label>
                            <Input
                                value={renameData.newName || ''}
                                onChange={(e) => handleChange('newName', e.target.value)}
                                placeholder="New column name"
                            />
                        </div>
                    </div>
                );
            }
            case 'find_replace': {
                const frData = data as FindReplaceNodeData;
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Target Column</label>
                            <select
                                value={frData.field || ''}
                                onChange={(e) => handleChange('field', e.target.value)}
                                className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="" disabled>Select column...</option>
                                {frData.availableFields?.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Find</label>
                            <Input
                                value={frData.search || ''}
                                onChange={(e) => handleChange('search', e.target.value)}
                                placeholder="Text to find"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Replace With</label>
                            <Input
                                value={frData.replace || ''}
                                onChange={(e) => handleChange('replace', e.target.value)}
                                placeholder="Replacement text"
                            />
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <input
                                type="checkbox"
                                id="caseSensitive"
                                checked={frData.caseSensitive || false}
                                onChange={(e) => handleChange('caseSensitive', e.target.checked)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="caseSensitive" className="text-sm text-slate-700">Case Sensitive</label>
                        </div>
                    </div>
                );
            }
            default:
                // Generic renderer for unknown types or simple label editing
                return (
                    <div className="text-sm text-slate-500 italic">
                        No specific properties available for this node type ({type}).
                    </div>
                );
        }
    };

    return (
        <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 h-full shadow-lg z-20">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div>
                    <h3 className="text-sm font-semibold text-slate-900">{data.label}</h3>
                    <p className="text-xs text-slate-500 font-mono">{type}</p>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
                <div className="mb-6">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Node Label</label>
                    <Input
                        value={data.label}
                        onChange={(e) => handleChange('label', e.target.value)}
                    />
                </div>

                <div className="border-t border-slate-100 pt-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Configuration</h4>
                    {renderContent()}
                </div>
            </div>
        </aside>
    );
};
