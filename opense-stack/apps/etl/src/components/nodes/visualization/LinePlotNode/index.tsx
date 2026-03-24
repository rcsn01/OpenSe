import { NodeProps } from 'reactflow';
import { TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BaseNode } from '../../_base/BaseNode';
import { ChartNodeData } from '../../types';

export const LinePlotNode = ({ data, selected }: NodeProps<ChartNodeData>) => {
  const rows = data.previewRows || [];
  const hasConfig = data.xAxis && data.yAxis;

  return (
    <BaseNode
      label={data.label || 'Line Plot'}
      description={hasConfig ? `${data.xAxis} × ${data.yAxis}` : 'Select axes in properties'}
      icon={TrendingUp}
      color="bg-green-500"
      inputs={['in']}
      outputs={['out']}
      selected={selected}
      resizable
      minWidth={300}
      minHeight={250}
    >
      {hasConfig && rows.length > 0 ? (
        <div className="w-full h-full min-h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey={data.xAxis} tick={{ fontSize: 'var(--type-size-2xs)' }} />
              <YAxis tick={{ fontSize: 'var(--type-size-2xs)' }} />
              <Tooltip contentStyle={{ fontSize: 'var(--type-size-xs)' }} />
              <Line type="monotone" dataKey={data.yAxis!} stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-[10px] text-slate-400 italic text-center py-4">
          {rows.length === 0 ? 'No data — run workflow first' : 'Select X and Y axes in properties'}
        </p>
      )}
    </BaseNode>
  );
};
