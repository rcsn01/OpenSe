import { supabase, db } from '../lib/supabase'
import { OrgSimple, OrgInvite } from '../types/organisation'
import {
  getPendingOrganisationInvites,
  acceptOrganisationInvite,
  declineOrganisationInvite,
  inviteOrganisationMember,
} from '@repo/shared/organisation-invites'

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
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

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
 * REMOVED: checkCheckoutSession stub (Audit S1 - OWASP A01: Broken Access Control).
 *
 * The previous implementation returned status: 'complete' for ANY session ID
 * without server-side verification, allowing trivial payment bypass.
 *
 * Checkout verification is now handled server-side by the stripe-webhook
 * edge function, which creates the organisation only after Stripe confirms
 * payment. The client uses pollForOrganisation() to wait for the result.
 */
