-- CATEGORY: Auth helpers and bootstrap
-- Establish helper functions plus the new-user trigger for profiles/super-admin bootstrap.

-- Helper functions (cached auth values via SELECT to avoid per-row initplans)
create or replace function public.is_app_super_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.super_admin_members
    where user_id = (select auth.uid())
  );
$$;

create or replace function public.is_org_owner(p_org_id uuid, p_user_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.organisations
    where id = p_org_id and owner_id = p_user_id
  );
$$;

create or replace function public.is_org_member(p_org_id uuid, p_user_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.organisation_members
    where org_id = p_org_id and user_id = p_user_id
  );
$$;

create or replace function public.is_org_admin(p_org_id uuid, p_user_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.organisation_members
    where org_id = p_org_id and user_id = p_user_id and role = 'admin'
  );
$$;

-- Trigger to automatically create a profile for new users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;

  if not exists (select 1 from public.super_admin_members) then
    insert into public.super_admin_members (user_id) values (new.id)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$ language plpgsql security definer;
-- Trigger the function every time a user is inserted into auth.users
drop trigger if exists on_auth_user_created on auth.users;
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper to check if any users exist (used by frontend to gate first-run flow)
create or replace function public.has_users()
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.profiles);
$$;

grant execute on function public.has_users() to anon;
grant execute on function public.has_users() to authenticated;
