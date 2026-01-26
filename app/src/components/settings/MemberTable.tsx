import React from 'react';
import { Shield, Trash2, Loader2 } from 'lucide-react';
import { Member, Organization } from './types';
import { StatusBadge } from '../ui/StatusBadge';

type MemberTableProps = {
  members: Member[];
  organization: Organization;
  canManage: boolean;
  removingId: string | null;
  onRemove: (member: Member) => void;
};

export const MemberTable: React.FC<MemberTableProps> = ({ members, organization, canManage, removingId, onRemove }) => {
  return (
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
          {members.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-6 py-6 text-center text-slate-500 text-sm">No members yet.</td>
            </tr>
          ) : members.map((member) => {
            const displayName = member.profiles?.full_name || member.profiles?.email || 'Unknown user';
            const email = member.profiles?.email || 'Unknown email';
            const roleLabel = member.user_id === organization.owner_id
              ? 'Owner'
              : member.role === 'admin'
                ? 'Admin'
                : member.role === 'editor'
                  ? 'Editor'
                  : 'Member';

            return (
              <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-medium text-sm mr-3">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900">{displayName}</div>
                      <div className="text-sm text-slate-500">{email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-slate-700 capitalize">
                    <Shield className="w-4 h-4 mr-1.5 text-slate-400" />
                    {roleLabel}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge tone="success" label="Active" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {canManage && member.user_id !== organization.owner_id ? (
                    <button
                      onClick={() => onRemove(member)}
                      disabled={removingId === member.id}
                      className="inline-flex items-center text-slate-400 hover:text-red-600 disabled:opacity-50"
                    >
                      {removingId === member.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      <span className="sr-only">Remove member</span>
                    </button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
