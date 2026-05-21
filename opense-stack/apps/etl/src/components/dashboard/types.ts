export type WorkflowRow = {
  id: string;
  name: string;
  created_at: string | null;
  owner_id: string;
  org_id: string | null;
  owner?: {
    full_name: string | null;
    email?: string | null;
  };
};

export type WorkflowTableProps = {
  workflows: WorkflowRow[];
  loading: boolean;
  error: string | null;
  search: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};
