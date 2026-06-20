export const formatProfileName = (
  profile: { full_name: string | null; username: string | null; email: string | null } | null,
) => profile?.full_name || profile?.username || profile?.email || 'Unknown user'
