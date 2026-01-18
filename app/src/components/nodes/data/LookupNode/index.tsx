import React from 'react';
import { NodeProps } from 'reactflow';
import { Book } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { Select, TextArea, TextInput } from '../../_base/NodeControls';
import { LookupNodeData } from '../../types';

const parseMap = (text: string) => {
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj as Record<string, string>;
  } catch (_) {
    return undefined;
  }
  return undefined;
};

export const LookupNode = ({ data, selected }: NodeProps<LookupNodeData>) => {
  const mapText = JSON.stringify(data.map || {}, null, 0);

  return (
    <BaseNode
      label={data.label || 'Lookup'}
      description="Map key to value"
      icon={Book}
      color="bg-emerald-600"
      inputs={['in']}
      outputs={['out']}
      selected={selected}
    >
      {data.availableFields?.length ? (
        <Select
          value={data.field || ''}
          onChange={(e) => data.setData?.((prev: LookupNodeData) => ({ ...prev, field: e.target.value }))}
        >
          <option value="">Select key column...</option>
          {data.availableFields.map((f) => <option key={f} value={f}>{f}</option>)}
        </Select>
      ) : (
        <TextInput
          placeholder="Key column"
          value={data.field || ''}
          onChange={(e) => data.setData?.((prev: LookupNodeData) => ({ ...prev, field: e.target.value }))}
        />
      )}
      <TextInput
        placeholder="New field name (optional)"
        value={data.newField || ''}
        onChange={(e) => data.setData?.((prev: LookupNodeData) => ({ ...prev, newField: e.target.value }))}
      />
      <TextArea
        className="h-24"
        placeholder='Lookup map JSON, e.g. {"US":"United States"}'
        value={mapText}
        onChange={(e) => data.setData?.((prev: LookupNodeData) => ({ ...prev, map: parseMap(e.target.value) || prev.map || {} }))}
      />
    </BaseNode>
  );
};
