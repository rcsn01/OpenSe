import React from 'react';
import { Users, UserPlus } from 'lucide-react';
import { Member, Organization } from '../settings/types';
import { InviteMemberForm } from '../settings/InviteMemberForm';
import { MemberTable } from '../settings/MemberTable';

type TeamSettingsProps = {
  organization: Organization;
  members: Member[];
  canManageTeam: boolean;
  inviteEmail: string;
  inviteRole: 'admin' | 'editor' | 'member';
  inviting: boolean;
  inviteError: string | null;
  removingId: string | null;
  onInviteEmailChange: (val: string) => void;
  onInviteRoleChange: (role: 'admin' | 'editor' | 'member') => void;
  onInviteSubmit: (e: React.FormEvent) => void;
  onRemoveMember: (member: Member) => void;
};

export const TeamSettings: React.FC<TeamSettingsProps> = ({
  organization,
  members,
  canManageTeam,
  inviteEmail,
  inviteRole,
  inviting,
  inviteError,
  removingId,
  onInviteEmailChange,
  onInviteRoleChange,
  onInviteSubmit,
  onRemoveMember,
}) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Invitation Section */}
      {canManageTeam && (
        <section>
          <InviteMemberForm
            inviteEmail={inviteEmail}
            inviteRole={inviteRole}
            inviting={inviting}
            inviteError={inviteError}
            onInviteEmailChange={onInviteEmailChange}
            onInviteRoleChange={onInviteRoleChange}
            onSubmit={onInviteSubmit}
          />
        </section>
      )}

      {/* Members List Section */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-900">Team Members</h2>
          </div>
          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            {members.length} Total
          </span>
        </div>
        
        <MemberTable
          members={members}
          organization={organization}
          canManage={canManageTeam}
          removingId={removingId}
          onRemove={onRemoveMember}
        />
      </section>
    </div>
  );
};