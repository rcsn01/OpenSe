import { supabase } from '@repo/shared/supabase'

export const db = supabase.schema('open_kb')

export { supabase }
