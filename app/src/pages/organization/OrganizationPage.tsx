import React, { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Building2, Loader2, Users, CreditCard } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { Member } from '../../components/settings/types';
import { OrgHeader } from '../../components/settings/OrgHeader';
import { TeamSettings } from '../../components/organization/TeamSettings';
import { PaymentSettings } from '../../components/organization/PaymentSettings';
import { useOrganizationMembers, useUserOrganizations } from '../../hooks/queries/useOrganizations';
import {
    addOrganizationMember,
    findProfileByEmail,
    removeOrganizationMember,
    updateOrganizationName,
    userHasAnyMembership,
} from '../../api/organizations';
import { OrgSimple } from '../../types/organization';
import clsx from 'clsx';

type OrganizationPageContext = { currentOrg: OrgSimple | null; };

export const OrganizationPage = () => {
    const { user, isSuperAdmin } = useAuth();
    const { currentOrg: contextOrg } = useOutletContext<OrganizationPageContext>();
    const queryClient = useQueryClient();

    const { data: userOrgs = [], isLoading: orgsLoading } = useUserOrganizations(user?.id);
    const organization = contextOrg ?? userOrgs[0] ?? null;

    const { data: members = [], isLoading: membersLoading, refetch: refetchMembers } = useOrganizationMembers(organization?.id);

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

    useEffect(() => { if (organization?.name) setOrgNameInput(organization.name); }, [organization?.name]);

    const membershipRole = useMemo(() => {
        if (!organization || !user) return null;
        if (organization.owner_id === user.id) return 'owner';
        return members.find((m) => m.user_id === user.id)?.role ?? 'member';
    }, [organization, user, members]);

    const canManageTeam = membershipRole === 'owner' || membershipRole === 'admin';

    const handleUpdateOrg = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organization) return;
        const nextName = orgNameInput.trim();
        if (!nextName || nextName === organization.name) {
            setEditing(false);
            return;
        }

        setSavingOrg(true);
        setError(null);
        try {
            await updateOrganizationName(organization.id, nextName);
            await queryClient.invalidateQueries({ queryKey: ['userOrganizations', user?.id] });
            setEditing(false);
        } catch (err: any) {
            setError(err?.message ?? 'Failed to update organization.');
        } finally {
            setSavingOrg(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organization) return;

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
                setInviteError('User is already assigned to an organization.');
                return;
            }

            await addOrganizationMember(organization.id, profile.id, inviteRole);
            setInviteEmail('');
            setInviteRole('member');
            await refetchMembers();
            queryClient.invalidateQueries({ queryKey: ['userOrganizations', user?.id] });
        } catch (err: any) {
            setInviteError(err?.message ?? 'Failed to invite member.');
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
            queryClient.invalidateQueries({ queryKey: ['userOrganizations', user?.id] });
        } catch (err: any) {
            setError(err?.message ?? 'Failed to remove member.');
        } finally {
            setRemovingId(null);
        }
    };

    if (orgsLoading || (!!organization && membersLoading)) {
        return (
            <div className="p-8 max-w-5xl mx-auto flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!organization) {
        return (
            <div className="p-8 max-w-3xl mx-auto">
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12 text-center">
                    <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h1 className="text-xl font-semibold text-slate-900 mb-2">No Organization Found</h1>
                    <p className="text-slate-500 mb-6">You are not currently a member of any organization.</p>
                    {isSuperAdmin && (
                        <Link to="/admin" className="text-blue-600 hover:underline font-medium text-sm">
                            Go to Super Admin Dashboard
                        </Link>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            <OrgHeader
                organization={organization}
                membershipRole={membershipRole}
                membersCount={members.length}
                initialLetter={organization.name.charAt(0).toUpperCase()}
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
                    organization={organization}
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
                />
            ) : (
                <PaymentSettings />
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