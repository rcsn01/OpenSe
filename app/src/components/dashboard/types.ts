export type WorkflowRow = {
  id: string;
  name: string;
  created_at: string | null;
  owner_id: string;
  org_id: string | null;
};

export type WorkflowTabsProps = {
  activeTab: 'personal' | 'org';
  onChange: (tab: 'personal' | 'org') => void;
  orgName?: string;
};

export type WorkflowTableProps = {
  workflows: WorkflowRow[];
  loading: boolean;
  error: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};
