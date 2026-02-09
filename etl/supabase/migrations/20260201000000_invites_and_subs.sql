-- CATEGORY: Invites + subscription tier support

-- 1. Create table for invitations
create table if not exists public.organisation_invites (
  id uuid default gen_random_uuid() primary key,
  org_id uuid not null references public.organisations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'editor', 'member')),
  invited_by uuid references public.profiles(id),
  created_at timestamptz default timezone('utc'::text, now()) not null,
  unique (org_id, email)
);

create index if not exists organisation_invites_org_idx on public.organisation_invites(org_id);
create index if not exists organisation_invites_email_idx on public.organisation_invites(email);

-- 2. Add subscription fields to organisations
alter table public.organisations
  add column if not exists tier text default 'tier-1' check (tier in ('tier-1', 'tier-2', 'tier-3')),
  add column if not exists subscription_status text default 'active',
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

-- 3. RLS policies for invites
alter table public.organisation_invites enable row level security;

drop policy if exists "Users can view their own invites" on public.organisation_invites;
drop policy if exists "Admins can view org invites" on public.organisation_invites;
drop policy if exists "Admins can create invites" on public.organisation_invites;
drop policy if exists "Admins revoke or Users decline" on public.organisation_invites;

create policy "Users can view their own invites" on public.organisation_invites
for select using (
  email = (select auth.jwt() ->> 'email')
);

create policy "Admins can view org invites" on public.organisation_invites
for select using (
  public.is_org_admin(org_id, (select auth.uid()))
  or public.is_org_owner(org_id, (select auth.uid()))
  or public.is_app_super_admin()
);

create policy "Admins can create invites" on public.organisation_invites
for insert with check (
  public.is_org_admin(org_id, (select auth.uid()))
  or public.is_org_owner(org_id, (select auth.uid()))
  or public.is_app_super_admin()
);

create policy "Admins revoke or Users decline" on public.organisation_invites
for delete using (
  public.is_org_admin(org_id, (select auth.uid()))
  or public.is_org_owner(org_id, (select auth.uid()))
  or public.is_app_super_admin()
  or email = (select auth.jwt() ->> 'email')
);

-- 4. RPC: accept invite
create or replace function public.accept_invite(invite_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
  v_user_email text;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  v_user_email := (select auth.jwt() ->> 'email');

  if v_user_id is null or v_user_email is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_invite
  from public.organisation_invites
  where id = invite_id;

  if v_invite is null then
    raise exception 'Invite not found';
  end if;

  if v_invite.email <> v_user_email then
    raise exception 'This invite does not belong to you';
  end if;

  insert into public.organisation_members (org_id, user_id, role)
  values (v_invite.org_id, v_user_id, v_invite.role)
  on conflict (org_id, user_id) do update set role = excluded.role;

  delete from public.organisation_invites where id = invite_id;

  return true;
end;
$$;

grant execute on function public.accept_invite(uuid) to authenticated;
