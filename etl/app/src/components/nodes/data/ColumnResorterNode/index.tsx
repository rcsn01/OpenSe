import { NodeProps } from 'reactflow';
import { ArrowUpDown } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { ColumnResorterNodeData } from '../../types';

export const ColumnResorterNode = ({ data, selected }: NodeProps<ColumnResorterNodeData>) => {
  const order = data.columnOrder || [];

  return (
    <BaseNode
      label={data.label || 'Column Resorter'}
      description="Reorder columns"
      icon={ArrowUpDown}
      color="bg-violet-500"
      inputs={['in']}
      outputs={['out']}
      selected={selected}
    >
      {order.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {order.slice(0, 4).map((col, idx) => (
            <span key={col} className="px-1.5 py-0.5 bg-violet-50 text-violet-700 text-[10px] rounded border border-violet-100 truncate max-w-[80px]" title={col}>
              {idx + 1}. {col}
            </span>
          ))}
          {order.length > 4 && (
            <span className="px-1.5 py-0.5 bg-slate-50 text-slate-500 text-[10px] rounded border border-slate-100">
              +{order.length - 4} more
            </span>
          )}
        </div>
      ) : (
        <p className="text-[10px] text-slate-400 italic text-center py-1">No order defined</p>
      )}
    </BaseNode>
  );
};
