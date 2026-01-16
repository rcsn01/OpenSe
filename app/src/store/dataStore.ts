import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { WorkflowRow } from '../components/dashboard/types';

interface DataState {
  workflows: WorkflowRow[];
  workflowsLoaded: boolean;
  loading: boolean;
  isRefreshing: boolean;
  error: string | null;
  
  // Actions
  fetchWorkflows: (userId: string, orgId: string | null, isBackgroundRefresh?: boolean) => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  reset: () => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  workflows: [],
  workflowsLoaded: false,
  loading: false,
  isRefreshing: false,
  error: null,

  fetchWorkflows: async (userId, orgId, isBackgroundRefresh = false) => {
    const state = get();
    if (state.loading && !isBackgroundRefresh) return;

    if (state.workflows.length === 0 && !isBackgroundRefresh) {
      set({ loading: true, error: null });
    } else {
      set({ isRefreshing: true, error: null });
    }

    try {
      let query = supabase
        .from('workflows')
        .select('id, name, created_at, owner_id, org_id')
        .order('created_at', { ascending: false });

      if (orgId) {
        query = query.eq('org_id', orgId);
      } else {
        query = query.eq('owner_id', userId).is('org_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      set({ workflows: data || [], workflowsLoaded: true, loading: false, isRefreshing: false });
    } catch (err: any) {
      set({ error: err.message, loading: false, isRefreshing: false });
    }
  },

  deleteWorkflow: async (id: string) => {
    try {
      const { error } = await supabase.from('workflows').delete().eq('id', id);
      if (error) throw error;
      
      // Update local state immediately
      set((state) => ({
        workflows: state.workflows.filter(w => w.id !== id)
      }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  reset: () => set({ workflows: [], workflowsLoaded: false, loading: false, isRefreshing: false, error: null })
}));
