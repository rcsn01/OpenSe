import React from 'react';
import { NodeProps } from 'reactflow';
import { Filter } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { Select, TextInput } from '../../_base/NodeControls';
import { FilterNodeData } from '../../types';

export const FilterNode = ({ data, selected }: NodeProps<FilterNodeData>) => (
  <BaseNode
    label={data.label || 'Filter Rows'}
    description="Keep rows matching"
    icon={Filter}
    color="bg-indigo-500"
    inputs={['in']}
    outputs={['out']}
    selected={selected}
  >
    {data.availableFields?.length ? (
      <Select
        value={data.field}
        onChange={(e) => data.setData?.((prev: FilterNodeData) => ({ ...prev, field: e.target.value }))}
      >
        <option value="">Select column...</option>
        {data.availableFields.map((field) => (
          <option key={field} value={field}>{field}</option>
        ))}
      </Select>
    ) : (
      <TextInput
        placeholder="Field (e.g. country)"
        value={data.field}
        onChange={(e) => data.setData?.((prev: FilterNodeData) => ({ ...prev, field: e.target.value }))}
      />
    )}
    <Select
      value={data.operator}
      onChange={(e) => data.setData?.((prev: FilterNodeData) => ({ ...prev, operator: e.target.value as FilterNodeData['operator'] }))}
    >
      <option value="equals">equals</option>
      <option value="contains">contains</option>
    </Select>
    <TextInput
      placeholder="Value"
      value={data.value}
      onChange={(e) => data.setData?.((prev: FilterNodeData) => ({ ...prev, value: e.target.value }))}
    />
  </BaseNode>
);
