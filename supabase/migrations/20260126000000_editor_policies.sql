-- Update the role check constraint to include 'editor'
ALTER TABLE public.organisation_members
  DROP CONSTRAINT IF EXISTS organisation_members_role_check;

ALTER TABLE public.organisation_members
  ADD CONSTRAINT organisation_members_role_check
  CHECK (role IN ('admin', 'editor', 'member'));

-- Add a helper to check if a user is the absolute owner of an org
CREATE OR REPLACE FUNCTION public.is_org_owner_strictly(p_org_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organisations
    WHERE id = p_org_id AND owner_id = p_user_id
  );
$$;
