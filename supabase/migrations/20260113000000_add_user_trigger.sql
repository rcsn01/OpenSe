-- Create a function to automatically create a profile for new users
create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_first_user boolean;
begin
  -- Determine if this is the first user ever created
  select not exists (select 1 from public.profiles) into is_first_user;

  insert into public.profiles (id, email, full_name, is_super_admin)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    is_first_user -- first user becomes super admin
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is inserted into auth.users
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
