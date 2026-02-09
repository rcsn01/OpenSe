import React, { useState, useEffect } from 'react';
import { LookupNodeData } from '../../types';

interface LookupNodePropertiesProps {
  data: LookupNodeData;
  onChange: (key: string, value: any) => void;
}

const parseMap = (text: string): Record<string, string> | undefined => {
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj as Record<string, string>;
  } catch {
    return undefined;
  }
  return undefined;
};

export const LookupNodeProperties: React.FC<LookupNodePropertiesProps> = ({ data, onChange }) => {
  const available = data.availableFields || [];
  const [mapText, setMapText] = useState(JSON.stringify(data.map || {}, null, 2));

  useEffect(() => {
    setMapText(JSON.stringify(data.map || {}, null, 2));
  }, [data.map]);

  const handleMapChange = (text: string) => {
    setMapText(text);
    const parsed = parseMap(text);
    if (parsed) {
      onChange('map', parsed);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Key Column</label>
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
            placeholder="Key column name"
            className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">New Field Name</label>
        <input
          value={data.newField || ''}
          onChange={(e) => onChange('newField', e.target.value)}
          placeholder="New field name (optional)"
          className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Lookup Map (JSON)</label>
        <textarea
          value={mapText}
          onChange={(e) => handleMapChange(e.target.value)}
          placeholder={'{"US": "United States", "GB": "United Kingdom"}'}
          rows={6}
          className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <p className="text-[10px] text-slate-400 mt-1">Enter a valid JSON object mapping keys to values</p>
      </div>
    </div>
  );
};
