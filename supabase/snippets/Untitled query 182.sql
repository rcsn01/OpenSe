-- Enforce single organization membership per user
-- First, drop the existing composite unique constraint if it exists
ALTER TABLE public.organization_members 
DROP CONSTRAINT IF EXISTS organization_members_org_user_unique;

-- Add a unique constraint on user_id only
-- This ensures a user_id can appear at most once in the table
ALTER TABLE public.organization_members
ADD CONSTRAINT organization_members_user_unique UNIQUE (user_id);