import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@repo/shared/auth/context';
import { ModernTeamSettings } from './TeamSettings';
import { Member } from '../settings/types';
import { OrgSimple } from '../../types/organisation';
import {
    addOrganisationMember,
    findProfileByEmail,
    updateOrganisationMemberRole,
    userHasAnyMembership,
} from '../../api/organisations';

type OrganisationPageContext = {
    currentOrg: OrgSimple | null;
    members: Member[];
    refetchMembers: () => Promise<any>;
    userRole: string | null;
    teamSearch?: string;
    setTeamSearch?: (value: string) => void;
};

export const TeamTab = () => {
    const { user } = useAuth();
    const {
        currentOrg: organisation,
        members,
        refetchMembers,
        userRole,
    } = useOutletContext<OrganisationPageContext>();
    const queryClient = useQueryClient();

    // Invite State
    const [inviteError, setInviteError] = useState<string | null>(null);

    const canManageTeam = userRole === 'owner' || userRole === 'admin';
    const handleInvite = async (email: string, role: 'admin' | 'editor' | 'member') => {
        if (!organisation) return;

        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail) return;

        setInviteError(null);
        try {
            const profile = await findProfileByEmail(normalizedEmail);
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

            await addOrganisationMember(organisation.id, profileId, role);
            await refetchMembers();

            queryClient.invalidateQueries({ queryKey: ['userOrganisations', user?.id] });
        } catch (err: any) {
            setInviteError(err?.message ?? 'Failed to invite member.');
        }
    };

    const handleUpdateRole = async (memberId: string, newRole: 'admin' | 'editor' | 'member') => {
        try {
            await updateOrganisationMemberRole(memberId, newRole);
            await refetchMembers();
            queryClient.invalidateQueries({ queryKey: ['userOrganisations', user?.id] });
        } catch (err: any) {
            alert(err?.message ?? 'Failed to update member role.');
        }
    };

    if (!organisation) return null;

    return (
        <ModernTeamSettings
            organisation={organisation}
            members={members}
            currentUserId={user?.id}
            canManageTeam={canManageTeam}
            inviteError={inviteError}
            onInvite={handleInvite}
            onUpdateRole={handleUpdateRole}
        />
    );
};
