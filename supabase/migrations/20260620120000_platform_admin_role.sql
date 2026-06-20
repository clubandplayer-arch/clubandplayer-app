-- Platform Admin role: only clubandplayer@gmail.com can own it.

alter table if exists public.profiles
  drop constraint if exists profiles_account_type_check;

alter table if exists public.profiles
  add constraint profiles_account_type_check
  check (
    account_type is null
    or account_type in ('athlete', 'club', 'fan', 'staff', 'admin')
  ) not valid;

alter table if exists public.profiles
  drop constraint if exists profiles_type_check;

alter table if exists public.profiles
  add constraint profiles_type_check
  check (
    type is null
    or type in ('athlete', 'club', 'fan', 'staff', 'admin')
  ) not valid;

update public.profiles p
set
  account_type = 'admin',
  type = 'admin',
  role = 'Admin',
  is_admin = true,
  updated_at = now()
from auth.users u
where p.user_id = u.id
  and lower(u.email) = 'clubandplayer@gmail.com';

update public.profiles p
set
  account_type = case when p.account_type = 'admin' then null else p.account_type end,
  type = case when p.type = 'admin' then null else p.type end,
  role = case when p.role = 'Admin' then null else p.role end,
  is_admin = false,
  updated_at = now()
where (p.account_type = 'admin' or p.type = 'admin' or p.role = 'Admin' or p.is_admin is true)
  and not exists (
    select 1
    from auth.users u
    where u.id = p.user_id
      and lower(u.email) = 'clubandplayer@gmail.com'
  );

create or replace function public.enforce_single_platform_admin_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  profile_email text;
begin
  if new.account_type = 'admin' or new.type = 'admin' or new.role = 'Admin' or new.is_admin is true then
    select lower(email) into profile_email
    from auth.users
    where id = new.user_id;

    if coalesce(profile_email, '') <> 'clubandplayer@gmail.com' then
      raise exception 'Admin role is reserved for clubandplayer@gmail.com';
    end if;

    new.account_type := 'admin';
    new.type := 'admin';
    new.role := 'Admin';
    new.is_admin := true;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_single_platform_admin_profile on public.profiles;
create trigger enforce_single_platform_admin_profile
before insert or update on public.profiles
for each row
execute function public.enforce_single_platform_admin_profile();
