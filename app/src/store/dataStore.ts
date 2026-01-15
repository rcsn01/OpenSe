import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { WorkflowRow } from '../components/dashboard/types';

interface DataState {
  workflows: WorkflowRow[];
  workflowsLoaded: boolean;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchWorkflows: (userId: string, orgId: string | null) => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  reset: () => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  workflows: [],
  workflowsLoaded: false,
  loading: false,
  error: null,

  fetchWorkflows: async (userId, orgId) => {
    // If we're already loading or have data, don't fetch unless needed
    // NOTE: In a real app, you might want a way to force refresh
    if (get().loading) return;
    
    // If we have data and it's for the same context (simplified here), we could skip.
    // For now, let's keep it simple as requested.
    set({ loading: true, error: null });

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
      set({ workflows: data || [], workflowsLoaded: true, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
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

  reset: () => set({ workflows: [], workflowsLoaded: false, loading: false, error: null })
}));
