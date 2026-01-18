import React from 'react';
import { NodeProps } from 'reactflow';
import { Search } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { Checkbox, Select, TextInput } from '../../_base/NodeControls';
import { FindReplaceNodeData } from '../../types';

export const FindReplaceNode = ({ data, selected }: NodeProps<FindReplaceNodeData>) => (
  <BaseNode
    label={data.label || 'Find & Replace'}
    description="Replace text in a column"
    icon={Search}
    color="bg-pink-500"
    inputs={['in']}
    outputs={['out']}
    selected={selected}
  >
    {data.availableFields?.length ? (
      <Select
        value={data.field || ''}
        onChange={(e) => data.setData?.((prev: FindReplaceNodeData) => ({ ...prev, field: e.target.value }))}
      >
        <option value="">Select column...</option>
        {data.availableFields.map((f) => <option key={f} value={f}>{f}</option>)}
      </Select>
    ) : (
      <TextInput
        placeholder="Column name"
        value={data.field || ''}
        onChange={(e) => data.setData?.((prev: FindReplaceNodeData) => ({ ...prev, field: e.target.value }))}
      />
    )}
    <TextInput
      placeholder="Find"
      value={data.search}
      onChange={(e) => data.setData?.((prev: FindReplaceNodeData) => ({ ...prev, search: e.target.value }))}
    />
    <TextInput
      placeholder="Replace"
      value={data.replace}
      onChange={(e) => data.setData?.((prev: FindReplaceNodeData) => ({ ...prev, replace: e.target.value }))}
    />
    <Checkbox
      label="Case sensitive"
      checked={!!data.caseSensitive}
      onChange={(e) => data.setData?.((prev: FindReplaceNodeData) => ({ ...prev, caseSensitive: e.target.checked }))}
    />
  </BaseNode>
);
