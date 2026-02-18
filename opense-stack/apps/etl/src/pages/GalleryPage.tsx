import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Search, Copy, LayoutTemplate, Loader2, GitFork, AlertCircle } from 'lucide-react';
import { useAuth } from '@repo/shared/auth/context';
import { useGallery, GalleryWorkflow } from '../hooks/useGallery';
import { Input, Button, BasePage } from '@repo/ui';
import { cloneWorkflowFromTemplate } from '../api/workflows';

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
  const { data: templates = [], isLoading: loading, error: queryError } = useGallery();
  const error = queryError instanceof Error ? queryError.message : null;
  const { user, isDemoUser } = useAuth();
  const navigate = useNavigate();
  const { currentOrg } = useOutletContext<AppContextType>() || {};
  const [search, setSearch] = useState('');
  const [cloningId, setCloningId] = useState<string | null>(null);

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleClone = async (template: GalleryWorkflow) => {
    if (!user) return;
    setCloningId(template.id);

    try {
      const newId = await cloneWorkflowFromTemplate({
        template: { id: template.id, name: template.name, description: template.description, graph_data: template.graph_data },
        ownerId: user.id,
        orgId: currentOrg?.id || null,
      });

      navigate(`/editor/${newId}`);
    } catch (err: any) {
      console.error('Failed to clone workflow:', err);
      alert('Failed to clone workflow: ' + (err?.message || '')); 
    } finally {
      setCloningId(null);
    }
  };

  return (
    <BasePage>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <LayoutTemplate className="w-6 h-6 text-blue-600" />
            Workflow Gallery
          </h1>
          <p className="text-slate-500 mt-1">
            Browse admin-configured workflows and clone them to{' '}
            {currentOrg ? <strong>{currentOrg.name}</strong> : 'your personal workspace'}.
          </p>
        </div>
        <div className="w-full md:w-72">
          <Input
            prefix={<Search className="w-4 h-4" />}
            placeholder="Search workflows..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200 mb-6 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Error loading gallery: {error}
        </div>
      )}

      {isDemoUser && (
        <div className="p-4 bg-amber-50 text-amber-800 rounded-md border border-amber-200 mb-6 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Demo mode is enabled. Workflow Gallery shows demo workflows, not admin-configured workflows.
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin mb-4" />
          <p>Loading workflows...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group"
            >
              <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors">
                    <GitFork className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200">
                    {getNodeCount(template.graph_data)} Nodes
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {template.name}
                </h3>
                <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">
                  {template.description || 'No description provided for this workflow.'}
                </p>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs text-slate-500 flex flex-col">
                  <span>Author</span>
                  <span className="font-medium text-slate-700">{template.owner?.full_name || 'System'}</span>
                </div>
                <Button
                  variant="secondary"
                  className="text-xs px-3 py-1.5 h-auto"
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
            </div>
          ))}

          {filteredTemplates.length === 0 && (
            <div className="col-span-full text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <LayoutTemplate className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No workflows found matching "{search}"</p>
              <p className="text-slate-400 text-sm">Try adjusting your search terms.</p>
            </div>
          )}
        </div>
      )}
    </BasePage>
  );
};
