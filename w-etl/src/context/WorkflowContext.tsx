import React, { createContext, useContext, useState, useCallback } from 'react';

// Maps Node ID -> Array of Data Objects
type DataMap = Record<string, any[]>;

interface WorkflowContextType {
  dataMap: DataMap;
  updateNodeData: (nodeId: string, data: any[]) => void;
  getNodeData: (nodeId: string) => any[] | null;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export const WorkflowProvider = ({ children }: { children: React.ReactNode }) => {
  const [dataMap, setDataMap] = useState<DataMap>({});
  // Mock edges for now to prevent crash outside ReactFlowProvider
  const edges: any[] = []; 

  // Called when a node completes processing
  const updateNodeData = useCallback((nodeId: string, data: any[]) => {
    setDataMap((prev) => ({ ...prev, [nodeId]: data }));
    
    // AUTO-PROPAGATION LOGIC mocking
    // 1. Find all edges where 'source' is the current nodeId
    const outgoingEdges = edges.filter(e => e.source === nodeId);
    
    // 2. Trigger updates...
  }, [edges]);

  // Called by a node to see what its input is
  const getNodeData = useCallback((nodeId: string) => {
    // Find the edge connecting TO this node
    const incomingEdge = edges.find(e => e.target === nodeId);
    if (!incomingEdge) return null;
    
    // Return data from the SOURCE of that edge
    return dataMap[incomingEdge.source] || null;
  }, [dataMap, edges]);

  return (
    <WorkflowContext.Provider value={{ dataMap, updateNodeData, getNodeData }}>
      {children}
    </WorkflowContext.Provider>
  );
};

export const useWorkflowData = () => {
  const context = useContext(WorkflowContext);
  if (!context) throw new Error("useWorkflowData must be used within WorkflowProvider");
  return context;
};
