import { NodeProps } from 'reactflow';
import { BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BaseNode } from '../../_base/BaseNode';
import { ChartNodeData } from '../../types';

export const BarChartNode = ({ data, selected }: NodeProps<ChartNodeData>) => {
  const rows = data.previewRows || [];
  const hasConfig = data.xAxis && data.yAxis;

  return (
    <BaseNode
      label={data.label || 'Bar Chart'}
      description={hasConfig ? `${data.xAxis} × ${data.yAxis}` : 'Select axes in properties'}
      icon={BarChart3}
      color="bg-blue-500"
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
            <BarChart data={rows} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey={data.xAxis} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Bar dataKey={data.yAxis!} fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
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
