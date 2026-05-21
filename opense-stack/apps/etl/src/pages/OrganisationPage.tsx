import { useMemo } from 'react';
import { useOutletContext, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Users, Activity, FileText, ShieldCheck } from 'lucide-react';
import { ContentTabs, Spinner } from '@repo/ui';
import { useAuth } from '@repo/shared/auth/context';
import { Member } from '../components/settings/types';

import { useOrganisationMembers, useUserOrganisations } from '../hooks/queries/useOrganisations';
import { OrgSimple } from '../types/organisation';
import { ETLPageShell } from '../components/ETLPageShell';
import { useTopBarSearchValue } from '../components/Search/TopBarSearch';

// Context for AppLayout
type OrganisationPageContext = {
    currentOrg: OrgSimple | null;
};

// Context passed to child routes
type OutletContextType = {
    currentOrg: OrgSimple | null;
    members: Member[];
    refetchMembers: () => Promise<any>;
    userRole: string | null;
    teamSearch?: string;
};

export const OrganisationPage = () => {
    const { user } = useAuth();
    const { currentOrg: contextOrg } = useOutletContext<OrganisationPageContext>();
    const location = useLocation();
    const navigate = useNavigate();
    const activeTab = location.pathname.split('/').pop() || 'team';
    const { searchValue: teamSearch } = useTopBarSearchValue();

    const { data: userOrgs = [], isLoading: orgsLoading } = useUserOrganisations(user?.id);
    const organisation = contextOrg ?? userOrgs[0] ?? null;

    const { data: members = [], isLoading: membersLoading, refetch: refetchMembers } = useOrganisationMembers(organisation?.id);

    const membershipRole = useMemo(() => {
        if (!organisation || !user) return null;
        if (organisation.owner_id === user.id) return 'owner';
        return members.find((m) => m.user_id === user.id)?.role ?? 'member';
    }, [organisation, user, members]);

    const searchConfig = useMemo(() => ({
        searchKey: 'organisation-team',
        enabled: activeTab === 'team',
        placeholder: 'Search members...',
        emptyMessage: 'No members found.',
        suggestions: members.map((member) => ({
            id: member.id,
            title: member.profiles?.full_name || member.profiles?.email || 'Unknown Member',
            value: member.profiles?.full_name || member.profiles?.email || member.user_id,
            subtitle: member.profiles?.email || member.user_id,
            badge: member.role,
            keywords: [member.role],
        })),
    }), [activeTab, members]);


    // --- Render Loading ---
    if (orgsLoading || (!!organisation && membersLoading)) {
        return (
            <ETLPageShell search={{ ...searchConfig, enabled: false }}>
                <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-[var(--color-muted-foreground)]">
                    <Spinner size="lg" className="mb-4" />
                    <p>Loading organisation details...</p>
                </div>
            </ETLPageShell>
        );
    }

    // --- Render Main View ---
    return (
        <ETLPageShell search={searchConfig}>
            <ContentTabs
                tabs={[
                    {
                        id: 'team',
                        label: 'Teams',
                        icon: <Users className="w-4 h-4" />,
                        content: <Outlet
                            context={{
                                currentOrg: organisation,
                                members,
                                refetchMembers,
                                userRole: membershipRole,
                                teamSearch,
                            } satisfies OutletContextType}
                        />,
                    },
                    {
                        id: 'permissions',
                        label: 'Permissions',
                        icon: <ShieldCheck className="w-4 h-4" />,
                        content: <Outlet
                            context={{
                                currentOrg: organisation,
                                members,
                                refetchMembers,
                                userRole: membershipRole,
                                teamSearch,
                            } satisfies OutletContextType}
                        />,
                    },
                    {
                        id: 'usage',
                        label: 'Usage',
                        icon: <Activity className="w-4 h-4" />,
                        content: <Outlet
                            context={{
                                currentOrg: organisation,
                                members,
                                refetchMembers,
                                userRole: membershipRole,
                                teamSearch,
                            } satisfies OutletContextType}
                        />,
                    },
                    {
                        id: 'logs',
                        label: 'Logs',
                        icon: <FileText className="w-4 h-4" />,
                        content: <Outlet
                            context={{
                                currentOrg: organisation,
                                members,
                                refetchMembers,
                                userRole: membershipRole,
                                teamSearch,
                            } satisfies OutletContextType}
                        />,
                    },
                ]}
                activeTab={activeTab}
                onTabChange={(id) => navigate(`/organisation/${id}`)}
                bottomSpacing
                contentClassName="overflow-hidden"
            />
        </ETLPageShell>
    );
};
