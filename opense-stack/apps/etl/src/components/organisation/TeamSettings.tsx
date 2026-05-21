import { useState } from 'react';
import { Member, Organisation } from '../settings/types';
import {
  OrganisationTeamsTab,
  type OrganisationTeamsTabMember,
  type OrganisationTeamsTabRole,
} from '@repo/ui';

type ModernTeamSettingsProps = {
  organisation: Organisation;
  members: Member[];
  currentUserId?: string;
  canManageTeam: boolean;
  inviteError: string | null;
  searchValue?: string;
  onInvite: (email: string, role: 'admin' | 'editor' | 'member') => Promise<void> | void;
  
  // Member Logic
  onUpdateRole: (memberId: string, newRole: 'admin' | 'editor' | 'member') => Promise<void> | void;
};

export const ModernTeamSettings = (props: ModernTeamSettingsProps) => {
  const [roleChangeMessage, setRoleChangeMessage] = useState<string | null>(null);

  const sharedMembers: OrganisationTeamsTabMember[] = props.members.map((member) => ({
    id: member.id,
    userId: member.user_id,
    displayName: member.profiles?.full_name || member.profiles?.email || 'Unknown Member',
    subtitle: member.profiles?.email || member.user_id,
    roleId: member.role,
  }));

  const sharedRoles: OrganisationTeamsTabRole[] = [
    { id: 'admin', name: 'Admin' },
    { id: 'editor', name: 'Editor' },
    { id: 'member', name: 'Member' },
  ];

  const inviteMessage = props.inviteError;

  const handleInvite = async (email: string, roleId: string) => {
    await props.onInvite(email, roleId as 'admin' | 'editor' | 'member');
  };

  const handleRoleChange = async (memberId: string, roleId: string) => {
    setRoleChangeMessage(null);

    try {
      await props.onUpdateRole(memberId, roleId as 'admin' | 'editor' | 'member');
      setRoleChangeMessage('Member role updated successfully.');
    } catch (error) {
      setRoleChangeMessage(error instanceof Error ? error.message : 'Failed to update member role.');
    }
  };

  return (
      <OrganisationTeamsTab
        members={sharedMembers}
        roles={sharedRoles}
        canManageTeam={props.canManageTeam}
        isRoleEditable={(member) => member.roleId !== 'owner' && member.userId !== props.currentUserId}
        onRoleChange={handleRoleChange}
        onInvite={handleInvite}
        searchValue={props.searchValue}
        inviteMessage={inviteMessage ?? undefined}
        roleChangeMessage={roleChangeMessage}
        emptyStateTitle={`No members in ${props.organisation.name}`}
        emptyStateDescription="Invite teammates to get started."
      />
  );
};
