export type Organisation = {
  id: string;
  name: string;
  owner_id?: string;
  created_at?: string | null;
};

export type Member = {
  id: string;
  user_id: string;
  role: 'admin' | 'editor' | 'member';
  profiles?: {
    email: string | null;
    full_name: string | null;
  } | null;
};
