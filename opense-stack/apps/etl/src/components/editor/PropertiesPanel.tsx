import React from 'react';
import { Node } from 'reactflow';
import { Info, X } from 'lucide-react';

import { Input } from '../ui/Input';
import { WorkflowNodeData, FileNodeData } from '../../components/nodes/types';
import { NODE_REGISTRY } from '../../components/nodes/registry';

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
        const config = type ? NODE_REGISTRY[type] : undefined;

        // Use the registered propertiesComponent if available
        if (config?.propertiesComponent) {
            const PropertiesComponent = config.propertiesComponent;
            return <PropertiesComponent data={data} onChange={handleChange} />;
        }

        // Fallback for nodes without a propertiesComponent (e.g., FileInput)
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
            default:
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
