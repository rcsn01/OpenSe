import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { ModernTeamSettings } from './TeamSettings';
import { Member } from '../settings/types';
import { OrgSimple } from '../../types/organisation';
import {
    addOrganisationMember,
    findProfileByEmail,
    removeOrganisationMember,
    userHasAnyMembership,
} from '../../api/organisations';

type OrganisationPageContext = {
    currentOrg: OrgSimple | null;
    members: Member[];
    refetchMembers: () => Promise<any>;
    userRole: string | null;
};

export const TeamTab = () => {
    const { user } = useAuth();
    const { currentOrg: organisation, members, refetchMembers, userRole } = useOutletContext<OrganisationPageContext>();
    const queryClient = useQueryClient();

    console.log('[TeamTab] Context:', { organisation, membersCount: members?.length, userRole });

    // Invite State
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'member'>('member');
    const [inviting, setInviting] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);

    // Member Action State
    const [removingId, setRemovingId] = useState<string | null>(null);

    const canManageTeam = userRole === 'owner' || userRole === 'admin';

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organisation) return;

        const email = inviteEmail.trim().toLowerCase();
        if (!email) return;

        setInviting(true);
        setInviteError(null);
        try {
            const profile = await findProfileByEmail(email);
            if (!profile) {
                setInviteError('User not found. Please ask them to sign up first.');
                return;
            }

            const profileId = profile.id;
            const alreadyMember = await userHasAnyMembership(profileId);
            if (alreadyMember) {
                setInviteError('User is already assigned to an organisation.');
                return;
            }

            await addOrganisationMember(organisation.id, profileId, inviteRole);
            setInviteEmail('');
            setInviteRole('member');
            await refetchMembers();

            queryClient.invalidateQueries({ queryKey: ['userOrganisations', user?.id] });
        } catch (err: any) {
            setInviteError(err?.message ?? 'Failed to invite member.');
        } finally {
            setInviting(false);
        }
    };

    const handleRemoveMember = async (member: Member) => {
        if (!organisation) return;
        if (member.user_id === organisation.owner_id) return;

        if (!window.confirm(`Are you sure you want to remove ${member.profiles?.email}?`)) return;

        setRemovingId(member.id);
        try {
            await removeOrganisationMember(member.id);
            await refetchMembers();
            queryClient.invalidateQueries({ queryKey: ['userOrganisations', user?.id] });
        } catch (err: any) {
            alert(err?.message ?? 'Failed to remove member.');
        } finally {
            setRemovingId(null);
        }
    };

    const handleUpdateRole = async (memberId: string, newRole: 'admin' | 'editor' | 'member') => {
        console.log('Role update requested:', memberId, newRole);
    };

    if (!organisation) return null;

    return (
        <ModernTeamSettings
            organisation={organisation}
            members={members}
            canManageTeam={canManageTeam}
            // Invite Props
            inviteEmail={inviteEmail}
            inviteRole={inviteRole}
            inviting={inviting}
            inviteError={inviteError}
            onInviteEmailChange={setInviteEmail}
            onInviteRoleChange={setInviteRole}
            onInviteSubmit={handleInvite}
            // Member Props
            removingId={removingId}
            onRemoveMember={handleRemoveMember}
            onUpdateRole={handleUpdateRole}
        />
    );
};
