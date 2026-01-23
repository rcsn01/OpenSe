import { supabase } from '../lib/supabase'

export const signUp = async (email: string, password: string) => {
  const { error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
}

export const signIn = async (email: string, password: string) => {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Sign in with Google OAuth (full-page redirect handled by Supabase)
export const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`,
      queryParams: {
        prompt: 'select_account',
      },
    },
  })

  if (error) throw error
}

export const fetchProfileFullName = async (userId: string) => {
  const { data, error } = await supabase.from('profiles').select('full_name').eq('id', userId).single()
  if (error) throw error
  return data?.full_name ?? ''
}

export const updateProfileFullName = async (userId: string, fullName: string) => {
  const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', userId)
  if (error) throw error
}

export const updateAuthFullName = async (fullName: string) => {
  const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } })
  if (error) throw error
}

export const updatePassword = async (password: string) => {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

export const hasUsers = async () => {
  const { data, error } = await supabase.rpc('has_users')
  if (error) throw error
  return Boolean(data)
}
