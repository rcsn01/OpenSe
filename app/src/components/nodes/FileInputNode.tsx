import React, { useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import { FileInput } from 'lucide-react';
import { FileNodeData, Row } from './types';
import { useWorker } from '../../hooks/useWorker';

export const FileInputNode = ({ data }: { data: FileNodeData }) => {
  const { runWorkerTask } = useWorker();

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await runWorkerTask('PARSE_CSV', { file });
      const { datasetId, schema, count, chunkCount, preview } = result as any;
      data.setData?.((prev: FileNodeData) => ({
        ...prev,
        datasetId,
        schema,
        fileName: file.name,
        count,
        chunkCount,
        rows: preview,
      }));
    } catch (err) {
      console.error('CSV parse failed', err);
    } finally {
      event.target.value = '';
    }
  }, [data, runWorkerTask]);

  const stopPropagation = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 w-64" onMouseDown={stopPropagation} onClick={stopPropagation}>
      <Handle type="source" position={Position.Right} id="out" className="!bg-blue-500" />
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 rounded-md bg-blue-100 text-blue-700"><FileInput className="w-4 h-4" /></div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{data.label}</p>
          <p className="text-xs text-slate-500">Upload a CSV file</p>
        </div>
      </div>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        onClick={stopPropagation}
        onMouseDown={stopPropagation}
        className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border file:border-slate-200 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      <div className="mt-2 text-xs text-slate-600 space-y-1">
        <p>Rows: {data.count || data.rows?.length || 0}</p>
        <p>Columns: {data.schema?.length || (data.rows?.[0] ? Object.keys(data.rows[0]).length : 0)}</p>
        <p className="truncate" title={data.fileName || ''}>File: {data.fileName || '—'}</p>
      </div>
    </div>
  );
};
