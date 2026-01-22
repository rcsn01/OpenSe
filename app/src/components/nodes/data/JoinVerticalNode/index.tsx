import React from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { Layers } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';

export const JoinVerticalNode = ({ selected }: NodeProps) => (
  <BaseNode
    label="Stack Tables"
    description="Append rows"
    icon={Layers}
    color="bg-emerald-700"
    selected={selected}
    inputs={[]} // Disable automatic inputs to prevent overlap
    outputs={['output-stacked']}
    className="w-64"
    contentClassName="space-y-4"
  >
    {/* Input 1: Top */}
    <div className="relative flex items-center">
      <Handle
        type="target"
        position={Position.Left}
        id="input-top"
        className="!w-4 !h-4 !bg-slate-400 !border-2 !border-white transition-transform hover:scale-110 !relative !left-[-20px]"
      />
      <div className="ml-[-12px] flex flex-col">
        <span className="text-xs font-semibold text-slate-700">Top Table</span>
        <span className="text-[10px] text-slate-400">First dataset</span>
      </div>
    </div>

    {/* Input 2: Bottom */}
    <div className="relative flex items-center">
      <Handle
        type="target"
        position={Position.Left}
        id="input-bottom"
        className="!w-4 !h-4 !bg-slate-400 !border-2 !border-white transition-transform hover:scale-110 !relative !left-[-20px]"
      />
      <div className="ml-[-12px] flex flex-col">
        <span className="text-xs font-semibold text-slate-700">Bottom Table</span>
        <span className="text-[10px] text-slate-400">Appended dataset</span>
      </div>
    </div>

    {/* Footer Info */}
    <div className="pt-2 border-t border-slate-100">
      <p className="text-[10px] text-slate-400 leading-snug">
        Columns not matching the top table will be empty.
      </p>
    </div>
  </BaseNode>
);