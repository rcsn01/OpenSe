import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@repo/shared/auth/context';
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
import { NODE_REGISTRY, nodeTypes } from '../components/nodes/registry';
import { WorkflowNodeData } from '../components/nodes/types';
import { runExecution } from '../lib/execution/ExecutionEngine';
import { useSaveWorkflow, useUpdateWorkflowName, useWorkflow } from '../hooks/queries/useWorkflows';

// Components
import { EditorHeader } from '../components/editor/EditorHeader';
import { NodeSidebar } from '../components/editor/NodeSidebar';
import { PropertiesPanel } from '../components/editor/PropertiesPanel';
import { VersionHistoryPanel } from '../components/editor/VersionHistoryPanel';
import { NotificationSettingsPanel } from '../components/editor/NotificationSettingsPanel';
import { Info } from 'lucide-react';

// Hooks
import { useUndoRedo } from '../hooks/useUndoRedo';
import { useCreateWorkflowVersion } from '../hooks/queries/useVersions';
import { WorkflowVersion } from '../api/versions';

// Notifications
import { fireNotifications } from '../lib/notifications';

// Validation (Audit S5: sanitize imported workflows)
import { validateWorkflowImport, sanitizeText } from '../lib/validation';

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

  // Version History & Notifications panel state
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Force re-render for undo/redo button state
  const [, forceRender] = useState(0);

  const { data: workflowData, error: workflowError } = useWorkflow(workflowId);
  const saveMutation = useSaveWorkflow();
  const nameMutation = useUpdateWorkflowName();
  const createVersionMutation = useCreateWorkflowVersion();

  // ── Undo/Redo ──
  const { takeSnapshot, undo, redo, resetHistory, canUndo, canRedo } = useUndoRedo();

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
    resetHistory(); // Clear undo history when loading a workflow
    setRunMessage('Workflow loaded');
  }, [workflowData, setEdges, setNodes, withSetters, resetHistory]);

  useEffect(() => {
    if (workflowError) setRunMessage('Failed to load workflow');
  }, [workflowError]);

  // Hook to track selection
  useOnSelectionChange({
    onChange: ({ nodes }) => {
      setSelectedNodeId(nodes.length > 0 ? nodes[0].id : null);
    },
  });

  // ── Keyboard shortcuts for Undo/Redo ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      // Ignore when typing in inputs/textareas
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleUndo = useCallback(() => {
    const prev = undo(nodes, edges);
    if (prev) {
      setNodes(withSetters(prev.nodes));
      setEdges(prev.edges);
      forceRender((v) => v + 1);
    }
  }, [undo, nodes, edges, setNodes, setEdges, withSetters]);

  const handleRedo = useCallback(() => {
    const next = redo(nodes, edges);
    if (next) {
      setNodes(withSetters(next.nodes));
      setEdges(next.edges);
      forceRender((v) => v + 1);
    }
  }, [redo, nodes, edges, setNodes, setEdges, withSetters]);

  // Wrap onNodesChange to take snapshots
  const handleNodesChange = useCallback((changes: any) => {
    // Snapshot before structural changes (add, remove, position after drag)
    const hasStructuralChange = changes.some(
      (c: any) => c.type === 'remove' || c.type === 'add' ||
                   (c.type === 'position' && c.dragging === false)
    );
    if (hasStructuralChange) {
      takeSnapshot(nodes, edges);
      forceRender((v) => v + 1);
    }
    onNodesChange(changes);
  }, [onNodesChange, takeSnapshot, nodes, edges]);

  // Wrap onEdgesChange to take snapshots
  const handleEdgesChange = useCallback((changes: any) => {
    const hasStructuralChange = changes.some(
      (c: any) => c.type === 'remove' || c.type === 'add'
    );
    if (hasStructuralChange) {
      takeSnapshot(nodes, edges);
      forceRender((v) => v + 1);
    }
    onEdgesChange(changes);
  }, [onEdgesChange, takeSnapshot, nodes, edges]);

  const onConnect = useCallback((connection: Edge | Connection) => {
    takeSnapshot(nodes, edges);
    setEdges((eds) => addEdge(connection, eds));
    forceRender((v) => v + 1);
  }, [setEdges, takeSnapshot, nodes, edges]);

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

    // Snapshot before adding node
    takeSnapshot(nodes, edges);

    const position = rfInstance?.project({ x: event.clientX - 288, y: event.clientY - 64 }) || { x: 100, y: 100 };
    const id = `${type}-${Date.now()}`;

    const baseData = { ...config.initialData } as WorkflowNodeData;
    const dataWithSetter = { ...baseData, setData: (updater: any) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: typeof updater === 'function' ? updater(n.data) : updater } : n)) };

    const newNode = { id, type: config.type as any, position, data: dataWithSetter };
    setNodes((nds) => nds.concat(newNode));
    setSelectedNodeId(id);
    forceRender((v) => v + 1);
  }, [rfInstance, setNodes, takeSnapshot, nodes, edges]);

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
    if (cleanedData && typeof cleanedData === 'object' && 'setData' in (cleanedData as Record<string, unknown>)) {
      delete (cleanedData as Record<string, unknown>).setData;
    }
    if (cleanedData && 'previewRows' in (cleanedData as Record<string, unknown>)) {
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
    setNodes(withSetters(result.updatedNodes));

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
    let executionFailed = false;
    let errorMessage = '';
    try {
      await runAndApplyExecution();
    } catch (err: any) {
      executionFailed = true;
      errorMessage = err?.message || 'Unknown execution error';
      setRunMessage(`Run failed: ${errorMessage}`);
    } finally {
      setIsRunning(false);
    }

    // Fire notifications on failure (Feature 3)
    if (executionFailed && workflowId) {
      fireNotifications(workflowId, {
        workflowName,
        status: 'failed',
        errorMessage,
        timestamp: new Date().toISOString(),
      }).catch(() => {/* swallow notification errors */});
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

    const graphData = { nodes: sanitizedNodes, edges };

    // Personal tab uses /editor/new (no orgId); org tab uses /editor/new?orgId=xxx
    // Only set org_id when URL explicitly has orgId — otherwise workflow stays personal
    const orgIdForSave = orgIdParam?.trim() ? orgIdParam.trim() : null;

    saveMutation.mutate(
      {
        id: workflowId,
        name: workflowName.trim(),
        graph_data: graphData,
        owner_id: user.id,
        org_id: orgIdForSave,
      },
      {
        onSuccess: (data) => {
          const savedId = data.id || workflowId;
          setWorkflowId(savedId);
          setRunMessage('Workflow saved');
          // Ensure "Back to Dashboard" redirects to the tab where this workflow will appear
          const tab = data.org_id ? 'org' : 'personal';
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('dashboardLastTab', tab);
          }
          if (!workflowId && data.id) {
            navigate(`/editor/${data.id}`, { replace: true });
          }

          // Auto-create version snapshot (Feature 2)
          if (savedId) {
            createVersionMutation.mutate({
              workflowId: savedId,
              graphData,
              name: workflowName.trim(),
              userId: user.id,
              changeSummary: 'Auto-saved version',
            });
          }
        },
        onError: (err: any) => {
          setRunMessage(err?.message || 'Failed to save workflow');
        },
      },
    );
  }, [edges, navigate, orgIdParam, sanitizeNodes, saveMutation, user, workflowId, workflowName, createVersionMutation]);

  // ── Version Restore Handler ──
  const handleRestoreVersion = useCallback((version: WorkflowVersion) => {
    if (!window.confirm(`Restore version ${version.version_number}? This will replace your current graph.`)) return;

    takeSnapshot(nodes, edges); // Allow undo of the restore

    const graph = (typeof version.graph_data === 'string'
      ? JSON.parse(version.graph_data)
      : version.graph_data || {}) as { nodes?: Node<WorkflowNodeData>[]; edges?: Edge[] };

    setNodes(withSetters((graph.nodes || []) as Node<WorkflowNodeData>[]));
    setEdges((graph.edges || []) as Edge[]);
    setShowVersionHistory(false);
    setRunMessage(`Restored version ${version.version_number}. Save to persist.`);
  }, [nodes, edges, takeSnapshot, withSetters, setNodes, setEdges]);

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

        const validation = validateWorkflowImport(parsed);
        if (!validation.valid) {
          setRunMessage(`Import failed: ${validation.error}`);
          return;
        }

        takeSnapshot(nodes, edges); // Allow undo of import

        const graph = (parsed.graph_data || parsed) as { nodes?: Node<WorkflowNodeData>[]; edges?: Edge[] };
        const incomingNodes = withSetters((graph.nodes || []) as Node<WorkflowNodeData>[]);
        const incomingEdges = (graph.edges || []) as Edge[];
        setNodes(incomingNodes);
        setEdges(incomingEdges);
        if (parsed.name) setWorkflowName(sanitizeText(parsed.name, 100));
        setRunMessage('Workflow imported');
      } catch (err: any) {
        setRunMessage(err?.message || 'Failed to import workflow');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  }, [setEdges, setNodes, withSetters, takeSnapshot, nodes, edges]);

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <EditorHeader
        workflowName={workflowName}
        onNameChange={setWorkflowName}
        onNameBlur={persistNameIfPossible}
        dashboardTab={orgIdParam?.trim() || workflowData?.org_id ? 'org' : 'personal'}
        onImportClick={handleImportClick}
        onExportClick={handleExport}
        onSave={handleSaveWorkflow}
        onRun={handleRun}
        isSaving={saveMutation.isPending}
        isRunning={isRunning}
        importInputRef={importInputRef}
        onImportFile={handleImportFile}
        // Undo/Redo
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo()}
        canRedo={canRedo()}
        // Version History
        onToggleVersionHistory={() => { setShowVersionHistory((v) => !v); setShowNotifications(false); }}
        hasVersionHistory={!!workflowId}
        // Notifications
        onToggleNotifications={() => { setShowNotifications((v) => !v); setShowVersionHistory(false); }}
        hasNotifications={!!workflowId}
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
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
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

        {/* Right panel: Properties, Version History, or Notifications */}
        {showVersionHistory ? (
          <VersionHistoryPanel
            workflowId={workflowId}
            onRestore={handleRestoreVersion}
            onClose={() => setShowVersionHistory(false)}
          />
        ) : showNotifications ? (
          <NotificationSettingsPanel
            workflowId={workflowId}
            userId={user?.id || ''}
            onClose={() => setShowNotifications(false)}
          />
        ) : (
          <PropertiesPanel
            selectedNode={selectedNode as any}
            onClose={() => setSelectedNodeId(null)}
            onChange={updateNodeData}
          />
        )}
      </div>
    </div>
  );
};
