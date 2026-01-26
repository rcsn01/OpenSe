import React, { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Building2, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { Member } from '../../components/settings/types';
import { OrgHeader } from '../../components/settings/OrgHeader';
import { InviteMemberForm } from '../../components/settings/InviteMemberForm';
import { MemberTable } from '../../components/settings/MemberTable';
import { useOrganizationMembers, useUserOrganizations } from '../../hooks/queries/useOrganizations';
import {
    addOrganizationMember,
    findProfileByEmail,
    removeOrganizationMember,
    updateOrganizationName,
    userHasAnyMembership,
} from '../../api/organizations';
import { OrgSimple } from '../../types/organization';

type OrganizationPageContext = {
    currentOrg: OrgSimple | null;
};

export const OrganizationPage = () => {
    const { user, isSuperAdmin } = useAuth();
    const { currentOrg: contextOrg } = useOutletContext<OrganizationPageContext>();
    const queryClient = useQueryClient();

    const { data: userOrgs = [], isLoading: orgsLoading } = useUserOrganizations(user?.id);
    const organization = contextOrg ?? userOrgs[0] ?? null;

    const {
        data: members = [],
        isLoading: membersLoading,
        refetch: refetchMembers,
    } = useOrganizationMembers(organization?.id);

    const [editing, setEditing] = useState(false);
    const [orgNameInput, setOrgNameInput] = useState('');
    const [savingOrg, setSavingOrg] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'member'>('member');
    const [inviting, setInviting] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'team' | 'payments'>('team');

    useEffect(() => {
        if (organization?.name) {
            setOrgNameInput(organization.name);
        }
    }, [organization?.name]);

    const membershipRole = useMemo(() => {
        if (!organization || !user) return null;
        if (organization.owner_id === user.id) return 'owner';
        const member = members.find((m) => m.user_id === user.id);
        return member?.role ?? 'member';
    }, [organization, user, members]);

    const isOwner = membershipRole === 'owner';
    const canManageTeam = isOwner || membershipRole === 'admin';

    const handleUpdateOrg = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organization) return;
        const nextName = orgNameInput.trim();
        if (!nextName) return;

        setSavingOrg(true);
        setError(null);
        try {
            await updateOrganizationName(organization.id, nextName);
            setEditing(false);
            queryClient.invalidateQueries({ queryKey: ['userOrganizations', user?.id] });
        } catch (err: any) {
            setError(err.message || 'Failed to update organization');
        } finally {
            setSavingOrg(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organization) return;

        const email = inviteEmail.trim().toLowerCase();
        if (!email) {
            setInviteError('Email is required');
            return;
        }

        setInviting(true);
        setInviteError(null);

        try {
            const profile = await findProfileByEmail(email);

            if (!profile) {
                throw new Error('No user found with that email. Ask them to sign up first.');
            }

            const alreadyMember = members.some((m) => m.user_id === profile.id);
            if (alreadyMember) {
                throw new Error('User is already a member of this organization.');
            }

            const alreadyInOrg = await userHasAnyMembership(profile.id);
            if (alreadyInOrg) {
                throw new Error('User is already a member of another organization.');
            }

            await addOrganizationMember(organization.id, profile.id, inviteRole);

            setInviteEmail('');
            setInviteRole('member');
            await refetchMembers();
        } catch (err: any) {
            setInviteError(err.message || 'Failed to invite member');
        } finally {
            setInviting(false);
        }
    };

    const handleRemoveMember = async (member: Member) => {
        if (!organization) return;
        if (member.user_id === organization.owner_id) return;

        setRemovingId(member.id);
        setError(null);
        try {
            await removeOrganizationMember(member.id);
            await refetchMembers();
        } catch (err: any) {
            setError(err.message || 'Failed to remove member');
        } finally {
            setRemovingId(null);
        }
    };

    const isLoading = orgsLoading || (!!organization && membersLoading);

    const initialLetter = useMemo(() => {
        if (organization?.name) return organization.name.charAt(0).toUpperCase();
        return 'W';
    }, [organization?.name]);

    if (isLoading) {
        return (
            <div className="p-8 max-w-5xl mx-auto">
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 flex items-center justify-center text-slate-500">
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Loading organization...
                </div>
            </div>
        );
    }

    if (!organization) {
        return (
            <div className="p-8 max-w-3xl mx-auto space-y-6">
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 text-center">
                    <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <Building2 className="w-6 h-6 text-slate-400" />
                    </div>
                    <h1 className="text-xl font-semibold text-slate-900 mb-2">No Organization Found</h1>
                    <p className="text-sm text-slate-500 mb-4">You are not currently a member of any organization.</p>
                    {isSuperAdmin && (
                        <div className="mt-6 border-t border-slate-100 pt-6">
                            <Link to="/admin" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                                Go to Super Admin Dashboard
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                    {error}
                </div>
            )}

            <OrgHeader
                organization={organization}
                membershipRole={membershipRole}
                membersCount={members.length}
                initialLetter={initialLetter}
                canManage={canManageTeam}
                editing={editing}
                orgNameInput={orgNameInput}
                savingOrg={savingOrg}
                onEditToggle={setEditing}
                onOrgNameChange={setOrgNameInput}
                onSubmit={handleUpdateOrg}
            />

            <div className="border-b border-slate-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        type="button"
                        onClick={() => setActiveTab('team')}
                        className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'team' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500'
                        }`}
                    >
                        Team
                    </button>
                    {isOwner && (
                        <button
                            type="button"
                            onClick={() => setActiveTab('payments')}
                            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'payments' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500'
                            }`}
                        >
                            Payments
                        </button>
                    )}
                </nav>
            </div>

            {activeTab === 'team' && (
                <div className="space-y-6">
                    {canManageTeam && (
                        <InviteMemberForm
                            inviteEmail={inviteEmail}
                            inviteRole={inviteRole}
                            inviting={inviting}
                            inviteError={inviteError}
                            onInviteEmailChange={setInviteEmail}
                            onInviteRoleChange={setInviteRole}
                            onSubmit={handleInvite}
                        />
                    )}

                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">Team Members</h2>
                                <p className="text-sm text-slate-500">
                                    {canManageTeam
                                        ? "Manage who has access to your organization's workflows."
                                        : 'View members of this organization.'}
                                </p>
                            </div>
                        </div>

                        <MemberTable
                            members={members}
                            organization={organization}
                            canManage={canManageTeam}
                            removingId={removingId}
                            onRemove={handleRemoveMember}
                        />
                    </div>
                </div>
            )}

            {activeTab === 'payments' && isOwner && (
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4">Subscription Management</h2>
                    <p className="text-slate-600">This section is visible to owners only.</p>
                </div>
            )}
        </div>
    );
};