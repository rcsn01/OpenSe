import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { WorkflowTable } from './WorkflowTable';
import { useDeleteWorkflow, useWorkflows } from '../../hooks/queries/useWorkflows';
import { OrgSimple } from '../../types/organisation';

type DashboardContextType = { currentOrg: OrgSimple | null };

type WorkflowListProps = {
    mode: 'personal' | 'org';
};

export const WorkflowList = ({ mode }: WorkflowListProps) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    // Using context from DashboardPage layout
    const { currentOrg } = useOutletContext<DashboardContextType>() || { currentOrg: null };

    const [search, setSearch] = useState('');

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
                search={search}
                onSearchChange={setSearch}
                onEdit={(id) => navigate(`/editor/${id}`)}
                onDelete={handleDelete}
            />

            <Link
                to={mode === 'org' && currentOrg ? `/editor/new?orgId=${currentOrg.id}` : '/editor/new'}
                className="mt-6 block w-full rounded-xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-blue-500 hover:bg-blue-50/50 transition-all group bg-white/50"
            >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 group-hover:bg-blue-100 transition-colors">
                    <Plus className="h-6 w-6 text-slate-500 group-hover:text-blue-600 transition-colors" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-slate-900 group-hover:text-blue-700">Create a new workflow</h3>
                <p className="mt-1 text-sm text-slate-500">
                    {mode === 'org' && currentOrg
                        ? `Start a new shared workflow in ${currentOrg.name}`
                        : 'Start a new private workflow'}
                </p>
            </Link>
        </>
    );
};
