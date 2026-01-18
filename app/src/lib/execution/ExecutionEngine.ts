import { Edge, Node } from 'reactflow';
import { WorkflowNodeData } from '../../components/nodes/types';
import { supabase } from '../supabase';
import { NODE_REGISTRY } from '../../components/nodes/registry';
import { DataRef, ExecutionDownload, loadRows, persistRows, toCsv } from './utils';
import { ProcessorInput } from '../../components/nodes/registry.types';

export type ExecutionResult = {
  updatedNodes: Node<WorkflowNodeData>[];
  downloads: ExecutionDownload[];
  unresolved: string[];
};

const buildInputs = async (deps: Edge[], dataOut: Record<string, Record<string, DataRef>>): Promise<Record<string, ProcessorInput>> => {
  const inputs: Record<string, ProcessorInput> = {};

  for (const edge of deps) {
    const ref = dataOut[edge.source]?.[edge.sourceHandle || 'default'];
    const rows = await loadRows(ref);
    inputs[edge.targetHandle || 'in'] = { rows, ref };
  }

  return inputs;
};

export const runExecution = async (
  nodes: Node<WorkflowNodeData>[],
  edges: Edge[],
  workflowName: string,
  // New Logging Params
  workflowId: string | null,
  userId: string,
  orgId: string | null
): Promise<ExecutionResult> => {
  const startTime = new Date();
  let errorState: string | null = null;

  try {
    const incoming: Record<string, Edge[]> = {};
    edges.forEach((e) => {
      if (!incoming[e.target]) incoming[e.target] = [];
      incoming[e.target].push(e as Edge);
    });

    const dataOut: Record<string, Record<string, DataRef>> = {};
    const unresolved = new Set(nodes.map((n) => n.id));
    let progress = true;
    const downloads: ExecutionDownload[] = [];
    let updatedNodes = nodes.map((n) => ({ ...n }));

    while (unresolved.size && progress) {
      progress = false;
      for (const id of Array.from(unresolved)) {
        const nodeIndex = updatedNodes.findIndex((n) => n.id === id);
        if (nodeIndex === -1) continue;
        const node = updatedNodes[nodeIndex];

        const nodeConfig = NODE_REGISTRY[node.type];
        if (!nodeConfig) {
          console.warn(`No node config found for type: ${node.type}`);
          unresolved.delete(id);
          progress = true;
          continue;
        }

        const deps = incoming[id] || [];
        const allInputsReady = deps.every((d) => dataOut[d.source]?.[d.sourceHandle || 'default']);
        if (deps.length && !allInputsReady) continue;

        const inputs = await buildInputs(deps, dataOut);

        const result = await nodeConfig.processor({
          data: node.data as any,
          inputs,
          node,
          helpers: { persistRows, loadRows, toCsv, workflowName },
        });

        const setOutput = (handleId: string, ref: DataRef) => {
          if (!dataOut[id]) dataOut[id] = {};
          dataOut[id][handleId || 'default'] = ref;
        };

        Object.entries(result.outputs || {}).forEach(([handle, ref]) => setOutput(handle, ref));

        if (result.updatedData) {
          const nextData = { ...(node.data as any), ...result.updatedData };
          updatedNodes = updatedNodes.map((n, idx) => (idx === nodeIndex ? { ...n, data: nextData } : n));
        }

        if (result.downloads?.length) {
          downloads.push(...result.downloads);
        }

        unresolved.delete(id);
        progress = true;
      }
    }

    if (unresolved.size > 0) {
      errorState = "Dependency cycle or disconnected nodes detected.";
    }

    return {
      updatedNodes,
      downloads,
      unresolved: Array.from(unresolved),
    };

  } catch (err: any) {
    errorState = err.message;
    throw err;
  } finally {
    // LOGGING TO SUPABASE
    if (workflowId && userId) {
        await supabase.from('workflow_executions').insert({
            workflow_id: workflowId,
            user_id: userId,
            org_id: orgId,
            status: errorState ? 'failed' : 'success',
            started_at: startTime.toISOString(),
            completed_at: new Date().toISOString(),
            error_message: errorState
        });
    }
  }
};
