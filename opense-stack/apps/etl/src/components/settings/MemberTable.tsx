import { Trash2, Loader2 } from 'lucide-react';
import { Member, Organisation } from './types';
import clsx from 'clsx';
import { Select } from '@repo/ui';

type MemberTableProps = {
  members: Member[];
  organisation: Organisation;
  canManage: boolean;
  removingId: string | null;
  updatingId: string | null;
  customRoleOptions: { value: string; label: string }[];
  memberCustomRoleMap: Record<string, string | null>;
  onRemove: (member: Member) => void;
  onUpdateRole: (memberId: string, role: 'admin' | 'editor' | 'member') => void;
  onUpdateCustomRole: (memberId: string, roleId: string | null) => void;
};

const RoleBadge = ({ role }: { role: string }) => {
  const styles = {
    admin: 'bg-purple-100 text-purple-700 border-purple-200',
    editor: 'bg-blue-100 text-blue-700 border-blue-200',
    member: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  return (
    <span className={clsx(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize",
      styles[role as keyof typeof styles] || styles.member
    )}>
      {role}
    </span>
  );
};

export const MemberTable: React.FC<MemberTableProps> = ({
  members,
  organisation,
  canManage,
  removingId,
  updatingId,
  customRoleOptions,
  memberCustomRoleMap,
  onRemove,
  onUpdateRole,
  onUpdateCustomRole,
}) => {
  return (
    <div className="overflow-hidden bg-white rounded-xl border border-slate-200 shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Member</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Permissions Role</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {members.map((member) => {
            const isOwner = member.user_id === organisation.owner_id;
            const displayName = member.profiles?.full_name || member.profiles?.email || 'Unknown Member';
            const email = member.profiles?.email || 'No email';
            const initials = displayName.charAt(0).toUpperCase();

            return (
              <tr key={member.id} className="group hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                        {initials}
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {displayName}
                        {isOwner && <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 font-bold uppercase tracking-wide">Owner</span>}
                      </div>
                      <div className="text-sm text-slate-500">{email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {isOwner ? (
                    <RoleBadge role="admin" />
                  ) : canManage ? (
                    <div className="w-36">
                      <Select
                        value={member.role}
                        onChange={(e) => onUpdateRole(member.id, e.target.value as any)}
                        disabled={updatingId === member.id}
                        options={[
                          { value: 'member', label: 'Member' },
                          { value: 'editor', label: 'Editor' },
                          { value: 'admin', label: 'Admin' },
                        ]}
                        className="text-xs"
                      />
                    </div>
                  ) : (
                    <RoleBadge role={member.role} />
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {isOwner ? (
                    <span className="text-xs text-slate-500">Not required</span>
                  ) : canManage ? (
                    <div className="w-52">
                      <Select
                        value={memberCustomRoleMap[member.id] ?? ''}
                        onChange={(e) => onUpdateCustomRole(member.id, e.target.value || null)}
                        disabled={updatingId === member.id}
                        options={[
                          { value: '', label: 'No custom role' },
                          ...customRoleOptions,
                        ]}
                        className="text-xs"
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-slate-600">{memberCustomRoleMap[member.id] ? 'Assigned' : '—'}</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Active
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {!isOwner && canManage && (
                    <button
                      onClick={() => onRemove(member)}
                      disabled={removingId === member.id}
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all"
                      title="Remove member"
                    >
                      {removingId === member.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
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
