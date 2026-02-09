import { NodeProps } from 'reactflow';
import { Code2 } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { CodeNodeData } from '../../types';

export const CodeNode = ({ data, selected }: NodeProps<CodeNodeData>) => {
  const lineCount = (data.code || '').split('\n').length;

  return (
    <BaseNode
      label={data.label || 'Code'}
      description="Custom JavaScript"
      icon={Code2}
      color="bg-violet-500"
      inputs={['in']}
      outputs={['out']}
      selected={selected}
    >
      {data.code ? (
        <p className="text-[11px] text-slate-600 truncate">
          <span className="font-mono text-violet-600">{lineCount} lines</span>
          {' · '}
          <span className="text-slate-500">{data.language}</span>
        </p>
      ) : (
        <p className="text-[10px] text-slate-400 italic text-center py-1">No code written</p>
      )}
    </BaseNode>
  );
};
