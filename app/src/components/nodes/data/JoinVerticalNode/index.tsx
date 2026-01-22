import React from 'react';
import { NodeProps } from 'reactflow';
import { Layers } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';

export const JoinVerticalNode = ({ selected }: NodeProps) => (
  <BaseNode
    label="Stack Tables"
    description="Append rows by column name"
    icon={Layers}
    color="bg-emerald-700"
    selected={selected}
    inputs={[
      { id: 'input-top', label: 'Top' },
      { id: 'input-bottom', label: 'Bottom' },
    ]}
    outputs={['output-stacked']}
    className="max-w-[16rem]"
    contentClassName="text-xs text-slate-600"
  >
    <div className="text-xs text-slate-400">
      Rows are appended; missing columns are left blank.
    </div>
  </BaseNode>
);
