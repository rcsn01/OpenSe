import React from 'react';
import { CodeNodeData } from '../../types';
import { AlertTriangle } from 'lucide-react';

interface CodeNodePropertiesProps {
  data: CodeNodeData;
  onChange: (key: string, value: any) => void;
}

export const CodeNodeProperties: React.FC<CodeNodePropertiesProps> = ({ data, onChange }) => {
  const available = data.availableFields || [];

  return (
    <div className="space-y-4">
      {/* Available columns hint */}
      {available.length > 0 && (
        <div className="p-2 bg-slate-50 border border-slate-200 rounded-md">
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Available Columns
          </label>
          <div className="flex flex-wrap gap-1">
            {available.map((f) => (
              <span
                key={f}
                className="px-1.5 py-0.5 bg-violet-50 text-violet-700 rounded text-[10px] font-mono border border-violet-200"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Code editor */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">
          JavaScript Code
        </label>
        <textarea
          value={data.code || ''}
          onChange={(e) => onChange('code', e.target.value)}
          placeholder={`// rows is the input array\nreturn rows.map(row => ({\n  ...row,\n}));`}
          className="w-full rounded-md border border-slate-300 py-2 px-3 text-xs font-mono focus:border-violet-500 focus:ring-1 focus:ring-violet-500 bg-slate-900 text-green-400 leading-relaxed"
          rows={14}
          spellCheck={false}
        />
      </div>

      {/* Sandbox notice */}
      <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md text-[11px] text-amber-800">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Sandboxed Execution</p>
          <p className="mt-0.5 text-amber-700">
            Code runs in a restricted scope with no access to browser APIs (window, fetch, DOM, etc.).
            The <code className="bg-amber-100 px-0.5 rounded">rows</code> variable contains input data.
            You must <code className="bg-amber-100 px-0.5 rounded">return</code> an array. 10s timeout.
          </p>
        </div>
      </div>
    </div>
  );
};
