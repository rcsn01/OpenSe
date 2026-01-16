import React, { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { WorkflowTabs } from '../../components/dashboard/WorkflowTabs';
import { WorkflowTable } from '../../components/dashboard/WorkflowTable';
import { WorkflowRow } from '../../components/dashboard/types';

type OrgSimple = { id: string; name: string };
type DashboardContextType = { currentOrg: OrgSimple | null };

export const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { currentOrg } = useOutletContext<DashboardContextType>();

  const [activeTab, setActiveTab] = useState<'personal' | 'org'>('org');
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    if (!user) return { data: [], error: null };

    const orgId = activeTab === 'org' ? currentOrg?.id || null : null;

    let query = supabase
      .from('workflows')
      .select('id, name, created_at, owner_id, org_id')
      .order('created_at', { ascending: false });

    if (orgId) {
      query = query.eq('org_id', orgId);
    } else {
      // Personal tab: workflows owned by user AND not part of any org
      query = query.eq('owner_id', user.id).is('org_id', null);
    }

    return await query;
  }, [user, activeTab, currentOrg?.id]);

  const { data, loading, error, refresh } = useSupabaseQuery<WorkflowRow[]>(
    fetchWorkflows,
    [activeTab, currentOrg?.id],
    { enabled: !!user }
  );

  const workflows = data || [];

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this workflow?')) return;
    setActionError(null);
    try {
      const { error } = await supabase.from('workflows').delete().eq('id', id);
      if (error) throw error;
      
      await refresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete workflow');
    }
  }, [refresh]);

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
        error={error || actionError}
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