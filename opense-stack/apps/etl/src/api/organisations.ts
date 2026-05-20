import { supabase } from '../lib/supabase'
import { OrgSimple, OrgInvite } from '../types/organisation'
import {
  getPendingOrganisationInvites,
  acceptOrganisationInvite,
  declineOrganisationInvite,
  inviteOrganisationMember,
} from '@repo/shared/organisation-invites'
import { getRuntimeConfigValue } from '@repo/shared/runtime-config'

const parseResponseBody = async (response: Response): Promise<any> => {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return response.json()
  }

  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

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

export const updateOrganisationMemberRole = async (
  memberId: string,
  role: 'admin' | 'editor' | 'member',
) => {
  const { data: currentMember, error: currentMemberError } = await supabase
    .from('organisation_members')
    .select('role')
    .eq('id', memberId)
    .single()

  if (currentMemberError) throw currentMemberError

  if (currentMember?.role === 'owner') {
    throw new Error('Owner role is system-managed and cannot be changed directly.')
  }

  const { error } = await supabase
    .from('organisation_members')
    .update({ role })
    .eq('id', memberId)

  if (error) throw error
}

export const listUserOrganisations = async (userId: string) => {
  const { data, error } = await supabase
    .from('organisation_members')
    .select('organisations:organisations!organisation_members_org_id_fkey(id, name, owner_id, created_at)')
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



export const getPendingInvites = async (): Promise<OrgInvite[]> => {
  return getPendingOrganisationInvites()
}

export const acceptInvite = async (inviteId: string) => {
  await acceptOrganisationInvite(inviteId)
  return true
}

export const rejectInvite = async (inviteId: string) => {
  await declineOrganisationInvite(inviteId)
  return true
}

export const inviteMember = async (orgId: string, email: string, role: 'admin' | 'editor' | 'member') => {
  await inviteOrganisationMember(orgId, email, role)
}

export const updateOrganisationTier = async (
  orgId: string,
  tier: 'tier-1' | 'tier-2' | 'tier-3',
  orgName?: string
) => {
  // Get fresh session for edge function calls
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData?.session?.access_token
  const supabaseUrl = getRuntimeConfigValue('VITE_SUPABASE_URL')
  const anonKey = getRuntimeConfigValue('VITE_SUPABASE_ANON_KEY')

  if (!accessToken) {
    throw new Error('Missing authenticated session. Please sign in again and retry.')
  }

  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing Supabase environment variables for edge-function calls.')
  }

  // Try update-subscription first via direct fetch
  let updateResult: { data: any; error: any } = { data: null, error: null }
  try {
    const updateRes = await window.fetch(`${supabaseUrl}/functions/v1/update-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({ orgId, tier }),
    })
    const updateBody = await parseResponseBody(updateRes)

    if (!updateRes.ok) {
      updateResult.error = new Error(updateBody?.error || updateBody?.message || `HTTP ${updateRes.status}`)
    } else {
      updateResult.data = updateBody
    }
  } catch (error: unknown) {
    updateResult.error = error
  }

  if (updateResult.error) {
    // Fallback: create-checkout via direct fetch
    if (orgName) {
      const successUrl = `${window.location.origin}/organisation?success=true`
      const cancelUrl = `${window.location.origin}/organisation?canceled=true`

      const checkoutRes = await window.fetch(`${supabaseUrl}/functions/v1/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({ orgName, tier, successUrl, cancelUrl, orgId }),
      })
      const checkoutBody = await parseResponseBody(checkoutRes)

      if (!checkoutRes.ok) {
        throw new Error(checkoutBody?.error || checkoutBody?.message || `HTTP ${checkoutRes.status}`)
      }
      if (!checkoutBody?.url) throw new Error('Checkout URL not returned')
      return { paymentUrl: checkoutBody.url, message: 'Checkout started' }
    }

    throw updateResult.error
  }
  if (updateResult.data?.error) throw new Error(updateResult.data.error)
  return updateResult.data
}

