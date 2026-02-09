import { useMemo } from 'react';
import { NodeProps } from 'reactflow';
import { Copy } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { DeduplicateNodeData } from '../../types';

export const DeduplicateNode = ({ data, selected }: NodeProps<DeduplicateNodeData>) => {
  const selectedKeys = useMemo(() => data.keys || [], [data.keys]);

  return (
    <BaseNode
      label={data.label || 'Deduplicate'}
      description="Remove duplicate rows"
      icon={Copy}
      color="bg-amber-500"
      inputs={['in']}
      outputs={['out']}
      selected={selected}
    >
      {selectedKeys.length > 0 ? (
        <div className="space-y-1">
          <p className="text-[11px] text-slate-600">
            Keys: <span className="font-semibold text-amber-700">{selectedKeys.length}</span> column{selectedKeys.length !== 1 ? 's' : ''}
          </p>
          <div className="flex flex-wrap gap-1">
            {selectedKeys.slice(0, 4).map((key) => (
              <span key={key} className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] rounded border border-amber-100 truncate max-w-[80px]" title={key}>
                {key}
              </span>
            ))}
            {selectedKeys.length > 4 && (
              <span className="px-1.5 py-0.5 bg-slate-50 text-slate-500 text-[10px] rounded border border-slate-100">
                +{selectedKeys.length - 4} more
              </span>
            )}
          </div>
        </div>
      ) : (
        <p className="text-[10px] text-slate-400 italic text-center py-1">Using entire row for uniqueness</p>
      )}
    </BaseNode>
  );
};
