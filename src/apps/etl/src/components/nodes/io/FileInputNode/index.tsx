import React, { useCallback, useState } from 'react';
import { NodeProps } from 'reactflow';
import { FileInput, UploadCloud } from 'lucide-react';
import clsx from 'clsx';
import { BaseNode } from '../../_base/BaseNode';
import { FileNodeData } from '../../types';
import { useWorker } from '../../../../hooks/execution/useWorker';

export const FileInputNode = ({ data, selected }: NodeProps<FileNodeData>) => {
  const { runWorkerTask } = useWorker();
  const [isDragging, setIsDragging] = useState(false);

  // Reusable function to process the file (used by both Drop and Change events)
  const processFile = useCallback(async (file: File) => {
    try {
      const result = await runWorkerTask('PARSE_CSV', { file });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      alert("Failed to parse CSV file.");
    }
  }, [data, runWorkerTask]);

  // Handler for standard file input click
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    const file = event.target.files?.[0];
    if (file) {
        await processFile(file);
    }
    // Reset value so the same file can be selected again if needed
    event.target.value = '';
  }, [processFile]);

  // Drag Event Handlers
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback(async (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        await processFile(file);
      } else {
        alert("Please upload a valid CSV file.");
      }
    }
  }, [processFile]);

  // Prevent React Flow from panning when clicking inside the node
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
      {/* Drop Zone Area */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={clsx(
          "relative flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg transition-all duration-200",
          isDragging 
            ? "border-blue-500 bg-blue-50" 
            : "border-slate-300 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-400"
        )}
      >
        {/* Invisible File Input covering the area */}
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          title="" // Hides default tooltip
          onClick={(e) => e.stopPropagation()} 
        />
        
        {/* Visual Content */}
        <div className="flex flex-col items-center text-center text-slate-500 pointer-events-none">
          <UploadCloud className={clsx("w-6 h-6 mb-1 transition-colors", isDragging ? "text-blue-600" : "text-slate-400")} />
          <span className="text-[10px] font-medium text-slate-600">
            {isDragging ? "Drop CSV file here" : "Click or drag CSV"}
          </span>
        </div>
      </div>

      {/* File Details */}
      <div className="text-xs text-slate-600 space-y-1 mt-2 border-t border-slate-100 pt-2">
        <div className="flex justify-between">
            <span className="text-slate-400">Rows:</span>
            <span className="font-medium">{data.count || data.rows?.length || 0}</span>
        </div>
        <div className="flex justify-between">
            <span className="text-slate-400">Columns:</span>
            <span className="font-medium">{data.schema?.length || (data.rows?.[0] ? Object.keys(data.rows[0]).length : 0)}</span>
        </div>
        <p className="truncate text-[10px] text-slate-500 pt-1" title={data.fileName || ''}>
            {data.fileName ? `📄 ${data.fileName}` : 'No file selected'}
        </p>
      </div>
    </BaseNode>
  );
};