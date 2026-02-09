import React from 'react';

interface ChartAxisPropertiesProps {
  data: {
    xAxis?: string;
    yAxis?: string;
    availableFields?: string[];
  };
  onChange: (key: string, value: any) => void;
  xLabel?: string;
  yLabel?: string;
}

export const ChartAxisProperties: React.FC<ChartAxisPropertiesProps> = ({
  data,
  onChange,
  xLabel = 'X Axis',
  yLabel = 'Y Axis',
}) => {
  const available = data.availableFields || [];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">{xLabel}</label>
        <select
          value={data.xAxis || ''}
          onChange={(e) => onChange('xAxis', e.target.value)}
          className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select column...</option>
          {available.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">{yLabel}</label>
        <select
          value={data.yAxis || ''}
          onChange={(e) => onChange('yAxis', e.target.value)}
          className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select column...</option>
          {available.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>
    </div>
  );
};
