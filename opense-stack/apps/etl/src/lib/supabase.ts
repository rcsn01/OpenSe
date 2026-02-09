/**
 * Supabase clients for the ETL app.
 *
 * - `supabase`  — public schema (auth, profiles, RPCs)
 * - `db`        — etl schema (organisations, workflows, etc.)
 */
import { supabase } from '@repo/shared/supabase'

/** Schema-specific client for ETL tables (etl.*) */
export const db = supabase.schema('etl')

export { supabase }
