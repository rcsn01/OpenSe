import { useEffect, useMemo, useState } from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'

export interface CurrentAccountProfileRow {
  id: string
  email: string | null
  full_name: string | null
  username: string | null
  avatar_url: string | null
}

export interface CurrentAccountProfileSummary {
  id: string | null
  email: string
  displayName: string
  username: string
  profileSrc?: string
  profileFallback: string
}

export interface CurrentAccountProfileSource {
  profile?: CurrentAccountProfileRow | null
  user?: Pick<User, 'id' | 'email' | 'user_metadata'> | null
}

export interface UseCurrentAccountProfileSummaryOptions {
  user?: Pick<User, 'id' | 'email' | 'user_metadata'> | null
  client: SupabaseClient<any>
}

const DEFAULT_PROFILE_FALLBACK = 'U'
const PROFILE_FIELDS = 'id, email, full_name, username, avatar_url'

const cleanString = (value: unknown): string => {
  return typeof value === 'string' ? value.trim() : ''
}

const getMetadataString = (
  user: Pick<User, 'user_metadata'> | null | undefined,
  key: string,
): string => {
  return cleanString(user?.user_metadata?.[key])
}

const getEmailLocalPart = (email: string) => {
  return email.split('@')[0] || email
}

export const getProfileInitials = (value: string): string => {
  const normalized = value.trim()
  if (!normalized) return DEFAULT_PROFILE_FALLBACK

  const parts = normalized.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
  }

  return (normalized[0] ?? DEFAULT_PROFILE_FALLBACK).toUpperCase()
}

export const getCurrentAccountProfileSummary = ({
  profile,
  user,
}: CurrentAccountProfileSource): CurrentAccountProfileSummary => {
  const email = cleanString(profile?.email) || cleanString(user?.email)
  const fullName =
    cleanString(profile?.full_name) ||
    getMetadataString(user, 'full_name') ||
    getMetadataString(user, 'name')
  const username = cleanString(profile?.username) || getMetadataString(user, 'username')
  const avatarUrl =
    cleanString(profile?.avatar_url) ||
    getMetadataString(user, 'avatar_url') ||
    getMetadataString(user, 'picture')
  const displayName = fullName || username || (email ? getEmailLocalPart(email) : 'User')
  const fallbackSource = fullName || username || email || displayName

  return {
    id: cleanString(profile?.id) || cleanString(user?.id) || null,
    email,
    displayName,
    username,
    profileSrc: avatarUrl || undefined,
    profileFallback: getProfileInitials(fallbackSource),
  }
}

export const fetchCurrentAccountProfile = async (
  client: SupabaseClient<any>,
  userId: string,
): Promise<CurrentAccountProfileRow | null> => {
  const { data, error } = await client
    .from('profiles')
    .select(PROFILE_FIELDS)
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return (data as CurrentAccountProfileRow | null) ?? null
}

export const useCurrentAccountProfileSummary = ({
  user,
  client,
}: UseCurrentAccountProfileSummaryOptions) => {
  const [profile, setProfile] = useState<CurrentAccountProfileRow | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadProfile = async () => {
      if (!user?.id) {
        setProfile(null)
        return
      }

      try {
        const nextProfile = await fetchCurrentAccountProfile(client, user.id)
        if (!cancelled) {
          setProfile(nextProfile)
        }
      } catch {
        if (!cancelled) {
          setProfile(null)
        }
      }
    }

    void loadProfile()

    return () => {
      cancelled = true
    }
  }, [client, user?.id])

  return useMemo(
    () => getCurrentAccountProfileSummary({ profile, user }),
    [profile, user],
  )
}
