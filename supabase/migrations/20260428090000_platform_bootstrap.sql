-- Core platform bootstrap.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "moddatetime";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Supabase-linked projects pre-provision the extensions schema, so this is the
-- one platform-owned schema that must remain idempotent for linked resets.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA etl;
CREATE SCHEMA stoqr;
CREATE SCHEMA app_private;

GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA etl TO authenticated, service_role;
GRANT USAGE ON SCHEMA stoqr TO authenticated, service_role;
GRANT USAGE ON SCHEMA app_private TO anon, authenticated, service_role;
