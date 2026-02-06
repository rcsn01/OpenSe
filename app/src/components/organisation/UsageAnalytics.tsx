import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { OrgSimple } from '../../types/organisation';
import { useOutletContext } from 'react-router-dom';

type UsageAnalyticsProps = {
    organisation?: OrgSimple;
};

// Mock data generator (replace with real API call later)
const generateMockData = () => {
    const dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toLocaleDateString('en-US', { weekday: 'short' });
    });

    return dates.map(date => ({
        name: date,
        executions: Math.floor(Math.random() * 50) + 10,
        failed: Math.floor(Math.random() * 5),
    }));
};

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];

export const UsageAnalytics = ({ organisation: propOrg }: UsageAnalyticsProps) => {
    const context = useOutletContext<{ currentOrg: OrgSimple }>();
    // Use prop or context
    const organisation = propOrg || context?.currentOrg;

    const data = useMemo(() => generateMockData(), []);

    const statusData = [
        { name: 'Success', value: 85 },
        { name: 'Failed', value: 10 },
        { name: 'Running', value: 5 },
    ];

    if (!organisation) return null;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Metric Cards */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-medium text-slate-500">Total Executions (7d)</h3>
                    <p className="text-3xl font-bold text-slate-900 mt-2">1,234</p>
                    <p className="text-sm text-green-600 mt-2 flex items-center">
                        +12% from last week
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-medium text-slate-500">Success Rate</h3>
                    <p className="text-3xl font-bold text-slate-900 mt-2">98.2%</p>
                    <p className="text-sm text-slate-500 mt-2">Target: 99.9%</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-medium text-slate-500">Avg. Duration</h3>
                    <p className="text-3xl font-bold text-slate-900 mt-2">1.2s</p>
                    <p className="text-sm text-green-600 mt-2">-0.3s improvement</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Execution Volume Chart */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[400px]">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Execution Volume</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: '#F1F5F9' }}
                                />
                                <Bar dataKey="executions" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Success vs Failure */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[400px]">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Execution Status</h3>
                    <div className="h-[300px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};
