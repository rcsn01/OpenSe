import React from 'react';
import { NodeProps } from 'reactflow';
import { Edit3 } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { Select, TextInput } from '../../_base/NodeControls';
import { RenameColumnNodeData } from '../../types';

export const RenameColumnNode = ({ data, selected }: NodeProps<RenameColumnNodeData>) => (
  <BaseNode
    label={data.label || 'Rename Column'}
    description="Map a column to a new name"
    icon={Edit3}
    color="bg-yellow-500"
    inputs={['in']}
    outputs={['out']}
    selected={selected}
  >
    {data.availableFields?.length ? (
      <Select
        value={data.field || ''}
        onChange={(e) => data.setData?.((prev: RenameColumnNodeData) => ({ ...prev, field: e.target.value }))}
      >
        <option value="">Select column...</option>
        {data.availableFields.map((f) => <option key={f} value={f}>{f}</option>)}
      </Select>
    ) : (
      <TextInput
        placeholder="Column name"
        value={data.field || ''}
        onChange={(e) => data.setData?.((prev: RenameColumnNodeData) => ({ ...prev, field: e.target.value }))}
      />
    )}
    <TextInput
      placeholder="New name"
      value={data.newName}
      onChange={(e) => data.setData?.((prev: RenameColumnNodeData) => ({ ...prev, newName: e.target.value }))}
    />
  </BaseNode>
);
