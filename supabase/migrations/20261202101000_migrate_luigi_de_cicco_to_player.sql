-- Migra Luigi De Cicco da Club a Player (athlete).
-- L'utente aveva selezionato il tipo account errato; lasciamo gli altri campi
-- invariati così potrà completarli autonomamente dal flusso Player.

do $$
declare
  target_user_id uuid := 'b4a83039-39cb-436c-ac5d-0ff78b87bbbd';
  target_email text := 'andacca30@gmail.com';
  target_first_name text := 'Luigi';
  target_last_name text := 'De Cicco';
  target_full_name text := target_first_name || ' ' || target_last_name;
  updated_profiles integer := 0;
  updated_users integer := 0;
begin
  update public.profiles p
  set
    account_type = 'athlete',
    type = 'athlete',
    full_name = target_full_name,
    display_name = target_full_name,
    role = case
      when lower(coalesce(p.role, '')) in ('club', 'societa', 'società', 'team', 'squadra') then null
      else p.role
    end,
    is_admin = false,
    updated_at = now()
  from auth.users u
  where p.user_id = u.id
    and u.id = target_user_id
    and lower(u.email) = target_email;

  get diagnostics updated_profiles = row_count;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'first_name'
  ) then
    execute 'update public.profiles set first_name = $1 where user_id = $2'
    using target_first_name, target_user_id;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'last_name'
  ) then
    execute 'update public.profiles set last_name = $1 where user_id = $2'
    using target_last_name, target_user_id;
  end if;

  update auth.users
  set
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object(
        'account_type', 'athlete',
        'type', 'athlete',
        'role', 'athlete',
        'first_name', target_first_name,
        'last_name', target_last_name,
        'full_name', target_full_name,
        'display_name', target_full_name,
        'name', target_full_name
      ),
    updated_at = now()
  where id = target_user_id
    and lower(email) = target_email;

  get diagnostics updated_users = row_count;

  if updated_profiles <> 1 or updated_users <> 1 then
    raise exception 'Luigi De Cicco role migration expected 1 profile and 1 auth user, updated profiles %, users %', updated_profiles, updated_users;
  end if;
end $$;
