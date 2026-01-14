export type OrgRow = {
  id: string;
  name: string;
  created_at: string | null;
  owner?: { email: string | null; full_name: string | null } | null;
  member_count?: number | null;
};

export type Message = { type: 'success' | 'error'; text: string } | null;
