import React, { useEffect, useState, useRef } from 'react';
import { Plus, Building2, ChevronDown, Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { WorkflowTabs } from '../../components/dashboard/WorkflowTabs';
import { WorkflowTable } from '../../components/dashboard/WorkflowTable';
import { WorkflowRow } from '../../components/dashboard/types';

type OrgSimple = { id: string; name: string };

export const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Tabs & Workflow State
  const [activeTab, setActiveTab] = useState<'personal' | 'org'>('org');
  const [workflows, setWorkflows] = useState<WorkflowRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  // Org Selection State
  const [userOrgs, setUserOrgs] = useState<OrgSimple[]>([]);
  const [currentOrg, setCurrentOrg] = useState<OrgSimple | null>(null);
  const [isOrgMenuOpen, setIsOrgMenuOpen] = useState(false);
  const orgMenuRef = useRef<HTMLDivElement>(null);

  // Close org menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (orgMenuRef.current && !orgMenuRef.current.contains(event.target as Node)) {
        setIsOrgMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. Fetch User Organizations
  useEffect(() => {
    if (!user) return;
    
    const fetchOrgs = async () => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('organizations(id, name)')
        .eq('user_id', user.id);

      if (!error && data) {
        // Flatten the structure: organization_members -> organizations
        const mappedOrgs = data
          .map((item: any) => (Array.isArray(item.organizations) ? item.organizations[0] : item.organizations))
          .filter((o) => !!o) as OrgSimple[];
        
        setUserOrgs(mappedOrgs);
        
        // Default to first org if available and none selected
        if (mappedOrgs.length > 0 && !currentOrg) {
          setCurrentOrg(mappedOrgs[0]);
        }
      }
    };
    fetchOrgs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // 2. Fetch Workflows when Tab or Org changes
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
        // Org Mode
        if (!currentOrg) {
          setWorkflows([]);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('workflows')
          .select('id, name, created_at, owner_id, org_id')
          .eq('org_id', currentOrg.id)
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
  }, [activeTab, currentOrg?.id, user?.id]);

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

  const handleOrgSwitch = (org: OrgSimple) => {
    setCurrentOrg(org);
    setIsOrgMenuOpen(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      
      {/* Top Left Organization Switcher (Only if user has orgs) */}
      {userOrgs.length > 0 && (
        <div className="mb-4 relative inline-block text-left" ref={orgMenuRef}>
          <button
            type="button"
            onClick={() => setIsOrgMenuOpen(!isOrgMenuOpen)}
            className="inline-flex items-center justify-between w-full min-w-[200px] gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
          >
            <div className="flex items-center gap-2">
              <div className="p-1 bg-slate-100 rounded text-slate-600">
                <Building2 className="w-4 h-4" />
              </div>
              <span>{currentOrg?.name || 'Select Organization'}</span>
            </div>
            <ChevronDown className="-mr-1 h-5 w-5 text-slate-400" aria-hidden="true" />
          </button>

          {isOrgMenuOpen && (
            <div className="absolute left-0 z-10 mt-2 w-56 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1">
                {userOrgs.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => handleOrgSwitch(org)}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-slate-700 hover:bg-slate-100"
                  >
                    <span className="truncate">{org.name}</span>
                    {currentOrg?.id === org.id && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user?.user_metadata?.full_name || 'Guest'}</h1>
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
    </div>
  );
};