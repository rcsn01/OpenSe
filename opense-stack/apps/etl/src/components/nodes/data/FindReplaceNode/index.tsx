import { NodeProps } from 'reactflow';
import { Search } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { FindReplaceNodeData } from '../../types';

export const FindReplaceNode = ({ data, selected }: NodeProps<FindReplaceNodeData>) => {
  return (
    <BaseNode
      label={data.label || 'Find & Replace'}
      description="Replace text in a column"
      icon={Search}
      color="bg-pink-500"
      inputs={['in']}
      outputs={['out']}
      selected={selected}
    >
      {data.field && data.search ? (
        <div className="space-y-0.5">
          <p className="text-[11px] text-slate-600 truncate">
            In <span className="font-semibold text-pink-700">[{data.field}]</span>
          </p>
          <p className="text-[11px] text-slate-600 truncate">
            <span className="type-mono text-red-500">"{data.search}"</span>
            {' → '}
            <span className="type-mono text-green-600">"{data.replace}"</span>
          </p>
          {data.caseSensitive && (
            <span className="text-[9px] text-slate-400 uppercase tracking-wider">Case sensitive</span>
          )}
        </div>
      ) : (
        <p className="text-[10px] text-slate-400 italic text-center py-1">No replacement configured</p>
      )}
    </BaseNode>
  );
};
