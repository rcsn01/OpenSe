import { Trash2, Loader2 } from 'lucide-react';
import { Member, Organisation } from './types';
import clsx from 'clsx';

type MemberTableProps = {
  members: Member[];
  organisation: Organisation;
  canManage: boolean;
  removingId: string | null;
  onRemove: (member: Member) => void;
  onUpdateRole: (memberId: string, role: 'admin' | 'editor' | 'member') => void;
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
  onRemove,
  onUpdateRole
}) => {
  return (
    <div className="overflow-hidden bg-white rounded-xl border border-slate-200 shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Member</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
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
                    <div className="relative inline-block text-left">
                      <select
                        value={member.role}
                        onChange={(e) => onUpdateRole(member.id, e.target.value as any)}
                        className="appearance-none bg-white border border-slate-300 text-slate-700 py-1 pl-3 pr-8 rounded-lg text-xs font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer hover:border-indigo-300 transition-colors"
                      >
                        <option value="member">Member</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <RoleBadge role={member.role} />
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
