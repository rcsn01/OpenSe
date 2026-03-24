import { NodeProps } from 'reactflow';
import { Edit3, ArrowRight } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { RenameNodeData } from '../../types';

export const RenameNode = ({ data, selected }: NodeProps<RenameNodeData>) => {
  const mappings = data.mappings || [];

  return (
    <BaseNode
      label={data.label || 'Rename Columns'}
      description={`${mappings.length} mapping(s)`}
      icon={Edit3}
      color="bg-yellow-600"
      inputs={['in']}
      outputs={['out']}
      selected={selected}
      className="w-64"
    >
      <div className="space-y-1">
        {mappings.length > 0 ? (
          mappings.slice(0, 3).map((m, idx) => (
            <div key={idx} className="flex items-center text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-100">
              <span className="type-mono text-[10px] truncate max-w-[80px]" title={m.oldColumn}>{m.oldColumn || '?'}</span>
              <ArrowRight className="w-3 h-3 mx-1 text-slate-400 shrink-0" />
              <span className="font-semibold truncate max-w-[80px]" title={m.newColumn}>{m.newColumn || '?'}</span>
            </div>
          ))
        ) : (
          <div className="text-xs text-slate-400 italic px-2 py-4 text-center border border-dashed border-slate-200 rounded">
            No mappings configured
          </div>
        )}
        {mappings.length > 3 && (
          <div className="text-[10px] text-slate-400 text-center pt-1 italic">
            + {mappings.length - 3} more...
          </div>
        )}
      </div>
    </BaseNode>
  );
};
