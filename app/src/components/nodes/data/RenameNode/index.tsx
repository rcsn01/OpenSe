import React from 'react';
import { NodeProps } from 'reactflow';
import { Edit3, Plus, X } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { Select, TextInput } from '../../_base/NodeControls';
import { RenameNodeData } from '../../types';

export const RenameNode = ({ data, selected }: NodeProps<RenameNodeData>) => {
  const mappings = data.mappings || [];
  const available = data.availableFields || [];

  const updateMapping = (idx: number, key: 'oldColumn' | 'newColumn', value: string) => {
    data.setData?.((prev: RenameNodeData) => {
      const next = [...(prev.mappings || [])];
      next[idx] = { ...next[idx], [key]: value };
      return { ...prev, mappings: next };
    });
  };

  const addMapping = () => {
    data.setData?.((prev: RenameNodeData) => ({ ...prev, mappings: [...(prev.mappings || []), { oldColumn: '', newColumn: '' }] }));
  };

  const removeMapping = (idx: number) => {
    data.setData?.((prev: RenameNodeData) => {
      const next = [...(prev.mappings || [])];
      next.splice(idx, 1);
      return { ...prev, mappings: next };
    });
  };

  const renderSelect = (value: string, onChange: (v: string) => void, placeholder: string) => (
    available.length ? (
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {available.map((f) => <option key={f} value={f}>{f}</option>)}
      </Select>
    ) : (
      <TextInput
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  );

  return (
    <BaseNode
      label={data.label || 'Rename Columns'}
      description="Add rename pairs"
      icon={Edit3}
      color="bg-yellow-600"
      inputs={['in']}
      outputs={['out']}
      selected={selected}
      className="w-72"
    >
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>{mappings.length} mapping(s)</span>
        <button type="button" className="flex items-center gap-1 text-blue-600" onClick={addMapping}>
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>
      <div className="max-h-40 overflow-y-auto space-y-2 pr-1" onWheel={(e) => e.stopPropagation()}>
        {mappings.map((m, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="flex-1 space-y-1">
              {renderSelect(m.oldColumn, (v) => updateMapping(idx, 'oldColumn', v), 'Old name')}
              <TextInput
                placeholder="New name"
                value={m.newColumn}
                onChange={(e) => updateMapping(idx, 'newColumn', e.target.value)}
              />
            </div>
            <button type="button" className="p-1 text-slate-400 hover:text-slate-600" onClick={() => removeMapping(idx)}>
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {mappings.length === 0 && (
          <p className="text-[11px] text-slate-500">Add a mapping to begin.</p>
        )}
      </div>
    </BaseNode>
  );
};
