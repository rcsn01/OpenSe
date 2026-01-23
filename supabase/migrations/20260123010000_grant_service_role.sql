-- CATEGORY: Privilege grants
-- Ensure service_role (and future tables) have full privileges to bypass RLS and insert during seeding.

-- Grant on existing tables and sequences
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

-- Future defaults
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
