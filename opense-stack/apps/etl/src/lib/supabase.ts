/**
 * Supabase clients for the ETL app.
 *
 * - `supabase`  — public schema (auth, profiles, organisations, shared RPCs)
 * - `db`        — etl schema (etl tables like workflows, executions, invites)
 */
import { supabase } from '@repo/shared/supabase'

/** Schema-specific client for ETL tables (etl.*) */
export const db = supabase.schema('etl')

export { supabase }
