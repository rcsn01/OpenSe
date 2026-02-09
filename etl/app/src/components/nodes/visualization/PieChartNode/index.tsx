import { useMemo } from 'react';
import { NodeProps } from 'reactflow';
import { PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BaseNode } from '../../_base/BaseNode';
import { PieChartNodeData } from '../../types';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export const PieChartNode = ({ data, selected }: NodeProps<PieChartNodeData>) => {
  const rows = data.previewRows || [];
  const hasConfig = data.nameKey && data.valueKey;

  const chartData = useMemo(() => {
    if (!hasConfig || !rows.length) return [];
    return rows.slice(0, 20).map((row) => ({
      name: String(row[data.nameKey!] ?? ''),
      value: Number(row[data.valueKey!]) || 0,
    }));
  }, [rows, data.nameKey, data.valueKey, hasConfig]);

  return (
    <BaseNode
      label={data.label || 'Pie Chart'}
      description={hasConfig ? `${data.nameKey} / ${data.valueKey}` : 'Select columns in properties'}
      icon={PieChartIcon}
      color="bg-purple-500"
      inputs={['in']}
      outputs={['out']}
      selected={selected}
      resizable
      minWidth={300}
      minHeight={280}
    >
      {hasConfig && chartData.length > 0 ? (
        <div className="w-full h-full min-h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius="70%"
                label={({ name }) => name}
                labelLine={{ strokeWidth: 1 }}
                fontSize={9}
              >
                {chartData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-[10px] text-slate-400 italic text-center py-4">
          {rows.length === 0 ? 'No data — run workflow first' : 'Select name & value columns'}
        </p>
      )}
    </BaseNode>
  );
};
