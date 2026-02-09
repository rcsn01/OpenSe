import { NodeProps } from 'reactflow';
import { GitBranch } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { ConditionalRouterNodeData } from '../../types';

export const ConditionalRouterNode = ({ data, selected }: NodeProps<ConditionalRouterNodeData>) => {
  return (
    <BaseNode
      label={data.label || 'Conditional Router'}
      description="Send rows to Yes/No"
      icon={GitBranch}
      color="bg-rose-500"
      inputs={['in']}
      outputs={['out-yes', 'out-no']}
      selected={selected}
    >
      {data.field ? (
        <p className="text-[11px] text-slate-600 truncate">
          If <span className="font-semibold text-rose-700">[{data.field}]</span>{' '}
          <span className="text-rose-500">{data.operator}</span>{' '}
          <span className="font-mono text-slate-700">"{data.value}"</span>
        </p>
      ) : (
        <p className="text-[10px] text-slate-400 italic text-center py-1">No condition set</p>
      )}
    </BaseNode>
  );
};
