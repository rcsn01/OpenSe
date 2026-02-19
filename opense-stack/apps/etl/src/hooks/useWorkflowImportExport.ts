import { useCallback, useRef } from 'react';
import { Edge, Node } from 'reactflow';
import { WorkflowNodeData } from '../components/nodes/types';
import { validateWorkflowImport, sanitizeText } from '../lib/validation';

type UseWorkflowImportExportParams = {
  workflowName: string;
  setWorkflowName: (name: string) => void;
  edges: Edge[];
  nodes: Node<WorkflowNodeData>[];
  sanitizeNodes: () => Node<WorkflowNodeData>[];
  withSetters: (nodes: Node<WorkflowNodeData>[]) => Node<WorkflowNodeData>[];
  setNodes: (updater: Node<WorkflowNodeData>[] | ((nodes: Node<WorkflowNodeData>[]) => Node<WorkflowNodeData>[])) => void;
  setEdges: (updater: Edge[] | ((edges: Edge[]) => Edge[])) => void;
  setRunMessage: (message: string) => void;
  takeSnapshot: (nodes: Node<WorkflowNodeData>[], edges: Edge[]) => void;
};

export const useWorkflowImportExport = ({
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
}: UseWorkflowImportExportParams) => {
  const importInputRef = useRef<HTMLInputElement | null>(null);

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
  }, [edges, sanitizeNodes, setRunMessage, workflowName]);

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

        takeSnapshot(nodes, edges);

        const graph = (parsed.graph_data || parsed) as { nodes?: Node<WorkflowNodeData>[]; edges?: Edge[] };
        const incomingNodes = withSetters((graph.nodes || []) as Node<WorkflowNodeData>[]);
        const incomingEdges = (graph.edges || []) as Edge[];
        setNodes(incomingNodes);
        setEdges(incomingEdges);

        if (parsed.name) {
          setWorkflowName(sanitizeText(parsed.name, 100));
        }

        setRunMessage('Workflow imported');
      } catch (err: any) {
        setRunMessage(err?.message || 'Failed to import workflow');
      } finally {
        e.target.value = '';
      }
    };

    reader.readAsText(file);
  }, [edges, nodes, setEdges, setNodes, setRunMessage, setWorkflowName, takeSnapshot, withSetters]);

  return {
    importInputRef,
    handleExport,
    handleImportClick,
    handleImportFile,
  };
};
