import { supabase } from '@repo/shared/supabase'
import { updateAuthFullName, updateProfileFullName } from '@repo/shared/auth'

const AVATAR_BUCKET = 'account-avatars'

export interface AccountProfile {
  id: string
  email: string | null
  fullName: string | null
  username: string | null
  avatarUrl: string | null
  avatarStoragePath: string | null
  recoveryEmail: string | null
  createdAt: string
  updatedAt: string | null
}

interface AccountProfileRow {
  id: string
  email: string | null
  full_name: string | null
  username: string | null
  avatar_url: string | null
  avatar_storage_path: string | null
  recovery_email: string | null
  created_at: string
  updated_at: string | null
}

const mapProfile = (row: AccountProfileRow): AccountProfile => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name,
  username: row.username,
  avatarUrl: row.avatar_url,
  avatarStoragePath: row.avatar_storage_path,
  recoveryEmail: row.recovery_email,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const getAccountProfile = async (): Promise<AccountProfile> => {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const userId = userData.user?.id
  if (!userId) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, username, avatar_url, avatar_storage_path, recovery_email, created_at, updated_at')
    .eq('id', userId)
    .single()
  if (error) throw error

  const row = data as AccountProfileRow | null
  if (!row) throw new Error('Profile not found for current user.')
  return mapProfile(row)
}

export const updateAccountProfile = async ({
  userId,
  fullName,
  username,
  avatarUrl,
  avatarStoragePath,
}: {
  userId: string
  fullName: string
  username: string | null
  avatarUrl?: string | null
  avatarStoragePath?: string | null
}): Promise<AccountProfile> => {
  const nextName = fullName.trim()
  if (!nextName) throw new Error('Full name cannot be empty.')

  await Promise.all([
    updateProfileFullName(userId, nextName),
    updateAuthFullName(nextName),
  ])

  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: nextName,
      username: username?.trim() || null,
      avatar_url: avatarUrl,
      avatar_storage_path: avatarStoragePath,
    })
    .eq('id', userId)
    .select('id, email, full_name, username, avatar_url, avatar_storage_path, recovery_email, created_at, updated_at')
    .single()
  if (error) throw error

  const row = data as AccountProfileRow | null
  if (!row) throw new Error('Updated profile was not returned.')
  return mapProfile(row)
}

export const uploadAccountAvatar = async (userId: string, file: File): Promise<{ url: string; path: string }> => {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'png'
  const path = `${userId}/${Date.now()}.${extension}`

  const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  })
  if (uploadError) throw uploadError

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
  return {
    path,
    url: data.publicUrl,
  }
}

export const removeAccountAvatar = async (storagePath: string | null): Promise<void> => {
  if (!storagePath) return
  const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([storagePath])
  if (error) throw error
}
