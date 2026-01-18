import React from 'react';
import { NodeProps } from 'reactflow';
import { ArrowDownUp } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { Select, TextInput } from '../../_base/NodeControls';
import { SortNodeData } from '../../types';

export const SortNode = ({ data, selected }: NodeProps<SortNodeData>) => (
  <BaseNode
    label={data.label || 'Sort'}
    description="Order rows by a column"
    icon={ArrowDownUp}
    color="bg-indigo-600"
    inputs={['in']}
    outputs={['out']}
    selected={selected}
  >
    {data.availableFields?.length ? (
      <Select
        value={data.field || ''}
        onChange={(e) => data.setData?.((prev: SortNodeData) => ({ ...prev, field: e.target.value }))}
      >
        <option value="">Select column...</option>
        {data.availableFields.map((f) => <option key={f} value={f}>{f}</option>)}
      </Select>
    ) : (
      <TextInput
        placeholder="Column name"
        value={data.field || ''}
        onChange={(e) => data.setData?.((prev: SortNodeData) => ({ ...prev, field: e.target.value }))}
      />
    )}
    <Select
      value={data.direction}
      onChange={(e) => data.setData?.((prev: SortNodeData) => ({ ...prev, direction: e.target.value as SortNodeData['direction'] }))}
    >
      <option value="asc">Ascending</option>
      <option value="desc">Descending</option>
    </Select>
  </BaseNode>
);
