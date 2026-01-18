import React from 'react';
import { NodeProps } from 'reactflow';
import { GitBranch } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { Select, TextInput } from '../../_base/NodeControls';
import { ConditionalRouterNodeData } from '../../types';

export const ConditionalRouterNode = ({ data, selected }: NodeProps<ConditionalRouterNodeData>) => (
  <BaseNode
    label={data.label || 'Conditional Router'}
    description="Send rows to Yes/No"
    icon={GitBranch}
    color="bg-rose-500"
    inputs={['in']}
    outputs={['out-yes', 'out-no']}
    selected={selected}
  >
    {data.availableFields?.length ? (
      <Select
        value={data.field || ''}
        onChange={(e) => data.setData?.((prev: ConditionalRouterNodeData) => ({ ...prev, field: e.target.value }))}
      >
        <option value="">Select column...</option>
        {data.availableFields.map((f) => <option key={f} value={f}>{f}</option>)}
      </Select>
    ) : (
      <TextInput
        placeholder="Column name"
        value={data.field || ''}
        onChange={(e) => data.setData?.((prev: ConditionalRouterNodeData) => ({ ...prev, field: e.target.value }))}
      />
    )}
    <Select
      value={data.operator}
      onChange={(e) => data.setData?.((prev: ConditionalRouterNodeData) => ({ ...prev, operator: e.target.value as ConditionalRouterNodeData['operator'] }))}
    >
      <option value="equals">equals</option>
      <option value="contains">contains</option>
    </Select>
    <TextInput
      placeholder="Value"
      value={data.value}
      onChange={(e) => data.setData?.((prev: ConditionalRouterNodeData) => ({ ...prev, value: e.target.value }))}
    />
  </BaseNode>
);
