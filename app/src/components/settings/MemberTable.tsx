import React from 'react';
import { Shield, Trash2, Loader2, MoreVertical } from 'lucide-react';
import { Member, Organisation } from './types';
import { StatusBadge } from '../ui/StatusBadge';

type MemberTableProps = {
  members: Member[];
  organisation: Organisation;
  canManage: boolean;
  removingId: string | null;
  onRemove: (member: Member) => void;
  onUpdateRole: (memberId: string, role: 'admin' | 'editor' | 'member') => void;
};

export const MemberTable: React.FC<MemberTableProps> = ({ 
  members, 
  organisation, 
  canManage, 
  removingId, 
  onRemove,
  onUpdateRole
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100">
        <thead>
          <tr className="text-left bg-slate-50/50">
            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Member</th>
            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role & Permissions</th>
            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {members.map((member) => {
            const isOwner = member.user_id === organisation.owner_id;
            const displayName = member.profiles?.full_name || member.profiles?.email || 'Unknown';
            const email = member.profiles?.email || '';

            return (
              <tr key={member.id} className="group hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-bold border border-white shadow-sm">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-900 leading-none">{displayName}</span>
                      <span className="text-xs text-slate-500 mt-1">{email}</span>
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  {isOwner ? (
                    <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">
                      <Shield className="w-3 h-3 mr-1" /> Owner
                    </div>
                  ) : canManage ? (
                    <select
                      value={member.role}
                      onChange={(e) => onUpdateRole(member.id, e.target.value as any)}
                      className="text-xs font-medium bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer hover:border-slate-300 shadow-sm"
                    >
                      <option value="member">Member (View only)</option>
                      <option value="editor">Editor (Can edit flows)</option>
                      <option value="admin">Admin (Can manage team)</option>
                    </select>
                  ) : (
                    <span className="text-xs font-medium text-slate-600 capitalize bg-slate-100 px-2 py-1 rounded-md">
                      {member.role}
                    </span>
                  )}
                </td>

                <td className="px-6 py-4 text-right">
                  {!isOwner && canManage && (
                    <button
                      onClick={() => onRemove(member)}
                      disabled={removingId === member.id}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    >
                      {removingId === member.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};