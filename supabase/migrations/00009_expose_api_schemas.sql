-- ============================================================
-- Migration 0009: Expose API Schemas
-- ============================================================
-- Note: pgrst.db_schemas cannot be set via migrations on hosted Supabase.
-- Configure exposed schemas in the Supabase dashboard (Project Settings > API).

DO $$
BEGIN
	RAISE NOTICE 'Configure exposed schemas (public, graphql_public, etl, stoqr) in Supabase dashboard.';
END $$;
