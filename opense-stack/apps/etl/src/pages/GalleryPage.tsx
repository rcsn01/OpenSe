import { useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Copy, Loader2, GitFork } from 'lucide-react';
import { useAuth } from '@repo/shared/auth/context';
import { useGalleryTemplates } from '../hooks/gallery/useGalleryTemplates';
import { Alert, Badge, Button, Card, EmptyState, Spinner } from '@repo/ui';
import { cloneWorkflowFromTemplate } from '../api/workflows';
import type { GalleryWorkflow } from '../api/gallery';
import { ETLPageShell } from '../components/ETLPageShell';
import { useTopBarSearchValue } from '../components/Search/TopBarSearch';

const getNodeCount = (graphData: any) => {
  if (!graphData) return 0;
  try {
    const data = typeof graphData === 'string' ? JSON.parse(graphData) : graphData;
    return data?.nodes?.length || 0;
  } catch {
    return 0;
  }
};

type AppContextType = {
  currentOrg: { id: string; name: string } | null;
};

export const GalleryPage = () => {
  const { data: templates = [], isLoading: loading, error: queryError } = useGalleryTemplates();
  const error = queryError instanceof Error ? queryError.message : null;
  const { user } = useAuth();
  const navigate = useNavigate();
  const { currentOrg } = useOutletContext<AppContextType>() || {};
  const { searchValue: gallerySearch } = useTopBarSearchValue();
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [cloneError, setCloneError] = useState<string | null>(null);
  const searchConfig = useMemo(() => ({
    searchKey: 'gallery-templates',
    placeholder: 'Search templates...',
    emptyMessage: 'No templates found.',
    suggestions: templates.map((template) => ({
      id: template.id,
      title: template.name,
      value: template.name,
      subtitle: template.description ?? undefined,
      badge: `${getNodeCount(template.graph_data)} nodes`,
    })),
  }), [templates]);

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(gallerySearch.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(gallerySearch.toLowerCase())
  );

  const handleClone = async (template: GalleryWorkflow) => {
    if (!user) return;
    setCloningId(template.id);
    setCloneError(null);

    try {
      const newId = await cloneWorkflowFromTemplate({
        template: { id: template.id, name: template.name, description: template.description, graph_data: template.graph_data },
        ownerId: user.id,
        orgId: currentOrg?.id || null,
      });

      navigate(`/editor/${newId}`);
    } catch (err: any) {
      console.error('Failed to clone workflow:', err);
      setCloneError('Failed to clone workflow: ' + (err?.message || 'Unknown error'));
    } finally {
      setCloningId(null);
    }
  };

  return (
    <ETLPageShell search={searchConfig}>
      {error && (
        <Alert variant="destructive" title="Error loading gallery">
          Error loading gallery: {error}
        </Alert>
      )}

      {cloneError && (
        <Alert variant="destructive" dismissible onDismiss={() => setCloneError(null)}>
          {cloneError}
        </Alert>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--color-muted-foreground)]">
          <Spinner size="lg" className="mb-4" />
          <p>Loading workflows...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTemplates.map((template) => (
            <Card
              key={template.id}
              className="flex min-h-[13rem] flex-col overflow-hidden border border-[var(--color-border)] bg-[var(--color-card)]"
              padding="none"
              hoverable
            >
              <div className="flex flex-1 flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-muted)] text-[var(--color-primary)]">
                    <GitFork className="w-5 h-5" />
                  </div>
                  <Badge variant="outline">
                    {getNodeCount(template.graph_data)} Nodes
                  </Badge>
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-[var(--color-foreground)]">
                    {template.name}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--color-muted-foreground)]">
                    {template.description || 'No description provided for this workflow.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] px-5 py-3">
                <div className="min-w-0 text-xs text-[var(--color-muted-foreground)]">
                  <span>Author</span>
                  <p className="truncate font-medium text-[var(--color-foreground)]">{template.owner?.full_name || 'System'}</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleClone(template)}
                  disabled={!!cloningId}
                >
                  {cloningId === template.id ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                  ) : (
                    <Copy className="w-3 h-3 mr-1.5" />
                  )}
                  Clone
                </Button>
              </div>
            </Card>
          ))}

          {filteredTemplates.length === 0 && (
            <div className="col-span-full rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] py-14">
              <EmptyState
                title="No templates found"
                description={gallerySearch ? `No results for "${gallerySearch}".` : 'No workflow templates are available.'}
              />
            </div>
          )}
        </div>
      )}
    </ETLPageShell>
  );
};
