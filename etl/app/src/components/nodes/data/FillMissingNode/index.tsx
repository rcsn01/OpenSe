import { NodeProps } from 'reactflow';
import { Droplet } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { FillMissingNodeData } from '../../types';

const strategyLabels: Record<string, string> = {
  static: 'Static value',
  mean: 'Mean',
  median: 'Median',
  ffill: 'Forward fill',
};

export const FillMissingNode = ({ data, selected }: NodeProps<FillMissingNodeData>) => {
  return (
    <BaseNode
      label={data.label || 'Fill Missing'}
      description="Handle null / empty values"
      icon={Droplet}
      color="bg-cyan-500"
      inputs={['in']}
      outputs={['out']}
      selected={selected}
    >
      {data.field ? (
        <div className="space-y-0.5">
          <p className="text-[11px] text-slate-600 truncate">
            Column <span className="font-semibold text-cyan-700">[{data.field}]</span>
          </p>
          <p className="text-[11px] text-slate-600 truncate">
            Strategy: <span className="text-cyan-600">{strategyLabels[data.strategy] || data.strategy}</span>
            {data.strategy === 'static' && data.value && (
              <span className="font-mono text-slate-500"> = "{data.value}"</span>
            )}
          </p>
        </div>
      ) : (
        <p className="text-[10px] text-slate-400 italic text-center py-1">No column selected</p>
      )}
    </BaseNode>
  );
};
