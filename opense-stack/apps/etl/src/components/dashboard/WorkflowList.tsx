import { Plus } from 'lucide-react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '@repo/shared/auth/context';
import { WorkflowTable } from './WorkflowTable';
import { useDeleteWorkflow, useWorkflows } from '../../hooks/queries/useWorkflows';
import { OrgSimple } from '../../types/organisation';

type DashboardContextType = {
    currentOrg: OrgSimple | null;
    dashboardSearch?: string;
    setDashboardSearch?: (value: string) => void;
};

type WorkflowListProps = {
    mode: 'personal' | 'org';
};

export const WorkflowList = ({ mode }: WorkflowListProps) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { currentOrg, dashboardSearch = '', setDashboardSearch } = useOutletContext<DashboardContextType>() || {
        currentOrg: null,
        dashboardSearch: '',
        setDashboardSearch: () => {},
    };

    const {
        data: workflows = [],
        isLoading,
        error: queryError,
    } = useWorkflows({
        userId: user?.id,
        orgId: currentOrg?.id,
        mode: mode,
    });

    const deleteMutation = useDeleteWorkflow();
    const errorMessage = queryError instanceof Error ? queryError.message : null;

    const handleDelete = (id: string) => {
        if (!window.confirm('Are you sure you want to delete this workflow?')) return;

        deleteMutation.mutate(id, {
            onError: (err) => {
                alert(err instanceof Error ? err.message : 'Failed to delete workflow');
            },
        });
    };

    return (
        <>
            <WorkflowTable
                workflows={workflows}
                loading={isLoading}
                error={errorMessage}
                search={dashboardSearch}
                onSearchChange={setDashboardSearch ?? (() => {})}
                onEdit={(id) => navigate(`/editor/${id}`)}
                onDelete={handleDelete}
            />

            <Link
                to={mode === 'org' && currentOrg ? `/editor/new?orgId=${currentOrg.id}` : '/editor/new'}
                className="mt-6 block w-full rounded-xl border border-slate-700 bg-slate-900 p-8 text-center hover:border-blue-500 hover:bg-slate-800 transition-all group"
            >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 group-hover:bg-blue-500/20 transition-colors">
                <Plus className="h-6 w-6 text-slate-400 group-hover:text-blue-400 transition-colors" />
                    </div>
                <h3 className="mt-3 text-sm font-semibold text-slate-200 group-hover:text-blue-400">Create a new workflow</h3>
                <p className="mt-1 text-sm text-slate-500">
                    {mode === 'org' && currentOrg
                        ? `Start a new shared workflow in ${currentOrg.name}`
                        : 'Start a new private workflow'}
                </p>
            </Link>
        </>
    );
};
