-- CATEGORY: Admin-only RPCs (super admin gated)
-- Uses helper public.is_app_super_admin() defined in 20260113000000_add_user_trigger.sql
--
-- SECURITY AUDIT NOTES:
-- ----------------------
-- 1. All admin RPCs use `public.is_app_super_admin()` which checks the `super_admin_members` 
--    table server-side using `auth.uid()`. This is a SECURE method because:
--    - It uses `security definer` to execute with elevated privileges
--    - It checks `auth.uid()` which is cryptographically verified from the JWT
--    - It does NOT rely on any client-side data or claims
-- 
-- 2. The `super_admin_members` table itself is protected by RLS policies that only allow
--    existing super admins to modify it (defense-in-depth).
--
-- 3. Each RPC explicitly validates admin status BEFORE performing any sensitive operation.
--
-- 4. NEVER add admin logic that relies on client-provided data. Always use auth.uid().
--

create extension if not exists pgcrypto;

-- 0. RPC to Check Super Admin Status (used by UI gating)
-- NOTE: This is safe to call from the client because it only returns true/false
-- and performs no mutations. The actual is_app_super_admin() check is done server-side.
create or replace function public.get_super_admin_status()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.is_app_super_admin();
$$;

revoke all on function public.get_super_admin_status() from public;
grant execute on function public.get_super_admin_status() to authenticated;

-- 1. RPC to Create a User (Admin Only)
create or replace function public.create_user_admin(
  email text,
  password text,
  full_name text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  new_id uuid;
begin
  -- Enforce Super Admin Check
  if not public.is_app_super_admin() then
    raise exception 'Access denied: Super Admin only';
  end if;

  -- Check if email exists
  if exists (select 1 from auth.users where auth.users.email = create_user_admin.email) then
    raise exception 'User with this email already exists';
  end if;

  new_id := gen_random_uuid();

  -- Insert into auth.users (This triggers the existing on_auth_user_created trigger for profile creation)
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000',
    new_id,
    'authenticated',
    'authenticated',
    email,
    crypt(password, gen_salt('bf')),
    now(), -- Auto-confirm email
    jsonb_build_object('full_name', full_name),
    now(),
    now()
  );

  return new_id;
end;
$$;

revoke all on function public.create_user_admin(email text, password text, full_name text) from public;
grant execute on function public.create_user_admin(email text, password text, full_name text) to authenticated;

-- 2. RPC to Reset Password (Admin Only)
create or replace function public.reset_password_admin(
  target_user_id uuid,
  new_password text
)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if not public.is_app_super_admin() then
    raise exception 'Access denied: Super Admin only';
  end if;

  update auth.users
  set encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  where id = target_user_id;
end;
$$;

revoke all on function public.reset_password_admin(target_user_id uuid, new_password text) from public;
grant execute on function public.reset_password_admin(target_user_id uuid, new_password text) to authenticated;

-- 3. RPC to Delete User Completely (Admin Only)
-- This fixes the issue where deleting just the profile left the auth user orphaned
create or replace function public.delete_user_admin(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_app_super_admin() then
    raise exception 'Access denied: Super Admin only';
  end if;

  -- Delete profile first (if foreign key doesn't cascade automatically)
  delete from public.profiles where id = target_user_id;
  -- Delete auth user
  delete from auth.users where id = target_user_id;
end;
$$;

revoke all on function public.delete_user_admin(target_user_id uuid) from public;
grant execute on function public.delete_user_admin(target_user_id uuid) to authenticated;

-- Grant super admins the ability to read/control the data they manage
