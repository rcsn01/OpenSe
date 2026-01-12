import React from 'react';
import { UserPlus, Mail, Shield, Trash2, MoreHorizontal } from 'lucide-react';

const MOCK_MEMBERS = [
  { id: '1', name: 'Alice Johnson', email: 'alice@pearlcorp.com', role: 'Admin', status: 'Active' },
  { id: '2', name: 'Bob Smith', email: 'bob@pearlcorp.com', role: 'Member', status: 'Active' },
  { id: '3', name: 'Charlie Davis', email: 'charlie@external.com', role: 'Member', status: 'Pending' },
];

export const OrganizationSettingsPage = () => {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      
      {/* Org Header */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 flex items-start justify-between">
         <div>
            <div className="flex items-center gap-4">
                <div className="h-16 w-16 bg-blue-600 rounded-lg flex items-center justify-center text-white text-2xl font-bold">
                    P
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Pearl Corp</h1>
                    <p className="text-slate-500">Enterprise Plan • 12 Active Workflows</p>
                </div>
            </div>
         </div>
         <button className="text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-4 py-2 rounded-md hover:bg-blue-50 transition-colors">
            Edit Details
         </button>
      </div>

      {/* Members Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
            <div>
                 <h2 className="text-lg font-semibold text-slate-900">Team Members</h2>
                 <p className="text-sm text-slate-500">Manage who has access to your organization's workflows.</p>
            </div>
            <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium">
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Member
            </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Member</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                        <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {MOCK_MEMBERS.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                    <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-medium text-sm mr-3">
                                        {member.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-slate-900">{member.name}</div>
                                        <div className="text-sm text-slate-500">{member.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center text-sm text-slate-700">
                                    <Shield className="w-4 h-4 mr-1.5 text-slate-400" />
                                    {member.role}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 text-xs leading-5 font-semibold rounded-full ${
                                    member.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                    {member.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button className="text-slate-400 hover:text-slate-600">
                                    <MoreHorizontal className="w-5 h-5" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};
