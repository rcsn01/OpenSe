export type OrgRow = {
  id: string;
  name: string;
  created_at: string | null;
  owner?: { email: string | null; full_name: string | null } | null;
  member_count?: number | null;
  tier?: 'tier-1' | 'tier-2' | 'tier-3' | null;
  subscription_status?: string | null;
};

export type Message = { type: 'success' | 'error'; text: string } | null;

export type UsageStats = {
  success: number;
  failed: number;
  total: number;
};

export type UserUsageStats = {
  personalSuccess: number;
  personalFailed: number;
  orgSuccess: number;
  orgFailed: number;
};

export type UserOrgMembership = {
  org_id: string;
  org_name: string;
  role: 'admin' | 'editor' | 'member';
};

export type AdminUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at?: string;
  super_admin_members?: { user_id: string }[];
  memberships?: UserOrgMembership[];
};
