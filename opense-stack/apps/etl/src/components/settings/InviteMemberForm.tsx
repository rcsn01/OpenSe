import React from 'react';
import { UserPlus, Mail, Loader2 } from 'lucide-react';

export type InviteMemberFormProps = {
  inviteEmail: string;
  inviteRole: 'admin' | 'editor' | 'member';
  inviting: boolean;
  inviteError: string | null;
  onInviteEmailChange: (value: string) => void;
  onInviteRoleChange: (value: 'admin' | 'editor' | 'member') => void;
  onSubmit: (e: React.FormEvent) => void;
};

export const InviteMemberForm: React.FC<InviteMemberFormProps> = ({
  inviteEmail,
  inviteRole,
  inviting,
  inviteError,
  onInviteEmailChange,
  onInviteRoleChange,
  onSubmit,
}) => {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Invite a member</h2>
          <p className="text-sm text-slate-500">Add teammates by email. Users must already have an account.</p>
        </div>
      </div>
      {inviteError && (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">
          {inviteError}
        </div>
      )}
      <form className="grid grid-cols-1 md:grid-cols-3 gap-3" onSubmit={onSubmit}>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="invite-email">Email address</label>
          <div className="mt-1 relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="invite-email"
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => onInviteEmailChange(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="teammate@example.com"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="invite-role">Role</label>
          <select
            id="invite-role"
            value={inviteRole}
            onChange={(e) => onInviteRoleChange(e.target.value as 'admin' | 'editor' | 'member')}
            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="member">Member</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="md:col-span-3 flex justify-end">
          <button
            type="submit"
            disabled={inviting}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium disabled:opacity-60"
          >
            {inviting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
            Send invite
          </button>
        </div>
      </form>
    </div>
  );
};
