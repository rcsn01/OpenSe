import React from 'react';
import { NodeProps } from 'reactflow';
import { Type as TypeIcon } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { Select, TextInput } from '../../_base/NodeControls';
import { TypeCasterNodeData } from '../../types';

export const TypeCasterNode = ({ data, selected }: NodeProps<TypeCasterNodeData>) => (
  <BaseNode
    label={data.label || 'Type Caster'}
    description="Force column type"
    icon={TypeIcon}
    color="bg-fuchsia-500"
    inputs={['in']}
    outputs={['out']}
    selected={selected}
  >
    {data.availableFields?.length ? (
      <Select
        value={data.field || ''}
        onChange={(e) => data.setData?.((prev: TypeCasterNodeData) => ({ ...prev, field: e.target.value }))}
      >
        <option value="">Select column...</option>
        {data.availableFields.map((f) => <option key={f} value={f}>{f}</option>)}
      </Select>
    ) : (
      <TextInput
        placeholder="Column name"
        value={data.field || ''}
        onChange={(e) => data.setData?.((prev: TypeCasterNodeData) => ({ ...prev, field: e.target.value }))}
      />
    )}
    <Select
      value={data.targetType}
      onChange={(e) => data.setData?.((prev: TypeCasterNodeData) => ({ ...prev, targetType: e.target.value as TypeCasterNodeData['targetType'] }))}
    >
      <option value="string">String</option>
      <option value="number">Number</option>
      <option value="boolean">Boolean</option>
      <option value="date">Date</option>
    </Select>
  </BaseNode>
);
