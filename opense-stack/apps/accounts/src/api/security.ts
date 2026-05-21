import { supabase } from '@repo/shared/supabase'
import { updatePassword } from '@repo/shared/auth'

export interface AccountSessionSummary {
  userId: string
  email: string | null
  expiresAt: string | null
  lastSignInAt: string | null
}

export interface MfaFactor {
  id: string
  factorType: string
  status: string
  friendlyName: string | null
  createdAt: string | null
}

export interface MfaEnrollment {
  factorId: string
  qrCode: string | null
  secret: string | null
}

export const changeAccountPassword = updatePassword

export const getCurrentSessionSummary = async (): Promise<AccountSessionSummary> => {
  const [{ data: sessionData }, { data: userData, error: userError }] = await Promise.all([
    supabase.auth.getSession(),
    supabase.auth.getUser(),
  ])

  if (userError) throw userError
  const user = userData.user
  if (!user) throw new Error('No authenticated user found.')

  return {
    userId: user.id,
    email: user.email ?? null,
    expiresAt: sessionData.session?.expires_at ? new Date(sessionData.session.expires_at * 1000).toISOString() : null,
    lastSignInAt: user.last_sign_in_at ?? null,
  }
}

export const requestRecoveryEmailChange = async (email: string): Promise<void> => {
  const nextEmail = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
    throw new Error('Enter a valid recovery email.')
  }

  const { error } = await supabase.rpc('accounts_update_recovery_email', { p_recovery_email: nextEmail })
  if (error) throw error
}

export const listMfaFactors = async (): Promise<MfaFactor[]> => {
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) throw error

  const factors = [
    ...((data?.totp ?? []) as any[]),
    ...((data?.phone ?? []) as any[]),
  ]

  return factors.map((factor) => ({
    id: factor.id,
    factorType: factor.factor_type ?? 'totp',
    status: factor.status ?? 'unknown',
    friendlyName: factor.friendly_name ?? null,
    createdAt: factor.created_at ?? null,
  }))
}

export const enrollTotpFactor = async (): Promise<MfaEnrollment> => {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Authenticator app',
  })
  if (error) throw error

  return {
    factorId: data.id,
    qrCode: data.totp?.qr_code ?? null,
    secret: data.totp?.secret ?? null,
  }
}

export const verifyTotpFactor = async (factorId: string, code: string): Promise<void> => {
  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
  if (challengeError) throw challengeError

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code: code.trim(),
  })
  if (error) throw error
}

export const unenrollMfaFactor = async (factorId: string): Promise<void> => {
  const { error } = await supabase.auth.mfa.unenroll({ factorId })
  if (error) throw error
}

export const signOutSessionScope = async (scope: 'local' | 'others' | 'global'): Promise<void> => {
  const { error } = await supabase.auth.signOut({ scope })
  if (error) throw error
}

export const exportAccountData = async (): Promise<Record<string, unknown>> => {
  const { data, error } = await supabase.functions.invoke('account-self-service', {
    body: { action: 'export-account' },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data as Record<string, unknown>
}

export const deleteAccount = async (confirmation: string): Promise<void> => {
  const { data, error } = await supabase.functions.invoke('account-self-service', {
    body: { action: 'delete-account', confirmation },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
}
