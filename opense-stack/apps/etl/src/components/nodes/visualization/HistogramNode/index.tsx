import { useMemo } from 'react';
import { NodeProps } from 'reactflow';
import { BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BaseNode } from '../../_base/BaseNode';
import { HistogramNodeData } from '../../types';

const computeBins = (values: number[], numBins: number) => {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return [{ range: String(min), count: values.length }];

  const binWidth = (max - min) / numBins;
  const bins = Array.from({ length: numBins }, (_, i) => {
    const lo = min + i * binWidth;
    const hi = lo + binWidth;
    return {
      range: `${lo.toFixed(1)}-${hi.toFixed(1)}`,
      count: 0,
      lo,
      hi,
    };
  });

  for (const v of values) {
    const idx = Math.min(Math.floor((v - min) / binWidth), numBins - 1);
    bins[idx].count++;
  }

  return bins.map(({ range, count }) => ({ range, count }));
};

export const HistogramNode = ({ data, selected }: NodeProps<HistogramNodeData>) => {
  const rows = data.previewRows || [];
  const hasConfig = !!data.field;

  const chartData = useMemo(() => {
    if (!hasConfig || !rows.length) return [];
    const values = rows.map((r) => Number(r[data.field!])).filter((n) => !Number.isNaN(n));
    return computeBins(values, data.bins || 10);
  }, [rows, data.field, data.bins, hasConfig]);

  return (
    <BaseNode
      label={data.label || 'Histogram'}
      description={hasConfig ? `Distribution of [${data.field}]` : 'Select column in properties'}
      icon={BarChart2}
      color="bg-amber-600"
      inputs={['in']}
      outputs={['out']}
      selected={selected}
      resizable
      minWidth={300}
      minHeight={250}
    >
      {hasConfig && chartData.length > 0 ? (
        <div className="w-full h-full min-h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="range" tick={{ fontSize: 'var(--type-size-2xs)' }} angle={-30} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 'var(--type-size-2xs)' }} />
              <Tooltip contentStyle={{ fontSize: 'var(--type-size-xs)' }} />
              <Bar dataKey="count" fill="#d97706" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-[10px] text-slate-400 italic text-center py-4">
          {rows.length === 0 ? 'No data — run workflow first' : 'Select a numeric column'}
        </p>
      )}
    </BaseNode>
  );
};
