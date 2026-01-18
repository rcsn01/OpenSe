import React, { useMemo, useState } from 'react';
import { NodeProps, NodeResizer } from 'reactflow';
import { Info } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { PreviewNodeData } from '../../types';

export const FilePreviewNode = ({ data, selected }: NodeProps<PreviewNodeData>) => {
  const [limit, setLimit] = useState<number | 'all'>(10);
  const rows = data.previewRows || [];

  const displayRows = useMemo(() => (limit === 'all' ? rows : rows.slice(0, limit)), [rows, limit]);
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  const wrapperProps = {
    onMouseDown: (event: React.SyntheticEvent) => event.stopPropagation(),
    onClick: (event: React.SyntheticEvent) => event.stopPropagation(),
  };

  return (
    <>
      <NodeResizer
        minWidth={288}
        minHeight={200}
        isVisible={selected}
        lineClassName="border-blue-500"
        handleClassName="h-3 w-3 bg-blue-500 rounded border-none"
      />
      <BaseNode
        label={data.label || 'Preview'}
        description={`Showing ${displayRows.length} of ${rows.length} rows`}
        icon={Info}
        color="bg-teal-500"
        inputs={['in']}
        outputs={['out']}
        selected={selected}
        className="!w-full !h-full flex flex-col min-w-[18rem]"
        contentClassName="flex-1 flex flex-col overflow-hidden !p-0"
        wrapperProps={wrapperProps}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/50 text-xs">
          <span className="text-slate-500">Show rows:</span>
          <select
            className="ml-2 rounded border border-slate-300 py-0.5 pl-2 pr-6 text-xs bg-white focus:ring-1 focus:ring-blue-500"
            value={limit}
            onChange={(e) => setLimit(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value="all">All</option>
          </select>
        </div>

        {rows.length === 0 ? (
          <div className="p-3 text-xs text-slate-500">No data yet. Connect a source and run.</div>
        ) : (
          <div className="flex-1 overflow-auto bg-white">
            <table className="min-w-full text-[11px] text-left text-slate-700 relative border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-2 py-1.5 font-semibold border-b border-slate-200 bg-slate-50 w-12 text-center text-slate-400">#</th>
                  {headers.map((h) => (
                    <th key={h} className="px-2 py-1.5 font-semibold border-b border-slate-200 whitespace-nowrap bg-slate-50 max-w-[200px] truncate" title={h}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-2 py-1 border-r border-slate-100 text-center text-slate-400 bg-slate-50/30">{idx + 1}</td>
                    {headers.map((h) => (
                      <td key={h} className="px-2 py-1 truncate max-w-[200px]" title={String(row[h] ?? '')}>
                        {row[h] === null ? <span className="text-slate-300 italic">null</span> : String(row[h])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </BaseNode>
    </>
  );
};
