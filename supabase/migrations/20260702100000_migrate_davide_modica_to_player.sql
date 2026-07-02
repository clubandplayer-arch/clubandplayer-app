-- Migrate Davide Modica from CLUB to PLAYER (athlete).
-- The user selected the wrong account type during signup; keep the profile ready
-- for the player onboarding flow so he can complete the remaining fields later.

do $$
declare
  target_user_id uuid := 'c62fea53-5bbe-4d1d-b7b4-92c8e02061fb';
  target_email text := 'modicadavide85@gmail.com';
  target_full_name text := 'Davide Modica';
  updated_profiles integer := 0;
  updated_users integer := 0;
begin
  update public.profiles p
  set
    account_type = 'athlete',
    type = 'athlete',
    full_name = coalesce(nullif(trim(p.full_name), ''), target_full_name),
    display_name = coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.full_name), ''), target_full_name),
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

  update auth.users
  set
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object(
        'account_type', 'athlete',
        'type', 'athlete',
        'role', 'athlete',
        'full_name', target_full_name,
        'display_name', target_full_name,
        'name', target_full_name
      ),
    updated_at = now()
  where id = target_user_id
    and lower(email) = target_email;

  get diagnostics updated_users = row_count;

  if updated_profiles <> 1 or updated_users <> 1 then
    raise exception 'Davide Modica role migration expected 1 profile and 1 auth user, updated profiles %, users %', updated_profiles, updated_users;
  end if;
end $$;
