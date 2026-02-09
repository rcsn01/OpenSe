/**
 * Supabase clients for the StoQR app.
 *
 * - `supabase`  — public schema (auth, profiles, RPCs)
 * - `db`        — stoqr schema (companies, products, inventory, etc.)
 */
import { supabase } from '@repo/shared/supabase'

/** Schema-specific client for StoQR tables (stoqr.*) */
export const db = supabase.schema('stoqr')

export { supabase }