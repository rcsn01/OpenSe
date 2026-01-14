import React, { useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { useWorkflowData } from '../../context/WorkflowContext';
import { useWorker } from '../../hooks/useWorker';

export const FileLoaderNode = ({ id, data }: NodeProps) => {
  const { updateNodeData } = useWorkflowData();
  const { runWorkerTask } = useWorker();

  const stopPropagation = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const rows = await runWorkerTask('PARSE_CSV', { file });
      updateNodeData(id, 'out', rows as any[]);
      if (typeof data === 'object' && data && 'setData' in data && typeof (data as any).setData === 'function') {
        (data as any).setData((prev: any) => ({ ...prev, fileName: file.name }));
      }
    } catch (err) {
      console.error('CSV parse failed', err);
    } finally {
      event.target.value = '';
    }
  }, [data, id, runWorkerTask, updateNodeData]);

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-md w-64" onMouseDown={stopPropagation} onClick={stopPropagation}>
      <div className="font-bold text-sm mb-2 text-gray-700">📄 CSV Loader</div>
      <input 
        type="file" 
        accept=".csv" 
        onChange={handleFileUpload} 
        onClick={stopPropagation}
        onMouseDown={stopPropagation}
        className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      <div className="text-xs text-gray-400 mt-2">
        {data.fileName ? `Loaded: ${data.fileName}` : "No file loaded"}
      </div>
      
      {/* Output Handle only - Source of data */}
      <Handle id="out" type="source" position={Position.Right} className="w-3 h-3 bg-blue-500" />
    </div>
  );
};
