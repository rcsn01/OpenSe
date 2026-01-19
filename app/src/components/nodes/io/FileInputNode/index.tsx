import React, { useCallback } from 'react';
import { NodeProps } from 'reactflow';
import { FileInput } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { FileNodeData } from '../../types';
import { useWorker } from '../../../../hooks/useWorker';

export const FileInputNode = ({ data, selected }: NodeProps<FileNodeData>) => {
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
    <BaseNode
      label={data.label || 'File Input'}
      description="Upload a CSV file"
      icon={FileInput}
      color="bg-blue-500"
      inputs={[]}
      outputs={['out']}
      selected={selected}
      wrapperProps={{ onMouseDown: stopPropagation, onClick: stopPropagation }}
    >
      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        onClick={stopPropagation}
        onMouseDown={stopPropagation}
        className="w-full text-xs text-transparent file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border file:border-slate-200 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      <div className="text-xs text-slate-600 space-y-1">
        <p>Rows: {data.count || data.rows?.length || 0}</p>
        <p>Columns: {data.schema?.length || (data.rows?.[0] ? Object.keys(data.rows[0]).length : 0)}</p>
        <p className="truncate" title={data.fileName || ''}>File: {data.fileName || '—'}</p>
      </div>
    </BaseNode>
  );
};