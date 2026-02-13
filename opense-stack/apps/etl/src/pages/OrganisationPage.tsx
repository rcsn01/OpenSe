import React, { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext, useSearchParams, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Users, CreditCard, Loader, XCircle, Activity, FileText } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@repo/shared/auth/context';
import { Member } from '../components/settings/types';

// New Imports
import { ModernOrgHeader } from '../components/organisation/OrgHeader';
import { OrganisationProvisioning } from '../components/organisation/OrganisationProvisioning';


// Existing Imports
import { InvitesList } from '../components/organisation/InvitesList';
import { CreateOrgForm } from '../components/organisation/CreateOrgForm';
import { useOrganisationMembers, useUserOrganisations } from '../hooks/queries/useOrganisations';
import {
    updateOrganisationName,
} from '../api/organisations';
import { OrgSimple } from '../types/organisation';
import clsx from 'clsx';
import { Button, Input } from '@repo/ui';
import { Tabs } from '../components/ui/Tabs';

// Context for AppLayout
type OrganisationPageContext = { currentOrg: OrgSimple | null; };

// Context passed to child routes
type OutletContextType = {
    currentOrg: OrgSimple | null;
    members: Member[];
    refetchMembers: () => Promise<any>;
    userRole: string | null;
};

export const OrganisationPage = () => {
    const { user } = useAuth();
    const { currentOrg: contextOrg } = useOutletContext<OrganisationPageContext>();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();

    // Check for Stripe redirect status
    const isStripeSuccess = searchParams.get('success') === 'true';
    const isStripeCanceled = searchParams.get('canceled') === 'true';

    const { data: userOrgs = [], isLoading: orgsLoading, refetch: refetchOrgs } = useUserOrganisations(user?.id);
    const organisation = contextOrg ?? userOrgs[0] ?? null;

    const { data: members = [], isLoading: membersLoading, refetch: refetchMembers } = useOrganisationMembers(organisation?.id);

    // Edit Org State
    const [isEditingOrg, setIsEditingOrg] = useState(false);
    const [orgNameInput, setOrgNameInput] = useState('');
    const [savingOrg, setSavingOrg] = useState(false);
    const [_genericError, setGenericError] = useState<string | null>(null);

    // No-Org View State
    const [noOrgTab, setNoOrgTab] = useState<'invites' | 'create'>('invites');

    // Provisioning state - show when returning from Stripe success
    const [isProvisioning, setIsProvisioning] = useState(isStripeSuccess && !organisation);

    // Clear URL params after reading them, and refresh org data on Stripe success
    useEffect(() => {
        if (isStripeSuccess || isStripeCanceled) {
            if (isStripeSuccess && organisation) {
                // Upgrade case: org exists, webhook should have updated tier — refetch
                queryClient.invalidateQueries({ queryKey: ['userOrganisations', user?.id] });
                refetchOrgs();
            }
            // Clear the query params from URL without triggering navigation
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('success');
            newParams.delete('canceled');
            setSearchParams(newParams, { replace: true });
        }
    }, [isStripeSuccess, isStripeCanceled, searchParams, setSearchParams]);

    // If org appears while provisioning, update state
    useEffect(() => {
        if (organisation && isProvisioning) {
            setIsProvisioning(false);
        }
    }, [organisation, isProvisioning]);

    // Sync org name to input when loaded
    useEffect(() => {
        if (organisation?.name) setOrgNameInput(organisation.name);
    }, [organisation?.name]);

    const membershipRole = useMemo(() => {
        if (!organisation || !user) return null;
        if (organisation.owner_id === user.id) return 'owner';
        return members.find((m) => m.user_id === user.id)?.role ?? 'member';
    }, [organisation, user, members]);


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

    // Handler for successful provisioning
    const handleProvisioningSuccess = (_org: OrgSimple) => {
        setIsProvisioning(false);
        queryClient.invalidateQueries({ queryKey: ['userOrganisations', user?.id] });
        refetchOrgs();
    };

    // Handler for canceling provisioning
    const handleProvisioningCancel = () => {
        setIsProvisioning(false);
    };

    // --- Render Provisioning State (after Stripe success) ---
    if (isProvisioning && user?.id) {
        return (
            <OrganisationProvisioning
                userId={user.id}
                onSuccess={handleProvisioningSuccess}
                onCancel={handleProvisioningCancel}
            />
        );
    }

    // --- Render Canceled State ---
    if (isStripeCanceled && !organisation) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-8">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
                    <div className="flex justify-center mb-6">
                        <XCircle className="w-12 h-12 text-amber-500" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900 mb-2">
                        Checkout Canceled
                    </h2>
                    <p className="text-slate-500 mb-6">
                        Your checkout was canceled. No charges were made. You can try again whenever you're ready.
                    </p>
                    <button
                        onClick={() => setNoOrgTab('create')}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

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

                {/* 2. Page Tabs (Navigation) */}
                <Tabs
                    tabs={[
                        { id: 'team', label: 'Team Management', icon: <Users className="w-4 h-4" /> },
                        { id: 'usage', label: 'Usage', icon: <Activity className="w-4 h-4" /> },
                        { id: 'logs', label: 'Logs', icon: <FileText className="w-4 h-4" /> },
                        ...(membershipRole === 'owner'
                            ? [{ id: 'billing', label: 'Billing & Settings', icon: <CreditCard className="w-4 h-4" /> }]
                            : []),
                    ]}
                    activeTab={location.pathname.split('/').pop() || 'team'}
                    onTabChange={(id) => navigate(id)}
                />

                {/* 3. Tab Content */}
                <Outlet context={{ currentOrg: organisation, members, refetchMembers, userRole: membershipRole } satisfies OutletContextType} />
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
                                    {savingOrg ? <Loader className="w-4 h-4 animate-spin mr-2" /> : null}
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
