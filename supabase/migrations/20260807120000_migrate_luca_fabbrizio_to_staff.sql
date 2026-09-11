-- Migrate Luca Fabbrizio from CLUB to STAFF.
-- The user selected the wrong account type during signup; preserve his name and
-- leave the specific staff role empty so it can be completed during onboarding.

do $$
declare
  target_user_id uuid := 'db17ae56-8582-4d00-a3cb-3fe038d70ec5';
  target_email text := 'lucafabbrizio@gmail.com';
  target_first_name text := 'Luca';
  target_last_name text := 'Fabbrizio';
  target_full_name text := target_first_name || ' ' || target_last_name;
  updated_profiles integer := 0;
  updated_users integer := 0;
begin
  update public.profiles p
  set
    account_type = 'staff',
    type = 'staff',
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

  update auth.users
  set
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object(
        'account_type', 'staff',
        'type', 'staff',
        'role', 'staff',
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

  -- Fresh branches do not contain Production identities; accept only coherent
  -- absence or a complete pair, and still fail closed on partial matches.
  if (updated_profiles, updated_users) not in ((0, 0), (1, 1)) then
    raise exception 'Luca Fabbrizio role migration expected coherent 0/0 or 1/1 rows, updated profiles %, users %', updated_profiles, updated_users;
  end if;
end $$;
