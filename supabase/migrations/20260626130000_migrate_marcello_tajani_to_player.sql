-- Migrate Marcello Tajani from CLUB to PLAYER (athlete).
-- The user selected the wrong account type during signup; keep the profile ready
-- for the player onboarding flow so he can complete the remaining fields later.

do $$
declare
  target_user_id uuid := 'c5f0d3e-2197-43bd-8153-1e73a5cea1d4';
  target_email text := 'tajanimarcello@gmail.com';
  target_full_name text := 'Marcello Tajani';
begin
  update public.profiles p
  set
    account_type = 'athlete',
    type = 'athlete',
    full_name = target_full_name,
    display_name = target_full_name,
    role = case
      when lower(coalesce(p.role, '')) in ('club', 'societa', 'società', 'team') then null
      else p.role
    end,
    is_admin = false,
    updated_at = now()
  from auth.users u
  where p.user_id = u.id
    and u.id = target_user_id
    and lower(u.email) = target_email;

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
end $$;
