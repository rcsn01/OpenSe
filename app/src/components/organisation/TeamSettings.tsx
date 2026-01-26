import React from 'react';
import { Users, UserPlus, Shield } from 'lucide-react';
import { Member, Organisation } from '../settings/types';
import { InviteMemberForm } from '../settings/InviteMemberForm';
import { MemberTable } from '../settings/MemberTable';

type TeamSettingsProps = {
  organisation: Organisation;
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
  onUpdateRole: (memberId: string, newRole: 'admin' | 'editor' | 'member') => void; // New Prop
};

export const TeamSettings: React.FC<TeamSettingsProps> = ({
  organisation,
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
  onUpdateRole,
}) => {
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Members</p>
            <p className="text-2xl font-bold text-slate-900">{members.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Admins</p>
            <p className="text-2xl font-bold text-slate-900">
                {members.filter(m => m.role === 'admin' || m.user_id === organisation.owner_id).length}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Invite Form */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Add Team Member</h2>
            <p className="text-sm text-slate-500 mb-6">Grow your team and collaborate on workflows.</p>
            
            {canManageTeam ? (
              <InviteMemberForm
                inviteEmail={inviteEmail}
                inviteRole={inviteRole}
                inviting={inviting}
                inviteError={inviteError}
                onInviteEmailChange={onInviteEmailChange}
                onInviteRoleChange={onInviteRoleChange}
                onSubmit={onInviteSubmit}
              />
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 italic">
                Only administrators can invite new members.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Member List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <h3 className="font-bold text-slate-900">Manage Access</h3>
            </div>
            
            <MemberTable
              members={members}
              organisation={organisation}
              canManage={canManageTeam}
              removingId={removingId}
              onRemove={onRemoveMember}
              onUpdateRole={onUpdateRole} // Pass to table
            />
          </div>
        </div>
      </div>
    </div>
  );
};