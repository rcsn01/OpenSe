import React from 'react';
import { NodeProps } from 'reactflow';
import { Info } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { PreviewNodeData } from '../../types';

export const FilePreviewNode = ({ data, selected }: NodeProps<PreviewNodeData>) => {
  const rows = data.previewRows || [];
  const first = rows.slice(0, 10);
  const headers = first[0] ? Object.keys(first[0]) : [];
  const wrapperProps = {
    onMouseDown: (event: React.SyntheticEvent) => event.stopPropagation(),
    onClick: (event: React.SyntheticEvent) => event.stopPropagation(),
  };

  return (
    <BaseNode
      label={data.label || 'Preview'}
      description="Shows first 10 rows"
      icon={Info}
      color="bg-teal-500"
      inputs={['in']}
      outputs={['out']}
      selected={selected}
      className="w-72"
      wrapperProps={wrapperProps}
    >
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
    </BaseNode>
  );
};
