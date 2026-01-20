import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Save, Download, ArrowLeft, MousePointer2, Info } from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import { NODE_REGISTRY, nodeTypes, nodesByCategory } from '../../components/nodes/registry';
import { WorkflowNodeData } from '../../components/nodes/types';
import { runExecution } from '../../lib/execution/ExecutionEngine';
import { useSaveWorkflow, useUpdateWorkflowName, useWorkflow } from '../../hooks/queries/useWorkflows';

const CATEGORY_ORDER = ['Input', 'Data', 'Logic', 'Output'];

export const WorkflowEditorPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const orgIdParam = searchParams.get('orgId');
  const navigate = useNavigate();

  const isValidUuid = (value: string | null | undefined) => !!value && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value);
  const initialWorkflowId = id && id !== 'new' && isValidUuid(id) ? id : null;
  const { user } = useAuth();
  const [workflowName, setWorkflowName] = useState('New Workflow');
  const [workflowId, setWorkflowId] = useState<string | null>(initialWorkflowId);
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [runMessage, setRunMessage] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const { data: workflowData, error: workflowError } = useWorkflow(workflowId);
  const saveMutation = useSaveWorkflow();
  const nameMutation = useUpdateWorkflowName();

  const paletteGroups = useMemo(() => {
    const ordered = CATEGORY_ORDER.map((category) => ({ category, nodes: nodesByCategory[category] || [] }))
      .filter((entry) => entry.nodes.length);
    const remaining = Object.entries(nodesByCategory)
      .filter(([category]) => !CATEGORY_ORDER.includes(category))
      .map(([category, nodes]) => ({ category, nodes }));
    return [...ordered, ...remaining];
  }, []);

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

  useEffect(() => {
    if (!workflowData) return;

    setWorkflowId(workflowData.id);
    setWorkflowName(workflowData.name || 'Untitled Workflow');

    const rawGraph = workflowData.graph_data;
    let graph: { nodes?: Node<WorkflowNodeData>[]; edges?: Edge[] } = {};

    try {
      graph = (typeof rawGraph === 'string' ? JSON.parse(rawGraph) : rawGraph || {}) as { nodes?: Node<WorkflowNodeData>[]; edges?: Edge[] };
    } catch (_err) {
      setRunMessage('Failed to parse saved workflow');
      return;
    }

    const incomingNodes = withSetters((graph.nodes || []) as Node<WorkflowNodeData>[]);
    const incomingEdges = (graph.edges || []) as Edge[];
    setNodes(incomingNodes);
    setEdges(incomingEdges);
    setRunMessage('Workflow loaded');
  }, [workflowData, setEdges, setNodes, withSetters]);

  useEffect(() => {
    if (workflowError) setRunMessage('Failed to load workflow');
  }, [workflowError]);

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

    const config = NODE_REGISTRY[type as keyof typeof NODE_REGISTRY];
    if (!config) {
      setRunMessage('Unknown node type');
      return;
    }

    const position = rfInstance?.project({ x: event.clientX - 320, y: event.clientY - 80 }) || { x: 100, y: 100 };
    const id = `${type}-${Date.now()}`;

    const baseData = { ...config.initialData } as WorkflowNodeData;
    const dataWithSetter = { ...baseData, setData: (updater: any) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: typeof updater === 'function' ? updater(n.data) : updater } : n)) };

    setNodes((nds) => nds.concat({ id, type: config.type as any, position, data: dataWithSetter }));
  }, [rfInstance, setNodes, setRunMessage]);

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const sanitizeNodes = useCallback(() => nodes.map((node) => {
    const { data, ...rest } = node;
    const cleanedData = data && typeof data === 'object'
      ? JSON.parse(JSON.stringify(data, (_key, val) => (typeof val === 'function' ? undefined : val)))
      : data;
    if (cleanedData && typeof cleanedData === 'object' && 'setData' in (cleanedData as Record<string, unknown>)) {
      delete (cleanedData as Record<string, unknown>).setData;
    }
    if (node.type === 'preview' && cleanedData && 'previewRows' in (cleanedData as Record<string, unknown>)) {
      delete (cleanedData as Record<string, unknown>).previewRows;
    }
    // Clear file data from FileInputNode on save
    if (node.type === 'file' && cleanedData) {
      delete (cleanedData as Record<string, unknown>).rows;
      delete (cleanedData as Record<string, unknown>).datasetId;
      delete (cleanedData as Record<string, unknown>).count;
      delete (cleanedData as Record<string, unknown>).chunkCount;
      delete (cleanedData as Record<string, unknown>).fileName;
      delete (cleanedData as Record<string, unknown>).schema;
    }
    return { ...rest, data: cleanedData };
  }), [nodes]);

  const runAndApplyExecution = async () => {
    if (!user) {
        setRunMessage('You must be logged in to run workflows.');
        return;
    }

    const result = await runExecution(
        nodes, 
        edges, 
        workflowName,
        workflowId,
        user.id,
        orgIdParam
    );
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

  const persistNameIfPossible = useCallback(() => {
    if (!workflowName?.trim()) return;
    if (!workflowId) return;

    nameMutation.mutate(
      { id: workflowId, name: workflowName.trim() },
      {
        onError: () => setRunMessage('Failed to update name'),
        onSuccess: () => setRunMessage('Name updated'),
      },
    );
  }, [nameMutation, workflowId, workflowName]);

  const handleSaveWorkflow = useCallback(async () => {
    if (!workflowName?.trim()) {
      setRunMessage('Please enter a workflow name before saving.');
      return;
    }
    if (!user) {
      setRunMessage('Please sign in to save your workflow.');
      return;
    }

    setRunMessage('Saving...');
    const sanitizedNodes = sanitizeNodes();

    saveMutation.mutate(
      {
        id: workflowId,
        name: workflowName.trim(),
        graph_data: { nodes: sanitizedNodes, edges },
        owner_id: user.id,
        org_id: orgIdParam || null,
      },
      {
        onSuccess: (data) => {
          setWorkflowId(data.id || workflowId);
          setRunMessage('Workflow saved');
          if (!workflowId && data.id) {
            navigate(`/editor/${data.id}`, { replace: true });
          }
        },
        onError: (err: any) => {
          setRunMessage(err?.message || 'Failed to save workflow');
        },
      },
    );
  }, [edges, navigate, orgIdParam, sanitizeNodes, saveMutation, user, workflowId, workflowName]);

  const handleExport = useCallback(() => {
    const sanitizedNodes = sanitizeNodes();
    const payload = {
      name: workflowName?.trim() || 'workflow',
      graph_data: { nodes: sanitizedNodes, edges },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${(workflowName || 'workflow').replace(/\s+/g, '_')}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setRunMessage('Workflow exported');
  }, [edges, sanitizeNodes, workflowName]);

  const handleImportClick = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = reader.result as string;
        const parsed = JSON.parse(raw);
        const graph = (parsed.graph_data || parsed) as { nodes?: Node<WorkflowNodeData>[]; edges?: Edge[] };
        const incomingNodes = withSetters((graph.nodes || []) as Node<WorkflowNodeData>[]);
        const incomingEdges = (graph.edges || []) as Edge[];
        setNodes(incomingNodes);
        setEdges(incomingEdges);
        if (parsed.name) setWorkflowName(parsed.name);
        setRunMessage('Workflow imported');
      } catch (err: any) {
        setRunMessage(err?.message || 'Failed to import workflow');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  }, [setEdges, setNodes, withSetters]);

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
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImportFile}
            />
            <button
              onClick={handleImportClick}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            >
                <Download className="w-4 h-4" />
                Import
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            >
                <Download className="w-4 h-4" />
              Export
            </button>
            <div className="h-6 w-px bg-slate-200 mx-1" />
            <button
              onClick={handleSaveWorkflow}
              disabled={saveMutation.isPending}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-slate-800 hover:bg-slate-900 rounded-md shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
                <Save className="w-4 h-4" />
                {saveMutation.isPending ? 'Saving...' : 'Save'}
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
            
            <div className="p-4 space-y-5 overflow-y-auto flex-1">
              {paletteGroups.map((group) => (
                <div key={group.category} className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{group.category}</div>
                  <div className="space-y-2">
                    {group.nodes.map((node) => (
                      <div
                        key={node.type}
                        onDragStart={(event) => onDragStart(event, node.type)}
                        draggable
                        className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg shadow-sm cursor-grab hover:border-blue-300 hover:ring-1 hover:ring-blue-100 transition-all active:cursor-grabbing"
                      >
                        <div className={`p-2 rounded-md ${node.color} text-white`}>
                          <node.icon className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-800">{node.label}</span>
                          <span className="text-[11px] text-slate-500">{node.type}</span>
                        </div>
                      </div>
                    ))}
                  </div>
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