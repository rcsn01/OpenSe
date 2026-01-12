import React, { useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { useWorkflowData } from '../../context/WorkflowContext';

export const JoinNode = ({ id }: NodeProps) => {
  const { getNodeInput, updateNodeData } = useWorkflowData();
  const leftData = getNodeInput(id, 'input-left');
  const rightData = getNodeInput(id, 'input-right');

  useEffect(() => {
    if (!leftData || !rightData) return;
    const minLength = Math.min(leftData.length, rightData.length);
    const merged = [] as any[];
    for (let i = 0; i < minLength; i++) {
      merged.push({ ...leftData[i], ...rightData[i] });
    }
    updateNodeData(id, 'output-merged', merged);
  }, [id, leftData, rightData, updateNodeData]);

  return (
    <div className="bg-white border-2 border-green-200 rounded-lg p-4 shadow-md w-64">
      <div className="font-bold text-sm mb-4 text-green-700">Join Tables</div>

      <div className="relative flex items-center mb-2">
        <Handle
          type="target"
          position={Position.Left}
          id="input-left"
          className="w-3 h-3 bg-blue-500 !left-[-18px]"
        />
        <span className="text-xs text-slate-500 ml-2">Table A</span>
      </div>

      <div className="relative flex items-center mb-4">
        <Handle
          type="target"
          position={Position.Left}
          id="input-right"
          className="w-3 h-3 bg-orange-500 !left-[-18px]"
        />
        <span className="text-xs text-slate-500 ml-2">Table B</span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="output-merged"
        className="w-3 h-3 bg-green-500"
      />
      <div className="text-right text-xs text-slate-400 mt-2">
        {leftData && rightData ? 'Ready to join' : 'Waiting for inputs...'}
      </div>
    </div>
  );
};
