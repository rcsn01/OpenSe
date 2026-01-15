import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';
import { WorkflowRow } from '../components/dashboard/types';

export type GalleryWorkflow = WorkflowRow & {
  description: string | null;
  graph_data: any;
  owner: { full_name: string | null } | null;
};

export const useGallery = () => {
  const fetchTemplates = useCallback(async () => {
    const { data, error } = await supabase
      .from('workflows')
      .select('id, name, description, created_at, owner_id, org_id, graph_data, owner:profiles!workflows_owner_id_fkey(full_name)')
      .eq('is_template', true)
      .order('created_at', { ascending: false });

    const formatted = (data || []).map((item) => ({
      ...item,
      owner: Array.isArray(item.owner) ? item.owner[0] : item.owner,
    }));

    return { data: formatted as GalleryWorkflow[], error };
  }, []);

  const { data, loading, error, refresh } = useSupabaseQuery<GalleryWorkflow[]>(
    fetchTemplates,
    []
  );

  return { templates: data || [], loading, error, refresh };
};
