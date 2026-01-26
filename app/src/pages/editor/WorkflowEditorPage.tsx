import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
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
  useOnSelectionChange
} from 'reactflow';
import 'reactflow/dist/style.css';
import { NODE_REGISTRY, nodeTypes } from '../../components/nodes/registry';
import { WorkflowNodeData } from '../../components/nodes/types';
import { runExecution } from '../../lib/execution/ExecutionEngine';
import { useSaveWorkflow, useUpdateWorkflowName, useWorkflow } from '../../hooks/queries/useWorkflows';

// New Components
import { EditorHeader } from '../../components/editor/EditorHeader';
import { NodeSidebar } from '../../components/editor/NodeSidebar';
import { PropertiesPanel } from '../../components/editor/PropertiesPanel';
import { Info } from 'lucide-react';

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

  // Selection State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const { data: workflowData, error: workflowError } = useWorkflow(workflowId);
  const saveMutation = useSaveWorkflow();
  const nameMutation = useUpdateWorkflowName();

  // Aesthetics: Define global style for connection lines
  const defaultEdgeOptions = useMemo(() => ({
    type: 'smoothstep',
    animated: true,
    style: {
      strokeWidth: 3,
      stroke: '#64748b' // Slate-500 for high visibility
    },
  }), []);

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

  // Hook to track selection
  useOnSelectionChange({
    onChange: ({ nodes }) => {
      // If multiple selected, just take the first one, or null if none
      setSelectedNodeId(nodes.length > 0 ? nodes[0].id : null);
    },
  });

  const onConnect = useCallback((connection: Edge | Connection) => {
    setEdges((eds) => addEdge(connection, eds));
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

    const position = rfInstance?.project({ x: event.clientX - 288, y: event.clientY - 64 }) || { x: 100, y: 100 }; // Adjusted for Sidebar width
    const id = `${type}-${Date.now()}`;

    const baseData = { ...config.initialData } as WorkflowNodeData;
    const dataWithSetter = { ...baseData, setData: (updater: any) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: typeof updater === 'function' ? updater(n.data) : updater } : n)) };

    const newNode = { id, type: config.type as any, position, data: dataWithSetter };
    setNodes((nds) => nds.concat(newNode));
    setSelectedNodeId(id); // Auto-select new node
  }, [rfInstance, setNodes, setRunMessage]);

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const updateNodeData = (nodeId: string, newData: any) => {
    setNodes((nds) => nds.map((node) => {
      if (node.id === nodeId) {
        return { ...node, data: newData };
      }
      return node;
    }));
  };

  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);

  const sanitizeNodes = useCallback(() => nodes.map((node) => {
    const { data, ...rest } = node;
    const cleanedData = data && typeof data === 'object'
      ? JSON.parse(JSON.stringify(data, (_key, val) => (typeof val === 'function' ? undefined : val)))
      : data;
    // ... same sanitization logic ...
    if (cleanedData && typeof cleanedData === 'object' && 'setData' in (cleanedData as Record<string, unknown>)) {
      delete (cleanedData as Record<string, unknown>).setData;
    }
    if (node.type === 'preview' && cleanedData && 'previewRows' in (cleanedData as Record<string, unknown>)) {
      delete (cleanedData as Record<string, unknown>).previewRows;
    }
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
      setRunMessage('Run complete.');
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
    let sanitizedNodes: ReturnType<typeof sanitizeNodes>;
    try {
      sanitizedNodes = sanitizeNodes();
    } catch (err) {
      setRunMessage('Failed to prepare workflow data');
      return;
    }

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
      <EditorHeader
        workflowName={workflowName}
        onNameChange={setWorkflowName}
        onNameBlur={persistNameIfPossible}
        onImportClick={handleImportClick}
        onExportClick={handleExport}
        onSave={handleSaveWorkflow}
        onRun={handleRun}
        isSaving={saveMutation.isPending}
        isRunning={isRunning}
        importInputRef={importInputRef}
        onImportFile={handleImportFile}
      />

      {runMessage && (
        <div className="px-4 py-2 text-sm text-blue-700 bg-blue-50 border-b border-blue-100 flex items-center gap-2 animate-in slide-in-from-top-1">
          <Info className="w-4 h-4" />
          {runMessage}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <NodeSidebar onDragStart={onDragStart} />

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
            defaultEdgeOptions={defaultEdgeOptions}
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

        <PropertiesPanel
          selectedNode={selectedNode as any} // Cast safely based on internal content
          onClose={() => setSelectedNodeId(null)}
          onChange={updateNodeData}
        />
      </div>
    </div>
  );
};