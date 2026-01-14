import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, FileSpreadsheet, Clock, Trash2, Edit } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

type WorkflowRow = {
  id: string;
  name: string;
  created_at: string | null;
  owner_id: string;
  org_id: string | null;
};

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

  const filteredWorkflows = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return workflows;
    return workflows.filter((w) => w.name.toLowerCase().includes(term));
  }, [workflows, search]);

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

  const formatDate = (value: string | null) => {
    if (!value) return '—';
    const d = new Date(value);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
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
      <div className="border-b border-slate-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('personal')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'personal'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            My Personal Workflows
          </button>
          <button
            onClick={() => setActiveTab('org')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'org'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            W-ETL Workflows
          </button>
        </nav>
      </div>

      {/* Filters & Search */}
      <div className="flex items-center mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search workflows..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="min-w-full divide-y divide-slate-200">
          <div className="bg-slate-50 grid grid-cols-12 gap-4 px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
            <div className="col-span-4">Name</div>
            <div className="col-span-3">Owner</div>
            <div className="col-span-3">Created</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          <div className="divide-y divide-slate-200 bg-white">
            {loading ? (
              <div className="px-6 py-10 text-center text-slate-500">Loading workflows...</div>
            ) : error ? (
              <div className="px-6 py-10 text-center text-red-600">{error}</div>
            ) : filteredWorkflows.length > 0 ? filteredWorkflows.map((workflow) => (
              <div key={workflow.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 transition-colors">
                <div className="col-span-4 flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg mr-3 text-blue-600">
                        <FileSpreadsheet className="w-5 h-5"/>
                    </div>
                    <div>
                        <Link to={`/editor/${workflow.id}`} className="font-medium text-slate-900 hover:text-blue-600 block">
                            {workflow.name}
                        </Link>
                        <span className="text-xs text-slate-500">ID: {workflow.id}</span>
                    </div>
                </div>
                <div className="col-span-3 text-sm text-slate-600 flex items-center">
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center mr-2 text-xs font-bold text-slate-500">
                        {workflow.owner_id ? workflow.owner_id.charAt(0).toUpperCase() : '?' }
                    </div>
                    <span className="truncate" title={workflow.owner_id}>{workflow.owner_id || 'Unknown'}</span>
                </div>
                <div className="col-span-3 text-sm text-slate-500 flex items-center">
                    <Clock className="w-4 h-4 mr-1.5 text-slate-400"/>
                    {formatDate(workflow.created_at)}
                </div>
                <div className="col-span-2 flex justify-end gap-2">
                    <button
                      onClick={() => navigate(`/editor/${workflow.id}`)}
                      className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(workflow.id)}
                      disabled={deletingId === workflow.id}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
              </div>
            )) : (
              <div className="px-6 py-12 text-center text-slate-500">
                <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p>No workflows found in this view.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
