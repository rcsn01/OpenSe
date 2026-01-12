import React, { useEffect, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { useWorkflowData } from '../../context/WorkflowContext';

export const RemoveColumnNode = ({ id, data }: NodeProps) => {
  const { getNodeData, updateNodeData } = useWorkflowData();
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedCol, setSelectedCol] = useState<string>(data.columnToRemove || '');

  // 1. Retrieve data from the PREVIOUS node
  const inputData = getNodeData(id); // Custom hook logic gets data from upstream

  // 2. Derive columns when input data changes
  useEffect(() => {
    if (inputData && inputData.length > 0) {
      setColumns(Object.keys(inputData[0]));
      
      // Auto-process if configuration exists
      if (selectedCol) processRemoval(selectedCol, inputData);
    }
  }, [inputData, selectedCol]);

  const processRemoval = (col: string, dataset: any[]) => {
    // Ideally, do this in a Worker
    const newData = dataset.map(row => {
      const { [col]: _, ...rest } = row; // Destructure to remove key
      return rest;
    });
    updateNodeData(id, newData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const col = e.target.value;
    setSelectedCol(col);
    // Persist configuration to React Flow data (for saving blueprint)
    data.columnToRemove = col; 
    
    if (inputData) processRemoval(col, inputData);
  };

  return (
    <div className="bg-white border-2 border-orange-200 rounded-lg p-4 shadow-md w-64">
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-gray-500" />
      
      <div className="font-bold text-sm mb-2 text-gray-700">✂️ Remove Column</div>
      
      <select 
        className="w-full border p-1 text-sm rounded" 
        value={selectedCol} 
        onChange={handleChange}
        disabled={!inputData}
      >
        <option value="">Select column...</option>
        {columns.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      <div className="text-xs text-gray-400 mt-2">
        {inputData ? `${inputData.length} rows in` : "Waiting for data..."}
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-500" />
    </div>
  );
};
