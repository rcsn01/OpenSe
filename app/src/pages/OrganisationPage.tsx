import React, { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Loader2, Users, CreditCard, Loader } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { Member } from '../components/settings/types';

// New Imports
import { ModernOrgHeader } from '../components/organisation/OrgHeader';
import { ModernTeamSettings } from '../components/organisation/TeamSettings';

// Existing Imports
import { PaymentSettings } from '../components/organisation/PaymentSettings';
import { InvitesList } from '../components/organisation/InvitesList';
import { CreateOrgForm } from '../components/organisation/CreateOrgForm';
import { useOrganisationMembers, useUserOrganisations } from '../hooks/queries/useOrganisations';
import {
    addOrganisationMember,
    findProfileByEmail,
    removeOrganisationMember,
    updateOrganisationName,
    userHasAnyMembership,
} from '../api/organisations';
import { OrgSimple } from '../types/organisation';
import clsx from 'clsx';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

type OrganisationPageContext = { currentOrg: OrgSimple | null; };

export const OrganisationPage = () => {
    const { user, isSuperAdmin } = useAuth();
    const { currentOrg: contextOrg } = useOutletContext<OrganisationPageContext>();
    const queryClient = useQueryClient();

    const { data: userOrgs = [], isLoading: orgsLoading } = useUserOrganisations(user?.id);
    const organisation = contextOrg ?? userOrgs[0] ?? null;

    const { data: members = [], isLoading: membersLoading, refetch: refetchMembers } = useOrganisationMembers(organisation?.id);

    // View State
    const [activeTab, setActiveTab] = useState<'team' | 'payments'>('team');
    
    // Edit Org State
    const [isEditingOrg, setIsEditingOrg] = useState(false);
    const [orgNameInput, setOrgNameInput] = useState('');
    const [savingOrg, setSavingOrg] = useState(false);
    
    // Invite State
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'member'>('member');
    const [inviting, setInviting] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);
    
    // Member Action State
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [genericError, setGenericError] = useState<string | null>(null);

    // No-Org View State
    const [noOrgTab, setNoOrgTab] = useState<'invites' | 'create'>('invites');

    // Sync org name to input when loaded
    useEffect(() => { 
        if (organisation?.name) setOrgNameInput(organisation.name); 
    }, [organisation?.name]);

    const membershipRole = useMemo(() => {
        if (!organisation || !user) return null;
        if (organisation.owner_id === user.id) return 'owner';
        return members.find((m) => m.user_id === user.id)?.role ?? 'member';
    }, [organisation, user, members]);

    const canManageTeam = membershipRole === 'owner' || membershipRole === 'admin';

    // --- Handlers ---

    const handleUpdateOrg = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organisation) return;
        const nextName = orgNameInput.trim();
        if (!nextName || nextName === organisation.name) {
            setIsEditingOrg(false);
            return;
        }

        setSavingOrg(true);
        setGenericError(null);
        try {
            await updateOrganisationName(organisation.id, nextName);
            await queryClient.invalidateQueries({ queryKey: ['userOrganisations', user?.id] });
            setIsEditingOrg(false);
        } catch (err: any) {
            setGenericError(err?.message ?? 'Failed to update organisation.');
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
            // Optional: Close modal here if you want to control it from parent, 
            // but currently the modal control is inside ModernTeamSettings. 
            // We'd ideally lift that state up if we wanted to close it programmatically on success.
            // For now, the user manually closes it or sees the success state.
            
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

        if(!window.confirm(`Are you sure you want to remove ${member.profiles?.email}?`)) return;

        setRemovingId(member.id);
        setGenericError(null);
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
        // Mock implementation until API supports it
        console.log('Role update requested:', memberId, newRole);
        // In a real app: await updateMemberRole(memberId, newRole); refetchMembers();
    };

    // --- Render Loading ---
    if (orgsLoading || (!!organisation && membersLoading)) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-600" />
                <p>Loading organisation details...</p>
            </div>
        );
    }

    // --- Render No Organisation View ---
    if (!organisation) {
        return (
            <div className="p-8 max-w-4xl mx-auto min-h-screen">
                <div className="mb-10 text-center">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome to OpenETL</h1>
                    <p className="text-slate-500 mt-2 text-lg">Join an existing team or create a new organisation to get started.</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden">
                    <div className="border-b border-slate-200 bg-slate-50/50">
                        <div className="flex">
                            <button
                                onClick={() => setNoOrgTab('invites')}
                                className={clsx(
                                    "flex-1 py-4 text-sm font-semibold text-center border-b-2 transition-all",
                                    noOrgTab === 'invites' ? "border-blue-600 text-blue-600 bg-white" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                                )}
                            >
                                Pending Invitations
                            </button>
                            <button
                                onClick={() => setNoOrgTab('create')}
                                className={clsx(
                                    "flex-1 py-4 text-sm font-semibold text-center border-b-2 transition-all",
                                    noOrgTab === 'create' ? "border-blue-600 text-blue-600 bg-white" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                                )}
                            >
                                Create Organisation
                            </button>
                        </div>
                    </div>

                    <div className="p-8 min-h-[300px]">
                        {noOrgTab === 'invites' ? (
                            <InvitesList onAccepted={() => queryClient.invalidateQueries({ queryKey: ['userOrganisations', user?.id] })} />
                        ) : (
                            <CreateOrgForm onCreated={() => queryClient.invalidateQueries({ queryKey: ['userOrganisations', user?.id] })} />
                        )}
                    </div>
                </div>

                {isSuperAdmin && (
                    <div className="mt-12 text-center">
                        <Link to="/admin" className="text-slate-400 hover:text-blue-600 hover:underline font-medium text-sm transition-colors">
                            Access Super Admin Dashboard
                        </Link>
                    </div>
                )}
            </div>
        );
    }

    // --- Render Main View ---
    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                
                {/* 1. Header Command Center */}
                <ModernOrgHeader 
                    organisation={organisation}
                    membersCount={members.length}
                    userRole={membershipRole || 'member'}
                    onEdit={() => setIsEditingOrg(true)}
                />

                {/* 2. Page Tabs */}
                <div className="flex border-b border-slate-200 mb-8 overflow-x-auto gap-8">
                    <button
                        onClick={() => setActiveTab('team')}
                        className={clsx(
                            "pb-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-all whitespace-nowrap",
                            activeTab === 'team' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                        )}
                    >
                        <Users className="w-4 h-4" /> Team Management
                    </button>
                    {membershipRole === 'owner' && (
                        <button
                            onClick={() => setActiveTab('payments')}
                            className={clsx(
                                "pb-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-all whitespace-nowrap",
                                activeTab === 'payments' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                            )}
                        >
                            <CreditCard className="w-4 h-4" /> Billing & Usage
                        </button>
                    )}
                </div>

                {/* 3. Tab Content */}
                {activeTab === 'team' ? (
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
                ) : (
                    <PaymentSettings organisation={organisation} />
                )}
            </div>

            {/* Edit Organisation Modal */}
            {isEditingOrg && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 border border-slate-200 animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Edit Organisation Details</h3>
                        
                        <form onSubmit={handleUpdateOrg} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Organisation Name</label>
                                <Input 
                                    autoFocus
                                    value={orgNameInput} 
                                    onChange={(e) => setOrgNameInput(e.target.value)}
                                />
                            </div>
                            
                            <div className="flex justify-end gap-3 mt-6">
                                <Button type="button" variant="secondary" onClick={() => setIsEditingOrg(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={savingOrg}>
                                    {savingOrg ? <Loader className="w-4 h-4 animate-spin mr-2"/> : null}
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};