import type { User } from '@supabase/supabase-js'

export const DEMO_USER_ID = 'demo-user'
export const DEMO_USER_EMAIL = 'demo@example.com'
export const DEMO_USER_NAME = 'Demo User'

export const createDemoUser = (): User => ({
  id: DEMO_USER_ID,
  email: DEMO_USER_EMAIL,
  app_metadata: {},
  user_metadata: { full_name: DEMO_USER_NAME },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as User)
