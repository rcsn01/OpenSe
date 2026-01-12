import React, { useCallback, useEffect, useState } from 'react';
import {
  Play,
  Save,
  Download,
  ArrowLeft,
  FileInput,
  Filter,
  Scissors,
  Save as SaveIcon,
  MousePointer2,
  Info,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowInstance,
  addEdge,
  Connection,
  Edge,
  Node,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { FileInputNode } from '../../components/nodes/FileInputNode';
import { FilePreviewNode } from '../../components/nodes/FilePreviewNode';
import { FilterNode } from '../../components/nodes/FilterNode';
import { SplitNode } from '../../components/nodes/SplitNode';
import { JoinNode } from '../../components/nodes/JoinNode';
import { FilterColumn } from '../../components/nodes/FilterColumn';
import { SaveFileNode } from '../../components/nodes/SaveFileNode';
import {
  Row,
  FileNodeData,
  FilterNodeData,
  RemoveNodeData,
  SaveNodeData,
  PreviewNodeData,
  WorkflowNodeData,
} from '../../components/nodes/types';
import { runExecution } from '../../lib/execution/ExecutionEngine';
import { useSchemaPropagation } from '../../hooks/useSchemaPropagation';

const NODE_PALETTE = [
  { type: 'file', label: 'File Input', icon: FileInput, color: 'bg-blue-500' },
  { type: 'filter', label: 'Filter Rows', icon: Filter, color: 'bg-indigo-500' },
  { type: 'remove', label: 'Filter Columns', icon: Scissors, color: 'bg-orange-500' },
  { type: 'save', label: 'Save CSV', icon: SaveIcon, color: 'bg-green-500' },
  { type: 'split', label: 'Split Rows', icon: MousePointer2, color: 'bg-purple-500' },
  { type: 'join', label: 'Join Tables', icon: MousePointer2, color: 'bg-emerald-500' },
  { type: 'preview', label: 'File Preview', icon: Info, color: 'bg-teal-500' },
];

const nodeTypes = {
  file: FileInputNode,
  filter: FilterNode,
  remove: FilterColumn,
  save: SaveFileNode,
  split: SplitNode,
  join: JoinNode,
  preview: FilePreviewNode,
};

const toCsv = (rows: Row[]) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  rows.forEach((r) => {
    lines.push(headers.map((h) => JSON.stringify(r[h] ?? '')).join(','));
  });
  return lines.join('\n');
};

export const WorkflowEditorPage = () => {
  const { id } = useParams();
  const isValidUuid = (value: string | null | undefined) => !!value && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value);
  const initialWorkflowId = id && id !== 'new' && isValidUuid(id) ? id : null;
  const { user } = useAuth();
  const [workflowName, setWorkflowName] = useState(initialWorkflowId ? `Workflow ${id}` : 'New Workflow');
  const [workflowId, setWorkflowId] = useState<string | null>(initialWorkflowId);
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [runMessage, setRunMessage] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useSchemaPropagation(nodes, edges, setNodes);

  const withSetters = useCallback((list: Node<WorkflowNodeData>[]) => (
    list.map((node) => ({
      ...node,
      data: {
        ...node.data,
        setData: node.data?.setData || ((updater: any) => setNodes((nds) => nds.map((n) => (
          n.id === node.id ? { ...n, data: typeof updater === 'function' ? updater(n.data) : updater } : n
        )))),
      },
    }))
  ), [setNodes]);

  // Load existing workflow when a valid id is present
  useEffect(() => {
    const loadWorkflow = async () => {
      if (!initialWorkflowId) return;
      const { data, error } = await supabase
        .from('workflows')
        .select('id, name, graph_data')
        .eq('id', initialWorkflowId)
        .single();
      if (error) {
        setRunMessage(error.message || 'Failed to load workflow');
        return;
      }
      setWorkflowId(data.id);
      setWorkflowName(data.name || 'Untitled Workflow');
      const graph = (data.graph_data || {}) as { nodes?: Node<WorkflowNodeData>[]; edges?: Edge[] };
      const incomingNodes = withSetters((graph.nodes || []) as Node<WorkflowNodeData>[]);
      const incomingEdges = (graph.edges || []) as Edge[];
      setNodes(incomingNodes);
      setEdges(incomingEdges);
      setRunMessage('Workflow loaded');
    };
    loadWorkflow();
  }, [initialWorkflowId, setEdges, setNodes]);

  const onConnect = useCallback((connection: Edge | Connection) => {
    setEdges((eds) => addEdge({ ...connection, animated: true, type: 'smoothstep' }, eds));
  }, [setEdges]);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    if (!type) return;

    const position = rfInstance?.project({ x: event.clientX - 320, y: event.clientY - 80 }) || { x: 100, y: 100 };
    const id = `${type}-${Date.now()}`;

    const label = NODE_PALETTE.find((p) => p.type === type)?.label || 'Node';

    let baseData: WorkflowNodeData;
    if (type === 'file') {
      baseData = { label, rows: [], description: '' } as FileNodeData;
    } else if (type === 'filter') {
      baseData = { label, field: '', operator: 'equals', value: '', description: '' } as FilterNodeData;
    } else if (type === 'remove') {
      baseData = { label, field: '', availableFields: [], description: '' } as RemoveNodeData;
    } else if (type === 'save') {
      baseData = { label } as SaveNodeData;
    } else if (type === 'preview') {
      baseData = { label, previewRows: [], description: '' } as PreviewNodeData;
    } else {
      baseData = { label } as WorkflowNodeData;
    }

    const dataWithSetter = { ...baseData, setData: (updater: any) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: typeof updater === 'function' ? updater(n.data) : updater } : n)) };

    setNodes((nds) => nds.concat({ id, type: type as any, position, data: dataWithSetter }));
  }, [rfInstance, setNodes]);

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const runAndApplyExecution = async () => {
    const result = await runExecution(nodes, edges, workflowName);
    setNodes(result.updatedNodes);

    if (result.downloads.length) {
      result.downloads.forEach((dl) => {
        const blob = new Blob([dl.csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', dl.filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
    }

    if (result.unresolved.length) {
      setRunMessage('Some nodes could not run. Please check connections.');
    } else {
      setRunMessage('Run complete. Outputs updated.');
    }
  };

  const handleRun = async () => {
    setIsRunning(true);
    setRunMessage('');
    try {
      await runAndApplyExecution();
    } finally {
      setIsRunning(false);
    }
  };

  const persistNameIfPossible = useCallback(async () => {
    if (!workflowName?.trim()) return;
    if (!workflowId) return; // Name will be stored on first save
    if (!user) {
      setRunMessage('Please sign in to save changes.');
      return;
    }
    const { error } = await supabase
      .from('workflows')
      .update({ name: workflowName.trim() })
      .eq('id', workflowId);
    if (error) {
      setRunMessage(error.message || 'Failed to update name');
    } else {
      setRunMessage('Name updated');
    }
  }, [user, workflowId, workflowName]);

  const handleSaveWorkflow = useCallback(async () => {
    if (!workflowName?.trim()) {
      setRunMessage('Please enter a workflow name before saving.');
      return;
    }
    if (!user) {
      setRunMessage('Please sign in to save your workflow.');
      return;
    }
    setIsSaving(true);
    setRunMessage('');
    const sanitizedNodes = nodes.map((node) => {
      const { data, ...rest } = node;
      const cleanedData = data && typeof data === 'object'
        ? Object.fromEntries(
            Object.entries(data as Record<string, any>).filter(([key, val]) => key !== 'setData' && typeof val !== 'function')
          )
        : data;
      return { ...rest, data: cleanedData };
    });
    const payload = {
      name: workflowName.trim(),
      graph_data: { nodes: sanitizedNodes, edges },
      owner_id: user.id,
    } as const;

    try {
      if (workflowId) {
        const { error } = await supabase
          .from('workflows')
          .update({ name: payload.name, graph_data: payload.graph_data })
          .eq('id', workflowId);
        if (error) throw error;
        setRunMessage('Workflow updated');
      } else {
        const { data, error } = await supabase
          .from('workflows')
          .insert([{ ...payload }])
          .select('id')
          .single();
        if (error) throw error;
        setWorkflowId(data?.id || null);
        setRunMessage('Workflow saved');
      }
    } catch (err: any) {
      setRunMessage(err?.message || 'Failed to save workflow');
    } finally {
      setIsSaving(false);
    }
  }, [edges, nodes, user, workflowId, workflowName]);

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 z-10 shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 text-slate-400 hover:bg-slate-100 rounded-md">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="h-6 w-px bg-slate-200" />
          <input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            onBlur={persistNameIfPossible}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            className="text-lg font-semibold text-slate-900 border-none focus:ring-0 p-0 hover:bg-slate-50 rounded px-2"
          />
        </div>

        <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
                <Download className="w-4 h-4" />
                Export
            </button>
            <div className="h-6 w-px bg-slate-200 mx-1" />
            <button
              onClick={handleSaveWorkflow}
              disabled={isSaving}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-slate-800 hover:bg-slate-900 rounded-md shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Play className="w-4 h-4 fill-current" />
                {isRunning ? 'Running...' : 'Run'}
            </button>
        </div>
      </header>

      {runMessage && (
        <div className="px-4 py-2 text-sm text-blue-700 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
          <Info className="w-4 h-4" />
          {runMessage}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
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

        <main className="flex-1 relative bg-slate-100 overflow-hidden">
            <div 
                className="absolute inset-0 opacity-[0.4]"
                style={{
                    backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                }}
            />

            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setRfInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              fitView
            >
              <Background gap={20} size={1} color="#cbd5e1" />
              <MiniMap nodeColor={() => '#0ea5e9'} />
              <Controls />
            </ReactFlow>
        </main>
      </div>
    </div>
  );
};
