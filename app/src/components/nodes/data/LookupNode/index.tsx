import { NodeProps } from 'reactflow';
import { Book } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { LookupNodeData } from '../../types';

export const LookupNode = ({ data, selected }: NodeProps<LookupNodeData>) => {
  const mapSize = Object.keys(data.map || {}).length;

  return (
    <BaseNode
      label={data.label || 'Lookup'}
      description="Map key to value"
      icon={Book}
      color="bg-emerald-600"
      inputs={['in']}
      outputs={['out']}
      selected={selected}
    >
      {data.field ? (
        <div className="space-y-0.5">
          <p className="text-[11px] text-slate-600 truncate">
            Key: <span className="font-semibold text-emerald-700">[{data.field}]</span>
          </p>
          {data.newField && (
            <p className="text-[11px] text-slate-600 truncate">
              Output: <span className="text-emerald-600">[{data.newField}]</span>
            </p>
          )}
          <p className="text-[10px] text-slate-400">{mapSize} mapping{mapSize !== 1 ? 's' : ''}</p>
        </div>
      ) : (
        <p className="text-[10px] text-slate-400 italic text-center py-1">No key column selected</p>
      )}
    </BaseNode>
  );
};
