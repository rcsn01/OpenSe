import { useMemo } from 'react';
import { NodeProps } from 'reactflow';
import { Scissors } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { RemoveNodeData } from '../../types';

export const FilterColumn = ({ data, selected }: NodeProps<RemoveNodeData>) => {
  const selectedFields = useMemo(() => data.selectedFields || (data.field ? [data.field] : []), [data.selectedFields, data.field]);

  return (
    <BaseNode
      label={data.label || 'Filter Columns'}
      description={`${selectedFields.length} columns kept`}
      icon={Scissors}
      color="bg-orange-500"
      inputs={['in']}
      outputs={['out']}
      selected={selected}
      className="w-64"
    >
      <div className="space-y-1">
        {selectedFields.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {selectedFields.slice(0, 5).map((field) => (
              <span key={field} className="px-1.5 py-0.5 bg-orange-50 text-orange-700 text-[10px] rounded border border-orange-100 truncate max-w-[100px]" title={field}>
                {field}
              </span>
            ))}
            {selectedFields.length > 5 && (
              <span className="px-1.5 py-0.5 bg-slate-50 text-slate-500 text-[10px] rounded border border-slate-100">
                +{selectedFields.length - 5} more
              </span>
            )}
          </div>
        ) : (
          <p className="text-[10px] text-slate-400 italic text-center py-2">
            No columns selected (keeping all or none)
          </p>
        )}
      </div>
    </BaseNode>
  );
};
