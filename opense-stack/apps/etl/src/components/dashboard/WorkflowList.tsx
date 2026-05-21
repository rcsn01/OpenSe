import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '@repo/shared/auth/context';
import {
    Alert,
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@repo/ui';
import { WorkflowTable } from './WorkflowTable';
import { useDeleteWorkflow, useWorkflows } from '../../hooks/queries/useWorkflows';
import { OrgSimple } from '../../types/organisation';

type DashboardContextType = {
    currentOrg: OrgSimple | null;
    dashboardSearch?: string;
};

type WorkflowListProps = {
    mode: 'personal' | 'org';
};

export const WorkflowList = ({ mode }: WorkflowListProps) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { currentOrg, dashboardSearch = '' } = useOutletContext<DashboardContextType>() || {
        currentOrg: null,
        dashboardSearch: '',
    };
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

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
    const createHref = mode === 'org' && currentOrg ? `/editor/new?orgId=${currentOrg.id}` : '/editor/new';
    const pendingDeleteWorkflow = workflows.find((workflow) => workflow.id === pendingDeleteId) ?? null;

    const handleDelete = () => {
        if (!pendingDeleteId) return;

        setDeleteError(null);
        deleteMutation.mutate(pendingDeleteId, {
            onSuccess: () => {
                setPendingDeleteId(null);
            },
            onError: (err) => {
                setDeleteError(err instanceof Error ? err.message : 'Failed to delete workflow');
            },
        });
    };

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-lg font-semibold text-[var(--color-foreground)]">
                        {mode === 'org' && currentOrg ? `${currentOrg.name} workflows` : 'Personal workflows'}
                    </h1>
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                        {mode === 'org' && currentOrg
                            ? 'Shared drafts and operational workflows for this organisation.'
                            : 'Private drafts and workflows owned by you.'}
                    </p>
                </div>

                <Link
                    to={createHref}
                    className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-foreground)] shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--color-primary-hover)]"
                >
                    <Plus className="h-4 w-4" />
                    New workflow
                </Link>
            </div>

            {deleteError ? (
                <Alert variant="destructive" dismissible onDismiss={() => setDeleteError(null)}>
                    {deleteError}
                </Alert>
            ) : null}

            <WorkflowTable
                workflows={workflows}
                loading={isLoading}
                error={errorMessage}
                search={dashboardSearch}
                onEdit={(id) => navigate(`/editor/${id}`)}
                onDelete={(id) => setPendingDeleteId(id)}
            />

            <Dialog open={Boolean(pendingDeleteId)} onClose={() => setPendingDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete workflow</DialogTitle>
                        <DialogDescription>
                            {pendingDeleteWorkflow
                                ? `Delete "${pendingDeleteWorkflow.name}"? This action cannot be undone.`
                                : 'Delete this workflow? This action cannot be undone.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setPendingDeleteId(null)}
                            disabled={deleteMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDelete}
                            loading={deleteMutation.isPending}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
