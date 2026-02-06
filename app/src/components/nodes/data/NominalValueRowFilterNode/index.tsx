import { NodeProps } from 'reactflow';
import { ListChecks } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { NominalValueRowFilterNodeData } from '../../types';

export const NominalValueRowFilterNode = ({ data, selected }: NodeProps<NominalValueRowFilterNodeData>) => {
  const sel = data.selectedValues || [];

  return (
    <BaseNode
      label={data.label || 'Value Row Filter'}
      description="Filter by category values"
      icon={ListChecks}
      color="bg-teal-500"
      inputs={['in']}
      outputs={['out']}
      selected={selected}
    >
      {data.field && sel.length > 0 ? (
        <div className="space-y-0.5">
          <p className="text-[11px] text-slate-600 truncate">
            Column <span className="font-semibold text-teal-700">[{data.field}]</span>
          </p>
          <div className="flex flex-wrap gap-1">
            {sel.slice(0, 3).map((v) => (
              <span key={v} className="px-1.5 py-0.5 bg-teal-50 text-teal-700 text-[10px] rounded border border-teal-100 truncate max-w-[80px]" title={v}>
                {v || '(empty)'}
              </span>
            ))}
            {sel.length > 3 && (
              <span className="px-1.5 py-0.5 bg-slate-50 text-slate-500 text-[10px] rounded border border-slate-100">
                +{sel.length - 3} more
              </span>
            )}
          </div>
        </div>
      ) : (
        <p className="text-[10px] text-slate-400 italic text-center py-1">No values selected</p>
      )}
    </BaseNode>
  );
};
