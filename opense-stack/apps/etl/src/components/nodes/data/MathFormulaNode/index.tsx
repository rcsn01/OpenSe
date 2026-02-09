import { NodeProps } from 'reactflow';
import { Calculator } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { MathFormulaNodeData } from '../../types';

export const MathFormulaNode = ({ data, selected }: NodeProps<MathFormulaNodeData>) => {
  return (
    <BaseNode
      label={data.label || 'Math Formula'}
      description="Compute a new column"
      icon={Calculator}
      color="bg-orange-600"
      inputs={['in']}
      outputs={['out']}
      selected={selected}
    >
      {data.expression ? (
        <div className="space-y-0.5">
          <p className="text-[11px] text-slate-600 font-mono truncate" title={data.expression}>
            {data.expression}
          </p>
          {data.newColumn && (
            <p className="text-[10px] text-slate-400">
              → <span className="font-semibold text-orange-600">[{data.newColumn}]</span>
            </p>
          )}
        </div>
      ) : (
        <p className="text-[10px] text-slate-400 italic text-center py-1">No formula defined</p>
      )}
    </BaseNode>
  );
};
