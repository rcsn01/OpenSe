-- ============================================================
-- Migration 0001: Extensions & Schemas
-- ============================================================
-- Sets up required PostgreSQL extensions and creates the
-- separate schemas for ETL and StoQR modules.

-- Extensions (shared)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "moddatetime";

-- Create application-specific schemas
CREATE SCHEMA IF NOT EXISTS etl;
CREATE SCHEMA IF NOT EXISTS stoqr;

-- Grant usage to Supabase roles
GRANT USAGE ON SCHEMA etl TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA stoqr TO anon, authenticated, service_role;

-- Default privileges for future objects in each schema
ALTER DEFAULT PRIVILEGES IN SCHEMA etl GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA etl GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA etl GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA etl GRANT ALL ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA stoqr GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA stoqr GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA stoqr GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA stoqr GRANT ALL ON SEQUENCES TO authenticated;
