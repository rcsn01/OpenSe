import { useMemo } from 'react';
import { NodeProps } from 'reactflow';
import { Grid3X3 } from 'lucide-react';
import { BaseNode } from '../../_base/BaseNode';
import { HeatmapNodeData, Row } from '../../types';

type HeatmapCell = {
  x: string;
  y: string;
  value: number;
  intensity: number; // 0-1
};

const buildHeatmap = (rows: Row[], xField: string, yField: string, valueField: string): {
  cells: HeatmapCell[];
  xLabels: string[];
  yLabels: string[];
} => {
  const map = new Map<string, number>();
  const xSet = new Set<string>();
  const ySet = new Set<string>();

  for (const row of rows) {
    const x = String(row[xField] ?? '');
    const y = String(row[yField] ?? '');
    const v = Number(row[valueField]);
    if (Number.isNaN(v)) continue;
    xSet.add(x);
    ySet.add(y);
    const key = `${x}||${y}`;
    map.set(key, (map.get(key) || 0) + v);
  }

  const xLabels = [...xSet].sort();
  const yLabels = [...ySet].sort();

  let min = Infinity;
  let max = -Infinity;
  for (const v of map.values()) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const range = max - min || 1;

  const cells: HeatmapCell[] = [];
  for (const x of xLabels) {
    for (const y of yLabels) {
      const value = map.get(`${x}||${y}`) || 0;
      cells.push({ x, y, value, intensity: (value - min) / range });
    }
  }

  return { cells, xLabels, yLabels };
};

const getColor = (intensity: number) => {
  // Blue to red gradient
  const r = Math.round(30 + intensity * 225);
  const g = Math.round(100 - intensity * 60);
  const b = Math.round(240 - intensity * 200);
  return `rgb(${r}, ${g}, ${b})`;
};

export const HeatmapNode = ({ data, selected }: NodeProps<HeatmapNodeData>) => {
  const rows = data.previewRows || [];
  const hasConfig = data.xAxis && data.yAxis && data.valueField;

  const heatmap = useMemo(() => {
    if (!hasConfig || !rows.length) return null;
    return buildHeatmap(rows, data.xAxis!, data.yAxis!, data.valueField!);
  }, [rows, data.xAxis, data.yAxis, data.valueField, hasConfig]);

  return (
    <BaseNode
      label={data.label || 'Heatmap'}
      description={hasConfig ? `${data.xAxis} × ${data.yAxis}` : 'Configure in properties'}
      icon={Grid3X3}
      color="bg-rose-600"
      inputs={['in']}
      outputs={['out']}
      selected={selected}
      resizable
      minWidth={300}
      minHeight={250}
    >
      {hasConfig && heatmap && heatmap.cells.length > 0 ? (
        <div className="w-full overflow-auto">
          <div className="inline-block">
            {/* Header row */}
            <div className="flex">
              <div className="w-16 shrink-0" />
              {heatmap.xLabels.slice(0, 15).map((x) => (
                <div key={x} className="w-10 text-[7px] text-slate-500 text-center truncate px-0.5" title={x}>
                  {x}
                </div>
              ))}
            </div>
            {/* Data rows */}
            {heatmap.yLabels.slice(0, 15).map((y) => (
              <div key={y} className="flex items-center">
                <div className="w-16 shrink-0 text-[7px] text-slate-500 text-right pr-1 truncate" title={y}>
                  {y}
                </div>
                {heatmap.xLabels.slice(0, 15).map((x) => {
                  const cell = heatmap.cells.find((c) => c.x === x && c.y === y);
                  return (
                    <div
                      key={`${x}-${y}`}
                      className="w-10 h-8 border border-white/50 flex items-center justify-center"
                      style={{ backgroundColor: cell ? getColor(cell.intensity) : '#f1f5f9' }}
                      title={`${x}, ${y}: ${cell?.value.toFixed(1) ?? 0}`}
                    >
                      <span className="text-[7px] text-white/80 font-mono">
                        {cell?.value.toFixed(0)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-[10px] text-slate-400 italic text-center py-4">
          {rows.length === 0 ? 'No data — run workflow first' : 'Select X, Y and value columns'}
        </p>
      )}
    </BaseNode>
  );
};
