import { useState, useMemo } from 'react';
import { UserPlus, Mail, Loader2, User } from 'lucide-react';
import { Member, Organisation } from '../settings/types';
import { MemberTable } from '../settings/MemberTable'; // Reusing your existing table logic, but wrapped
import { Button, Card, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input, Select } from '@repo/ui';

type ModernTeamSettingsProps = {
  organisation: Organisation;
  members: Member[];
  canManageTeam: boolean;
  updatingMemberId: string | null;
  customRoleOptions: { value: string; label: string }[];
  memberCustomRoleMap: Record<string, string | null>;
  searchTerm: string;
  
  // Invite Logic
  inviteEmail: string;
  inviteRole: 'admin' | 'editor' | 'member';
  inviting: boolean;
  inviteError: string | null;
  onInviteEmailChange: (val: string) => void;
  onInviteRoleChange: (role: 'admin' | 'editor' | 'member') => void;
  onInviteSubmit: (e: React.FormEvent) => void;
  
  // Member Logic
  removingId: string | null;
  onRemoveMember: (member: Member) => void;
  onUpdateRole: (memberId: string, newRole: 'admin' | 'editor' | 'member') => void;
  onAssignCustomRole: (memberId: string, roleId: string | null) => void;
};

export const ModernTeamSettings: React.FC<ModernTeamSettingsProps> = (props) => {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'editor' | 'member'>('all');

  // Local filtering
  const filteredMembers = useMemo(() => {
    return props.members.filter(m => {
      const matchesSearch = (m.profiles?.full_name || '').toLowerCase().includes(props.searchTerm.toLowerCase()) || 
                            (m.profiles?.email || '').toLowerCase().includes(props.searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || m.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [props.members, props.searchTerm, roleFilter]);

  const handleInviteSubmit = (e: React.FormEvent) => {
    props.onInviteSubmit(e);
    // Note: You might want to close modal only on success, handled in parent
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <Card className="flex flex-col sm:flex-row justify-between items-center gap-4" padding="md">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            options={[
              { value: 'all', label: 'All Roles' },
              { value: 'admin', label: 'Admins' },
              { value: 'editor', label: 'Editors' },
              { value: 'member', label: 'Members' },
            ]}
            className="min-w-36"
          />
        </div>

        {props.canManageTeam && (
          <Button onClick={() => setIsInviteModalOpen(true)} className="w-full sm:w-auto shadow-md shadow-blue-500/20">
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Member
          </Button>
        )}
      </Card>

      {/* Table Area */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <MemberTable 
          members={filteredMembers}
          organisation={props.organisation}
          canManage={props.canManageTeam}
          removingId={props.removingId}
          updatingId={props.updatingMemberId}
          customRoleOptions={props.customRoleOptions}
          memberCustomRoleMap={props.memberCustomRoleMap}
          onRemove={props.onRemoveMember}
          onUpdateRole={props.onUpdateRole}
          onUpdateCustomRole={props.onAssignCustomRole}
        />
        {filteredMembers.length === 0 && (
          <div className="p-12 text-center text-slate-500">
            <User className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p>No members found matching your search.</p>
          </div>
        )}
      </div>

      {/* Invite Modal Overlay */}
      {isInviteModalOpen && (
        <Dialog open={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Add a colleague to {props.organisation.name} and assign an initial role.
              </DialogDescription>
            </DialogHeader>

            <div>
              {props.inviteError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex gap-2 items-start">
                  <div className="mt-0.5 min-w-[4px] h-4 bg-red-500 rounded-full" />
                  {props.inviteError}
                </div>
              )}

              <form onSubmit={handleInviteSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                  <Input
                    type="email"
                    required
                    placeholder="colleague@company.com"
                    value={props.inviteEmail}
                    onChange={(e) => props.onInviteEmailChange(e.target.value)}
                    prefix={<Mail className="w-4 h-4" />}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['member', 'editor', 'admin'].map((role) => (
                      <div 
                        key={role}
                        onClick={() => props.onInviteRoleChange(role as any)}
                        className={`cursor-pointer border rounded-lg p-3 text-center transition-all ${
                          props.inviteRole === role 
                            ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500' 
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-sm font-semibold capitalize">{role}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {props.inviteRole === 'admin' ? 'Full access to settings and billing.' : 
                     props.inviteRole === 'editor' ? 'Can create and edit workflows.' : 
                     'Can run workflows and view results.'}
                  </p>
                </div>

                <div className="pt-2 flex gap-3">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsInviteModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={props.inviting}>
                    {props.inviting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Send Invite'}
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
