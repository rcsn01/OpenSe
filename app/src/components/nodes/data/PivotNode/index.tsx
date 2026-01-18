import React from 'react';
import { NodeProps } from 'reactflow';
import { Table } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { Select, TextInput } from '../../_base/NodeControls';
import { PivotNodeData } from '../../types';

const FieldInput = ({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options?: string[]; placeholder: string }) => (
  options?.length ? (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((f) => <option key={f} value={f}>{f}</option>)}
    </Select>
  ) : (
    <TextInput placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
  )
);

export const PivotNode = ({ data, selected }: NodeProps<PivotNodeData>) => (
  <BaseNode
    label={data.label || 'Pivot'}
    description="Rows to columns"
    icon={Table}
    color="bg-emerald-700"
    inputs={['in']}
    outputs={['out']}
    selected={selected}
  >
    <FieldInput
      value={data.indexColumn}
      onChange={(v) => data.setData?.((prev: PivotNodeData) => ({ ...prev, indexColumn: v }))}
      options={data.availableFields}
      placeholder="Index column"
    />
    <FieldInput
      value={data.pivotColumn}
      onChange={(v) => data.setData?.((prev: PivotNodeData) => ({ ...prev, pivotColumn: v }))}
      options={data.availableFields}
      placeholder="Column to pivot"
    />
    <FieldInput
      value={data.valueColumn}
      onChange={(v) => data.setData?.((prev: PivotNodeData) => ({ ...prev, valueColumn: v }))}
      options={data.availableFields}
      placeholder="Value column"
    />
  </BaseNode>
);
