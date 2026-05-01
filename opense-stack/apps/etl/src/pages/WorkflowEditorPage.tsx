import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@repo/shared/auth/context';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Edge,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { nodeTypes } from '../components/nodes/registry';
import { WorkflowNodeData } from '../components/nodes/types';
import { runExecution } from '../lib/execution/ExecutionEngine';

// Components
import { EditorHeader } from '../components/editor/EditorHeader';
import { NodeSidebar } from '../components/editor/NodeSidebar';
import { PropertiesPanel } from '../components/editor/PropertiesPanel';
import { VersionHistoryPanel } from '../components/editor/VersionHistoryPanel';
import { NotificationSettingsPanel } from '../components/editor/NotificationSettingsPanel';
import { Info } from 'lucide-react';

// Hooks
import { useWorkflowData } from '../hooks/workflow/useWorkflowData';
import { useWorkflowEditor } from '../hooks/workflow/useWorkflowEditor';
import { useWorkflowImportExport } from '../hooks/workflow/useWorkflowImportExport';
import { WorkflowVersion } from '../api/versions';

// Notifications
import { fireNotifications } from '../lib/notifications';

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
  const [runMessage, setRunMessage] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);

  // Version History & Notifications panel state
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const { workflowData, workflowError, saveMutation, nameMutation, createVersionMutation } = useWorkflowData(workflowId);
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    setRfInstance,
    selectedNode,
    setSelectedNodeId,
    defaultEdgeOptions,
    withSetters,
    sanitizeNodes,
    takeSnapshot,
    resetHistory,
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
    handleNodesChange,
    handleEdgesChange,
    onConnect,
    onDragStart,
    onDrop,
    onDragOver,
    updateNodeData,
  } = useWorkflowEditor({ setRunMessage });

  const {
    importInputRef,
    handleExport,
    handleImportClick,
    handleImportFile,
  } = useWorkflowImportExport({
    workflowName,
    setWorkflowName,
    edges,
    nodes,
    sanitizeNodes,
    withSetters,
    setNodes,
    setEdges,
    setRunMessage,
    takeSnapshot,
  });

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

  useEffect(() => {
    if (!workflowData?.is_template) return;

    setRunMessage('Gallery workflows are read-only. Clone from Workflow Gallery to edit.');
    navigate('/gallery', { replace: true });
  }, [navigate, workflowData?.is_template]);

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

    // Preserve existing org ownership when editing /editor/:id routes without orgId query param.
    // For new workflows, personal remains null unless orgId is explicitly provided.
    const orgIdForSave = orgIdParam?.trim()
      ? orgIdParam.trim()
      : (workflowData?.org_id ?? null);

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
              backgroundImage: 'radial-gradient(var(--color-border-hover) 1px, transparent 1px)',
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
            <Background gap={20} size={1} color="var(--color-border-hover)" />
            <MiniMap nodeColor={() => 'var(--etl-accent)'} />
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
