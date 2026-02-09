import { NodeProps } from 'reactflow';
import { Group } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { GroupByNodeData } from '../../types';

export const GroupByNode = ({ data, selected }: NodeProps<GroupByNodeData>) => {
  const groupBy = data.groupByColumns || [];
  const aggs = data.aggregations || [];

  return (
    <BaseNode
      label={data.label || 'Group By'}
      description="Aggregate grouped data"
      icon={Group}
      color="bg-blue-600"
      inputs={['in']}
      outputs={['out']}
      selected={selected}
    >
      {groupBy.length > 0 || aggs.length > 0 ? (
        <div className="space-y-1">
          {groupBy.length > 0 && (
            <p className="text-[11px] text-slate-600 truncate">
              By: {groupBy.map((c) => `[${c}]`).join(', ')}
            </p>
          )}
          {aggs.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {aggs.slice(0, 3).map((a, i) => (
                <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded border border-blue-100">
                  {a.function.toUpperCase()}({a.column})
                </span>
              ))}
              {aggs.length > 3 && (
                <span className="px-1.5 py-0.5 bg-slate-50 text-slate-500 text-[10px] rounded border border-slate-100">
                  +{aggs.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="text-[10px] text-slate-400 italic text-center py-1">Not configured</p>
      )}
    </BaseNode>
  );
};
