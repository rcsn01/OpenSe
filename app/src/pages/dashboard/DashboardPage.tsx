import React, { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { WorkflowTabs } from '../../components/dashboard/WorkflowTabs';
import { WorkflowTable } from '../../components/dashboard/WorkflowTable';
import { WorkflowRow } from '../../components/dashboard/types';

type OrgSimple = { id: string; name: string };
type DashboardContextType = { currentOrg: OrgSimple | null };

export const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Get currentOrg from AppLayout via Outlet context
  const { currentOrg } = useOutletContext<DashboardContextType>();
  const currentOrgId = currentOrg?.id || null;
  
  // Tabs & Workflow State
  const [activeTab, setActiveTab] = useState<'personal' | 'org'>('org');
  const [workflows, setWorkflows] = useState<WorkflowRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Fetch Workflows when Tab or Org changes
  const fetchWorkflows = useCallback(async (mountRef?: { current: boolean }) => {
    if (mountRef?.current === false) return;
    if (!user) {
      if (mountRef?.current !== false) {
        setWorkflows([]);
        setLoading(false);
      }
      return;
    }

    if (mountRef?.current !== false) {
      setLoading(true);
      setError(null);
    }

    try {
      if (activeTab === 'personal') {
        const { data, error } = await supabase
          .from('workflows')
          .select('id, name, created_at, owner_id, org_id')
          .eq('owner_id', user.id)
          .is('org_id', null)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (mountRef?.current !== false) {
          setWorkflows(data || []);
        }
      } else {
        if (!currentOrgId) {
          if (mountRef?.current !== false) {
            setWorkflows([]);
          }
          return;
        }

        const { data, error } = await supabase
          .from('workflows')
          .select('id, name, created_at, owner_id, org_id')
          .eq('org_id', currentOrgId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (mountRef?.current !== false) {
          setWorkflows(data || []);
        }
      }
    } catch (err: any) {
      if (mountRef?.current !== false) {
        setError(err.message || 'Failed to load workflows');
        setWorkflows([]);
      }
    } finally {
      if (mountRef?.current !== false) {
        setLoading(false);
      }
    }
  }, [activeTab, currentOrgId, user?.id]);

  useEffect(() => {
    const mountRef = { current: true };
    fetchWorkflows(mountRef);
    return () => {
      mountRef.current = false;
    };
  }, [fetchWorkflows]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this workflow?')) return;
    try {
      const { error } = await supabase.from('workflows').delete().eq('id', id);
      if (error) throw error;
      await fetchWorkflows();
    } catch (err: any) {
      setError(err.message || 'Failed to delete workflow');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user?.user_metadata?.full_name || 'Guest'}</h1>
          <p className="text-slate-500 mt-1">Manage your data workflows and automations.</p>
        </div>
        {/* Button removed from here */}
      </div>

      {/* Tabs */}
      <WorkflowTabs 
        activeTab={activeTab} 
        onChange={setActiveTab} 
        orgName={currentOrg?.name} 
      />

      <WorkflowTable
        workflows={workflows}
        loading={loading}
        error={error}
        search={search}
        onSearchChange={setSearch}
        onEdit={(id) => navigate(`/editor/${id}`)}
        onDelete={handleDelete}
      />

      {/* New Workflow Area */}
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