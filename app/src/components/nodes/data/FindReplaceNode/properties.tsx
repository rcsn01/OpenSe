import React from 'react';
import { FindReplaceNodeData } from '../../types';

interface FindReplaceNodePropertiesProps {
  data: FindReplaceNodeData;
  onChange: (key: string, value: any) => void;
}

export const FindReplaceNodeProperties: React.FC<FindReplaceNodePropertiesProps> = ({ data, onChange }) => {
  const available = data.availableFields || [];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Target Column</label>
        {available.length > 0 ? (
          <select
            value={data.field || ''}
            onChange={(e) => onChange('field', e.target.value)}
            className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select column...</option>
            {available.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        ) : (
          <input
            value={data.field || ''}
            onChange={(e) => onChange('field', e.target.value)}
            placeholder="Column name"
            className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Find</label>
        <input
          value={data.search || ''}
          onChange={(e) => onChange('search', e.target.value)}
          placeholder="Text to find"
          className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Replace With</label>
        <input
          value={data.replace || ''}
          onChange={(e) => onChange('replace', e.target.value)}
          placeholder="Replacement text"
          className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center gap-2 mt-2">
        <input
          type="checkbox"
          id="caseSensitive"
          checked={data.caseSensitive || false}
          onChange={(e) => onChange('caseSensitive', e.target.checked)}
          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="caseSensitive" className="text-sm text-slate-700">Case Sensitive</label>
      </div>
    </div>
  );
};
