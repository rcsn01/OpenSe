import React, { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { WorkflowTabs } from '../../components/dashboard/WorkflowTabs';
import { WorkflowTable } from '../../components/dashboard/WorkflowTable';
import { WorkflowRow } from '../../components/dashboard/types';

export const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'personal' | 'org'>('org');
  const [workflows, setWorkflows] = useState<WorkflowRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchWorkflows = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'personal') {
        const { data, error } = await supabase
          .from('workflows')
          .select('id, name, created_at, owner_id, org_id')
          .eq('owner_id', user.id)
          .is('org_id', null)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setWorkflows(data || []);
      } else {
        const { data: memberships, error: memError } = await supabase
          .from('organization_members')
          .select('org_id')
          .eq('user_id', user.id);

        if (memError) throw memError;

        const orgIds = (memberships || []).map((m) => m.org_id).filter(Boolean);
        if (orgIds.length === 0) {
          setWorkflows([]);
          return;
        }

        const { data, error } = await supabase
          .from('workflows')
          .select('id, name, created_at, owner_id, org_id')
          .in('org_id', orgIds)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setWorkflows(data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load workflows');
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user?.id]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from('workflows').delete().eq('id', id);
      if (error) throw error;
      await fetchWorkflows();
    } catch (err: any) {
      setError(err.message || 'Failed to delete workflow');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, Guest</h1>
          <p className="text-slate-500 mt-1">Manage your data workflows and automations.</p>
        </div>
        <Link
            to="/editor/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm font-medium"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Workflow
        </Link>
      </div>

      {/* Tabs */}
      <WorkflowTabs activeTab={activeTab} onChange={setActiveTab} />

      <WorkflowTable
        workflows={workflows}
        loading={loading}
        error={error}
        search={search}
        onSearchChange={setSearch}
        onEdit={(id) => navigate(`/editor/${id}`)}
        onDelete={handleDelete}
      />
    </div>
  );
};
