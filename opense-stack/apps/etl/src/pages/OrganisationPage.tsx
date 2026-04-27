import React, { useMemo } from 'react';
import { useOutletContext, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Users, Activity, FileText, ShieldCheck } from 'lucide-react';
import { BasePage, StackLayout } from '@repo/ui';
import { useAuth } from '@repo/shared/auth/context';
import { Member } from '../components/settings/types';

import { useOrganisationMembers, useUserOrganisations } from '../hooks/queries/useOrganisations';
import { OrgSimple } from '../types/organisation';
import { Tabs } from '../components/ui/Tabs';

// Context for AppLayout
type OrganisationPageContext = {
    currentOrg: OrgSimple | null;
    teamSearch?: string;
    setTeamSearch?: (value: string) => void;
};

// Context passed to child routes
type OutletContextType = {
    currentOrg: OrgSimple | null;
    members: Member[];
    refetchMembers: () => Promise<any>;
    userRole: string | null;
    teamSearch?: string;
    setTeamSearch?: (value: string) => void;
};

export const OrganisationPage = () => {
    const { user } = useAuth();
    const { currentOrg: contextOrg, teamSearch, setTeamSearch } = useOutletContext<OrganisationPageContext>();
    const location = useLocation();
    const navigate = useNavigate();

    const { data: userOrgs = [], isLoading: orgsLoading } = useUserOrganisations(user?.id);
    const organisation = contextOrg ?? userOrgs[0] ?? null;

    const { data: members = [], isLoading: membersLoading, refetch: refetchMembers } = useOrganisationMembers(organisation?.id);

    const membershipRole = useMemo(() => {
        if (!organisation || !user) return null;
        if (organisation.owner_id === user.id) return 'owner';
        return members.find((m) => m.user_id === user.id)?.role ?? 'member';
    }, [organisation, user, members]);


    // --- Render Loading ---
    if (orgsLoading || (!!organisation && membersLoading)) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-600" />
                <p>Loading organisation details...</p>
            </div>
        );
    }

    // --- Render Main View ---
    return (
        <BasePage>
            <StackLayout>
                {/* Page Tabs (Navigation) */}
                <Tabs
                    tabs={[
                        { id: 'team', label: 'Teams', icon: <Users className="w-4 h-4" /> },
                        { id: 'permissions', label: 'Permissions', icon: <ShieldCheck className="w-4 h-4" /> },
                        { id: 'usage', label: 'Usage', icon: <Activity className="w-4 h-4" /> },
                        { id: 'logs', label: 'Logs', icon: <FileText className="w-4 h-4" /> },
                    ]}
                    activeTab={location.pathname.split('/').pop() || 'team'}
                    onTabChange={(id) => navigate(id)}
                    bottomSpacing
                />

                {/* Tab Content */}
                <Outlet
                    context={{
                        currentOrg: organisation,
                        members,
                        refetchMembers,
                        userRole: membershipRole,
                        teamSearch,
                        setTeamSearch,
                    } satisfies OutletContextType}
                />
            </StackLayout>
        </BasePage>
    );
};
