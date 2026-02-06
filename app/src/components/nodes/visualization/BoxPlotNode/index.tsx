import { useMemo } from 'react';
import { NodeProps } from 'reactflow';
import { BoxSelect } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { BoxPlotNodeData, Row } from '../../types';

type BoxStats = {
  group: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
};

const computeBoxStats = (values: number[]): Omit<BoxStats, 'group'> | null => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const q = (p: number) => {
    const pos = (sorted.length - 1) * p;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  };
  return {
    min: sorted[0],
    q1: q(0.25),
    median: q(0.5),
    q3: q(0.75),
    max: sorted[sorted.length - 1],
  };
};

const computeAllBoxStats = (rows: Row[], field: string, groupBy?: string): BoxStats[] => {
  if (!groupBy) {
    const values = rows.map((r) => Number(r[field])).filter((n) => !Number.isNaN(n));
    const stats = computeBoxStats(values);
    return stats ? [{ group: 'All', ...stats }] : [];
  }

  const groups = new Map<string, number[]>();
  for (const row of rows) {
    const key = String(row[groupBy] ?? '');
    const val = Number(row[field]);
    if (Number.isNaN(val)) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(val);
  }

  const result: BoxStats[] = [];
  for (const [group, values] of groups) {
    const stats = computeBoxStats(values);
    if (stats) result.push({ group, ...stats });
  }
  return result;
};

export const BoxPlotNode = ({ data, selected }: NodeProps<BoxPlotNodeData>) => {
  const rows = data.previewRows || [];
  const hasConfig = !!data.field;

  const stats = useMemo(() => {
    if (!hasConfig || !rows.length) return [];
    return computeAllBoxStats(rows, data.field!, data.groupBy);
  }, [rows, data.field, data.groupBy, hasConfig]);

  // Find global min/max for scaling
  const globalMin = stats.length ? Math.min(...stats.map((s) => s.min)) : 0;
  const globalMax = stats.length ? Math.max(...stats.map((s) => s.max)) : 1;
  const range = globalMax - globalMin || 1;

  const scale = (v: number) => ((v - globalMin) / range) * 100;

  return (
    <BaseNode
      label={data.label || 'Box Plot'}
      description={hasConfig ? `Distribution of [${data.field}]` : 'Select column in properties'}
      icon={BoxSelect}
      color="bg-emerald-500"
      inputs={['in']}
      outputs={['out']}
      selected={selected}
      resizable
      minWidth={300}
      minHeight={250}
    >
      {hasConfig && stats.length > 0 ? (
        <div className="w-full space-y-3 py-2">
          {stats.slice(0, 8).map((s) => (
            <div key={s.group} className="space-y-1">
              <p className="text-[9px] text-slate-500 font-medium truncate">{s.group}</p>
              <div className="relative h-5 bg-slate-100 rounded">
                {/* Whiskers */}
                <div
                  className="absolute top-1/2 h-px bg-slate-400"
                  style={{ left: `${scale(s.min)}%`, width: `${scale(s.max) - scale(s.min)}%`, transform: 'translateY(-50%)' }}
                />
                {/* Box */}
                <div
                  className="absolute top-0.5 bottom-0.5 bg-emerald-200 border border-emerald-400 rounded-sm"
                  style={{ left: `${scale(s.q1)}%`, width: `${scale(s.q3) - scale(s.q1)}%` }}
                />
                {/* Median */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-emerald-700"
                  style={{ left: `${scale(s.median)}%` }}
                />
                {/* Min/Max endpoints */}
                <div className="absolute top-1 bottom-1 w-px bg-slate-400" style={{ left: `${scale(s.min)}%` }} />
                <div className="absolute top-1 bottom-1 w-px bg-slate-400" style={{ left: `${scale(s.max)}%` }} />
              </div>
              <div className="flex justify-between text-[8px] text-slate-400">
                <span>{s.min.toFixed(1)}</span>
                <span>Q1:{s.q1.toFixed(1)}</span>
                <span>Med:{s.median.toFixed(1)}</span>
                <span>Q3:{s.q3.toFixed(1)}</span>
                <span>{s.max.toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-slate-400 italic text-center py-4">
          {rows.length === 0 ? 'No data — run workflow first' : 'Select a numeric column'}
        </p>
      )}
    </BaseNode>
  );
};
