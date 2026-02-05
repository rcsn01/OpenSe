import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { WorkflowTabs } from '../components/dashboard/WorkflowTabs';
import { WorkflowTable } from '../components/dashboard/WorkflowTable';
import { useDeleteWorkflow, useWorkflows } from '../hooks/queries/useWorkflows';

type OrgSimple = { id: string; name: string };
type DashboardContextType = { currentOrg: OrgSimple | null };

export const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { currentOrg } = useOutletContext<DashboardContextType>();

  // Initialize from localStorage, default to 'org'
  const [activeTab, setActiveTab] = useState<'personal' | 'org'>(() => {
    const saved = localStorage.getItem('dashboard_active_tab');
    return (saved === 'personal' || saved === 'org') ? saved : 'org';
  });

  const [search, setSearch] = useState('');

  // Automatically switch to personal if user has no org but tab is set to org
  useEffect(() => {
    if (!currentOrg && activeTab === 'org') {
      setActiveTab('personal');
      localStorage.setItem('dashboard_active_tab', 'personal');
    }
  }, [currentOrg, activeTab]);

  const handleTabChange = (tab: 'personal' | 'org') => {
    setActiveTab(tab);
    localStorage.setItem('dashboard_active_tab', tab);
  };

  const {
    data: workflows = [],
    isLoading,
    error: queryError,
  } = useWorkflows({
    userId: user?.id,
    orgId: currentOrg?.id,
    mode: activeTab,
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
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user?.user_metadata?.full_name || 'Guest'}</h1>
          <p className="text-slate-500 mt-1">Manage your data workflows and automations.</p>
        </div>
      </div>

      <WorkflowTabs
        activeTab={activeTab}
        onChange={handleTabChange}
        orgName={currentOrg?.name}
      />

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
        to={activeTab === 'org' && currentOrg ? `/editor/new?orgId=${currentOrg.id}` : '/editor/new'}
        className="mt-6 block w-full rounded-xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-blue-500 hover:bg-blue-50/50 transition-all group bg-white/50"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 group-hover:bg-blue-100 transition-colors">
          <Plus className="h-6 w-6 text-slate-500 group-hover:text-blue-600 transition-colors" />
        </div>
        <h3 className="mt-3 text-sm font-semibold text-slate-900 group-hover:text-blue-700">Create a new workflow</h3>
        <p className="mt-1 text-sm text-slate-500">
          {activeTab === 'org' && currentOrg 
            ? `Start a new shared workflow in ${currentOrg.name}` 
            : 'Start a new private workflow'}
        </p>
      </Link>
    </div>
  );
};