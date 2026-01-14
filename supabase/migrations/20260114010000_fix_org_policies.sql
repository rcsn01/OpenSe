-- Replace organization and organization_members RLS policies to avoid recursive checks

-- Drop previous policies
DROP POLICY IF EXISTS "Organizations: select visible orgs" ON organizations;
DROP POLICY IF EXISTS "Organizations: insert own org" ON organizations;
DROP POLICY IF EXISTS "Organizations: update own org" ON organizations;
DROP POLICY IF EXISTS "Organizations: delete own org" ON organizations;
DROP POLICY IF EXISTS "Org members: select within orgs" ON organization_members;
DROP POLICY IF EXISTS "Org members: insert by owner or admin" ON organization_members;
DROP POLICY IF EXISTS "Org members: update by owner or admin" ON organization_members;
DROP POLICY IF EXISTS "Org members: delete by owner or admin" ON organization_members;

-- Organizations policies (safe, references membership but membership policies no longer reference organizations)
CREATE POLICY "Organizations: select visible orgs" ON organizations
FOR SELECT USING (
  auth.uid() = owner_id
  OR EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.org_id = organizations.id
      AND om.user_id = auth.uid()
  )
);

CREATE POLICY "Organizations: insert own org" ON organizations
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Organizations: update own org" ON organizations
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Organizations: delete own org" ON organizations
FOR DELETE USING (auth.uid() = owner_id);

-- Organization members policies (no references back to organizations to avoid recursion)
-- Allow viewing: self or any row in an org where current user is admin
CREATE POLICY "Org members: select within orgs" ON organization_members
FOR SELECT USING (
  organization_members.user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.org_id = organization_members.org_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
  )
);

-- Allow insert: self-add, or admins adding others
CREATE POLICY "Org members: insert by owner or admin" ON organization_members
FOR INSERT WITH CHECK (
  organization_members.user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.org_id = organization_members.org_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
  )
);

-- Allow update: admins in the same org
CREATE POLICY "Org members: update by owner or admin" ON organization_members
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.org_id = organization_members.org_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
  )
);

-- Allow delete: admins in the same org
CREATE POLICY "Org members: delete by owner or admin" ON organization_members
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.org_id = organization_members.org_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
  )
);
