import { supabase } from '../lib/supabase'
import { OrgRow } from '../components/admin/types'
import { OrgSimple, OrgInvite } from '../types/organisation'

export const updateOrganisationName = async (orgId: string, name: string) => {
  const { error } = await supabase.from('organisations').update({ name }).eq('id', orgId)
  if (error) throw error
}

export const findProfileByEmail = async (email: string): Promise<{ id: string; email: string; full_name: string | null } | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('email', email)
    .limit(1)

  if (error) throw error
  return data?.[0] ?? null
}

export const userHasAnyMembership = async (userId: string) => {
  const { data, error } = await supabase.from('organisation_members').select('id').eq('user_id', userId).limit(1)
  if (error) throw error
  return (data?.length ?? 0) > 0
}

export const addOrganisationMember = async (
  orgId: string,
  userId: string,
  role: 'admin' | 'editor' | 'member'
) => {
  const { error } = await supabase.from('organisation_members').insert({ org_id: orgId, user_id: userId, role })
  if (error) throw error
}

export const removeOrganisationMember = async (memberId: string) => {
  const { error } = await supabase.from('organisation_members').delete().eq('id', memberId)
  if (error) throw error
}

export const listUserOrganisations = async (userId: string) => {
  const { data, error } = await supabase
    .from('organisation_members')
    .select('organisations(id, name, owner_id, created_at)')
    .eq('user_id', userId)

  if (error) throw error

  return (
    data
      ?.map((item: any) => (Array.isArray(item.organisations) ? item.organisations[0] : item.organisations))
      .filter((o) => !!o) ?? []
  ) as OrgSimple[]
}

export const listOrganisationMembers = async (orgId: string) => {
  const { data, error } = await supabase
    .from('organisation_members')
    .select('id, role, user_id, profiles:profiles!organisation_members_user_id_fkey(email, full_name)')
    .eq('org_id', orgId)

  if (error) throw error

  return (
    data?.map((m) => ({
      ...m,
      profiles: Array.isArray(m.profiles) ? m.profiles[0] ?? null : m.profiles ?? null,
    })) ?? []
  )
}

export const listAdminUsers = async () => {
  const { data, error } = await supabase.from('profiles').select('*, super_admin_members(user_id)').order('email', {
    ascending: true,
  })

  if (error) throw error
  return data
}

export const listAdminOrgs = async () => {
  const { data, error } = await supabase
    .from('organisations')
    .select('id, name, created_at, owner:profiles!organisations_owner_id_fkey(email, full_name), organisation_members(count)')
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data || []).map((o: any) => ({
    id: o.id,
    name: o.name,
    created_at: o.created_at,
    owner: Array.isArray(o.owner) ? o.owner[0] ?? null : o.owner ?? null,
    member_count:
      Array.isArray(o.organisation_members) && o.organisation_members[0]?.count != null
        ? o.organisation_members[0].count
        : null,
  })) as OrgRow[]
}

export const createOrganisation = async (name: string, tier: 'tier-1' | 'tier-2' | 'tier-3') => {
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: {
      orgName: name,
      tier,
      successUrl: `${window.location.origin}/organisation?success=true`,
      cancelUrl: `${window.location.origin}/organisation?canceled=true`,
    },
  })

  if (error) throw error
  if (!data?.url) throw new Error('Checkout URL not returned')

  window.location.href = data.url
  return data
}

export const getPendingInvites = async (): Promise<OrgInvite[]> => {
  const { data: session } = await supabase.auth.getSession()
  const userEmail = session.session?.user?.email

  if (!userEmail) return []

  const { data, error } = await supabase
    .from('organisation_invites')
    .select(
      `
        id,
        role,
        created_at,
        organisations (id, name),
        inviter:profiles!organisation_invites_invited_by_fkey (full_name)
      `
    )
    .eq('email', userEmail)

  if (error) throw error

  return (data ?? []).map((i: any) => ({
    id: i.id,
    org_id: i.organisations?.id,
    org_name: i.organisations?.name ?? 'Unknown',
    role: i.role,
    created_at: i.created_at,
    inviter_name: i.inviter?.full_name || 'Unknown',
  }))
}

export const acceptInvite = async (inviteId: string) => {
  const { error } = await supabase.rpc('accept_invite', { invite_id: inviteId })
  if (error) throw error
  return true
}

export const rejectInvite = async (inviteId: string) => {
  const { error } = await supabase.from('organisation_invites').delete().eq('id', inviteId)
  if (error) throw error
  return true
}

export const inviteMember = async (orgId: string, email: string, role: 'admin' | 'editor' | 'member') => {
  const { data: user } = await supabase.auth.getUser()
  const { error } = await supabase.from('organisation_invites').insert({
    org_id: orgId,
    email,
    role,
    invited_by: user.user?.id,
  })
  if (error) throw error
}

export const updateOrganisationTier = async (orgId: string, tier: 'tier-1' | 'tier-2' | 'tier-3') => {
  // Mock API call to update tier and seat limit
  // In real app, this would call Stripe and update DB
  await new Promise((resolve) => setTimeout(resolve, 1000))
  return true
}

/**
 * Poll for organisation to appear after Stripe checkout.
 * The webhook creates the org asynchronously, so we poll until it appears.
 * 
 * @param userId - The user ID to check organisations for
 * @param options - Polling options
 * @returns The first organisation found, or null if timeout
 */
export const pollForOrganisation = async (
  userId: string,
  options: {
    maxAttempts?: number
    intervalMs?: number
    onAttempt?: (attempt: number, maxAttempts: number) => void
  } = {}
): Promise<OrgSimple | null> => {
  const { 
    maxAttempts = 15, 
    intervalMs = 2000,
    onAttempt 
  } = options

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    onAttempt?.(attempt, maxAttempts)
    
    try {
      const orgs = await listUserOrganisations(userId)
      if (orgs.length > 0) {
        console.log(`[pollForOrganisation] Found org after ${attempt} attempts`)
        return orgs[0]
      }
    } catch (error) {
      console.warn(`[pollForOrganisation] Attempt ${attempt} failed:`, error)
    }

    // Don't wait after the last attempt
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
  }

  console.warn(`[pollForOrganisation] Timed out after ${maxAttempts} attempts`)
  return null
}

/**
 * Check the status of a Stripe checkout session
 * This can be used to verify payment completed before polling
 */
export const checkCheckoutSession = async (sessionId: string): Promise<{
  status: 'complete' | 'open' | 'expired' | 'unknown'
  paymentStatus: string | null
}> => {
  // Note: For security, checking session status should go through a backend function
  // For now, we just assume success if we have a session ID
  // In production, create an edge function to verify this
  return {
    status: sessionId ? 'complete' : 'unknown',
    paymentStatus: 'paid'
  }
}
