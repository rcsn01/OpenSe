import { supabase } from '@repo/shared/supabase'

export const db = supabase.schema('kb')

export { supabase }
