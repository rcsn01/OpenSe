import React from 'react';
import { NodeProps } from 'reactflow';
import { Droplet } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { Select, TextInput } from '../../_base/NodeControls';
import { FillMissingNodeData } from '../../types';

export const FillMissingNode = ({ data, selected }: NodeProps<FillMissingNodeData>) => (
  <BaseNode
    label={data.label || 'Fill Missing'}
    description="Handle null / empty values"
    icon={Droplet}
    color="bg-cyan-500"
    inputs={['in']}
    outputs={['out']}
    selected={selected}
  >
    {data.availableFields?.length ? (
      <Select
        value={data.field || ''}
        onChange={(e) => data.setData?.((prev: FillMissingNodeData) => ({ ...prev, field: e.target.value }))}
      >
        <option value="">Select column...</option>
        {data.availableFields.map((f) => <option key={f} value={f}>{f}</option>)}
      </Select>
    ) : (
      <TextInput
        placeholder="Column name"
        value={data.field || ''}
        onChange={(e) => data.setData?.((prev: FillMissingNodeData) => ({ ...prev, field: e.target.value }))}
      />
    )}
    <Select
      value={data.strategy}
      onChange={(e) => data.setData?.((prev: FillMissingNodeData) => ({ ...prev, strategy: e.target.value as FillMissingNodeData['strategy'] }))}
    >
      <option value="static">Static value</option>
      <option value="mean">Mean (numeric)</option>
      <option value="median">Median (numeric)</option>
      <option value="ffill">Forward fill</option>
    </Select>
    {data.strategy === 'static' && (
      <TextInput
        placeholder="Value"
        value={data.value || ''}
        onChange={(e) => data.setData?.((prev: FillMissingNodeData) => ({ ...prev, value: e.target.value }))}
      />
    )}
  </BaseNode>
);
