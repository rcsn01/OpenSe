import React, { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDataStore } from '../../store/dataStore';
import { WorkflowTabs } from '../../components/dashboard/WorkflowTabs';
import { WorkflowTable } from '../../components/dashboard/WorkflowTable';

type OrgSimple = { id: string; name: string };
type DashboardContextType = { currentOrg: OrgSimple | null };

export const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { currentOrg } = useOutletContext<DashboardContextType>();
  
  const { workflows, loading, error, fetchWorkflows, deleteWorkflow } = useDataStore();
  
  const [activeTab, setActiveTab] = useState<'personal' | 'org'>('org');
  const [search, setSearch] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      // Fetch workflows for the current context
      fetchWorkflows(user.id, activeTab === 'org' ? currentOrg?.id || null : null);
    }
  }, [user, currentOrg, activeTab, fetchWorkflows]);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this workflow?')) return;
    setLocalError(null);
    try {
      await deleteWorkflow(id);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to delete workflow');
    }
  }, [deleteWorkflow]);

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
        onChange={setActiveTab}
        orgName={currentOrg?.name}
      />

      <WorkflowTable
        workflows={workflows}
        loading={loading}
        error={error || localError}
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