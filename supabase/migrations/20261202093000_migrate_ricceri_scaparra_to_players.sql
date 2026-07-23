-- Corregge due utenze registrate erroneamente come Fan: sono Player.
-- Completa i campi minimi del profilo Player con i dati forniti.

do $$
declare
  updated_profiles integer := 0;
  updated_users integer := 0;
begin
  with target_profiles(id, full_name, birth_year, sport, player_role) as (
    values
      ('d68ace32-ca38-4755-b5ab-0a1f8ad0eced'::uuid, 'Enrico Ricceri', 1998, 'Calcio', 'Centrocampista centrale'),
      ('d2c9c2f9-5910-408f-9b6d-61881d156518'::uuid, 'Sergio Scaparra', 1982, 'Calcio', 'Terzino/Esterno difensivo')
  )
  update public.profiles p
  set
    account_type = 'athlete',
    type = 'athlete',
    full_name = t.full_name,
    display_name = t.full_name,
    birth_year = coalesce(p.birth_year, t.birth_year),
    country = coalesce(nullif(trim(p.country), ''), 'Italia'),
    sport = t.sport,
    role = t.player_role,
    interest_country = 'IT',
    interest_region = 'Sicilia',
    interest_province = 'Siracusa',
    interest_city = 'Carlentini',
    city = coalesce(nullif(trim(p.city), ''), 'Carlentini'),
    open_to_opportunities = coalesce(p.open_to_opportunities, false),
    is_admin = false,
    updated_at = now()
  from target_profiles t
  where p.id = t.id
    and p.user_id = t.id;

  get diagnostics updated_profiles = row_count;

  with target_users(id, full_name) as (
    values
      ('d68ace32-ca38-4755-b5ab-0a1f8ad0eced'::uuid, 'Enrico Ricceri'),
      ('d2c9c2f9-5910-408f-9b6d-61881d156518'::uuid, 'Sergio Scaparra')
  )
  update auth.users u
  set
    raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object(
        'account_type', 'athlete',
        'type', 'athlete',
        'role', 'athlete',
        'full_name', t.full_name,
        'display_name', t.full_name,
        'name', t.full_name
      ),
    updated_at = now()
  from target_users t
  where u.id = t.id;

  get diagnostics updated_users = row_count;

  if updated_profiles <> 2 then
    raise exception 'Expected to migrate 2 Player profiles, updated %', updated_profiles;
  end if;

  if updated_users <> 2 then
    raise exception 'Expected to update 2 auth users, updated %', updated_users;
  end if;
end $$;
