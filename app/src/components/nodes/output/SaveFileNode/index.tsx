import React from 'react';
import { NodeProps } from 'reactflow';
import { Save as SaveIcon } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { SaveNodeData } from '../../types';

export const SaveFileNode = ({ data, selected }: NodeProps<SaveNodeData>) => (
  <BaseNode
    label={data.label || 'Save CSV'}
    description="Final output"
    icon={SaveIcon}
    color="bg-green-500"
    inputs={['in']}
    outputs={[]}
    selected={selected}
    contentClassName="space-y-1"
  >
    <div className="text-xs text-slate-600 space-y-1">
      <p>Rows saved: {data.lastSavedCsv ? 'Updated' : '—'}</p>
      {data.lastSavedCsv && <p className="truncate" title={data.lastSavedCsv}>CSV ready</p>}
    </div>
  </BaseNode>
);
