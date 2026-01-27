import React, { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Building2, Loader2, Users, CreditCard } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { Member } from '../../components/settings/types';
import { OrgHeader } from '../../components/settings/OrgHeader';
import { TeamSettings } from '../../components/organisation/TeamSettings';
import { PaymentSettings } from '../../components/organisation/PaymentSettings';
import { InvitesList } from '../../components/organisation/InvitesList';
import { CreateOrgForm } from '../../components/organisation/CreateOrgForm';
import { useOrganisationMembers, useUserOrganisations } from '../../hooks/queries/useOrganisations';
import {
    addOrganisationMember,
    findProfileByEmail,
    removeOrganisationMember,
    updateOrganisationName,
    userHasAnyMembership,
} from '../../api/organisations';
import { OrgSimple } from '../../types/organisation';
import clsx from 'clsx';

type OrganisationPageContext = { currentOrg: OrgSimple | null; };

export const OrganisationPage = () => {
    const { user, isSuperAdmin } = useAuth();
    const { currentOrg: contextOrg } = useOutletContext<OrganisationPageContext>();
    const queryClient = useQueryClient();

    const { data: userOrgs = [], isLoading: orgsLoading } = useUserOrganisations(user?.id);
    const organisation = contextOrg ?? userOrgs[0] ?? null;

    const { data: members = [], isLoading: membersLoading, refetch: refetchMembers } = useOrganisationMembers(organisation?.id);

    // Form/UI States
    const [activeTab, setActiveTab] = useState<'team' | 'payments'>('team');
    const [editing, setEditing] = useState(false);
    const [orgNameInput, setOrgNameInput] = useState('');
    const [savingOrg, setSavingOrg] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'member'>('member');
    const [inviting, setInviting] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);
    // State for No-Org view
    const [noOrgTab, setNoOrgTab] = useState<'invites' | 'create'>('invites');

    useEffect(() => { if (organisation?.name) setOrgNameInput(organisation.name); }, [organisation?.name]);

    const membershipRole = useMemo(() => {
        if (!organisation || !user) return null;
        if (organisation.owner_id === user.id) return 'owner';
        return members.find((m) => m.user_id === user.id)?.role ?? 'member';
    }, [organisation, user, members]);

    const canManageTeam = membershipRole === 'owner' || membershipRole === 'admin';

    const handleUpdateOrg = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organisation) return;
        const nextName = orgNameInput.trim();
        if (!nextName || nextName === organisation.name) {
            setEditing(false);
            return;
        }

        setSavingOrg(true);
        setError(null);
        try {
            await updateOrganisationName(organisation.id, nextName);
            await queryClient.invalidateQueries({ queryKey: ['userOrganisations', user?.id] });
            setEditing(false);
        } catch (err: any) {
            setError(err?.message ?? 'Failed to update organisation.');
        } finally {
            setSavingOrg(false);
        }
    };

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

            const alreadyMember = await userHasAnyMembership(profile.id);
            if (alreadyMember) {
                setInviteError('User is already assigned to an organisation.');
                return;
            }

            await addOrganisationMember(organisation.id, profile.id, inviteRole);
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

        setRemovingId(member.id);
        setError(null);
        try {
            await removeOrganisationMember(member.id);
            await refetchMembers();
            queryClient.invalidateQueries({ queryKey: ['userOrganisations', user?.id] });
        } catch (err: any) {
            setError(err?.message ?? 'Failed to remove member.');
        } finally {
            setRemovingId(null);
        }
    };

    const handleUpdateRole = async (memberId: string, newRole: 'admin' | 'editor' | 'member') => {
        // Mock role update - in real app would call API
        console.log('Update role', memberId, newRole);
    };

    if (orgsLoading || (!!organisation && membersLoading)) {
        return (
            <div className="p-8 max-w-5xl mx-auto flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }



    if (!organisation) {
        return (
            <div className="p-8 max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-900">Welcome to OpenETL</h1>
                    <p className="text-slate-500">Join an existing team or create a new one to get started.</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="border-b border-slate-200">
                        <div className="flex">
                            <button
                                onClick={() => setNoOrgTab('invites')}
                                className={clsx(
                                    "flex-1 py-4 text-sm font-medium text-center border-b-2 transition-colors",
                                    noOrgTab === 'invites' ? "border-blue-500 text-blue-600 bg-blue-50/30" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                                )}
                            >
                                Invitations
                            </button>
                            <button
                                onClick={() => setNoOrgTab('create')}
                                className={clsx(
                                    "flex-1 py-4 text-sm font-medium text-center border-b-2 transition-colors",
                                    noOrgTab === 'create' ? "border-blue-500 text-blue-600 bg-blue-50/30" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                                )}
                            >
                                Create Organisation
                            </button>
                        </div>
                    </div>

                    <div className="p-8">
                        {noOrgTab === 'invites' ? (
                            <InvitesList onAccepted={() => queryClient.invalidateQueries({ queryKey: ['userOrganisations', user?.id] })} />
                        ) : (
                            <CreateOrgForm onCreated={() => queryClient.invalidateQueries({ queryKey: ['userOrganisations', user?.id] })} />
                        )}
                    </div>
                </div>

                {isSuperAdmin && (
                    <div className="mt-8 text-center">
                        <Link to="/admin" className="text-blue-600 hover:underline font-medium text-sm">
                            Go to Super Admin Dashboard
                        </Link>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            <OrgHeader
                organisation={organisation}
                membershipRole={membershipRole}
                membersCount={members.length}
                initialLetter={organisation.name.charAt(0).toUpperCase()}
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
                    <TabButton
                        active={activeTab === 'team'}
                        onClick={() => setActiveTab('team')}
                        icon={<Users className="w-4 h-4" />}
                        label="Team"
                    />
                    {membershipRole === 'owner' && (
                        <TabButton
                            active={activeTab === 'payments'}
                            onClick={() => setActiveTab('payments')}
                            icon={<CreditCard className="w-4 h-4" />}
                            label="Payments"
                        />
                    )}
                </nav>
            </div>

            {activeTab === 'team' ? (
                <TeamSettings
                    organisation={organisation}
                    members={members}
                    canManageTeam={canManageTeam}
                    inviteEmail={inviteEmail}
                    inviteRole={inviteRole}
                    inviting={inviting}
                    inviteError={inviteError}
                    removingId={removingId}
                    onInviteEmailChange={setInviteEmail}
                    onInviteRoleChange={setInviteRole}
                    onInviteSubmit={handleInvite}
                    onRemoveMember={handleRemoveMember}
                    onUpdateRole={handleUpdateRole}
                />
            ) : (
                <PaymentSettings organisation={organisation} />
            )}
        </div>
    );
};

const TabButton = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) => (
    <button
        type="button"
        onClick={onClick}
        className={clsx(
            "pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-all",
            active ? "border-blue-500 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
        )}
    >
        {icon}
        {label}
    </button>
);