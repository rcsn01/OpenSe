import { useCallback } from 'react';
import { useEdges } from 'reactflow';
import { useWorkflowData } from '../context/WorkflowContext';

// Logic to propagate data from one node to another
export const useExecution = () => {
  const edges = useEdges();
  const { dataMap } = useWorkflowData();

  const propagate = useCallback((sourceNodeId: string) => {
    // Find downstream nodes
    const outgoingEdges = edges.filter(e => e.source === sourceNodeId);
    
    // Get the data from the source
    const sourceData = dataMap[sourceNodeId];
    if (!sourceData) return;

    outgoingEdges.forEach(edge => {
        // In a real execution engine, we would trigger the target node to run.
        // Since we are using a "push" model in this simple MVP, 
        // the target node usually listens to `getNodeData` in its own useEffect.
        // However, if we needed to trigger a specific action:
        console.log(`Propagating data from ${sourceNodeId} to ${edge.target}`);
    });
  }, [edges, dataMap]);

  return { propagate };
};
