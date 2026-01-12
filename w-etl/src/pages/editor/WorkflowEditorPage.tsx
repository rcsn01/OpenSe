import React, { useState } from 'react';
import { 
  Play, 
  Save, 
  Download, 
  ArrowLeft, 
  FileInput, 
  Filter, 
  Scissors, 
  Save as SaveIcon,
  MousePointer2 
} from 'lucide-react';
import { Link } from 'react-router-dom';

const NODE_PALETTE = [
  { type: 'fileLoader', label: 'File Input', icon: FileInput, color: 'bg-blue-500' },
  { type: 'filterRows', label: 'Filter Rows', icon: Filter, color: 'bg-indigo-500' },
  { type: 'removeColumn', label: 'Remove Column', icon: Scissors, color: 'bg-orange-500' },
  { type: 'saveFile', label: 'Save CSV', icon: SaveIcon, color: 'bg-green-500' },
];

export const WorkflowEditorPage = () => {
  const [workflowName, setWorkflowName] = useState('New Workflow 1');

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* Top Bar */}
      <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 z-10 shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 text-slate-400 hover:bg-slate-100 rounded-md">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="h-6 w-px bg-slate-200" />
          <input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="text-lg font-semibold text-slate-900 border-none focus:ring-0 p-0 hover:bg-slate-50 rounded px-2"
          />
        </div>

        <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
                <Download className="w-4 h-4" />
                Export
            </button>
            <div className="h-6 w-px bg-slate-200 mx-1" />
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-slate-800 hover:bg-slate-900 rounded-md shadow-sm transition-colors">
                <Save className="w-4 h-4" />
                Save
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors">
                <Play className="w-4 h-4 fill-current" />
                Run
            </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar (Node Palette) */}
        <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
            <div className="p-4 border-b border-slate-200">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nodes</h3>
            </div>
            
            <div className="p-4 space-y-3 overflow-y-auto flex-1">
                {NODE_PALETTE.map((node) => (
                    <div
                        key={node.type}
                        onDragStart={(event) => onDragStart(event, node.type)}
                        draggable
                        className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg shadow-sm cursor-grab hover:border-blue-300 hover:ring-1 hover:ring-blue-100 transition-all active:cursor-grabbing"
                    >
                        <div className={`p-2 rounded-md ${node.color} text-white`}>
                            <node.icon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">{node.label}</span>
                    </div>
                ))}
            </div>

            <div className="mt-auto p-4 border-t border-slate-200 bg-slate-100/50">
                <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded text-xs text-blue-700">
                   <MousePointer2 className="w-4 h-4 shrink-0 mt-0.5" />
                   <p>Drag nodes from this panel onto the canvas to build your workflow.</p>
                </div>
            </div>
        </aside>

        {/* Main Canvas Area */}
        <main className="flex-1 relative bg-slate-100 overflow-hidden">
             
            {/* Grid Pattern Placeholder */}
            <div 
                className="absolute inset-0 opacity-[0.4]"
                style={{
                    backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                }}
            />

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                    <p className="text-slate-400 font-medium">React Flow Canvas Placeholder</p>
                    <p className="text-slate-300 text-sm mt-1">Drop nodes here</p>
                </div>
            </div>
        </main>
      </div>
    </div>
  );
};
