-- Drop the restrictive policy that only allowed owners/super admins to update
DROP POLICY IF EXISTS "Organizations can be updated by owner or super admin" ON organizations;

-- Create a new policy that also allows Organization Admins to update details
CREATE POLICY "Organizations can be updated by owner, admin, or super admin" ON organizations
FOR UPDATE USING (
  owner_id = auth.uid() 
  OR public.is_org_admin(id, auth.uid()) 
  OR public.is_app_super_admin()
);
