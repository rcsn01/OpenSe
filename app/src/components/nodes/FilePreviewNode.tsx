import React from 'react';
import { Handle, Position } from 'reactflow';
import { Info } from 'lucide-react';
import { PreviewNodeData } from './types';

export const FilePreviewNode = ({ data }: { data: PreviewNodeData }) => {
  const stopPropagation = (event: React.SyntheticEvent) => event.stopPropagation();
  const rows = data.previewRows || [];
  const first = rows.slice(0, 10);
  const headers = first[0] ? Object.keys(first[0]) : [];

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 w-72" onMouseDown={stopPropagation} onClick={stopPropagation}>
      <Handle type="target" position={Position.Left} id="in" className="!bg-slate-400" />
      <Handle type="source" position={Position.Right} id="out" className="!bg-teal-500" />
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 rounded-md bg-teal-100 text-teal-700"><Info className="w-4 h-4" /></div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{data.label || 'Preview'}</p>
          <p className="text-xs text-slate-500">Shows first 10 rows</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-500">No data yet. Connect a source and run.</p>
      ) : (
        <div className="max-h-48 overflow-auto border border-slate-200 rounded">
          <table className="min-w-full text-[11px] text-left text-slate-700">
            <thead className="bg-slate-100 sticky top-0">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="px-2 py-1 font-semibold border-b border-slate-200">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {first.map((row, idx) => (
                <tr key={idx} className="even:bg-slate-50">
                  {headers.map((h) => (
                    <td key={h} className="px-2 py-1 border-b border-slate-100 truncate max-w-[120px]" title={String(row[h])}>{String(row[h])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
