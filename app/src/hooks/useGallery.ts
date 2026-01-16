import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { WorkflowRow } from '../components/dashboard/types';

export type GalleryWorkflow = WorkflowRow & {
  description: string | null;
  graph_data: any;
  owner: { full_name: string | null } | null;
};

export const useGallery = () => {
  const [data, setData] = useState<GalleryWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('workflows')
        .select('id, name, description, created_at, owner_id, org_id, graph_data, owner:profiles!workflows_owner_id_fkey(full_name)')
        .eq('is_template', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((item) => ({
        ...item,
        owner: Array.isArray(item.owner) ? item.owner[0] : item.owner,
      }));

      setData(formatted as GalleryWorkflow[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return { templates: data, loading, error, refresh: fetchTemplates };
};