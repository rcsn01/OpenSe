import React, { createContext, useContext, useState, useCallback } from 'react';
import { useEdges } from 'reactflow';

// Maps Node ID -> Source Handle ID -> Data Array
type DataMap = Record<string, Record<string, any[]>>;

interface WorkflowContextType {
  dataMap: DataMap;
  updateNodeData: (nodeId: string, handleId: string, data: any[]) => void;
  getNodeInput: (nodeId: string, targetHandle: string) => any[] | null;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export const WorkflowProvider = ({ children }: { children: React.ReactNode }) => {
  const [dataMap, setDataMap] = useState<DataMap>({});
  const edges = useEdges();

  // Publish data from a specific output handle on a node
  const updateNodeData = useCallback((nodeId: string, handleId: string, data: any[]) => {
    setDataMap((prev) => ({
      ...prev,
      [nodeId]: {
        ...(prev[nodeId] || {}),
        [handleId || 'default']: data,
      },
    }));
  }, []);

  // Retrieve data arriving at a specific target handle on a node
  const getNodeInput = useCallback((nodeId: string, targetHandle: string) => {
    const incomingEdge = edges.find(
      (e) => e.target === nodeId && (e.targetHandle || 'default') === (targetHandle || 'default')
    );
    if (!incomingEdge) return null;

    const sourceNodeData = dataMap[incomingEdge.source];
    if (!sourceNodeData) return null;

    return sourceNodeData[incomingEdge.sourceHandle || 'default'] || null;
  }, [dataMap, edges]);

  return (
    <WorkflowContext.Provider value={{ dataMap, updateNodeData, getNodeInput }}>
      {children}
    </WorkflowContext.Provider>
  );
};

export const useWorkflowData = () => {
  const context = useContext(WorkflowContext);
  if (!context) throw new Error("useWorkflowData must be used within WorkflowProvider");
  return context;
};
