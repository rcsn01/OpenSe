/**
 * Shared auth utilities - sign in, sign up, sign out wrappers.
 * Used by both ETL and StoQR apps.
 */

import { supabase } from '../supabase'

export interface SignUpParams {
  email: string
  password: string
  fullName?: string
  username?: string
}

export interface SignInParams {
  email: string
  password: string
}

export const signUp = async ({ email, password, fullName, username }: SignUpParams) => {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        username: username,
      },
    },
  })
}

export const signIn = async ({ email, password }: SignInParams) => {
  return supabase.auth.signInWithPassword({ email, password })
}

export const signOut = async () => {
  return supabase.auth.signOut()
}

export const getSession = async () => {
  return supabase.auth.getSession()
}

export const onAuthStateChange = (
  callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]
) => {
  return supabase.auth.onAuthStateChange(callback)
}
